"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Selection, Space, ViewId } from "./config";
import { MODEL_URL, applySelection, disposeModel, prepareModel, setDoors, setSpace } from "./model";
import type { CabinModel } from "./model";

// Units are metres. The lift sits in the lobby wall of the room: the doorway is centred on x = 0 and the cabin
// spans z = -0.8 .. 0.8 behind the wall face at z = 1.12.
interface ViewSpec {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  distance: [number, number];
  azimuth: [number, number];
  polar: [number, number];
  /** Look around from a fixed point instead of orbiting an object (drag turns the head, no zoom). */
  look360?: boolean;
}

const VIEWS: Record<ViewId, ViewSpec> = {
  // The eye stays in the middle of the cabin; the orbit radius is a centimetre, so dragging only turns the head.
  inside: {
    pos: [0, 1.4, 0.1],
    target: [0, 1.4, 0.09],
    fov: 75,
    distance: [0.01, 0.01],
    azimuth: [-Infinity, Infinity],
    polar: [0.35, Math.PI - 0.35],
    look360: true,
  },
  lobby: { pos: [0, 1.5, 3.2], target: [0, 1.15, 0], fov: 50, distance: [1.6, 5.5], azimuth: [-1.0, 1.0], polar: [0.9, 1.7] },
  // a three-quarter view of the lift on its own, from the side of the door
  angle: { pos: [2.6, 1.85, 3.8], target: [0, 1.0, 0], fov: 42, distance: [2.2, 8], azimuth: [-1.2, 1.5], polar: [0.8, 1.75] },
  room: { pos: [-2.0, 1.7, 7.1], target: [2.2, 1.1, -2.0], fov: 58, distance: [3, 12], azimuth: [-1.4, 0.6], polar: [0.8, 1.7] },
};

const TWEEN_SECONDS = 0.9;
const ease = (t: number) => t * t * (3 - 2 * t);

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

/** Applies a preset's limits; null frees them (while the camera glides). */
function applyLimits(c: OrbitControls, s: ViewSpec | null) {
  c.minDistance = s ? s.distance[0] : 0;
  c.maxDistance = s ? s.distance[1] : Infinity;
  c.minAzimuthAngle = s ? s.azimuth[0] : -Infinity;
  c.maxAzimuthAngle = s ? s.azimuth[1] : Infinity;
  c.minPolarAngle = s ? s.polar[0] : 0;
  c.maxPolarAngle = s ? s.polar[1] : Math.PI;
  c.enableZoom = !s?.look360;
  // A negative speed makes the drag "grab the world", the natural direction when looking around.
  c.rotateSpeed = s?.look360 ? -0.6 : 1;
}

/** Orbit controls that glide between the camera presets and keep each one inside its own limits. */
function Controls({ view }: { view: ViewId }) {
  const { camera, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControls | null>(null);
  const placed = useRef(false);
  const tween = useRef<{
    t: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromFov: number;
    toFov: number;
    spec: ViewSpec;
  } | null>(null);

  useEffect(() => {
    const c = new OrbitControls(cam, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.zoomSpeed = 0.6;
    controls.current = c;
    return () => {
      c.dispose();
      controls.current = null;
    };
  }, [cam, gl]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const spec = VIEWS[view];
    if (!placed.current) {
      placed.current = true;
      cam.position.set(...spec.pos);
      cam.fov = spec.fov;
      cam.updateProjectionMatrix();
      c.target.set(...spec.target);
      applyLimits(c, spec);
      c.update();
      return;
    }
    // Free the limits while gliding so they cannot snap the camera mid-way; they come back at the end.
    applyLimits(c, null);
    c.enabled = false;
    tween.current = {
      t: 0,
      fromPos: cam.position.clone(),
      toPos: new THREE.Vector3(...spec.pos),
      fromTarget: c.target.clone(),
      toTarget: new THREE.Vector3(...spec.target),
      fromFov: cam.fov,
      toFov: spec.fov,
      spec,
    };
  }, [view, cam]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const tw = tween.current;
    if (tw) {
      tw.t = Math.min(1, tw.t + Math.min(delta, 0.05) / TWEEN_SECONDS);
      const e = ease(tw.t);
      cam.position.lerpVectors(tw.fromPos, tw.toPos, e);
      c.target.lerpVectors(tw.fromTarget, tw.toTarget, e);
      cam.fov = tw.fromFov + (tw.toFov - tw.fromFov) * e;
      cam.updateProjectionMatrix();
      if (tw.t >= 1) {
        applyLimits(c, tw.spec);
        c.enabled = true;
        tween.current = null;
      }
    }
    c.update();
  });
  return null;
}

