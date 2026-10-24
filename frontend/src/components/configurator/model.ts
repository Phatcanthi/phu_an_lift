import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { applyMarble, setInlay } from "../marbleFloor";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VARIANT_BASE, groups } from "./config";
import type { Group, GroupId, Option, Part, Selection, Space } from "./config";

export const MODEL_URL = "/models/room.glb";

// The car doors are exported open (hidden inside the wall); each panel slides 0.45 m to close. Stop 2 mm
// short so the two panels never share a face.
export const DOOR_SLIDE = 0.448;

type Standard = THREE.MeshStandardMaterial;

/**
 * The lift itself: the cabin (everything in elevator-only.glb), the door frame in the lobby wall and the
 * landing call buttons. Every other mesh belongs to the room and is hidden in the lift-only view.
 */
const LIFT_PART =
  /^(Back_|Front_(Header|Return)|Side_Seam|Car_Door|Ceiling_(Mirror|Panel|Shell)|COP_|Door_Sill|Downlight_|Floor(_\d+)?$|Handrail_|Indicator_|Jamb_|Skirting_|Wall_(Back|Left|Right)$|Lift_Frame_|Call_|Landing_Door_)/;
export const isLiftPart = (name: string) => LIFT_PART.test(name);

/** The option chosen for a group; an unknown or empty code falls back to the group's first option. */
export const optionFor = (group: Group, selection: Selection): Option | undefined =>
  group.options.find((o) => o.code === selection[group.id]) ?? group.options[0];

/** The 3D variant files a selection asks for, keyed by group. Groups on a plain tint option are absent. */
export function variantFiles(selection: Selection): Map<Group["id"], string> {
  const files = new Map<Group["id"], string>();
  for (const group of groups) {
    const glb = optionFor(group, selection)?.glb;
    if (glb) files.set(group.id, glb);
  }
  return files;
}

const buffers = new Map<string, Promise<ArrayBuffer>>();

/** Loads the variant files (each fetched once, parsed afresh so every model owns what it disposes). */
export async function loadVariants(files: Map<Group["id"], string>) {
  const loaded = new Map<Group["id"], THREE.Group>();
  await Promise.all(
    [...files].map(async ([id, file]) => {
      const url = VARIANT_BASE + file;
      let bytes = buffers.get(url);
      if (!bytes) {
        bytes = fetch(url).then((r) => {
          if (!r.ok) throw new Error(`${url}: ${r.status}`);
          return r.arrayBuffer();
        });
        buffers.set(url, bytes);
        bytes.catch(() => buffers.delete(url));
      }
      const gltf = await new GLTFLoader().parseAsync((await bytes).slice(0), "");
      loaded.set(id, gltf.scene);
    }),
  );
  return loaded;
}

/**
 * The variants are lit by the scene lights alone, while the room model carries its light baked into the
 * emissive channel, so they would look dark beside it. Give them a share of their own colour as emissive light.
 */
function liftVariant(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Standard[]) {
      if (m.userData.lit) continue;
      m.userData.lit = true;
      if (m.emissive.r + m.emissive.g + m.emissive.b > 0.01) {
        m.emissiveIntensity *= 0.4; // lamps, button rings and display digits already glow
        continue;
      }
      if (m.map) {
        m.emissiveMap = m.map;
        m.emissive.set(1, 1, 1);
      } else {
        m.emissive.copy(m.color);
      }
      m.emissiveIntensity = m.metalness > 0.5 ? 0.3 : 0.6;
    }
  });
}

/** Swaps each variant group's own nodes for the nodes of its chosen file. */
function applyVariants(scene: THREE.Group, variants: Map<Group["id"], THREE.Group>) {
  for (const [id, source] of variants) {
    const replace = groups.find((g) => g.id === id)?.replace;
    if (!replace) continue;
    for (const node of scene.children.filter((c) => replace.test(c.name))) {
      node.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      node.removeFromParent();
    }
    for (const node of [...source.children]) {
      liftVariant(node);
      scene.add(node);
    }
  }
}

interface Slot {
  role: Part["role"];
  material: Standard;
  color0: THREE.Color;
  emissive0: THREE.Color;
  meshes: THREE.Mesh[];
}

export interface CabinModel {
  scene: THREE.Group;
  slots: Map<GroupId, Slot[]>;
  doors: { left?: THREE.Object3D; right?: THREE.Object3D; leftX: number; rightX: number };
  /** Landing doors only exist when a variant brings them; they slide together with the car doors. */
  landing: { left?: THREE.Object3D; right?: THREE.Object3D; leftX: number; rightX: number };
  mirror: Reflector | null;
  space: Space;
  /** Meshes that only exist for the room; hidden when `space` is `lift`. */
  roomMeshes: THREE.Mesh[];
}

/**
 * One-off fixes for the model as exported from Blender, the same ones the home page hero applies to its own
 * copy of the file (components/hero/ElevatorCanvas.tsx).
 */
