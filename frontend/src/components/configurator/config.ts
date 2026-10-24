// What the cabin configurator lets a customer change. Every group maps to nodes of public/models/room.glb
// by node name (and optionally by the source material), so a new model only needs the same naming.
//
// Colours: the baked materials (`*_Baked`) carry their colour in the emissive texture and have a black base
// colour, so a tint multiplies the emissive channel. Metals and other plain materials take it as base colour.
// Names shown to the customer live in the `customize` messages, keyed by the codes below.

export type GroupId =
  | "preset"
  | "exterior"
  | "floor"
  | "ceiling"
  | "cabinWall"
  | "cabinDoor"
  | "landingDoor"
  | "handrail"
  | "cabinButtons"
  | "hallButtons"
  | "doorFrame";

export type ViewId = "inside" | "lobby" | "room";

export interface Option {
  code: string;
  /** sRGB colour of the swatch shown to the customer. */
  swatch: string;
  /** Colour for the group's surface parts; omitted keeps the model's own colour. */
  tint?: string;
  /** Colour for the group's light parts (glowing strips, button rings); omitted keeps the model's own. */
  light?: string;
  /** Hides the group's meshes (an optional fitting such as the handrail). */
  hide?: boolean;
}

export interface Part {
  /** Tested against the node name (dots are stripped by the loader: `Wall_Back.001` is `Wall_Back001`). */
  nodes: RegExp;
  /** Tested against the material name the node has in the file. */
  materials?: RegExp;
  role: "surface" | "light";
}

export interface Group {
  id: Exclude<GroupId, "preset">;
  parts: Part[];
  options: Option[];
}

export interface Preset {
  code: string;
  swatches: [string, string, string];
  picks: Record<Exclude<GroupId, "preset">, string>;
}

const metals: Option[] = [
  { code: "inox", swatch: "#cfcfd2" },
  { code: "rose", swatch: "#c58f7e", tint: "#c58f7e" },
  { code: "bronze", swatch: "#a07a50", tint: "#a07a50" },
  { code: "champagne", swatch: "#d8c39a", tint: "#d8c39a" },
  { code: "brass", swatch: "#c9a24a", tint: "#c9a24a" },
  { code: "black", swatch: "#2b2b2d", tint: "#2b2b2d" },
];

const buttons: Option[] = [
  { code: "btnInox", swatch: "#cfcfd2" },
  { code: "btnBrass", swatch: "#c9a24a", tint: "#c9a24a", light: "#ffb347" },
  { code: "btnBlack", swatch: "#2b2b2d", tint: "#2b2b2d", light: "#ffffff" },
  { code: "btnRose", swatch: "#c58f7e", tint: "#c58f7e", light: "#ff9d8a" },
];

export const groups: Group[] = [
  {
    id: "exterior",
    parts: [{ nodes: /^(Wall_|Shaft_)/, materials: /^Room_Wall_Baked$/, role: "surface" }],
    options: [
      { code: "wallCream", swatch: "#e8dfd0" },
      { code: "wallGrey", swatch: "#b9c2c4", tint: "#b9c2c4" },
      { code: "wallBlush", swatch: "#d9b9a0", tint: "#d9b9a0" },
      { code: "wallSage", swatch: "#a9b5a0", tint: "#a9b5a0" },
    ],
  },
  {
    id: "floor",
    parts: [{ nodes: /^Floor$/, role: "surface" }],
    options: [
      { code: "stoneWhite", swatch: "#ecebe8" },
      { code: "stoneGrey", swatch: "#9a9ca0", tint: "#9a9ca0" },
      { code: "stoneBlack", swatch: "#3a3a3e", tint: "#4a4a4e" },
      { code: "stoneWarm", swatch: "#c8a77e", tint: "#c8a77e" },
    ],
  },
  {
    id: "ceiling",
    parts: [{ nodes: /^(Ceiling_Panel_[LR]|Downlight_\d+)$/, role: "light" }],
    options: [
      { code: "lightNeutral", swatch: "#fff6ea" },
      { code: "lightWarm", swatch: "#ffd9a0", light: "#ffd9a0" },
      { code: "lightCool", swatch: "#d6e6ff", light: "#d6e6ff" },
    ],
  },
  {
    id: "cabinWall",
    parts: [
      {
        nodes: /^(Wall_(Back|Left|Right)|Back_(Header|Post_[LR])|Front_(Header|Return_[LR])|Skirting_[LR])$/,
        materials: /^Elevator_BrushedSteel$/,
        role: "surface",
      },
    ],
    options: metals,
  },
  {
    id: "cabinDoor",
    parts: [{ nodes: /^(Car_Door_[LR]|Door_Sill)$/, role: "surface" }],
    options: metals,
  },
  // The model has no landing (floor) doors, so there is nothing to attach options to yet.
  { id: "landingDoor", parts: [], options: [] },
  {
    id: "handrail",
    parts: [{ nodes: /^Handrail_[LR]/, role: "surface" }],
    options: [...metals, { code: "none", swatch: "transparent", hide: true }],
  },
  {
    id: "cabinButtons",
    parts: [
      { nodes: /^COP_(Plate|Key|Btn_(\d|Close|Open)_Cap)$/, role: "surface" },
      { nodes: /^COP_Btn_(\d|Close|Open)_Ring$/, role: "light" },
    ],
    options: buttons,
  },
  {
    id: "hallButtons",
    parts: [
      { nodes: /^Call_Plate$/, role: "surface" },
      { nodes: /^Call_Button_\d+$/, role: "light" },
    ],
    options: buttons,
  },
  {
    id: "doorFrame",
    parts: [{ nodes: /^(Jamb_(L|R|Top)|Lift_Frame_[LRT])$/, role: "surface" }],
    // The lobby frame is black in the model, so every option names its colour explicitly.
    options: metals.map((o) => (o.tint ? o : { ...o, tint: "#e2e2e6" })),
  },
];

