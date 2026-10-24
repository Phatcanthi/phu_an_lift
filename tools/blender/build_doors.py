"""
Build the car (cabin) and landing door variants as real 3D models and export them for the website
(frontend/public/models/variants/cabin_door/cabin_door_<code>.glb and landing_door/landing_door_<code>.glb).

Why: the earlier door files were plain boxes wearing the catalogue picture as their colour map, so the
mirror strips, inlays, columns, arches and lattices were painted on and caught no light. Here each pattern
from the catalogue (D:/WorkSpace/PhuAnLift/image/door) is geometry standing proud of the door face, in its
own metal, with bevelled edges, so the cabin lights pick out its relief as the camera moves.

How to run (Blender 4.2+ / 5.x, no scene needed):
  blender -b --python tools/blender/build_doors.py                        # every door
  blender -b --python tools/blender/build_doors.py -- TM004 TM019         # some of them
  blender -b --python tools/blender/build_doors.py -- --preview <dir>     # also render a PNG each

Coordinates: designs are written on the closed door seen from the front, (u, v) in metres: u across the
doorway (-0.457 .. 0.457, the two leaves meet at 0 with an 8 mm gap), v up from the floor. Parts that cross
the middle are cut in two. Each leaf is exported open, as the configurator expects: the node sits 0.45 m out
to the side and slides 0.448 m to close (see DOOR_SLIDE in components/configurator/model.ts).

Node names match the room model: Car_Door_L/R and Door_Sill(_Groove_1/2) in the cabin door file,
Landing_Door_L/R in the landing door file. A leaf with several materials loads as a group of that name.
"""

import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import (  # noqa: E402  (Blender runs this file directly, so its folder goes on the path first)
    Mats, arc, box, ellipse, export, face, link, material, prism, prisms, rect, render_preview, reset, ribbon,
    uv_and_shade, VARIANTS,
)

HALF_W = 0.457  # outer edge of a closed leaf
GAP = 0.004  # half the gap between the closed leaves
OPEN = 0.45  # how far each leaf node sits from the middle in the exported (open) position
SHIFT = 0.002  # closed leaf position: OPEN - 0.448

KINDS = {
    # cabin side of the car door faces into the cabin (+Y in Blender); the leaf is 2.4 cm thick behind it
    "cabin": dict(folder="cabin_door", node="Car_Door", y=-0.863, out=1, thick=0.024, height=2.12),
    # lobby side of the landing door faces out of the shaft (-Y in Blender)
    "landing": dict(folder="landing_door", node="Landing_Door", y=-1.115, out=-1, thick=0.025, height=2.10),
}


def palette(code, kind):
    p = lambda role: f"Door_{kind}_{code}_{role}"
    return {
        "hairline": lambda: material(p("Hairline"), (0.72, 0.72, 0.74), 1.0, 0.35, brushed=True),
        "satin": lambda: material(p("Satin"), (0.86, 0.86, 0.88), 1.0, 0.16),
        "frost": lambda: material(p("Frost"), (0.8, 0.8, 0.82), 1.0, 0.45),
        "white": lambda: material(p("WhiteGlass"), (0.9, 0.9, 0.9), 0.0, 0.08, coat=0.6),
        "greyGlass": lambda: material(p("GreyGlass"), (0.42, 0.43, 0.45), 0.0, 0.08, coat=0.6),
        "gold": lambda: material(p("Gold"), (0.93, 0.74, 0.38), 1.0, 0.2),
        "brightGold": lambda: material(p("BrightGold"), (1.0, 0.84, 0.52), 1.0, 0.1),
        "darkGold": lambda: material(p("DarkGold"), (0.55, 0.4, 0.18), 1.0, 0.28),
        "brushedGold": lambda: material(p("BrushedGold"), (0.93, 0.76, 0.42), 1.0, 0.3, brushed=True),
        "rose": lambda: material(p("RoseGold"), (0.86, 0.56, 0.45), 1.0, 0.18),
        "peach": lambda: material(p("Peach"), (0.92, 0.66, 0.52), 1.0, 0.3, brushed=True),
        "champagne": lambda: material(p("Champagne"), (0.86, 0.79, 0.6), 1.0, 0.18),
        "bronze": lambda: material(p("Bronze"), (0.42, 0.33, 0.27), 1.0, 0.3, brushed=True),
        "taupe": lambda: material(p("Taupe"), (0.55, 0.47, 0.41), 1.0, 0.32, brushed=True),
        "silver": lambda: material(p("Silver"), (0.95, 0.95, 0.96), 1.0, 0.12),
        "blackMirror": lambda: material(p("BlackMirror"), (0.03, 0.03, 0.035), 1.0, 0.06),
        "wood": lambda: material(p("Wood"), roughness=0.5, wood=True, coat=0.35),
        "ash": lambda: material(p("Ash"), roughness=0.5, wood="wood_ash_base.jpg", coat=0.3),
        "aluminium": lambda: material(p("Aluminium"), (0.6, 0.61, 0.63), 1.0, 0.4, brushed=True),
        "groove": lambda: material(p("Groove"), (0.01, 0.01, 0.012), 0.0, 0.7),
    }


