// Mutable state shared between the DOM overlay (scroll/drag handlers) and the WebGL frame loop.
// It lives in a ref so per-frame updates never trigger React re-renders.
export interface SceneState {
  /** Scroll progress through the hero, 0..1. */
  progress: number;
  /** Door opening, 0 (closed) .. 1 (open), eased every frame. */
  doorOpen: number;
  /** User override once inside the cabin; null follows scroll. */
  manualDoor: boolean | null;
  yawTarget: number;
  pitchTarget: number;
  yaw: number;
  pitch: number;
  /** Position along the camera path, 0 (room overview) .. 1 (inside the cabin), eased every frame. */
  travel: number;
  /** Pointer position over the viewport, -1..1, and its eased value (drives a slight camera parallax). */
  pointerX: number;
  pointerY: number;
  swayX: number;
  swayY: number;
  /** Jump straight to the target pose (used when the page loads already scrolled). */
  snap: boolean;
}

export const INSIDE_THRESHOLD = 0.86;

export function createSceneState(): SceneState {
  return {
    progress: 0,
    doorOpen: 0,
    manualDoor: null,
    yawTarget: 0,
    pitchTarget: 0,
    yaw: 0,
    pitch: 0,
    travel: 0,
    pointerX: 0,
    pointerY: 0,
    swayX: 0,
    swayY: 0,
    snap: false,
  };
}
