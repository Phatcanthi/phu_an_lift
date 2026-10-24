"""
Build the catalogue button panels as real 3D models and export them for the website:
car operating panels (frontend/public/models/variants/cop/cop_<code>.glb) and landing call panels
(frontend/public/models/variants/hall/hall_<code>.glb).

Why: the earlier panel files put the catalogue picture on a flat plate and on the button caps, so the
numbers, the display and the supplier's logo were all part of a photo. Here every panel is modelled from
the catalogue (D:/WorkSpace/PhuAnLift/image/cop_buttons): a bevelled plate, glass display windows with
glowing seven-segment or dot-matrix digits, turned buttons with a lit ring and raised numerals, speaker
slots, camera dome and service cabinet. No brand or logo is drawn.

How to run (Blender 4.2+ / 5.x, no scene needed):
  blender -b --python tools/blender/build_panels.py                       # every panel
  blender -b --python tools/blender/build_panels.py -- HCP12 HHP811       # some of them
  blender -b --python tools/blender/build_panels.py -- --preview <dir>    # also render a PNG each

Coordinates: each panel is drawn as seen by the person using it, (a, b) in metres: a to their right
from the panel's centre line, b up from the cabin floor; h is how far a part stands proud of the plate.
The frames below turn that into the room model's coordinates, so text is never mirrored.

Node names match the room model: COP_* (cabin buttons) and Call_*, Hall_Lantern*, Indicator_* (landing
buttons, the lantern over the landing door and the floor indicator over the car door inside the cabin).
"""

import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import (  # noqa: E402  (Blender runs this file directly, so its folder goes on the path first)
    Mats, VARIANTS, box, ellipse, export, link, material, prism, prisms, rect, render_preview, reset, ribbon,
    uv_and_shade,
)

# The cabin panel sits on the right front return, its face 0.792 m from the cabin centre towards the door;
# the user inside looks towards +z (glTF), so their right is -x.
COP_X = 0.575


def cop_frame(a, b, h):
    return (COP_X - a, -0.792 + h, b)  # Blender (x, y, z); glTF z = -y


# The landing panel is in the lobby wall beside the door, its face at z 1.125; the user looks towards -z.
HALL_X = 0.6


def hall_frame(a, b, h):
    return (HALL_X + a, -1.125 - h, b)


def lantern_frame(a, b, h):
    return (a, -1.12 - h, b)


# The floor indicator over the car door, inside the cabin (face at z 0.8, read from inside).
def indicator_frame(a, b, h):
    return (-a, -0.8 + h, b)


def palette(code):
    p = lambda role: f"Panel_{code}_{role}"
    return {
        "hairline": lambda: material(p("Hairline"), (0.74, 0.74, 0.76), 1.0, 0.35, brushed=True),
        "satin": lambda: material(p("Satin"), (0.86, 0.86, 0.88), 1.0, 0.18),
        "frost": lambda: material(p("Frost"), (0.8, 0.81, 0.83), 1.0, 0.5),
        "chrome": lambda: material(p("Chrome"), (0.95, 0.95, 0.96), 1.0, 0.08),
        "glass": lambda: material(p("BlackGlass"), (0.012, 0.012, 0.014), 0.0, 0.05, coat=1.0),
        "greyGlass": lambda: material(p("GreyGlass"), (0.32, 0.33, 0.35), 0.4, 0.12, coat=1.0),
        "frame": lambda: material(p("Frame"), (0.05, 0.05, 0.055), 1.0, 0.3),
        "label": lambda: material(p("Label"), (0.03, 0.03, 0.035), 0.3, 0.45),
        "slot": lambda: material(p("Slot"), (0.01, 0.01, 0.012), 0.0, 0.8),
        "dome": lambda: material(p("CameraDome"), (0.93, 0.93, 0.9), 0.0, 0.15, coat=0.8),
        "ring": lambda: material(p("ButtonRing"), (1.0, 0.92, 0.78), 0.0, 0.4, emission=(1.0, 0.9, 0.74), strength=2.5),
        "alarm": lambda: material(p("AlarmYellow"), (0.95, 0.72, 0.08), 0.2, 0.35, emission=(1.0, 0.72, 0.1), strength=0.8),
        "digit": lambda: material(p("DisplayDigit"), (1.0, 1.0, 1.0), 0.0, 0.3, emission=(1.0, 0.98, 0.95), strength=4.0),
        "amber": lambda: material(p("DisplayAmber"), (1.0, 0.7, 0.3), 0.0, 0.3, emission=(1.0, 0.62, 0.22), strength=4.0),
        "lcd": lambda: material(p("BlueLCD"), (0.05, 0.42, 0.85), 0.0, 0.2, emission=(0.06, 0.45, 0.95), strength=1.6),
        "tft": lambda: material(p("ScreenTFT"), (0.1, 0.16, 0.24), 0.0, 0.2, emission=(0.12, 0.2, 0.32), strength=1.2),
    }


