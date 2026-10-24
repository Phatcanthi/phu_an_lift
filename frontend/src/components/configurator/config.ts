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

export type ViewId = "inside" | "lobby" | "room" | "angle";

/** `room` shows the whole living room around the lift; `lift` shows only the lift. */
export type Space = "room" | "lift";

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
  /** Draws a ready-made pattern (public/textures) instead of tinting the model's own surface. */
  pattern?: "inlay";
  /**
   * A finished 3D variant of the group (path under public/models/variants). Its nodes replace the group's own
   * nodes in the room model, keep their own materials and are never tinted.
   */
  glb?: string;
}

export interface Part {
  /** Tested against the node name (dots are stripped by the loader: `Wall_Back.001` is `Wall_Back001`). */
  nodes: RegExp;
  /** Tested against the material name the node has in the file. */
  materials?: RegExp;
  role: "surface" | "light";
  /**
   * Only the faces of the matching boxes that point away from the cabin. The cabin walls are 4 cm thick boxes
   * whose inner and outer faces share one mesh, so this splits them to colour the outside on its own.
   */
  outer?: boolean;
}

export interface Group {
  id: Exclude<GroupId, "preset">;
  parts: Part[];
  options: Option[];
  /** Nodes of the room model that a `glb` option takes over; they are removed before its own nodes are added. */
  replace?: RegExp;
}

export const VARIANT_BASE = "/models/variants/";

/** Shorthand for a 3D variant option: the file is `<folder>/<folder>_<file>.glb`. */
const variant = (code: string, swatch: string, folder: string, file: string): Option => ({
  code,
  swatch,
  glb: `${folder}/${folder}_${file}.glb`,
});