/** Groups in the order shown to the customer; `preset` (the whole-cabin template) comes first. */
export const groupOrder: GroupId[] = [
  "preset",
  "exterior",
  "floor",
  "ceiling",
  "cabinWall",
  "cabinDoor",
  "landingDoor",
  "handrail",
  "cabinButtons",
  "hallButtons",
  "doorFrame",
];

export const presets: Preset[] = [
  {
    code: "inox",
    swatches: ["#cfcfd2", "#ecebe8", "#cfcfd2"],
    picks: {
      exterior: "wallCream", floor: "stoneWhite", ceiling: "lightNeutral", cabinWall: "inox", cabinDoor: "inox",
      landingDoor: "", handrail: "inox", cabinButtons: "btnInox", hallButtons: "btnInox", doorFrame: "inox",
    },
  },
  {
    code: "rose",
    swatches: ["#c58f7e", "#c8a77e", "#ffd9a0"],
    picks: {
      exterior: "wallBlush", floor: "stoneWarm", ceiling: "lightWarm", cabinWall: "rose", cabinDoor: "rose",
      landingDoor: "", handrail: "rose", cabinButtons: "btnRose", hallButtons: "btnRose", doorFrame: "rose",
    },
  },
  {
    code: "bronze",
    swatches: ["#a07a50", "#3a3a3e", "#ffd9a0"],
    picks: {
      exterior: "wallCream", floor: "stoneBlack", ceiling: "lightWarm", cabinWall: "bronze", cabinDoor: "bronze",
      landingDoor: "", handrail: "brass", cabinButtons: "btnBrass", hallButtons: "btnBrass", doorFrame: "bronze",
    },
  },
  {
    code: "champagne",
    swatches: ["#d8c39a", "#ecebe8", "#fff6ea"],
    picks: {
      exterior: "wallCream", floor: "stoneWhite", ceiling: "lightNeutral", cabinWall: "champagne",
      cabinDoor: "champagne", landingDoor: "", handrail: "champagne", cabinButtons: "btnBrass",
      hallButtons: "btnBrass", doorFrame: "champagne",
    },
  },
  {
    code: "black",
    swatches: ["#2b2b2d", "#3a3a3e", "#d6e6ff"],
    picks: {
      exterior: "wallGrey", floor: "stoneBlack", ceiling: "lightCool", cabinWall: "black", cabinDoor: "black",
      landingDoor: "", handrail: "brass", cabinButtons: "btnBlack", hallButtons: "btnBlack", doorFrame: "black",
    },
  },
];

export type Selection = Record<Exclude<GroupId, "preset">, string>;

export const defaultSelection: Selection = presets[0].picks;

export const getGroup = (id: GroupId) => groups.find((g) => g.id === id);