# ---------------------------------------------------------------- shapes

SEGMENTS = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc",
    "7": "abc", "8": "abcdefg", "9": "abcdfg",
}


def seven_segment(text, ca, cb, h, w=None):
    """Outlines of seven-segment digits (slightly slanted), centred on (ca, cb), h tall."""
    w = w or h * 0.52
    t = h * 0.13
    gap = t * 0.18
    slant = h * 0.08
    polys = []
    step = w + t * 1.6
    x0 = ca - (len(text) - 1) * step / 2
    for i, ch in enumerate(text):
        cx = x0 + i * step
        top, mid, bot = cb + h / 2, cb, cb - h / 2
        left, right = cx - w / 2, cx + w / 2

        def bar(p, q):
            (x1, y1), (x2, y2) = p, q
            horiz = abs(y1 - y2) < 1e-9
            if horiz:
                x1, x2 = x1 + gap, x2 - gap
                pts = [(x1, y1), (x1 + t / 2, y1 + t / 2), (x2 - t / 2, y1 + t / 2), (x2, y1), (x2 - t / 2, y1 - t / 2), (x1 + t / 2, y1 - t / 2)]
            else:
                y1, y2 = y1 - gap, y2 + gap  # y1 is the upper end
                pts = [(x1, y1), (x1 + t / 2, y1 - t / 2), (x1 + t / 2, y2 + t / 2), (x1, y2), (x1 - t / 2, y2 + t / 2), (x1 - t / 2, y1 - t / 2)]
            return [(x + (y - cb) / h * slant, y) for x, y in pts]

        segs = {
            "a": ((left, top), (right, top)), "g": ((left, mid), (right, mid)), "d": ((left, bot), (right, bot)),
            "f": ((left, top), (left, mid)), "b": ((right, top), (right, mid)),
            "e": ((left, mid), (left, bot)), "c": ((right, mid), (right, bot)),
        }
        for s in SEGMENTS[ch]:
            polys.append(bar(*segs[s]))
    return polys


def arrow(ca, cb, size, up=True):
    """A lift direction arrow: a pointed head with a notch underneath."""
    s = size if up else -size
    return [(ca, cb + s * 0.5), (ca + size * 0.42, cb - s * 0.35), (ca, cb - s * 0.12), (ca - size * 0.42, cb - s * 0.35)]


def call_arrow(ca, cb, size, up=True):
    """The arrow engraved on a call button: head and stem."""
    s = 1 if up else -1
    pts = [(0, 0.5), (0.42, 0.05), (0.14, 0.05), (0.14, -0.5), (-0.14, -0.5), (-0.14, 0.05), (-0.42, 0.05)]
    return [(ca + x * size, cb + s * y * size) for x, y in pts]


DOTS = {
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "up": ["..#..", ".###.", "#.#.#", "..#..", "..#..", "..#..", "..#.."],
}


def dot_matrix(key, ca, cb, pitch):
    rows = DOTS[key]
    out = []
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch == "#":
                out.append(rect(ca + (c - 2) * pitch, cb + (3 - r) * pitch, pitch * 0.72, pitch * 0.72, r=pitch * 0.2, seg=2))
    return out