# ---------------------------------------------------------------- relief on the door face

class Door:
    """The door being built: its face frame, height and the parts made so far."""

    def __init__(self, kind, mats):
        k = KINDS[kind]
        self.kind = kind
        self.m = mats
        self.H = k["height"]
        self.thick = k["thick"]
        self.frame = face(k["y"], k["out"])
        # an open landing leaf slides into a wall whose face is 5 mm in front of the door face: keep the
        # relief behind it (the car door slides behind the cabin's front panels, which leave more room)
        self.cap = 0.004 if kind == "landing" else 0.012
        self.n = 0

    def _name(self, what):
        self.n += 1
        return f"part_{what}_{self.n}"

    def leaves(self, mat, margin=None):
        """The two leaf bodies, from 2 mm behind the face back through the leaf."""
        for sx in (-1, 1):
            prism(self._name("leaf"), box(sx * GAP, 0, sx * HALF_W, self.H), -self.thick, 0, self.m[mat],
                  bevel_width=0.0015, frame=self.frame, vertical=True)

    def relief(self, polys, h, mat, bevel=0.0006, steps=None):
        """Outlines standing h proud of the face."""
        h = min(h, self.cap - (max(steps) if steps else 0))
        if polys:
            prisms(self._name("relief"), polys, -0.0005, h, self.m[mat], bevel_width=bevel, frame=self.frame,
                   vertical=True, steps=steps)

    def panel(self, poly, h, mat, bevel=0.001):
        prism(self._name("panel"), poly, -0.0005, min(h, self.cap), self.m[mat], bevel_width=bevel, frame=self.frame, vertical=True)

    def rod(self, u, v0, v1, r, mat, seg=10):
        """A half-round bar standing on the face from v0 to v1 (columns, polished rods)."""
        bm = bmesh.new()
        flat = min(1.0, self.cap / r)  # squashed into a low half-oval where the depth is capped
        prof = [(u + r * math.cos(math.pi * k / seg), flat * r * math.sin(math.pi * k / seg)) for k in range(seg + 1)]
        lo = [bm.verts.new(self.frame(a, v0, h)) for a, h in prof]
        hi = [bm.verts.new(self.frame(a, v1, h)) for a, h in prof]
        for k in range(seg):
            bm.faces.new((lo[k], lo[k + 1], hi[k + 1], hi[k]))
        bm.faces.new(lo)
        bm.faces.new(hi)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        name = self._name("rod")
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        uv_and_shade(link(name, mesh, [self.m[mat]]).data, smooth_angle=60, vertical=True)

    def dome(self, u, v, ru, rv, h, mat, seg=20, rings=5):
        """A low dome (rosette centre, drop, bead)."""
        h = min(h, self.cap)
        bm = bmesh.new()
        grid = []
        for i in range(rings + 1):
            t = math.pi / 2 * i / rings
            grid.append([bm.verts.new(self.frame(u + ru * math.cos(t) * math.cos(2 * math.pi * k / seg),
                                                 v + rv * math.cos(t) * math.sin(2 * math.pi * k / seg),
                                                 h * math.sin(t))) for k in range(seg)])
        for i in range(rings):
            for k in range(seg):
                j = (k + 1) % seg
                bm.faces.new((grid[i][k], grid[i][j], grid[i + 1][j], grid[i + 1][k]))
        bm.faces.new(grid[0])
        bmesh.ops.remove_doubles(bm, verts=grid[-1], dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        name = self._name("dome")
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        uv_and_shade(link(name, mesh, [self.m[mat]]).data, smooth_angle=70, vertical=True)


def inside(pt, poly):
    """Point in polygon (even-odd)."""
    x, y = pt
    hit = False
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def lattice(region, cell, width, angle=45, centre=(0.0, 0.0), samples=3):
    """Two crossing sets of straight strips inside `region`, cut into cell-long pieces; a piece is kept when
    its ends and middle all fall inside the region. Returns (outlines, steps) for Door.relief."""
    xs = [p[0] for p in region]
    ys = [p[1] for p in region]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) * 1.5
    polys, steps = [], []
    for k, a in enumerate((angle, -angle)):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        n = int(span / cell) + 1
        for i in range(-n, n + 1):
            off = i * cell
            # line through centre + off * normal, along (ca, sa)
            ox, oy = centre[0] - sa * off, centre[1] + ca * off
            for j in range(-n, n):
                p0 = (ox + ca * j * cell, oy + sa * j * cell)
                p1 = (ox + ca * (j + 1) * cell, oy + sa * (j + 1) * cell)
                pts = [(p0[0] + (p1[0] - p0[0]) * t / samples, p0[1] + (p1[1] - p0[1]) * t / samples) for t in range(samples + 1)]
                if all(inside(p, region) for p in pts):
                    polys.append(ribbon([p0, p1], width))
                    steps.append(0.0002 * k)
    return polys, steps