/** A pool of light and a soft shadow under the lift, so it does not float in the dark when the room is hidden. */
function Ground() {
  const map = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    if (!g) return null;
    const pool = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    pool.addColorStop(0, "rgba(92, 86, 76, 0.95)");
    pool.addColorStop(0.45, "rgba(52, 49, 44, 0.7)");
    pool.addColorStop(1, "rgba(11, 11, 12, 0)");
    g.fillStyle = pool;
    g.fillRect(0, 0, 256, 256);
    const shade = g.createRadialGradient(128, 128, 0, 128, 128, 56);
    shade.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = shade;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => map?.dispose(), [map]);
  if (!map) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.065, 0]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Cabin({ model, selection, doorsOpen, space }: { model: CabinModel; selection: Selection; doorsOpen: boolean; space: Space }) {
  const open = useRef(1);

  useEffect(() => {
    setSpace(model, space);
    applySelection(model, selection);
  }, [model, selection, space]);

  useFrame((_, delta) => {
    const target = doorsOpen ? 1 : 0;
    open.current += (target - open.current) * (1 - Math.exp(-Math.min(delta, 0.05) * 5));
    if (Math.abs(target - open.current) < 0.001) open.current = target;
    setDoors(model, open.current);
    // The reflection costs a second render of the scene; skip it while the doors are shut.
    if (model.mirror) model.mirror.visible = open.current > 0.01;
  });

  return (
    <>
      <primitive object={model.scene} />
      {model.mirror && <primitive object={model.mirror} />}
      {space === "lift" && <Ground />}
    </>
  );
}

type Props = {
  selection: Selection;
  view: ViewId;
  doorsOpen: boolean;
  space: Space;
  onReady?: () => void;
  onProgress?: (ratio: number) => void;
  onError?: () => void;
  label: string;
};

export default function CabinCanvas({ selection, view, doorsOpen, space, onReady, onProgress, onError, label }: Props) {
  const [model, setModel] = useState<CabinModel | null>(null);
  // The callbacks may change on every render; the load must not restart because of that.
  const callbacks = useRef({ onReady, onProgress, onError });
  callbacks.current = { onReady, onProgress, onError };

  // Loaded here rather than with useLoader: that caches one shared scene per URL, and the hero's canvas
  // would then share (and be recoloured by) the one this page edits.
  useEffect(() => {
    let cancelled = false;
    let built: CabinModel | null = null;
    new GLTFLoader()
      .loadAsync(MODEL_URL, (e) => {
        if (e.total) callbacks.current.onProgress?.(e.loaded / e.total);
      })
      .then((gltf) => {
        built = prepareModel(gltf.scene);
        if (cancelled) return disposeModel(built);
        setModel(built);
        callbacks.current.onReady?.();
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError?.();
      });
    return () => {
      cancelled = true;
      if (built) disposeModel(built);
      setModel(null);
    };
  }, []);

  const start = useRef(VIEWS[view]).current; // the canvas camera is only read at creation; Controls follow `view`

  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ fov: start.fov, near: 0.05, far: 40, position: start.pos }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.8;
      }}
      role="img"
      aria-label={label}
    >
      <color attach="background" args={["#0b0b0c"]} />
      <Environment />
      <ambientLight intensity={0.1} />
      <hemisphereLight args={["#fff1d8", "#8a7a66", 0.25]} />
      {model && <Cabin model={model} selection={selection} doorsOpen={doorsOpen} space={space} />}
      <Controls view={view} />
    </Canvas>
  );
}