def open_close(ca, cb, size, opening):
    """The door open (<|>) or close (>|<) symbol."""
    s = size
    tri = lambda x, d: [(x, cb), (x + d * s * 0.42, cb + s * 0.42), (x + d * s * 0.42, cb - s * 0.42)]
    bar = rect(ca, cb, s * 0.1, s * 0.95)
    if opening:
        return [tri(ca - s * 0.95, 1), tri(ca + s * 0.95, -1), bar]
    return [tri(ca - s * 0.12, -1), tri(ca + s * 0.12, 1), bar]


def bell(ca, cb, s):
    """Alarm bell outline."""
    pts = [(-0.5, -0.35), (-0.38, -0.2), (-0.36, 0.15), (-0.2, 0.38), (0, 0.45), (0.2, 0.38), (0.36, 0.15),
           (0.38, -0.2), (0.5, -0.35)]
    return [(ca + x * s, cb + y * s) for x, y in pts]


# ---------------------------------------------------------------- parts

class Panel:
    def __init__(self, mats, frame):
        self.m = mats
        self.frame = frame

    def solid(self, name, poly, h0, h1, mat, holes=(), bevel=0.0008, vertical=True):
        return prism(name, poly, h0, h1, self.m[mat], holes=holes, bevel_width=bevel, frame=self.frame, vertical=vertical)

    def many(self, name, polys, h0, h1, mat, bevel=0.0002):
        return prisms(name, polys, h0, h1, self.m[mat], bevel_width=bevel, frame=self.frame)

    def turned(self, name, profile, ca, cb, mat, seg=36):
        """A round part (button cap, ring, dome) turned from a (radius, h) profile, standing on the face."""
        bm = bmesh.new()
        rings = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            rings.append([bm.verts.new(self.frame(ca + r * math.cos(t), cb + r * math.sin(t), h)) for r, h in profile])
        for k in range(seg):
            a, b = rings[k], rings[(k + 1) % seg]
            for i in range(len(profile) - 1):
                bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        obj = link(name, mesh, [self.m[mat]])
        uv_and_shade(obj.data, smooth_angle=50)
        return obj

    def text(self, name, body, size, ca, cb, h0, depth, mat):
        """Raised lettering from Blender's built-in font."""
        cu = bpy.data.curves.new(name, "FONT")
        cu.body = body
        cu.size = size
        cu.extrude = depth / 2
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        tmp = bpy.data.objects.new(name + "_tmp", cu)
        bpy.context.scene.collection.objects.link(tmp)
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
        bpy.data.objects.remove(tmp)
        bpy.data.curves.remove(cu)
        for v in mesh.vertices:
            x, y, z = v.co
            v.co = self.frame(ca + x, cb + y, h0 + depth / 2 + z)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        obj = link(name, mesh, [self.m[mat]])
        uv_and_shade(obj.data, smooth_angle=30)
        return obj

    def button(self, prefix, ca, cb, r, label=None, symbol=None, cap="satin", ring="ring", label_mat="label"):
        """A push button: a lit ring flush with the plate and a slightly domed cap with raised marking."""
        self.turned(prefix + "_Ring", [(r * 0.86, 0.0), (r * 0.86, 0.0012), (r, 0.0012), (r, 0.0)], ca, cb, ring)
        rc = r * 0.82
        self.turned(prefix + "_Cap", [(0.0, 0.0042), (rc * 0.6, 0.004), (rc * 0.9, 0.0033), (rc, 0.0022), (rc, 0.0)],
                    ca, cb, cap)
        if label:
            self.text(prefix + "_Label", label, rc * 0.95, ca, cb - rc * 0.03, 0.0036, 0.0008, label_mat)
        if symbol:
            self.many(prefix + "_Label", symbol, 0.0034, 0.0044, label_mat)


# ---------------------------------------------------------------- cabin operating panels