def arched(u0, u1, v0, v_spring, n=24):
    """Outline of an opening with a round arch on top: straight sides from v0 up to v_spring."""
    cu, r = (u0 + u1) / 2, (u1 - u0) / 2
    return [(u0, v0), (u1, v0)] + [(cu + r * math.cos(math.pi * i / n), v_spring + r * math.sin(math.pi * i / n)) for i in range(n + 1)]


def medallion(d, cu, cv, r, mat, petals=8):
    """A round rosette: outer and inner rings, radiating petals and a domed centre."""
    d.relief([ribbon(arc(cu, cv, r, 0, 360, 64), 0.008)], 0.0018, mat)
    d.relief([ribbon(arc(cu, cv, r * 0.72, 0, 360, 56), 0.004)], 0.0012, mat)
    d.relief([ellipse(cu + math.cos(a) * r * 0.42, cv + math.sin(a) * r * 0.42, r * 0.3, r * 0.11, a, n=28)
              for a in (2 * math.pi * i / petals for i in range(petals))], 0.0014, mat)
    d.relief([ellipse(cu + math.cos(a) * r * 0.86, cv + math.sin(a) * r * 0.86, r * 0.07, r * 0.07, n=16)
              for a in (2 * math.pi * (i + 0.5) / (petals * 2) for i in range(petals * 2))], 0.0012, mat)
    d.dome(cu, cv, r * 0.16, r * 0.16, 0.004, mat)


# ---------------------------------------------------------------- the designs

def tm004(d):
    """Hairline steel, a polished strip near each outer edge, an etched band of fine lines."""
    d.leaves("hairline")
    H = d.H
    d.relief([box(sx * 0.33, 0.02, sx * 0.385, H - 0.02) for sx in (-1, 1)], 0.0009, "satin")
    lines = []
    v = 0.33 * H
    while v < 0.47 * H:
        for sx in (-1, 1):
            lines.append(box(sx * 0.315, v, sx * 0.012, v + 0.004))
        v += 0.013
    d.relief(lines, 0.0006, "satin", bevel=0.0003)


