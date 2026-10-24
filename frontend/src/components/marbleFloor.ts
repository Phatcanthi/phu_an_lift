import * as THREE from "three";

// The cabin floor's marble is baked into a ~150 px tile of room.glb's lightmap atlas and is blown out to white,
// so its veins are lost. This draws a seamless marble pattern and multiplies it onto the baked light, in world
// space, leaving the baked light gradient intact. Shared by the hero and the customizer.
//
// The customizer can also switch the floor to a ready-made inlay texture (tools/blender/make_floor_inlay.py),
// stretched over the floor's exact footprint.

const SIZE = 1024;
/** Metres covered by one repeat of the pattern. */
const TILE = 1.6;

function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Value noise on a lattice that wraps every `period` cells, so the texture tiles. */
function noise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const w = (n: number) => ((n % period) + period) % period;
  const a = hash(w(xi), w(yi), seed);
  const b = hash(w(xi + 1), w(yi), seed);
  const c = hash(w(xi), w(yi + 1), seed);
  const d = hash(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, period: number, octaves: number, seed: number) {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const f = 2 ** o;
    sum += amp * noise(x * f, y * f, period * f, seed + o);
    total += amp;
    amp *= 0.5;
  }
  return sum / total;
}

let cached: THREE.CanvasTexture | null = null;

function marbleTexture() {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  const img = ctx.createImageData(SIZE, SIZE);

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const u = px / SIZE;
      const v = py / SIZE;
      const cloud = fbm(u * 4, v * 4, 4, 5, 11);
      const warp = fbm(u * 3, v * 3, 3, 4, 31);
      // The phase is an integer combination of u and v, so each vein family is periodic across the tile.
      const v1 = 1 - Math.abs(Math.sin(Math.PI * (2 * u + v + 1.0 * warp)));
      const v2 = 1 - Math.abs(Math.sin(Math.PI * (u - 2 * v + 1.3 * (1 - warp))));
      const thin1 = v1 ** 12;
      const thin2 = v2 ** 20;
      const haze = v1 ** 4;
      let c = 0.84 + 0.16 * cloud;
      c *= 1 - 0.34 * thin1 - 0.2 * thin2 - 0.14 * haze;
      c = Math.max(0.3, c);
      const i = (py * SIZE + px) * 4;
      img.data[i] = Math.min(255, c * 255 * 1.0);
      img.data[i + 1] = Math.min(255, c * 255 * 0.99);
      img.data[i + 2] = Math.min(255, c * 255 * 0.97);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cached = tex;
  return tex;
}

/** Footprint and image of an inlay floor; the image's top edge is the back (-z) edge of the footprint. */
export interface Inlay {
  url: string;
  box: THREE.Box3;
}

interface MarbleState {
  uniforms: {
    marbleMap: { value: THREE.Texture };
    marbleGain: { value: number };
    inlayMap: { value: THREE.Texture };
    inlayMix: { value: number };
    inlayRect: { value: THREE.Vector4 };
  };
  inlay?: Inlay;
  loading: boolean;
}

const STATE = "marble";

/**
 * Multiplies the marble pattern onto the material's emissive (baked) light. `gain` makes up for the
 * pattern's average darkening, so the floor keeps about the brightness it had. Pass `inlay` to let
 * `setInlay` switch to that picture later.
 */
export function applyMarble(material: THREE.MeshStandardMaterial, gain = 1.3, inlay?: Inlay) {
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  const rect = new THREE.Vector4(0, 0, 1, 1);
  if (inlay) {
    const size = inlay.box.getSize(new THREE.Vector3());
    rect.set(inlay.box.min.x, inlay.box.min.z, 1 / size.x, 1 / size.z);
  }
  const state: MarbleState = {
    uniforms: {
      marbleMap: { value: marbleTexture() },
      marbleGain: { value: gain },
      inlayMap: { value: white },
      inlayMix: { value: 0 },
      inlayRect: { value: rect },
    },
    inlay,
    loading: false,
  };
  material.userData[STATE] = state;

  material.onBeforeCompile = (shader) => {
    // the uniform objects are shared, so later changes to their `.value` reach the compiled program
    Object.assign(shader.uniforms, state.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec2 vMarbleUv;\nvoid main() {")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vMarbleUv = (modelMatrix * vec4(transformed, 1.0)).xz / ${TILE.toFixed(2)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform sampler2D marbleMap;\nuniform sampler2D inlayMap;\nuniform float marbleGain;\nuniform float inlayMix;\nuniform vec4 inlayRect;\nvarying vec2 vMarbleUv;\nvoid main() {",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        vec3 stone = texture2D(marbleMap, vMarbleUv).rgb;
        if (inlayMix > 0.5) {
          vec2 world = vMarbleUv * ${TILE.toFixed(2)};
          stone = texture2D(inlayMap, vec2((world.x - inlayRect.x) * inlayRect.z, 1.0 - (world.y - inlayRect.y) * inlayRect.w)).rgb;
        }
        totalEmissiveRadiance *= stone * marbleGain;`,
      );
  };
  material.customProgramCacheKey = () => "marble-floor";
  material.needsUpdate = true;
}

/** Shows the inlay picture instead of the tiled marble on a material prepared by `applyMarble`. No-op otherwise. */
export function setInlay(material: THREE.Material, on: boolean) {
  const state = material.userData[STATE] as MarbleState | undefined;
  if (!state) return;
  state.uniforms.inlayMix.value = on && state.inlay ? 1 : 0;
  if (on && state.inlay && !state.loading) {
    // fetched on first use: most visitors never pick it
    state.loading = true;
    new THREE.TextureLoader().load(state.inlay.url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      state.uniforms.inlayMap.value = tex;
    });
  }
}