def cop_plate(p, w, top_round, mat):
    """The plate on the front return, 0.84 .. 1.66 m, with gently arched ends when `top_round`."""
    b0, b1 = 0.84, 1.66
    if top_round:
        n = 16
        rise = 0.012
        top = [(w / 2 - w * i / n, b1 - rise + rise * math.sin(math.pi * i / n)) for i in range(n + 1)]
        bottom = [(-w / 2 + w * i / n, b0 + rise - rise * math.sin(math.pi * i / n)) for i in range(n + 1)]
        outline = bottom + top
    else:
        outline = rect(0, (b0 + b1) / 2, w, b1 - b0, r=0.004)
    p.solid("COP_Plate", outline, -0.008, 0.0, mat, bevel=0.0015)


def cop_cabinet(p, w, b0, b1, mat):
    """The service cabinet door at the bottom: a fine joint line and a key lock."""
    p.many("COP_Cabinet_Joint", [ribbon(rect(0, (b0 + b1) / 2, w, b1 - b0) + [rect(0, (b0 + b1) / 2, w, b1 - b0)[0]], 0.0012)],
           -0.0004, 0.0001, "slot", bevel=0)
    p.turned("COP_Key", [(0.0, 0.0028), (0.006, 0.0028), (0.0075, 0.002), (0.0075, 0.0)], 0, b0 + 0.03, "chrome")
    p.many("COP_Key_Slot", [rect(0, b0 + 0.03, 0.0012, 0.007)], 0.0028, 0.0031, "slot", bevel=0)


def cop_speaker(p, b, kind):
    if kind == "slots":
        slots = [rect(sa * 0.022, b + i * 0.007, 0.034, 0.0028, r=0.0014) for sa in (-1, 1) for i in range(4)]
    else:
        slots = [ellipse(sa * 0.03 + (j - 2) * 0.0045, b, 0.0011, 0.0011, n=10) for sa in (-1, 1) for j in range(5)]
    p.many("COP_Speaker", slots, -0.0004, 0.0001, "slot", bevel=0)


def cop_keypad(p, rows, cols, b_top, pitch_a, pitch_b, r, cap="satin", oc_row=True):
    """Floor buttons numbered from the bottom left, an open/close row at the bottom, alarm above."""
    floor = 1
    for row in range(rows):
        b = b_top - (rows - 1 - row) * pitch_b
        for c in range(cols):
            a = (c - (cols - 1) / 2) * pitch_a
            if oc_row and row == 0:
                if c in (0, cols - 1):
                    opening = c == 0
                    p.button(f"COP_Btn_{'Open' if opening else 'Close'}", a, b, r,
                             symbol=open_close(a, b, r * 0.42, opening), cap=cap)
                continue
            p.button(f"COP_Btn_{floor}", a, b, r, label=str(floor), cap=cap)
            floor += 1


def cop_alarm(p, b, r):
    p.button("COP_Btn_Alarm", 0, b, r, symbol=[bell(0, b, r * 0.9)], cap="satin", ring="alarm", label_mat="alarm")


def cop_info(p, b, mat):
    p.text("COP_Info_Load", "1000 KG", 0.0055, -0.012, b, 0.0016, 0.0002, mat)
    p.text("COP_Info_People", "13 P", 0.0055, 0.022, b, 0.0016, 0.0002, mat)


def hcp10(p):
    """Hairline steel, arched ends, black display with a white arrow and floor digit."""
    w = 0.12
    cop_plate(p, w, True, "hairline")
    p.solid("COP_Display", rect(0, 1.52, 0.07, 0.17, r=0.004), 0.0, 0.0015, "glass")
    p.many("COP_Display_Arrow", [arrow(0, 1.575, 0.022)], 0.0015, 0.0017, "digit", bevel=0)
    p.many("COP_Display_Digit", seven_segment("2", 0, 1.525, 0.032), 0.0015, 0.0017, "digit", bevel=0)
    cop_info(p, 1.465, "digit")
    cop_speaker(p, 1.39, "slots")
    p.turned("COP_Camera", [(0.0, 0.006), (0.005, 0.0052), (0.0085, 0.0025), (0.0095, 0.0)], 0, 1.355, "dome")
    cop_alarm(p, 1.31, 0.014)
    cop_keypad(p, 7, 2, 1.26, 0.04, 0.036, 0.014)
    cop_cabinet(p, 0.07, 0.87, 0.98, "hairline")


