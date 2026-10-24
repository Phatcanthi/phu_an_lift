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

export type ViewId = "inside" | "lobby" | "room" | "angle" | "demo" | "panel";

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
  /** Photo of the finished model shown instead of the colour dot (public/images/options). */
  image?: string;
  /** Still a valid choice (presets, old links) but not offered in the panel. */
  hidden?: boolean;
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

/**
 * The catalogue photo of a variant (public/images/options, cut from D:/WorkSpace/PhuAnLift/image), by the
 * variant's folder and file code. Variants made for the site alone (plain finishes, wood walls) have none.
 */
const photo = (folder: string, file: string): string | undefined => {
  const name = ((): string | undefined => {
    switch (folder) {
      case "floor":
        return `floor/${file}`;
      case "ceiling":
      case "handrail":
        return `${folder}/KA-${file}`;
      case "cabin_door":
      case "landing_door":
        return `door/KA-${file}`;
      case "cop":
        return /^HCP/.test(file) ? `cop/KA-${file.replace(/A$/, "-A")}` : undefined;
      case "hall":
        if (file === "LOPW02") return "hall/LOP-W02";
        return /^HHP/.test(file) ? `hall/KA-${file}` : undefined;
    }
  })();
  return name && `/images/options/${name}.webp`;
};

/** Shorthand for a 3D variant option: the file is `<folder>/<folder>_<file>.glb`. */
const variant = (code: string, swatch: string, folder: string, file: string): Option => ({
  code,
  swatch,
  glb: `${folder}/${folder}_${file}.glb`,
  image: photo(folder, file),
});

/** Options that only recolour the model: kept so presets and old links still resolve, but not offered. */
const hidden = (options: Option[]): Option[] => options.map((o) => ({ ...o, hidden: true }));

/**
 * Finishes the customer can put on a chosen 3D style, as a multiplier on the style's own colour.
 * The colour belongs to the style's material; it is not a model of its own.
 */
export const finishes: Option[] = [
  { code: "finishOriginal", swatch: "#cfcfd2" },
  { code: "rose", swatch: "#c58f7e", tint: "#c58f7e" },
  { code: "bronze", swatch: "#a07a50", tint: "#a07a50" },
  { code: "champagne", swatch: "#d8c39a", tint: "#d8c39a" },
  { code: "brass", swatch: "#c9a24a", tint: "#c9a24a" },
  { code: "black", swatch: "#2b2b2d", tint: "#2b2b2d" },
];

/** Groups whose chosen 3D style can take a finish. */
export const finishGroups: Exclude<GroupId, "preset">[] = ["cabinDoor", "landingDoor", "handrail"];

export type FinishPicks = Partial<Record<Exclude<GroupId, "preset">, string>>;

