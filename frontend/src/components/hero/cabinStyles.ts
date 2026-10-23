// Wall finishes offered in the ELITE catalogue (stainless steel, rose gold, bronze, champagne).
// The 3D model is a single stainless-steel cabin; a finish only recolours its steel surfaces, so it is
// an illustration of the colour, not of the etched/patterned designs (V06, V08 ...).

export interface Finish {
  code: string;
  name: string;
  /** sRGB colour used for the swatch. */
  swatch: string;
  /** Tint applied to the model's brushed-steel material, or null to keep the original. */
  wall: string | null;
}

export const finishes: Finish[] = [
  { code: "inox", name: "Inox xước", swatch: "#cfcfd2", wall: null },
  { code: "rose", name: "Vàng hồng", swatch: "#c58f7e", wall: "#c58f7e" },
  { code: "bronze", name: "Đồng", swatch: "#a07a50", wall: "#a07a50" },
  { code: "champagne", name: "Vàng champagne", swatch: "#d8c39a", wall: "#d8c39a" },
];