def hcp12(p):
    """Hairline steel, arched ends, a large blue LCD with a white arrow and floor number."""
    w = 0.12
    cop_plate(p, w, True, "hairline")
    p.solid("COP_Display_Frame", rect(0, 1.52, 0.076, 0.18, r=0.004), 0.0, 0.0012, "glass")
    p.solid("COP_Display", rect(0, 1.545, 0.062, 0.115, r=0.002), 0.0012, 0.0016, "lcd", bevel=0)
    p.many("COP_Display_Arrow", [arrow(0, 1.582, 0.03)], 0.0016, 0.0018, "digit", bevel=0)
    p.text("COP_Display_Digit", "12", 0.036, 0, 1.533, 0.0016, 0.0002, "digit")
    p.text("COP_Display_Text", "FULL STOP", 0.0068, 0, 1.5, 0.0016, 0.0002, "digit")
    cop_info(p, 1.455, "digit")
    cop_speaker(p, 1.39, "slots")
    p.turned("COP_Camera", [(0.0, 0.006), (0.005, 0.0052), (0.0085, 0.0025), (0.0095, 0.0)], 0, 1.355, "dome")
    cop_alarm(p, 1.31, 0.014)
    cop_keypad(p, 7, 2, 1.26, 0.04, 0.036, 0.014, cap="chrome")
    cop_cabinet(p, 0.075, 0.87, 0.98, "hairline")


def hcp29(p):
    """Wide polished steel panel, a small colour screen and three columns of buttons."""
    w = 0.15
    cop_plate(p, w, False, "satin")
    p.solid("COP_Display_Frame", rect(0, 1.5, 0.084, 0.056, r=0.003), 0.0, 0.0012, "glass")
    p.solid("COP_Display", rect(0, 1.5, 0.076, 0.048, r=0.002), 0.0012, 0.0015, "tft", bevel=0)
    p.many("COP_Display_Arrow", [arrow(-0.026, 1.508, 0.014)], 0.0015, 0.0017, "digit", bevel=0)
    p.many("COP_Display_Digit", seven_segment("26", -0.022, 1.488, 0.013), 0.0015, 0.0017, "digit", bevel=0)
    p.many("COP_Display_Panel", [rect(0.016, 1.5, 0.038, 0.036, r=0.002)], 0.0015, 0.0016, "greyGlass", bevel=0)
    cop_info(p, 1.455, "label")
    cop_speaker(p, 1.43, "dots")
    p.turned("COP_Camera", [(0.0, 0.005), (0.004, 0.0043), (0.007, 0.002), (0.008, 0.0)], 0, 1.4, "dome")
    p.button("COP_Btn_Alarm", -0.036, 1.18, 0.012, symbol=[bell(-0.036, 1.18, 0.011)], ring="alarm", label_mat="alarm")
    floor = 1
    for row in range(5):
        b = 1.18 + row * 0.033
        for c in range(3):
            a = (c - 1) * 0.036
            if row == 0 and c == 0:
                continue  # the alarm sits here
            if row == 0 and c in (1, 2):
                p.button(f"COP_Btn_{'Open' if c == 1 else 'Close'}", a, b, 0.012,
                         symbol=open_close(a, b, 0.005, c == 1))
                continue
            p.button(f"COP_Btn_{floor}", a, b, 0.012, label=str(floor))
            floor += 1
    cop_cabinet(p, 0.07, 0.9, 1.02, "satin")