function fixExport(scene: THREE.Group) {
  scene.traverse((o) => {
    const mat = (o as THREE.Mesh).material;
    if (!mat || Array.isArray(mat)) return;
    const m = mat as Standard;
    if (m.userData.toned) return;
    m.userData.toned = true;
    // Flat steel panels mirror the brightest part of the environment as a hot patch; a rougher surface blurs it.
    if (m.name === "Elevator_BrushedSteel") m.roughness = Math.max(m.roughness, 0.55);
    // The mirror panel, lamp glow and pure-white marble floor blow out under the WebGL tone mapping.
    if (m.name === "Elevator_Mirror") m.color.multiplyScalar(0.4);
    if (m.name === "Elevator_LampGlow") m.emissiveIntensity *= 0.5;
    if (m.name === "Elevator_Marble") m.color.multiplyScalar(0.6);
    // The cove strips, window and lamp shade are exported very bright and glare.
    if (m.name === "Room_WarmStrip") m.emissiveIntensity *= 0.35;
    if (m.name === "Room_Sky") m.emissiveIntensity *= 0.4;
    if (m.name === "Room_LampShade") m.emissiveIntensity *= 0.5;
    // Baked surfaces show their lightmap through the emissive channel and read too bright next to real-time metals.
    if (m.name.endsWith("_Baked")) m.emissiveIntensity *= m.name === "Elevator_Marble_Baked" ? 0.3 : 0.7;
    if (m.name === "Elevator_CeilingGlow") m.emissiveIntensity *= 0.6;
  });

  // Blender's default cube was left hidden in the .blend and still exported; it sits inside the cabin.
  const strayCube = scene.getObjectByName("Cube");
  if (strayCube?.type === "Mesh") strayCube.removeFromParent();

  // Parts that sit exactly flush with their neighbours flicker (z-fighting); nudge them apart.
  const nudge = (name: string, x: number, y: number) => {
    const node = scene.getObjectByName(name);
    if (node && !node.userData.nudged) {
      node.userData.nudged = true;
      node.position.x += x;
      node.position.y += y;
    }
  };
  nudge("Jamb_L", 0.002, 0);
  nudge("Jamb_R", -0.002, 0);
  nudge("Jamb_Top", 0, -0.002);
  nudge("Door_Sill", 0, 0.001);
  nudge("Door_Sill_Groove_1", 0, 0.0015);
  nudge("Door_Sill_Groove_2", 0, 0.0015);
}

/**
 * Gives every part of every group its own copy of the material. The file shares materials between groups
 * (the handrail, door jambs, button caps and call plate are all `Elevator_PolishedSteel`), so changing the
 * shared one would recolour them all.
 */
function buildSlots(scene: THREE.Group, list: Group[]) {
  const slots = new Map<GroupId, Slot[]>();
  const byKey = new Map<string, Slot>();

  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const source = mesh.material as Standard;
    for (const group of list) {
      group.parts.forEach((part, i) => {
        if (part.outer) return; // handled once every mesh has its inner material, see splitOuter
        if (!part.nodes.test(mesh.name) || (part.materials && !part.materials.test(source.name))) return;
        const key = `${group.id}.${i}.${source.uuid}`;
        let slot = byKey.get(key);
        if (!slot) {
          const material = source.clone();
          slot = { role: part.role, material, color0: material.color.clone(), emissive0: material.emissive.clone(), meshes: [] };
          byKey.set(key, slot);
          slots.set(group.id, [...(slots.get(group.id) ?? []), slot]);
        }
        slot.meshes.push(mesh);
        mesh.material = slot.material;
      });
    }
  });
  splitOuter(scene, list, slots);
  return slots;
}

/** Cabin centre: a face whose normal points away from here is on the outside of the cabin. */
const CABIN_CENTRE = new THREE.Vector3(0, 1.2, 0);

/**
 * Gives the outward faces of `outer` parts a material of their own. Each box is six quads of six indices; the
 * quads facing away from the cabin go to a second material, everything else keeps the one it already has.
 */
function splitOuter(scene: THREE.Group, list: Group[], slots: Map<GroupId, Slot[]>) {
  const n = new THREE.Vector3();
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (const group of list) {
    group.parts.forEach((part) => {
      if (!part.outer) return;
      let slot: Slot | null = null;
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || Array.isArray(mesh.material) || !part.nodes.test(mesh.name)) return;
        const geometry = mesh.geometry.clone();
        const { index } = geometry;
        if (!index) return;
        mesh.updateWorldMatrix(true, false);
        const position = geometry.getAttribute("position");
        const normal = geometry.getAttribute("normal");
        geometry.clearGroups();
        let start = 0;
        let current = -1;
        for (let f = 0; f + 5 < index.count; f += 6) {
          c.set(0, 0, 0);
          for (let k = 0; k < 6; k++) c.add(p.fromBufferAttribute(position, index.getX(f + k)));
          c.multiplyScalar(1 / 6).applyMatrix4(mesh.matrixWorld);
          n.fromBufferAttribute(normal, index.getX(f)).transformDirection(mesh.matrixWorld);
          const outward = n.dot(p.subVectors(c, CABIN_CENTRE)) > 0 ? 1 : 0;
          if (outward !== current) {
            if (current !== -1) geometry.addGroup(start, f - start, current);
            start = f;
            current = outward;
          }
        }
        geometry.addGroup(start, index.count - start, current);
        const inner = mesh.material as Standard;
        if (!slot) {
          const material = inner.clone();
          slot = { role: part.role, material, color0: material.color.clone(), emissive0: material.emissive.clone(), meshes: [] };
          slots.set(group.id, [...(slots.get(group.id) ?? []), slot]);
        }
        mesh.geometry = geometry;
        mesh.material = [inner, slot.material];
        slot.meshes.push(mesh);
      });
    });
  }
}

