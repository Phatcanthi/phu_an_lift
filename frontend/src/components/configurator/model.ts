import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { applyMarble } from "../marbleFloor";
import { groups } from "./config";
import type { Group, GroupId, Part, Selection } from "./config";

export const MODEL_URL = "/models/room.glb";

// The car doors are exported open (hidden inside the wall); each panel slides 0.45 m to close. Stop 2 mm
// short so the two panels never share a face.
export const DOOR_SLIDE = 0.448;

type Standard = THREE.MeshStandardMaterial;

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
  mirror: Reflector | null;
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
  return slots;
}

/** The mirror in the back wall only reflects the (dim) environment map and renders black; use a real reflection. */
function buildMirror(scene: THREE.Group) {
  const recess = scene.getObjectByName("Back_Recess");
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
}

export function prepareModel(scene: THREE.Group): CabinModel {
  fixExport(scene);
  const slots = buildSlots(scene, groups);
  // Applied to the per-group copy: `clone()` does not carry the shader hook over from the shared material.
  slots.get("floor")?.forEach((s) => applyMarble(s.material));
  const left = scene.getObjectByName("Car_Door_L");
  const right = scene.getObjectByName("Car_Door_R");
  return {
    scene,
    slots,
    doors: { left, right, leftX: left?.position.x ?? 0, rightX: right?.position.x ?? 0 },
    mirror: buildMirror(scene),
  };
}

export function applySelection(model: CabinModel, selection: Selection) {
  for (const group of groups) {
    const option = group.options.find((o) => o.code === selection[group.id]) ?? group.options[0];
    if (!option) continue;
    for (const slot of model.slots.get(group.id) ?? []) {
      const { material: m } = slot;
      slot.meshes.forEach((mesh) => (mesh.visible = !option.hide));
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

export function setDoors(model: CabinModel, open: number) {
  const closed = (1 - open) * DOOR_SLIDE;
  const { left, right, leftX, rightX } = model.doors;
  if (left) left.position.x = leftX + closed;
  if (right) right.position.x = rightX - closed;
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