def hcp411(p, finish="hairline"):
    """Black glass head with the display, hairline steel below with two columns of buttons."""
    w = 0.118
    cop_plate(p, w, False, finish)
    p.solid("COP_Display", rect(0, 1.555, w - 0.002, 0.21, r=0.003), 0.0, 0.0018, "glass", bevel=0.001)
    p.many("COP_Display_Arrow", [arrow(0, 1.6, 0.018)], 0.0018, 0.002, "digit", bevel=0)
    p.many("COP_Display_Digit", seven_segment("2", 0, 1.56, 0.03), 0.0018, 0.002, "digit", bevel=0)
    cop_info(p, 1.49, "digit")
    cop_speaker(p, 1.43, "dots")
    p.turned("COP_Camera", [(0.0, 0.006), (0.005, 0.0052), (0.0085, 0.0025), (0.0095, 0.0)], 0, 1.395, "dome")
    cop_alarm(p, 1.35, 0.013)
    cop_keypad(p, 7, 2, 1.3, 0.038, 0.035, 0.013)
    cop_cabinet(p, 0.075, 0.87, 0.99, finish)


def hcp411a(p):
    """As HCP411 on sand-blasted steel."""
    hcp411(p, "frost")


# ---------------------------------------------------------------- landing panels

def lantern_and_indicator(m, display):
    """The lantern over the landing door and the floor indicator over the car door inside the cabin."""
    lp = Panel(m, lantern_frame)
    lp.solid("Hall_Lantern", rect(0, 2.32, 0.24, 0.08, r=0.004), 0.0, 0.015, "hairline", bevel=0.002)
    lp.many("Hall_Lantern_Glow", [arrow(0, 2.322, 0.034)], 0.015, 0.018, display, bevel=0)
    ip = Panel(m, indicator_frame)
    ip.solid("Indicator_Glass", rect(0, 2.25, 0.2, 0.07, r=0.003), 0.0, 0.004, "glass", bevel=0.001)
    ip.many("Indicator_Arrow", [arrow(-0.035, 2.252, 0.022)], 0.004, 0.0045, display, bevel=0)
    ip.many("Indicator_Digit", seven_segment("1", 0.03, 2.25, 0.032), 0.004, 0.0045, display, bevel=0)


def call_buttons(p, b_up, b_down, r, cap="satin"):
    for i, (b, up) in enumerate(((b_up, True), (b_down, False))):
        name = f"Call_Button_{i + 1}"
        p.turned(name, [(r * 0.86, 0.0), (r * 0.86, 0.0014), (r, 0.0014), (r, 0.0)], 0, b, "ring")
        rc = r * 0.82
        p.turned(name + "_Cap", [(0.0, 0.0045), (rc * 0.6, 0.0043), (rc * 0.9, 0.0035), (rc, 0.0023), (rc, 0.0)], 0, b, cap)
        p.many(name + "_Arrow", [call_arrow(0, b, rc * 0.9, up)], 0.0036, 0.0047, "label")


def hhp12(p):
    """Hairline steel with an arched top, blue LCD, two call buttons and a key switch."""
    w = 0.078
    n = 16
    top = [(w / 2 - w * i / n, 1.24 + 0.01 * math.sin(math.pi * i / n)) for i in range(n + 1)]
    p.solid("Call_Plate", [(-w / 2, 1.0), (w / 2, 1.0)] + top, -0.005, 0.0, "hairline", bevel=0.0015)
    p.solid("Call_Display", rect(0, 1.18, 0.058, 0.095, r=0.002), 0.0, 0.0016, "lcd", bevel=0.0005)
    p.many("Call_Display_Arrow", [arrow(0, 1.205, 0.026)], 0.0016, 0.0018, "digit", bevel=0)
    p.text("Call_Display_Digit", "12", 0.03, 0, 1.17, 0.0016, 0.0002, "digit")
    p.text("Call_Display_Text", "FULL STOP", 0.0062, 0, 1.143, 0.0016, 0.0002, "digit")
    call_buttons(p, 1.103, 1.068, 0.014, cap="chrome")
    p.turned("Call_Key", [(0.0, 0.003), (0.008, 0.003), (0.0095, 0.002), (0.0095, 0.0)], 0, 1.03, "chrome")
    p.many("Call_Key_Slot", [rect(0, 1.03, 0.0014, 0.009)], 0.003, 0.0034, "slot", bevel=0)