/** The mirror in the back wall only reflects the (dim) environment map and renders black; use a real reflection. */
function buildMirror(scene: THREE.Group) {
  const recess = scene.getObjectByName("Back_Recess");
  if (!recess) return null;
  const material = (recess as THREE.Mesh).material as Standard | undefined;
  // An etched mirror is part mirror, part frosted: a plain reflection would erase the pattern.
  if (material?.map) return null;
  const box = new THREE.Box3().setFromObject(recess);
  const size = box.getSize(new THREE.Vector3());
  // A coloured mirror (gold, rose, black titanium) tints what it reflects.
  // (its hue only: normalised so a dark bronze mirror does not reflect nothing)
  const tint = new THREE.Color(0x8c8c8c);
  if (material && material.name !== "Elevator_Mirror") {
    const hue = material.color.clone();
    tint.multiply(hue.multiplyScalar(1 / Math.max(hue.r, hue.g, hue.b, 1e-3)));
  }
  const reflector = new Reflector(new THREE.PlaneGeometry(size.x, size.y), {
    textureWidth: 512,
    textureHeight: 1024,
    color: tint,
  });
  reflector.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + 0.002);
  recess.visible = false;
  return reflector;
}

export function prepareModel(scene: THREE.Group, variants: Map<Group["id"], THREE.Group> = new Map()): CabinModel {
  applyVariants(scene, variants);
  fixExport(scene);
  const slots = buildSlots(scene, groups);
  // Applied to the per-group copy: `clone()` does not carry the shader hook over from the shared material.
  // A floor variant is a finished texture and must not get the marble pattern multiplied onto it.
  const floor = scene.getObjectByName("Floor");
  const inlay = floor && { url: "/textures/floor-inlay.jpg", box: new THREE.Box3().setFromObject(floor) };
  if (!variants.has("floor")) slots.get("floor")?.forEach((s) => applyMarble(s.material, 1.3, inlay || undefined));
  const roomMeshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !isLiftPart(o.name)) roomMeshes.push(o as THREE.Mesh);
  });
  const left = scene.getObjectByName("Car_Door_L");
  const right = scene.getObjectByName("Car_Door_R");
  const landL = scene.getObjectByName("Landing_Door_L");
  const landR = scene.getObjectByName("Landing_Door_R");
  return {
    scene,
    slots,
    doors: { left, right, leftX: left?.position.x ?? 0, rightX: right?.position.x ?? 0 },
    landing: { left: landL, right: landR, leftX: landL?.position.x ?? 0, rightX: landR?.position.x ?? 0 },
    mirror: buildMirror(scene),
    space: "room",
    roomMeshes,
  };
}

export function applySelection(model: CabinModel, selection: Selection) {
  for (const group of groups) {
    const option = optionFor(group, selection);
    if (!option) continue;
    for (const slot of model.slots.get(group.id) ?? []) {
      const { material: m } = slot;
      slot.meshes.forEach((mesh) => (mesh.visible = !option.hide && (model.space === "room" || isLiftPart(mesh.name))));
      setInlay(m, option.pattern === "inlay");
      if (option.glb) continue; // a finished 3D variant keeps its own materials and is never tinted
      const colour = slot.role === "surface" ? option.tint : option.light;
      m.color.copy(slot.color0);
      m.emissive.copy(slot.emissive0);
      if (!colour) continue;
      if (slot.role === "light") {
        m.emissive.set(colour);
        if (!m.emissiveMap) m.color.set(colour);
      } else if (m.emissiveMap) {
        m.emissive.set(colour); // baked: the colour sits in the emissive texture, so tint that
      } else {
        m.color.set(colour);
      }
    }
  }
}

export function setSpace(model: CabinModel, space: Space) {
  model.space = space;
  model.roomMeshes.forEach((mesh) => (mesh.visible = space === "room"));
}

export function setDoors(model: CabinModel, open: number) {
  const closed = (1 - open) * DOOR_SLIDE;
  const { left, right, leftX, rightX } = model.doors;
  if (left) left.position.x = leftX + closed;
  if (right) right.position.x = rightX - closed;
  const land = model.landing;
  if (land.left) land.left.position.x = land.leftX + closed;
  if (land.right) land.right.position.x = land.rightX - closed;
}

export function disposeModel(model: CabinModel) {
  model.mirror?.geometry.dispose();
  model.mirror?.dispose();
  const textures = new Set<THREE.Texture>();
  model.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
      m.dispose();
    });
  });
  textures.forEach((t) => t.dispose());
}
