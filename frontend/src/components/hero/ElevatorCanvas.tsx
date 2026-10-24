"use client";

import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { applyMarble } from "../marbleFloor";
import { finishes } from "./cabinStyles";
import { INSIDE_THRESHOLD } from "./sceneState";
import type { SceneState } from "./sceneState";

// Units are metres. The room model (public/models/room.glb) is a living room with the lift in its
// lobby wall: the wall's front face is at z = 1.12, the doorway is centred on x = 0 (0.9 m wide, 2.1 m high)
// and the cabin spans z = -0.8 .. 0.8 behind it. The room itself runs from x = -3.5 to 8 and z = -4.2 to 7.5.
const MODEL_URL = "/models/room.glb";
// The car doors are exported open (hidden inside the wall); each panel slides 0.45 m to close. Stop 2 mm
// short so the two panels never share a face.
const DOOR_SLIDE = 0.448;

// Camera path through the room, from the overview (close to the model's Room_Camera) to inside the cabin.
// Keyframe i sits at travel = i / (PATH.length - 1).
const PATH: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [-2.0, 1.7, 7.1], look: [2.2, 1.1, -2.0] }, // whole room
  { pos: [-0.7, 1.62, 5.0], look: [0.3, 1.2, 0.4] },
  { pos: [0, 1.55, 3.0], look: [0, 1.25, 0] }, // facing the lift
  { pos: [0, 1.5, 1.7], look: [0, 1.25, -0.8] }, // in front of the doorway
  { pos: [0, 1.48, 0.35], look: [0, 1.35, -0.8] }, // inside the cabin
];
const DOOR_OPEN_AT = 2 / (PATH.length - 1);
const HOLD_AT = 3 / (PATH.length - 1); // the camera waits here until the doors have opened

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const DEG = Math.PI / 180;

/** Widens the vertical FOV on narrow (portrait) screens so at least `minH` degrees stay visible horizontally. */
function fitFov(vfov: number, aspect: number, minH: number) {
  const needed = (2 * Math.atan(Math.tan((minH * DEG) / 2) / aspect)) / DEG;
  return Math.min(Math.max(vfov, needed), 85);
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    // Only the metals light up from this (the matte surfaces are baked); higher turns the cabin walls white.
    scene.environmentIntensity = 0.16;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/**
 * The matte surfaces carry their lighting in the baked lightmap (tools/blender/bake_room.py), so real-time
 * lights only matter for the metals, mirrors and glowing parts. Point lights are left out on purpose: on the
 * baked surfaces they would only add glossy hot spots (on the ceiling, for instance) on top of the bake.
 */
function RoomLights() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <hemisphereLight args={["#fff1d8", "#8a7a66", 0.25]} />
    </>
  );
}