const WOOD = "linear-gradient(135deg, #7a4326, #4a2813)";
const ETCHED = "repeating-linear-gradient(90deg, #dcdce0 0 3px, #a3a3aa 3px 6px)";

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
    // the outside of the cabin: its three walls and the panels either side of the door
    parts: [{ nodes: /^(Wall_(Back|Left|Right)|Front_(Header|Return_[LR]))$/, role: "surface", outer: true }],
    options: metals,
  },
  {
    id: "floor",
    parts: [{ nodes: /^Floor$/, role: "surface" }],
    options: [
      { code: "stoneWhite", swatch: "#ecebe8" },
      { code: "stoneGrey", swatch: "#9a9ca0", tint: "#9a9ca0" },
      { code: "stoneBlack", swatch: "#3a3a3e", tint: "#4a4a4e" },
      { code: "stoneWarm", swatch: "#c8a77e", tint: "#c8a77e" },
      {
        code: "inlayGreen",
        swatch: "radial-gradient(circle, #ecebe4 0 36%, #1f5a45 39% 62%, #ecebe4 65%)",
        pattern: "inlay",
      },
      variant("floorDB002", "#adb2a7", "floor", "KA-DB002"),
      variant("floorDB004", "#bbbebb", "floor", "KA-DB004"),
      variant("floorDB013", "#9ca79e", "floor", "KA-DB013"),
      variant("floorDB030", "#dfe1db", "floor", "KA-DB030"),
      variant("floorDB032", "#c2c7c8", "floor", "KA-DB032"),
      variant("floorDB036", "#cdbca1", "floor", "KA-DB036"),
    ],
    replace: /^Floor$/,
  },
  {
    id: "ceiling",
    parts: [{ nodes: /^(Ceiling_Panel_[LR]|Downlight_\d+)$/, role: "light" }],
    options: [
      { code: "lightNeutral", swatch: "#fff6ea" },
      { code: "lightWarm", swatch: "#ffd9a0", light: "#ffd9a0" },
      { code: "lightCool", swatch: "#d6e6ff", light: "#d6e6ff" },
      variant("ceilDD101", "#cfcfd2", "ceiling", "DD101"),
      variant("ceilDD102", "#b4b6ba", "ceiling", "DD102"),
      variant("ceilDD201", "#2b2b30", "ceiling", "DD201"),
      variant("ceilDD301", WOOD, "ceiling", "DD301"),
      variant("ceilDD303", "#b98a5c", "ceiling", "DD303"),
      variant("ceilDD304", "#d9a08e", "ceiling", "DD304"),
    ],
    replace: /^(Ceiling_(Shell|Mirror|Panel_[LR])|Downlight_\d+)$/,
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
    options: [
      ...metals,
      variant("wallMirrorEtched", ETCHED, "wall", "mirror-etched"),
      variant("wallWalnut", WOOD, "wall", "walnut"),
      variant("wallGold", "#c9a24a", "wall", "gold"),
      variant("wallRose", "#c58f7e", "wall", "rose"),
      variant("wallBlackTi", "#2b2b2d", "wall", "black-titanium"),
    ],
    replace: /^(Wall_(Back|Left|Right)|Back_|Front_(Header|Return_[LR])|Side_Seam|Skirting_)/,
  },
  {
    id: "cabinDoor",
    parts: [{ nodes: /^(Car_Door_[LR]|Door_Sill)$/, role: "surface" }],
    options: [
      ...metals,
      variant("doorTM004", "#8f9195", "cabin_door", "TM004"),
      variant("doorTM013", "#b9bcc0", "cabin_door", "TM013"),
      variant("doorTM019", "#d9b94a", "cabin_door", "TM019"),
      variant("doorTM028", "#8c7a66", "cabin_door", "TM028"),
      variant("doorTM030", "#8a4a2b", "cabin_door", "TM030"),
    ],
    replace: /^(Car_Door_[LR]|Door_Sill)/,
  },
  // The room model has no landing doors of its own: they only exist as variants, so the first option shows none.
  {
    id: "landingDoor",
    parts: [{ nodes: /^Landing_Door_[LR]$/, role: "surface" }],
    options: [
      { code: "landingNone", swatch: "transparent", hide: true },
      variant("landTM004", "#8f9195", "landing_door", "TM004"),
      variant("landTM013", "#b9bcc0", "landing_door", "TM013"),
      variant("landTM019", "#d9b94a", "landing_door", "TM019"),
      variant("landTM028", "#8c7a66", "landing_door", "TM028"),
      variant("landTM030", "#8a4a2b", "landing_door", "TM030"),
    ],
    replace: /^Landing_Door_/,
  },
  {
    id: "handrail",
    parts: [{ nodes: /^Handrail_[LR]/, role: "surface" }],
    options: [
      ...metals,
      { code: "none", swatch: "transparent", hide: true },
      variant("railFS001", "#cfcfd2", "handrail", "FS001"),
      variant("railFS002", "#c9a24a", "handrail", "FS002"),
      variant("railFS003", "#b9bbbf", "handrail", "FS003"),
      variant("railFS009", WOOD, "handrail", "FS009"),
    ],
    replace: /^Handrail_/,
  },
  {
    id: "cabinButtons",
    parts: [
      { nodes: /^COP_(Plate|Key|Btn_(\d|Close|Open)_Cap)$/, role: "surface" },
      { nodes: /^COP_Btn_(\d|Close|Open)_Ring$/, role: "light" },
    ],
    options: [
      ...buttons,
      variant("copInox", "#cfcfd2", "cop", "inox"),
      variant("copInoxBlue", "linear-gradient(135deg, #cfcfd2 55%, #59b6ff 55%)", "cop", "inox-blue"),
      variant("copBrass", "#c9a24a", "cop", "brass"),
      variant("copBlack", "#2b2b2d", "cop", "black"),
      variant("copRose", "#c58f7e", "cop", "rose"),
    ],
    replace: /^COP_/,
  },
  {
    id: "hallButtons",
    parts: [
      { nodes: /^Call_Plate$/, role: "surface" },
      { nodes: /^Call_Button_\d+$/, role: "light" },
    ],
    options: [
      ...buttons,
      variant("hallInox", "#cfcfd2", "hall", "inox"),
      variant("hallBrass", "#c9a24a", "hall", "brass"),
      variant("hallBlack", "#2b2b2d", "hall", "black"),
      variant("hallRose", "#c58f7e", "hall", "rose"),
    ],
    replace: /^(Call_|Hall_Lantern|Indicator_)/,
  },
  {
    id: "doorFrame",
    parts: [{ nodes: /^(Jamb_(L|R|Top)|Lift_Frame_[LRT])$/, role: "surface" }],
    // The lobby frame is black in the model, so every option names its colour explicitly.
    options: [
      ...metals.map((o) => (o.tint ? o : { ...o, tint: "#e2e2e6" })),
      variant("frameInox", "#cfcfd2", "frame", "inox"),
      variant("frameGold", "#c9a24a", "frame", "gold"),
      variant("frameBlack", "#2b2b2d", "frame", "black"),
      variant("frameBronze", "#a07a50", "frame", "bronze"),
      variant("frameWalnut", WOOD, "frame", "walnut"),
    ],
    replace: /^(Jamb_|Lift_Frame_)/,
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
      exterior: "inox", floor: "stoneWhite", ceiling: "lightNeutral", cabinWall: "inox", cabinDoor: "inox",
      landingDoor: "", handrail: "inox", cabinButtons: "btnInox", hallButtons: "btnInox", doorFrame: "inox",
    },
  },
  {
    code: "rose",
    swatches: ["#c58f7e", "#c8a77e", "#ffd9a0"],
    picks: {
      exterior: "rose", floor: "stoneWarm", ceiling: "lightWarm", cabinWall: "rose", cabinDoor: "rose",
      landingDoor: "", handrail: "rose", cabinButtons: "btnRose", hallButtons: "btnRose", doorFrame: "rose",
    },
  },
  {
    code: "bronze",
    swatches: ["#a07a50", "#3a3a3e", "#ffd9a0"],
    picks: {
      exterior: "bronze", floor: "stoneBlack", ceiling: "lightWarm", cabinWall: "bronze", cabinDoor: "bronze",
      landingDoor: "", handrail: "brass", cabinButtons: "btnBrass", hallButtons: "btnBrass", doorFrame: "bronze",
    },
  },
  {
    code: "champagne",
    swatches: ["#d8c39a", "#ecebe8", "#fff6ea"],
    picks: {
      exterior: "champagne", floor: "stoneWhite", ceiling: "lightNeutral", cabinWall: "champagne",
      cabinDoor: "champagne", landingDoor: "", handrail: "champagne", cabinButtons: "btnBrass",
      hallButtons: "btnBrass", doorFrame: "champagne",
    },
  },
  {
    code: "black",
    swatches: ["#2b2b2d", "#3a3a3e", "#d6e6ff"],
    picks: {
      exterior: "black", floor: "stoneBlack", ceiling: "lightCool", cabinWall: "black", cabinDoor: "black",
      landingDoor: "", handrail: "brass", cabinButtons: "btnBlack", hallButtons: "btnBlack", doorFrame: "black",
    },
  },
  // The templates below are built from finished 3D variants (wood grain, stone and etched mirror included).
  {
    code: "walnut",
    swatches: ["#7a4326", "#dfe1db", "#ffd9a0"],
    picks: {
      exterior: "bronze", floor: "floorDB030", ceiling: "ceilDD301", cabinWall: "wallWalnut", cabinDoor: "doorTM030",
      landingDoor: "landTM030", handrail: "railFS009", cabinButtons: "copBrass", hallButtons: "hallBrass", doorFrame: "frameWalnut",
    },
  },
  {
    code: "gold",
    swatches: ["#c9a24a", "#c2c7c8", "#b98a5c"],
    picks: {
      exterior: "brass", floor: "floorDB032", ceiling: "ceilDD303", cabinWall: "wallGold", cabinDoor: "doorTM019",
      landingDoor: "landTM019", handrail: "railFS002", cabinButtons: "copBrass", hallButtons: "hallBrass", doorFrame: "frameGold",
    },
  },
  {
    code: "mirror",
    swatches: ["#cfcfd2", "#bbbebb", "#d6e6ff"],
    picks: {
      exterior: "inox", floor: "floorDB004", ceiling: "ceilDD102", cabinWall: "wallMirrorEtched", cabinDoor: "doorTM004",
      landingDoor: "landTM004", handrail: "railFS003", cabinButtons: "copInoxBlue", hallButtons: "hallInox", doorFrame: "frameInox",
    },
  },
];

export type Selection = Record<Exclude<GroupId, "preset">, string>;

export const defaultSelection: Selection = presets[0].picks;

export const getGroup = (id: GroupId) => groups.find((g) => g.id === id);