/** Door styles of the second catalogue batch: code (the file is `<folder>_<code>.glb`) and swatch colour. */
const newDoors: [string, string][] = [
  ["TM005", "#d9b94a"], ["TM014", "#c8cacd"], ["TM017", "#e8e8ea"], ["TM020", "#b8babe"], ["TM021", "#d9b04a"],
  ["TM022", "#d9ac52"], ["TM023", "#c9a24a"], ["TM024", "#b87a6a"], ["TM025", "#e0a98a"], ["TM026", "#c8b980"],
  ["TM027", "#a8998a"], ["TM029", "#2b2d30"], ["TM031", "#d8b890"],
];

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
      ...hidden([
        { code: "stoneWhite", swatch: "#ecebe8" },
        { code: "stoneGrey", swatch: "#9a9ca0", tint: "#9a9ca0" },
        { code: "stoneBlack", swatch: "#3a3a3e", tint: "#4a4a4e" },
        { code: "stoneWarm", swatch: "#c8a77e", tint: "#c8a77e" },
        {
          code: "inlayGreen",
          swatch: "radial-gradient(circle, #ecebe4 0 36%, #1f5a45 39% 62%, #ecebe4 65%)",
          pattern: "inlay" as const,
        },
      ]),
      variant("floorDB002", "#adb2a7", "floor", "KA-DB002"),
      variant("floorDB004", "#bbbebb", "floor", "KA-DB004"),
      variant("floorDB013", "#9ca79e", "floor", "KA-DB013"),
      variant("floorDB030", "#dfe1db", "floor", "KA-DB030"),
      variant("floorDB032", "#c2c7c8", "floor", "KA-DB032"),
      variant("floorDB036", "#cdbca1", "floor", "KA-DB036"),
      variant("floorDB003", "#e9a58b", "floor", "KA-DB003"),
      variant("floorDB005", "#efe4cc", "floor", "KA-DB005"),
      variant("floorDB012", "#e8c9ae", "floor", "KA-DB012"),
      variant("floorDB014", "#e0864f", "floor", "KA-DB014"),
      variant("floorDB031", "#c9ccd0", "floor", "KA-DB031"),
      variant("floorDB033", "#c79872", "floor", "KA-DB033"),
      variant("floorDB035", "#6d6f72", "floor", "KA-DB035"),
      variant("floorDB037", "#e8dcb4", "floor", "KA-DB037"),
      variant("floorDB011", "#2f6b55", "floor", "KA-DB011"),
      variant("floorDB034", "#c9ccd0", "floor", "KA-DB034"),
    ],
    replace: /^Floor$/,
  },
  {
    id: "ceiling",
    parts: [{ nodes: /^(Ceiling_Panel_[LR]|Downlight_\d+)$/, role: "light" }],
    options: [
      ...hidden([
        { code: "lightNeutral", swatch: "#fff6ea" },
        { code: "lightWarm", swatch: "#ffd9a0", light: "#ffd9a0" },
        { code: "lightCool", swatch: "#d6e6ff", light: "#d6e6ff" },
      ]),
      variant("ceilDD101", "#cfcfd2", "ceiling", "DD101"),
      variant("ceilDD102", "#b4b6ba", "ceiling", "DD102"),
      variant("ceilDD201", "#2b2b30", "ceiling", "DD201"),
      variant("ceilDD301", WOOD, "ceiling", "DD301"),
      variant("ceilDD303", "#b98a5c", "ceiling", "DD303"),
      variant("ceilDD304", "#d9a08e", "ceiling", "DD304"),
      variant("ceilDD103", "#b4b6ba", "ceiling", "DD103"),
      variant("ceilDD105", "#b4b6ba", "ceiling", "DD105"),
      variant("ceilDD202", "#f4f4f4", "ceiling", "DD202"),
      variant("ceilDD203", "#cfcfd2", "ceiling", "DD203"),
      variant("ceilDD302", WOOD, "ceiling", "DD302"),
      variant("ceilDD501", "#cfcfd2", "ceiling", "DD501"),
      variant("ceilDD502", "#d4d4d8", "ceiling", "DD502"),
      variant("ceilDD011", "#d8d8dc", "ceiling", "DD011"),
      variant("ceilDD021", "#c4c6ca", "ceiling", "DD021"),
      variant("ceilDD024", "#2b2b2d", "ceiling", "DD024"),
      variant("ceilDD005", "#cfcfd2", "ceiling", "DD005"),
      variant("ceilDD022", "#c4c6ca", "ceiling", "DD022"),
      variant("ceilDD023", "#cfcfd2", "ceiling", "DD023"),
    ],
    // a ceiling file names every node Ceiling_* or Downlight_* (tools/blender/build_ceilings.py)
    replace: /^(Ceiling_|Downlight_)/,
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
    // a leaf with several materials (inlays, reliefs) loads as a group with child meshes Car_Door_L_1, _2, ...
    parts: [{ nodes: /^(Car_Door_[LR](_\d+)?|Door_Sill)$/, role: "surface" }],
    options: [
      ...hidden(metals),
      variant("doorTM004", "#8f9195", "cabin_door", "TM004"),
      variant("doorTM013", "#b9bcc0", "cabin_door", "TM013"),
      variant("doorTM019", "#d9b94a", "cabin_door", "TM019"),
      variant("doorTM028", "#8c7a66", "cabin_door", "TM028"),
      variant("doorTM030", "#8a4a2b", "cabin_door", "TM030"),
      ...newDoors.map(([c, sw]) => variant(`door${c}`, sw, "cabin_door", c)),
    ],
    replace: /^(Car_Door_[LR]|Door_Sill)/,
  },
  // The room model has no landing doors of its own: they only exist as variants, so the first option shows none.
  {
    id: "landingDoor",
    parts: [{ nodes: /^Landing_Door_[LR](_\d+)?$/, role: "surface" }],
    options: [
      { code: "landingNone", swatch: "transparent", hide: true },
      variant("landTM004", "#8f9195", "landing_door", "TM004"),
      variant("landTM013", "#b9bcc0", "landing_door", "TM013"),
      variant("landTM019", "#d9b94a", "landing_door", "TM019"),
      variant("landTM028", "#8c7a66", "landing_door", "TM028"),
      variant("landTM030", "#8a4a2b", "landing_door", "TM030"),
      ...newDoors.map(([c, sw]) => variant(`land${c}`, sw, "landing_door", c)),
    ],
    replace: /^Landing_Door_/,
  },
  {
    id: "handrail",
    parts: [{ nodes: /^Handrail_[LR]/, role: "surface" }],
    options: [
      ...hidden(metals),
      { code: "none", swatch: "transparent", hide: true },
      variant("railFS001", "#cfcfd2", "handrail", "FS001"),
      variant("railFS002", "#c9a24a", "handrail", "FS002"),
      variant("railFS003", "#b9bbbf", "handrail", "FS003"),
      variant("railFS009", WOOD, "handrail", "FS009"),
      variant("railFS005", "#d7d8dc", "handrail", "FS005"),
      variant("railFS008", "#d7d8dc", "handrail", "FS008"),
      variant("railFS010", "#c9a24a", "handrail", "FS010"),
      variant("railFS013", "#c9a24a", "handrail", "FS013"),
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
      // modelled on the catalogue panels
      variant("copHCP411", "linear-gradient(135deg, #cfcfd2 60%, #17171a 60%)", "cop", "HCP411"),
      variant("copHCP10", "#cfcfd2", "cop", "HCP10"),
      variant("copHCP12", "linear-gradient(135deg, #cfcfd2 55%, #1a7fd6 55%)", "cop", "HCP12"),
      variant("copHCP411A", "linear-gradient(135deg, #d9d9dc 60%, #17171a 60%)", "cop", "HCP411A"),
      variant("copHCP29", "#a8a9ad", "cop", "HCP29"),
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
      // modelled on the catalogue panels
      variant("hallLOPW02", "linear-gradient(135deg, #17171a 50%, #cfcfd2 50%)", "hall", "LOPW02"),
      variant("hallHHP811", "linear-gradient(135deg, #17171a 50%, #d4d5d8 50%)", "hall", "HHP811"),
      variant("hallHHP12", "linear-gradient(135deg, #1a7fd6 50%, #cfcfd2 50%)", "hall", "HHP12"),
      variant("hallHHP29", "linear-gradient(135deg, #8d9094 50%, #b9bbbf 50%)", "hall", "HHP29"),
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
      exterior: "inox", floor: "floorDB030", ceiling: "ceilDD101", cabinWall: "inox", cabinDoor: "doorTM004",
      landingDoor: "", handrail: "railFS001", cabinButtons: "btnInox", hallButtons: "btnInox", doorFrame: "inox",
    },
  },
  {
    code: "rose",
    swatches: ["#c58f7e", "#c8a77e", "#ffd9a0"],
    picks: {
      exterior: "rose", floor: "floorDB036", ceiling: "ceilDD304", cabinWall: "rose", cabinDoor: "doorTM028",
      landingDoor: "", handrail: "railFS003", cabinButtons: "btnRose", hallButtons: "btnRose", doorFrame: "rose",
    },
  },
  {
    code: "bronze",
    swatches: ["#a07a50", "#3a3a3e", "#ffd9a0"],
    picks: {
      exterior: "bronze", floor: "floorDB002", ceiling: "ceilDD303", cabinWall: "bronze", cabinDoor: "doorTM030",
      landingDoor: "", handrail: "railFS002", cabinButtons: "btnBrass", hallButtons: "btnBrass", doorFrame: "bronze",
    },
  },
  {
    code: "champagne",
    swatches: ["#d8c39a", "#ecebe8", "#fff6ea"],
    picks: {
      exterior: "champagne", floor: "floorDB036", ceiling: "ceilDD303", cabinWall: "champagne",
      cabinDoor: "doorTM013", landingDoor: "", handrail: "railFS002", cabinButtons: "btnBrass",
      hallButtons: "btnBrass", doorFrame: "champagne",
    },
  },
  {
    code: "black",
    swatches: ["#2b2b2d", "#3a3a3e", "#d6e6ff"],
    picks: {
      exterior: "black", floor: "floorDB013", ceiling: "ceilDD201", cabinWall: "black", cabinDoor: "doorTM004",
      landingDoor: "", handrail: "railFS003", cabinButtons: "btnBlack", hallButtons: "btnBlack", doorFrame: "black",
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