/** The room and cabin from the GLB. Only the brushed-steel material is recoloured by the finish selector. */
function RoomModel({
  stateRef,
  finishIndex,
  onLoaded,
  onProgress,
}: {
  stateRef: MutableRefObject<SceneState>;
  finishIndex: number;
  onLoaded: () => void;
  onProgress?: (ratio: number) => void;
}) {
  const gltf = useLoader(GLTFLoader, MODEL_URL, undefined, (e) => {
    if (e.total) onProgress?.(e.loaded / e.total);
  });

  const steel = useMemo(() => {
    const found = new Set<THREE.MeshStandardMaterial>();
    gltf.scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material;
      if (mat && !Array.isArray(mat) && mat.name === "Elevator_BrushedSteel") found.add(mat as THREE.MeshStandardMaterial);
    });
    const list = [...found];
    // Flat steel panels mirror the brightest part of the environment as a hot patch; a rougher surface blurs it.
    list.forEach((m) => (m.roughness = Math.max(m.roughness, 0.55)));
    return { list, original: list.map((m) => m.color.clone()) };
  }, [gltf]);

  useEffect(() => {
    const tint = finishes[finishIndex].wall;
    steel.list.forEach((m, i) => (tint ? m.color.set(tint) : m.color.copy(steel.original[i])));
  }, [finishIndex, steel]);

  // One-off fixes for the model as exported from Blender.
  useEffect(() => {
    gltf.scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material;
      if (!mat || Array.isArray(mat)) return;
      const m = mat as THREE.MeshStandardMaterial;
      // The mirror panel, lamp glow and pure-white marble floor blow out under the WebGL tone mapping.
      if (m.userData.toned) return;
      m.userData.toned = true;
      if (m.name === "Elevator_Mirror") m.color.multiplyScalar(0.4);
      if (m.name === "Elevator_LampGlow") m.emissiveIntensity *= 0.5;
      if (m.name === "Elevator_Marble") m.color.multiplyScalar(0.6);
      // The cove strips, window and lamp shade are exported very bright (emissive strength 3-8) and glare.
      if (m.name === "Room_WarmStrip") m.emissiveIntensity *= 0.35;
      if (m.name === "Room_Sky") m.emissiveIntensity *= 0.4;
      if (m.name === "Room_LampShade") m.emissiveIntensity *= 0.5;
      // Baked surfaces show their lightmap through the emissive channel. Cycles' raw values read too bright
      // next to the real-time metals, the white cabin floor (lit from right above) most of all.
      if (m.name.endsWith("_Baked")) m.emissiveIntensity *= m.name === "Elevator_Marble_Baked" ? 0.3 : 0.7;
      if (m.name === "Elevator_CeilingGlow") m.emissiveIntensity *= 0.6;
      // The baked marble floor is a tiny, blown-out lightmap tile with no visible veins; draw them on top.
      if (m.name === "Elevator_Marble_Baked") applyMarble(m);
    });

    // Blender's default cube was left hidden in the .blend and still exported; it sits inside the cabin.
    const strayCube = gltf.scene.getObjectByName("Cube");
    if (strayCube?.type === "Mesh") strayCube.removeFromParent();

    // Some parts sit exactly flush with their neighbours, so their faces coincide and flicker (z-fighting):
    // the door-frame jambs against the front return panels and header, and the door sill against the floors.
    const nudge = (name: string, x: number, y: number) => {
      const node = gltf.scene.getObjectByName(name);
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
  }, [gltf]);

  const doors = useMemo(() => {
    const left = gltf.scene.getObjectByName("Car_Door_L");
    const right = gltf.scene.getObjectByName("Car_Door_R");
    return { left, right, leftX: left?.position.x ?? 0, rightX: right?.position.x ?? 0 };
  }, [gltf]);

  // The mirror in the back wall only reflects the (dim) environment map and renders almost black, so it is
  // replaced by a real planar reflection of the cabin and the lobby behind the viewer.
  const mirror = useMemo(() => {
    const recess = gltf.scene.getObjectByName("Back_Recess");
    if (!recess) return null;
    const box = new THREE.Box3().setFromObject(recess);
    const size = box.getSize(new THREE.Vector3());
    const reflector = new Reflector(new THREE.PlaneGeometry(size.x, size.y), {
      textureWidth: 512,
      textureHeight: 1024,
      color: 0x8c8c8c,
    });
    reflector.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + 0.002);
    recess.visible = false;
    return reflector;
  }, [gltf]);
  useEffect(
    () => () => {
      mirror?.geometry.dispose();
      mirror?.dispose();
    },
    [mirror],
  );

  useFrame(() => {
    const { doorOpen: open, travel } = stateRef.current;
    const closed = (1 - open) * DOOR_SLIDE;
    if (doors.left) doors.left.position.x = doors.leftX + closed;
    if (doors.right) doors.right.position.x = doors.rightX - closed;
    // The reflection costs a second render of the scene; skip it while the camera is outside behind closed doors.
    if (mirror) mirror.visible = open > 0.01 || travel > HOLD_AT;
  });

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  return (
    <>
      <primitive object={gltf.scene} />
      {mirror && <primitive object={mirror} />}
    </>
  );
}