def tm005(d):
    """Gold: turned columns either side, a beaded arch with a keystone, a lattice inside the arch."""
    d.leaves("gold")
    H = d.H
    spring = 0.74 * H
    for sx in (-1, 1):
        d.rod(sx * 0.395, 0.07, spring - 0.04, 0.016, "brightGold")
        d.panel(rect(sx * 0.395, 0.04, 0.06, 0.06, r=0.004), 0.006, "brightGold")  # base
        d.panel(rect(sx * 0.395, spring - 0.025, 0.06, 0.04, r=0.004), 0.006, "brightGold")  # capital
    d.relief([ribbon(arc(0, spring, 0.395, 0, 180, 48), 0.03)], 0.006, "brightGold", bevel=0.002)
    for i in range(1, 14):
        a = math.radians(180 * i / 14)
        d.dome(0.395 * math.cos(a), spring + 0.395 * math.sin(a), 0.008, 0.008, 0.009, "brightGold", seg=12, rings=3)
    d.panel(rect(0, spring + 0.395, 0.07, 0.07, r=0.005), 0.01, "brightGold")  # keystone
    field = arched(-0.37, 0.37, 0.07, spring)
    polys, steps = lattice(field, 0.055, 0.004, 60, centre=(0, 0.07))
    d.relief(polys, 0.0012, "brushedGold", bevel=0, steps=steps)  # strips too fine for a visible bevel


def tm013(d):
    """Hairline steel with frosted side bands, polished centre strips and an etched rosette."""
    d.leaves("hairline")
    H = d.H
    d.relief([box(sx * 0.27, 0.02, sx * 0.35, H - 0.02) for sx in (-1, 1)], 0.0006, "frost")
    d.relief([box(sx * 0.055, 0.03, sx * 0.07, 0.6 * H) for sx in (-1, 1)], 0.0009, "satin")
    d.relief([box(sx * 0.09, 0.03, sx * 0.097, 0.55 * H) for sx in (-1, 1)], 0.0009, "satin")
    medallion(d, 0, 0.76 * H, 0.15, "satin")


def tm014(d):
    """Polished steel: a skyline of frosted bars rising over an etched rosette, fine lines below."""
    d.leaves("satin")
    H = d.H
    cv = 0.6 * H
    bars, lines = [], []
    for i in range(16):
        u = -0.4125 + i * 0.055
        if abs(u) < 0.02:
            continue
        top = cv + 0.08 + 0.32 * H * (1 - abs(u) / 0.45) ** 1.4
        bars.append(rect(u, (cv + top) / 2, 0.012, top - cv))
        lines.append(rect(u, 0.27 * H, 0.005, 0.5 * H))
    d.relief(bars, 0.0012, "frost")
    d.relief(lines, 0.0008, "frost", bevel=0.0003)
    medallion(d, 0, cv, 0.16, "frost")


def tm017(d):
    """Steel frame round a white glass panel on each leaf, grey glass kick panel below."""
    d.leaves("hairline")
    H = d.H
    for sx in (-1, 1):
        d.panel(box(sx * 0.045, 0.3 * H, sx * 0.42, H - 0.04), 0.003, "white")
        d.panel(box(sx * 0.045, 0.04, sx * 0.42, 0.28 * H), 0.003, "greyGlass")