def hhp29(p):
    """Dark-framed panel: grey glass head with a dot-matrix arrow and floor, hairline steel below."""
    w = 0.08
    p.solid("Call_Plate", rect(0, 1.125, w, 0.25, r=0.006), -0.005, 0.0, "frame", bevel=0.0015)
    p.solid("Call_Display", rect(0, 1.19, w - 0.006, 0.11, r=0.004), 0.0, 0.0012, "greyGlass", bevel=0.0005)
    p.many("Call_Display_Arrow", dot_matrix("up", 0, 1.218, 0.0032), 0.0012, 0.0014, "digit", bevel=0)
    p.many("Call_Display_Digit", dot_matrix("1", 0, 1.165, 0.0032), 0.0012, 0.0014, "digit", bevel=0)
    p.solid("Call_Plate_Lower", rect(0, 1.066, w - 0.006, 0.124, r=0.004), 0.0, 0.0008, "hairline", bevel=0.0004)
    call_buttons(p, 1.092, 1.04, 0.015)


def hhp811(p):
    """Black glass head with a white arrow and seven-segment floor, satin steel below."""
    w = 0.072
    p.solid("Call_Plate", rect(0, 1.125, w, 0.25, r=0.004), -0.005, 0.0, "satin", bevel=0.0015)
    p.solid("Call_Display", rect(0, 1.188, w, 0.124, r=0.004), 0.0, 0.0015, "glass", bevel=0.0008)
    p.many("Call_Display_Arrow", [arrow(0, 1.222, 0.02)], 0.0015, 0.0017, "digit", bevel=0)
    p.many("Call_Display_Digit", seven_segment("6", 0, 1.18, 0.032), 0.0015, 0.0017, "digit", bevel=0)
    call_buttons(p, 1.09, 1.04, 0.014)


def lopw02(p):
    """Rounded satin panel with a black glass head, a white arrow and two-digit floor."""
    w = 0.072
    p.solid("Call_Plate", rect(0, 1.125, w, 0.25, r=0.012), -0.005, 0.0, "satin", bevel=0.002)
    p.solid("Call_Display", rect(0, 1.19, w - 0.006, 0.112, r=0.009), 0.0, 0.0015, "glass", bevel=0.0008)
    p.many("Call_Display_Arrow", [arrow(0, 1.222, 0.02)], 0.0015, 0.0017, "digit", bevel=0)
    p.many("Call_Display_Digit", seven_segment("12", 0, 1.178, 0.028), 0.0015, 0.0017, "digit", bevel=0)
    call_buttons(p, 1.09, 1.042, 0.014, cap="chrome")


COP = {"HCP10": hcp10, "HCP12": hcp12, "HCP29": hcp29, "HCP411": hcp411, "HCP411A": hcp411a}
HALL = {"HHP12": (hhp12, "digit"), "HHP29": (hhp29, "digit"), "HHP811": (hhp811, "digit"), "LOPW02": (lopw02, "digit")}


def build(code):
    reset()
    m = Mats(palette(code))
    if code in COP:
        COP[code](Panel(m, cop_frame))
        out = os.path.join(VARIANTS, "cop", f"cop_{code}.glb")
        view = ((COP_X, -0.25, 1.25), (math.radians(90), 0, math.radians(180)), 22)
    else:
        fn, display = HALL[code]
        fn(Panel(m, hall_frame))
        lantern_and_indicator(m, display)
        out = os.path.join(VARIANTS, "hall", f"hall_{code}.glb")
        view = ((HALL_X, -1.62, 1.125), (math.radians(90), 0, 0), 60)
    export(out)
    print(f"[panel] {code}: {len(bpy.context.scene.objects)} objects -> {out}", flush=True)
    return view


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    preview_dir = None
    if "--preview" in argv:
        i = argv.index("--preview")
        preview_dir = argv[i + 1]
        del argv[i:i + 2]
    for code in argv or [*COP, *HALL]:
        loc, rot, lens = build(code)
        if preview_dir:
            render_preview(os.path.join(preview_dir, f"{code}.png"), loc, rot, lens, size=(400, 900),
                           fill=(loc[0], (loc[1] + (-0.792 if code in COP else -1.125)) / 2, loc[2] + 0.3))


main()