function Rig({ stateRef }: { stateRef: MutableRefObject<SceneState> }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const started = useRef(false);
  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(PATH.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal"),
      look: new THREE.CatmullRomCurve3(PATH.map((k) => new THREE.Vector3(...k.look)), false, "centripetal"),
    }),
    [],
  );
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = stateRef.current;
    const p = s.progress;
    const inside = p > INSIDE_THRESHOLD;

    const travelTarget = ease(clamp01((p - 0.03) / 0.8));
    const doorTarget =
      s.manualDoor !== null && p > INSIDE_THRESHOLD - 0.04 ? (s.manualDoor ? 1 : 0) : travelTarget > DOOR_OPEN_AT ? 1 : 0;
    // Never let the camera reach a door that has not opened yet (once inside, closing the door keeps it there).
    const allowed = (open: number) => (open < 0.85 && s.travel < HOLD_AT + 0.01 ? Math.min(travelTarget, HOLD_AT) : travelTarget);

    if (!started.current) {
      started.current = true;
      if (p > 0.02) s.snap = true;
    }
    if (s.snap) {
      s.doorOpen = doorTarget;
      s.travel = doorTarget ? travelTarget : Math.min(travelTarget, HOLD_AT);
      s.yaw = s.yawTarget;
      s.pitch = s.pitchTarget;
      s.snap = false;
    } else {
      s.doorOpen += (doorTarget - s.doorOpen) * (1 - Math.exp(-dt * 2.6));
      s.travel += (allowed(s.doorOpen) - s.travel) * (1 - Math.exp(-dt * 3));
      s.yaw += ((inside ? s.yawTarget : 0) - s.yaw) * (1 - Math.exp(-dt * 6));
      s.pitch += ((inside ? s.pitchTarget : 0) - s.pitch) * (1 - Math.exp(-dt * 6));
    }
    s.swayX += ((inside ? 0 : s.pointerX) - s.swayX) * (1 - Math.exp(-dt * 2));
    s.swayY += ((inside ? 0 : s.pointerY) - s.swayY) * (1 - Math.exp(-dt * 2));

    const enter = ease(clamp01((s.travel - HOLD_AT) / (1 - HOLD_AT)));
    // Outside the cabin the camera follows the pointer a little and drifts as if hand-held.
    const drift = 1 - enter;
    const t = state.clock.elapsedTime;

    curves.pos.getPoint(s.travel, pos);
    curves.look.getPoint(s.travel, look);
    const dx = look.x - pos.x;
    const dz = look.z - pos.z;
    cam.position.set(
      pos.x + s.swayX * 0.12 * drift,
      pos.y - s.swayY * 0.05 * drift + Math.sin(t * 0.7) * 0.012 * drift,
      pos.z,
    );
    cam.rotation.order = "YXZ";
    cam.rotation.set(
      Math.atan2(look.y - pos.y, Math.hypot(dx, dz)) + s.pitch - s.swayY * 0.025 * drift,
      Math.atan2(-dx, -dz) + s.yaw - s.swayX * 0.04 * drift + Math.sin(t * 0.45) * 0.004 * drift,
      0,
    );

    // Wide enough to take in the room on any screen, then wider still in the cramped cabin.
    const fov = fitFov(lerp(58, 78, enter), size.width / size.height, lerp(72, 0, enter));
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

/** Soft glow around the light strips, lamps and window. Takes over rendering from R3F (frame priority 1). */
function Bloom() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    // High threshold: only the emissive strips, lamps and window (HDR values well above 1) glow; lit walls do not.
    // Kept faint and tight: on a real GPU the half-float buffer keeps the full HDR range and a wider glow fogs the room.
    c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.16, 0.1, 3));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);

  useFrame((_, delta) => composer.render(delta), 1);
  return null;
}

/** Reports a failed model download so the page can fall back to the static hero. */
class LoadBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ElevatorCanvas({
  stateRef,
  finishIndex,
  active,
  bloom,
  onReady,
  onProgress,
  onError,
}: {
  stateRef: MutableRefObject<SceneState>;
  finishIndex: number;
  active: boolean;
  /** Post-processing glow; costs an extra few passes per frame, so it is left off on small screens. */
  bloom: boolean;
  onReady?: () => void;
  onProgress?: (ratio: number) => void;
  onError?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 58, near: 0.05, far: 30, position: PATH[0].pos }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.8;
      }}
      aria-hidden="true"
    >
      <color attach="background" args={["#0b0b0c"]} />
      <Environment />
      <RoomLights />
      <LoadBoundary onError={() => onError?.()}>
        <Suspense fallback={null}>
          <RoomModel
            stateRef={stateRef}
            finishIndex={finishIndex}
            onLoaded={() => onReady?.()}
            onProgress={onProgress}
          />
        </Suspense>
      </LoadBoundary>
      <Rig stateRef={stateRef} />
      {bloom && <Bloom />}
    </Canvas>
  );
}