def tm019(d):
    """Gold with fine lines down the leaves and a framed lattice of interlocking rings in the middle."""
    d.leaves("gold")
    H = d.H
    cv = 0.5 * H
    d.relief([box(sx * 0.315, 0.02, sx * 0.322, H - 0.02) for sx in (-1, 1)], 0.0009, "brightGold", bevel=0.0003)
    d.relief([ribbon([(-0.27, cv - 0.18), (0.27, cv - 0.18), (0.27, cv + 0.18), (-0.27, cv + 0.18), (-0.27, cv - 0.18)], 0.012)],
             0.0016, "brightGold")
    for sv in (-1, 1):
        d.relief([box(-0.15, cv + sv * 0.18, -0.142, cv + sv * 0.36), box(0.142, cv + sv * 0.18, 0.15, cv + sv * 0.36)],
                 0.0012, "brightGold", bevel=0.0003)
    rings = []
    for i in range(4):
        for j in range(4):
            cu, cvv = -0.12 + i * 0.08, cv - 0.12 + j * 0.08
            rings.append(ribbon(arc(cu, cvv, 0.046, 0, 360, 36), 0.005))
    d.relief(rings, 0.0012, "brightGold", steps=[0.0002 * ((k // 4 + k) % 2) for k in range(16)])
    d.relief([ribbon([(-0.17, cv - 0.17), (0.17, cv - 0.17), (0.17, cv + 0.17), (-0.17, cv + 0.17), (-0.17, cv - 0.17)], 0.008)],
             0.0016, "brightGold")


def tm020(d):
    """Hairline steel embossed with a grid of small square pillows."""
    d.leaves("hairline")
    H = d.H
    tiles = []
    cell, size = 0.088, 0.072
    rows = int((H - 0.06) / cell)
    v0 = (H - rows * cell) / 2
    for sx in (-1, 1):
        for c in range(5):
            u = sx * (GAP + 0.01 + cell / 2 + c * cell)
            for r in range(rows):
                tiles.append(rect(u, v0 + cell / 2 + r * cell, size, size, r=0.004, seg=2))
    d.relief(tiles, 0.0016, "satin", bevel=0.001)


def tm021(d):
    """Gold with polished round rods running the full height."""
    d.leaves("darkGold")
    H = d.H
    for sx in (-1, 1):
        for i in range(6):
            d.rod(sx * (0.035 + i * 0.075), 0.02, H - 0.02, 0.007, "brightGold")


def tm022(d):
    """Gold with a shouldered arch outline and a fish-scale relief inside it."""
    d.leaves("gold")
    H = d.H
    spring = 0.8 * H
    top = [(0.4 * math.cos(math.pi * i / 32), spring + 0.13 * H * math.sin(math.pi * i / 32)) for i in range(33)]
    outline = [(-0.4, 0.04), (0.4, 0.04)] + top
    d.relief([ribbon(outline + [outline[0]], 0.014)], 0.0022, "brightGold", bevel=0.0008)
    scales, steps = [], []
    r = 0.045
    row = 0
    v = 0.06
    while v < H:
        off = (row % 2) * r
        u = -0.44 + off
        while u < 0.44:
            pts = arc(u, v, r, 0, 180, 8)
            if all(inside(p, outline) for p in pts):
                scales.append(ribbon(pts, 0.0035))
                steps.append(0.0002 * (row % 2))
            u += 2 * r
        v += r
        row += 1
    d.relief(scales, 0.0011, "brushedGold", bevel=0, steps=steps)


def tm023(d):
    """Dark gold with four narrow arches, each filled with a fine lattice."""
    d.leaves("darkGold")
    H = d.H
    for cu in (-0.33, -0.11, 0.11, 0.33):
        opening = arched(cu - 0.095, cu + 0.095, 0.05, 0.78 * H)
        d.relief([ribbon(opening + [opening[0]], 0.009)], 0.002, "brightGold", bevel=0.0006)
        inner = arched(cu - 0.085, cu + 0.085, 0.06, 0.78 * H)
        polys, steps = lattice(inner, 0.034, 0.003, 60, centre=(cu, 0.06))
        d.relief(polys, 0.0012, "gold", bevel=0, steps=steps)


def _clip_line(p0, p1, u0, v0, u1, v1):
    """Liang-Barsky: the part of segment p0-p1 inside the box, or None."""
    t0, t1 = 0.0, 1.0
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    for p, q in ((-dx, p0[0] - u0), (dx, u1 - p0[0]), (-dy, p0[1] - v0), (dy, v1 - p0[1])):
        if p == 0:
            if q < 0:
                return None
            continue
        t = q / p
        if p < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
    if t0 >= t1:
        return None
    return (p0[0] + dx * t0, p0[1] + dy * t0), (p0[0] + dx * t1, p0[1] + dy * t1)


def tm024(d):
    """Rose gold mirror crossed by a large diamond lattice of champagne strips."""
    d.leaves("rose")
    H = d.H
    polys, steps = [], []
    step = 0.3
    for k, sgn in enumerate((1, -1)):
        for i in range(-12, 13):
            # lines u = sgn * (v - c) + i * step * sqrt2, symmetric about u = 0
            c = H / 2
            p0 = (i * step * math.sqrt(2) + sgn * (-2 - c), -2)
            p1 = (i * step * math.sqrt(2) + sgn * (4 - c), 4)
            seg = _clip_line(p0, p1, -HALF_W + 0.01, 0.02, HALF_W - 0.01, H - 0.02)
            if seg:
                polys.append(ribbon(list(seg), 0.012))
                steps.append(0.0002 * k)
    d.relief(polys, 0.0012, "champagne", steps=steps)


def tm025(d):
    """Brushed peach-gold with bright horizontal inlay lines."""
    d.leaves("peach")
    H = d.H
    lines = []
    for i in range(1, 7):
        v = i * H / 7
        for sx in (-1, 1):
            lines.append(box(sx * 0.012, v - 0.003, sx * (HALF_W - 0.012), v + 0.003))
    d.relief(lines, 0.0008, "silver", bevel=0.0003)


def _key(u0, v0, s, flip_u, flip_v):
    """A Greek-key (meander) corner motif as one polyline, unit s."""
    pts = [(0, 0), (4, 0), (4, 3), (1, 3), (1, 1), (3, 1), (3, 2), (2, 2)]
    return [(u0 + (-x if flip_u else x) * s, v0 + (-y if flip_v else y) * s) for x, y in pts]


def tm026(d):
    """Champagne mirror with a fine border line and Greek-key corners at top and bottom."""
    d.leaves("champagne")
    H = d.H
    parts = []
    for sx in (-1, 1):
        inner_u, outer_u = sx * 0.035, sx * (HALF_W - 0.035)
        border = [(inner_u, 0.035), (outer_u, 0.035), (outer_u, H - 0.035), (inner_u, H - 0.035), (inner_u, 0.035)]
        parts.append(ribbon(border, 0.006))
        for top in (False, True):
            v = H - 0.06 if top else 0.06
            parts.append(ribbon(_key(sx * (HALF_W - 0.06), v, 0.028, sx > 0, top), 0.006))
    d.relief(parts, 0.0012, "brightGold", bevel=0.0004)


def tm027(d):
    """Dark bronze with silver threads hanging from the top, each ending in a drop."""
    d.leaves("bronze")
    H = d.H
    threads = []
    seed = 7
    for sx in (-1, 1):
        for i in range(10):
            seed = (seed * 1103515245 + 12345) % 2 ** 31
            u = sx * (0.03 + i * 0.042)
            end = 0.2 * H + (seed % 1000) / 1000 * 0.45 * H
            threads.append(box(u - 0.0015, end, u + 0.0015, H - 0.03))
            d.dome(u, end - 0.012, 0.006, 0.014, 0.004, "silver", seg=16, rings=4)
    d.relief(threads, 0.0008, "silver", bevel=0.0003)


def tm028(d):
    """Plain brushed taupe."""
    d.leaves("taupe")


def tm029(d):
    """Black mirror."""
    d.leaves("blackMirror")


def tm030(d):
    """Warm wood veneer."""
    d.leaves("wood")


def tm031(d):
    """Pale ash veneer."""
    d.leaves("ash")


DESIGNS = {
    "TM004": tm004, "TM005": tm005, "TM013": tm013, "TM014": tm014, "TM017": tm017, "TM019": tm019,
    "TM020": tm020, "TM021": tm021, "TM022": tm022, "TM023": tm023, "TM024": tm024, "TM025": tm025,
    "TM026": tm026, "TM027": tm027, "TM028": tm028, "TM029": tm029, "TM030": tm030, "TM031": tm031,
}


# ---------------------------------------------------------------- leaves, sill, export

def _cut(obj, keep_left):
    """Keeps the part of obj on one side of the gap between the leaves."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    if keep_left:
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(-GAP, 0, 0), plane_no=(1, 0, 0), clear_outer=True)
    else:
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(GAP, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
    bm.to_mesh(obj.data)
    bm.free()
    return len(obj.data.vertices) > 0


def assemble(node):
    """Sorts every part onto the left or right leaf (cutting those that cross), joins each leaf into one
    object named <node>_L / <node>_R and moves it to its exported, open position."""
    parts = [o for o in bpy.context.scene.objects if o.name.startswith("part_")]
    sides = {True: [], False: []}
    for o in parts:
        xs = [v.co.x for v in o.data.vertices]
        if max(xs) <= 0:
            sides[True].append(o)
        elif min(xs) >= 0:
            sides[False].append(o)
        else:
            twin = o.copy()
            twin.data = o.data.copy()
            bpy.context.scene.collection.objects.link(twin)
            if _cut(o, True):
                sides[True].append(o)
            if _cut(twin, False):
                sides[False].append(twin)
    for left, objs in sides.items():
        target = objs[0]
        with bpy.context.temp_override(active_object=target, object=target, selected_objects=objs,
                                       selected_editable_objects=objs):
            bpy.ops.object.join()
        name = f"{node}_{'L' if left else 'R'}"
        target.name = name
        target.data.name = name
        shift = SHIFT if left else -SHIFT
        for v in target.data.vertices:
            v.co.x += shift
        target.location.x = -OPEN if left else OPEN
    for o in [o for o in bpy.context.scene.objects if o.name.startswith("part_")]:
        bpy.data.objects.remove(o)


def sill(m):
    """The aluminium sill at the cabin threshold: two guide grooves for the door shoes and fine anti-slip ribs."""
    frame = lambda a, b, h: (a, -b, h)  # plan: b = depth (glTF z), h = height
    grooves = [box(-0.49, 0.832, 0.49, 0.838), box(-0.49, 0.882, 0.49, 0.888)]
    body = prism("Door_Sill", box(-0.5, 0.8, 0.5, 0.92), -0.03, 0, m["aluminium"], holes=grooves,
                 bevel_width=0.001, frame=frame)
    ribs = [box(-0.49, d, 0.49, d + 0.0015) for d in (0.808, 0.815, 0.822, 0.848, 0.855, 0.862, 0.869, 0.896, 0.903, 0.910)]
    rib = prisms("Door_Sill_Ribs", ribs, -0.0005, 0.0008, m["aluminium"], bevel_width=0.0003, frame=frame)
    with bpy.context.temp_override(active_object=body, object=body, selected_objects=[body, rib],
                                   selected_editable_objects=[body, rib]):
        bpy.ops.object.join()
    body.name = body.data.name = "Door_Sill"
    for i, g in enumerate(grooves):
        prism(f"Door_Sill_Groove_{i + 1}", g, -0.006, -0.005, m["groove"], bevel_width=0, frame=frame)


def build(code, kind):
    reset()
    m = Mats(palette(code, kind))
    d = Door(kind, m)
    DESIGNS[code](d)
    assemble(KINDS[kind]["node"])
    if kind == "cabin":
        sill(m)
    folder = KINDS[kind]["folder"]
    out = os.path.join(VARIANTS, folder, f"{folder}_{code}.glb")
    export(out)
    print(f"[door] {kind} {code}: {len(bpy.context.scene.objects)} objects -> {out}", flush=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    preview_dir = None
    if "--preview" in argv:
        i = argv.index("--preview")
        preview_dir = argv[i + 1]
        del argv[i:i + 2]
    for code in argv or list(DESIGNS):
        build(code, "landing")
        if preview_dir:
            # the landing door from the lobby, closed: slide the leaves back together first
            for o in bpy.context.scene.objects:
                if o.name.startswith("Landing_Door_"):
                    o.location.x += 0.448 if o.name.endswith("_L") else -0.448
            render_preview(os.path.join(preview_dir, f"{code}.png"), (0, -3.6, 1.06), (math.radians(90), 0, 0), 40,
                           size=(500, 900), fill=(0.6, -2.2, 1.6))
        build(code, "cabin")


main()
