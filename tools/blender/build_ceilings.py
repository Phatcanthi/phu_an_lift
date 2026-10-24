"""
Build the cabin ceiling variants as real 3D models and export them for the website
(frontend/public/models/variants/ceiling/ceiling_<code>.glb).

Why: the earlier ceiling files were the catalogue picture stretched over one flat quad, so the
frame, light panels, downlights and vents had no depth and the light on them never changed.
Here every part is modelled from the catalogue picture (D:/WorkSpace/PhuAnLift/image/ceiling):
a metal ceiling plate with real cut-outs and bevelled edges, a glowing acrylic sheet above the
cut-outs, downlights with a turned trim ring and lens, slotted vents, seams, ribs and mouldings.

How to run (Blender 4.2+ / 5.x, no scene needed; everything is generated):
  blender -b --python tools/blender/build_ceilings.py                       # every ceiling
  blender -b --python tools/blender/build_ceilings.py -- DD101 DD301        # some of them
  blender -b --python tools/blender/build_ceilings.py -- --preview <dir>    # also render a PNG each

Coordinates: designs are written in plan coordinates (x, d) in metres, seen from inside the
cabin looking up. x runs across the cabin (-0.7 .. 0.7, left to right when facing the back wall),
d runs from the back wall (-0.8) to the door (+0.8). Heights are measured from the cabin floor;
the cabin is 2.4 m high and the ceiling hangs just below that. On export Blender's Z-up becomes
glTF's Y-up, so plan (x, d, h) ends up at website (x, h, d).

Node names: every exported object starts with `Ceiling_` or `Downlight_`, which the configurator
treats as the ceiling (it replaces those nodes and keeps them in the lift-only view).
"""

import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import (  # noqa: E402  (Blender runs this file directly, so its folder goes on the path first)
    Mats, arc, box, ellipse, export, lathe, link, material, plane, prism, rect, render_preview, reset, ribbon,
    uv_and_shade, VARIANTS,
)

OUT_DIR = os.path.join(VARIANTS, "ceiling")

# Cabin interior, plan coordinates (the walls' inner faces).
HALF_X = 0.70
HALF_D = 0.80
# The ceiling plate: its underside and top. The roof shell sits at 2.40 .. 2.45.
Z0 = 2.370
Z1 = 2.386
# The glowing acrylic sheet above the plate: it shows through every cut-out.
ZG = 2.393


def palette(code):
    """The materials every design picks from; named per design so files never share a name."""
    p = lambda role: f"Ceil_{code}_{role}"
    return {
        "steel": lambda: material(p("Steel"), (0.72, 0.72, 0.74), 1.0, 0.35, brushed=True),
        "mirror": lambda: material(p("Mirror"), (0.93, 0.93, 0.94), 1.0, 0.05),
        # satin: polished but soft enough that it does not mirror the environment map as hard-edged blobs
        "satin": lambda: material(p("Satin"), (0.8, 0.8, 0.82), 1.0, 0.2),
        "darkSatin": lambda: material(p("DarkSatin"), (0.3, 0.3, 0.32), 1.0, 0.22),
        "darkMirror": lambda: material(p("GreyMirror"), (0.36, 0.36, 0.38), 1.0, 0.07),
        "blackMirror": lambda: material(p("BlackMirror"), (0.035, 0.035, 0.04), 1.0, 0.07),
        "gold": lambda: material(p("Gold"), (0.95, 0.77, 0.42), 1.0, 0.14),
        "champagne": lambda: material(p("Champagne"), (0.86, 0.76, 0.6), 1.0, 0.16),
        "bronze": lambda: material(p("Bronze"), (0.62, 0.38, 0.22), 1.0, 0.3, brushed=True),
        "darkBronze": lambda: material(p("DarkBronze"), (0.2, 0.11, 0.07), 1.0, 0.1),
        "copper": lambda: material(p("Copper"), (0.4, 0.2, 0.11), 1.0, 0.18),
        "white": lambda: material(p("WhitePaint"), (0.86, 0.86, 0.85), 0.0, 0.42),
        "lightWood": lambda: material(p("LightWood"), roughness=0.5, wood="wood_light_base.jpg", coat=0.3),
        "black": lambda: material(p("Black"), (0.012, 0.012, 0.014), 0.2, 0.6),
        "glow": lambda: material(p("Glow"), (1.0, 1.0, 1.0), 0.0, 0.4, emission=(1.0, 0.97, 0.93), strength=2.6),
        "warmGlow": lambda: material(p("WarmGlow"), (1.0, 0.9, 0.75), 0.0, 0.4, emission=(1.0, 0.86, 0.66), strength=2.6),
        "frost": lambda: material(p("Frost"), (0.9, 0.9, 0.92), 0.0, 0.5, emission=(0.86, 0.87, 0.9), strength=1.2),
        "lens": lambda: material(p("Lens"), (1.0, 1.0, 1.0), 0.0, 0.3, emission=(1.0, 0.95, 0.88), strength=7.0),
        "shell": lambda: material(p("Shell"), (0.035, 0.035, 0.04), 0.3, 0.7),
    }


# ---------------------------------------------------------------- ceiling parts

def downlight(name, x, d, z_ceiling, mats, R=0.042, deep=0.012, gimbal=False, lens=None):
    """A recessed downlight: turned trim ring under the ceiling and a glowing lens set back into it.
    Returns the hole the ceiling plate needs for it. `lens` is how far the lens sits above the trim's
    underside; keep it inside a thin panel so the lens is not hidden behind the plate above."""
    ri = R * 0.66
    zb = z_ceiling - 0.004
    trim = [
        (ri, zb + deep + 0.004), (ri, zb + 0.002), (ri + 0.0015, zb), (R - 0.003, zb),
        (R - 0.0005, zb + 0.0012), (R, zb + 0.004),
    ]
    bm = lathe(trim)
    if gimbal:
        # an inner swivel ring standing proud of the lens
        bm2 = lathe([(ri * 0.95, zb + 0.0015), (ri * 0.8, zb + 0.0015), (ri * 0.8, zb + 0.006)])
        tmp = bpy.data.meshes.new("tmp")
        bm2.to_mesh(tmp)
        bm2.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # lens: a disc facing down, its own material slot
    lens_z = zb + (lens if lens is not None else deep * 0.75)
    ring = [bm.verts.new((ri * math.cos(2 * math.pi * k / 40), ri * math.sin(2 * math.pi * k / 40), lens_z)) for k in range(40)]
    disc = bm.faces.new(ring)
    disc.normal_update()
    if disc.normal.z > 0:
        disc.normal_flip()
    disc.material_index = 1
    bmesh.ops.translate(bm, vec=(x, -d, 0), verts=bm.verts)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    uv_and_shade(link(name, mesh, [mats["mirror"], mats["lens"]]).data, smooth_angle=50)
    return ellipse(x, d, ri + 0.003, ri + 0.003, n=32)


def grille(name, cx, cd, w, l, z_ceiling, mats, across=True):
    """A slotted ventilation grille: dark box behind a row of thin metal slats. Returns its hole."""
    hole = rect(cx, cd, w, l, r=0.004)
    prism(name + "_Back", rect(cx, cd, w + 0.01, l + 0.01), z_ceiling + 0.016, z_ceiling + 0.02, mats["black"], bevel_width=0)
    pitch = 0.011
    count = int((w if across else l) / pitch) - 1
    for i in range(count):
        off = -((count - 1) * pitch) / 2 + i * pitch
        slat = rect(cx + off, cd, 0.0035, l - 0.004) if across else rect(cx, cd + off, w - 0.004, 0.0035)
        prism(f"{name}_Slat_{i + 1}", slat, z_ceiling + 0.002, z_ceiling + 0.014, mats["steel"], bevel_width=0)
    return hole


def seam(name, x0, d0, x1, d1, z, mats):
    """A dark joint line between two ceiling panels, a hair below the plate."""
    prism(name, ribbon([(x0, d0), (x1, d1)], 0.002), z - 0.0006, z + 0.0004, mats["black"], bevel_width=0)


def shell(mats):
    prism("Ceiling_Shell", box(-0.74, -0.84, 0.74, 0.80), 2.40, 2.45, mats["shell"], bevel_width=0)


def glow_sheet(mats, key="glow", poly=None, z=ZG):
    plane("Ceiling_Glow", poly or box(-HALF_X, -HALF_D, HALF_X, HALF_D), z, mats[key])


PLATE = box(-HALF_X + 0.001, -HALF_D + 0.001, HALF_X - 0.001, HALF_D - 0.001)


def downlights(positions, mats, z=Z0, **kw):
    return [downlight(f"Downlight_{i + 1}", x, d, z, mats, **kw) for i, (x, d) in enumerate(positions)]


# ---------------------------------------------------------------- the designs

def dd101(m):
    """Brushed steel, one large square LED panel, vent at the back."""
    holes = [box(-0.37, -0.50, 0.37, 0.62, r=0.006)]
    holes.append(grille("Ceiling_Grille", 0, -0.66, 0.30, 0.055, Z0, m))
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    for i, x in enumerate((-0.385, 0.385)):
        seam(f"Ceiling_Seam_{i + 1}", x, -HALF_D, x, HALF_D, Z0, m)
    glow_sheet(m)


def dd102(m):
    """Brushed steel, two LED panels split by a vent bar, three downlights each side."""
    holes = [box(-0.36, -0.70, 0.36, 0.16, r=0.006), box(-0.36, 0.30, 0.36, 0.70, r=0.006)]
    holes.append(grille("Ceiling_Grille", 0, 0.23, 0.34, 0.05, Z0, m))
    holes += downlights([(x, d) for x in (-0.53, 0.53) for d in (-0.55, 0.0, 0.55)], m)
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    glow_sheet(m)


def dd103(m):
    """Steel side strips with downlights, mirror-edged acrylic centre with etched arcs and lines."""
    holes = [box(-0.37, -0.74, 0.37, 0.74, r=0.004)]
    holes += downlights([(x, d) for x in (-0.54, 0.54) for d in (-0.55, 0.0, 0.55)], m)
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    # mirror trim around the acrylic
    prism("Ceiling_Trim", box(-0.39, -0.76, 0.39, 0.76), Z0 - 0.003, Z0, m["mirror"], [box(-0.37, -0.74, 0.37, 0.74)])
    # the decoration on the acrylic: three lines down the middle and two triple arcs
    for i, x in enumerate((-0.016, 0.0, 0.016)):
        prism(f"Ceiling_Line_{i + 1}", box(x - 0.002, -0.74, x + 0.002, 0.74), Z1 + 0.001, Z1 + 0.004, m["mirror"], bevel_width=0)
    k = 0
    for cd, sign in ((1.32, -1), (-1.32, 1)):
        for r in (1.02, 1.045, 1.07):
            half = math.degrees(math.asin(0.37 / r))
            a0, a1 = (-90 - half, -90 + half) if sign < 0 else (90 - half, 90 + half)
            k += 1
            prism(f"Ceiling_Arc_{k}", ribbon(arc(0, cd, r, a0, a1), 0.004), Z1 + 0.001, Z1 + 0.004, m["mirror"], bevel_width=0)
    # frosted half dome at the door end
    half_dome = [(0.26 * math.cos(math.pi * i / 32), 0.74 - 0.11 * math.sin(math.pi * i / 32)) for i in range(33)]
    plane("Ceiling_Frost", half_dome, ZG - 0.002, m["frost"])
    glow_sheet(m)


def dd105(m):
    """Brushed steel, a four-petal butterfly of light in the middle, four downlights, vent at the door."""
    holes = []
    # four separate petals: a narrow cross of steel stays between them
    for sx in (-1, 1):
        for sd in (-1, 1):
            big = sd < 0  # the pair towards the back is the larger one
            holes.append(ellipse(sx * 0.13, -0.02 + sd * (0.082 if big else 0.066), 0.12 if big else 0.102,
                                 0.072 if big else 0.056, sx * sd * math.radians(16), n=56))
    holes.append(grille("Ceiling_Grille", 0, 0.68, 0.26, 0.04, Z0, m))
    holes += downlights([(x, d) for x in (-0.5, 0.5) for d in (-0.6, 0.55)], m)
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    glow_sheet(m)


def dd201(m):
    """Black mirror frame, three lit boxes down each side, polished ribbed centre with two downlights."""
    holes = []
    for sx in (-1, 1):
        for d0, d1 in ((-0.74, -0.26), (-0.24, 0.24), (0.26, 0.74)):
            holes.append(box(sx * 0.68, d0, sx * 0.50, d1, r=0.003))
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["blackMirror"], holes)
    # polished centre panel with half-round ribs running front to back
    holes = downlights([(0, -0.38), (0, 0.38)], m, z=Z0 - 0.004, lens=0.0065)
    prism("Ceiling_Centre", box(-0.42, -0.78, 0.42, 0.78), Z0 - 0.004, Z0, m["darkMirror"], holes)
    bm = bmesh.new()
    pitch, r = 0.021, 0.0055
    count = int(0.80 / pitch)
    for i in range(count):
        x = -((count - 1) * pitch) / 2 + i * pitch
        if abs(x) < 0.05:
            continue  # a clear lane down the middle for the downlights
        prof = [(x + r * math.cos(math.pi * k / 10), Z0 - 0.004 - r * math.sin(math.pi * k / 10)) for k in range(11)]
        v0 = [bm.verts.new((px, 0.77, pz)) for px, pz in prof]
        v1 = [bm.verts.new((px, -0.77, pz)) for px, pz in prof]
        for k in range(10):
            bm.faces.new((v0[k], v0[k + 1], v1[k + 1], v1[k]))
        bm.faces.new(v0[::-1])
        bm.faces.new(v1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("Ceiling_Ribs")
    bm.to_mesh(mesh)
    bm.free()
    uv_and_shade(link("Ceiling_Ribs", mesh, [m["mirror"]]).data, smooth_angle=60)
    glow_sheet(m)


def dd202(m):
    """Slim steel frame, the whole ceiling lit in three panels."""
    holes = [box(-0.675, -0.77, -0.245, 0.77), box(-0.215, -0.77, 0.215, 0.77), box(0.245, -0.77, 0.675, 0.77)]
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    glow_sheet(m)


def dd203(m):
    """Brushed steel frame round two acrylic panels, the bar between them swelling into a lozenge."""
    holes = [box(-0.60, -0.72, 0.60, 0.28, r=0.035), box(-0.60, 0.40, 0.60, 0.72, r=0.035)]
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    lozenge = rect(0, 0.34, 0.56, 0.085, r=0.04)
    prism("Ceiling_Lozenge", lozenge, Z0 - 0.008, Z0, m["steel"], bevel_width=0.003)
    glow_sheet(m)


def dd301(m):
    """Wood coffered ceiling: stepped mouldings, a cove of warm light round a floating centre panel."""
    # three steps up into the coffer, each 1.4 cm higher than the last
    low = Z0 - 0.035
    holes = downlights([(0, -0.735), (0, 0.735), (-0.635, 0), (0.635, 0)], m, z=low)
    prism("Ceiling_Plate", PLATE, low, low + 0.016, m["lightWood"], [rect(0, 0, 1.12, 1.32, r=0.004)] + holes)
    prism("Ceiling_Step_1", rect(0, 0, 1.13, 1.33), low + 0.013, low + 0.029, m["lightWood"], [rect(0, 0, 0.98, 1.18)])
    prism("Ceiling_Step_2", rect(0, 0, 0.99, 1.19), low + 0.027, low + 0.043, m["lightWood"], [rect(0, 0, 0.88, 1.08)])
    # thin gilded bead round the edge of the lowest step
    prism("Ceiling_Bead", rect(0, 0, 1.128, 1.328), low - 0.003, low, m["champagne"], [rect(0, 0, 1.108, 1.308)], bevel_width=0)
    prism("Ceiling_Centre", rect(0, 0, 0.78, 0.98), ZG - 0.010, ZG - 0.004, m["lightWood"])
    glow_sheet(m, "warmGlow")


def dd302(m):
    """Deep copper mirror frame, one large panel of light, four wide downlights."""
    holes = [box(-0.40, -0.70, 0.40, 0.70, r=0.004)]
    holes += downlights([(x, d) for x in (-0.555, 0.555) for d in (-0.56, 0.56)], m, R=0.055)
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["copper"], holes)
    glow_sheet(m, "warmGlow")


def dd303(m):
    """Dark bronze mirror frame round a large light, champagne insets front and back."""
    holes = [box(-0.54, -0.66, 0.54, 0.66, r=0.004)]
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["darkBronze"], holes)
    for i, cd in enumerate((-0.73, 0.73)):
        prism(f"Ceiling_Inset_{i + 1}", rect(0, cd, 0.56, 0.1), Z0 - 0.003, Z0, m["champagne"])
        for j, x in enumerate((-0.32, 0.32)):
            prism(f"Ceiling_Inset_{i + 1}_Line_{j + 1}", rect(x, cd, 0.006, 0.1), Z0 - 0.003, Z0, m["champagne"])
    glow_sheet(m)


def dd304(m):
    """Brushed bronze frame, two acrylic panels, vent at the door."""
    holes = [box(-0.48, -0.70, 0.48, 0.16, r=0.004), box(-0.48, 0.27, 0.48, 0.64, r=0.004)]
    holes.append(grille("Ceiling_Grille", 0, 0.72, 0.30, 0.045, Z0, m))
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["bronze"], holes)
    glow_sheet(m, "warmGlow")


def dd501(m):
    """Brushed steel, two long LED panels and a column of louvre slots down each side."""
    holes = [box(-0.31, -0.72, -0.045, 0.72, r=0.004), box(0.045, -0.72, 0.31, 0.72, r=0.004)]
    for sx in (-1, 1):
        for i in range(15):
            d = -0.66 + i * (1.32 / 14)
            holes.append(rect(sx * 0.50, d, 0.13, 0.022, r=0.011))
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    glow_sheet(m)


def dd502(m):
    """Two-tone mirror ceiling with lit brackets either side and a lit oval ring in the middle."""
    ring_out = ellipse(0, 0, 0.25, 0.14, n=64)
    ring_in = ellipse(0, 0, 0.205, 0.095, n=64)
    holes = [ring_out]
    for sx in (-1, 1):
        holes += [
            box(sx * 0.52, -0.40, sx * 0.47, 0.40, r=0.003),
            box(sx * 0.52, -0.56, sx * 0.20, -0.51, r=0.003),
            box(sx * 0.52, 0.51, sx * 0.20, 0.56, r=0.003),
        ]
    # each half is its own plate, cut by the same holes
    left = [h for h in holes if min(p[0] for p in h) < 0]
    right = [h for h in holes if max(p[0] for p in h) > 0]
    prism("Ceiling_Plate_L", box(-HALF_X + 0.001, -HALF_D + 0.001, 0, HALF_D - 0.001), Z0, Z1, m["satin"], left)
    prism("Ceiling_Plate_R", box(0, -HALF_D + 0.001, HALF_X - 0.001, HALF_D - 0.001), Z0, Z1, m["darkSatin"], right)
    # the island inside the oval, split down the middle like the plate
    top = [p for p in ring_in if p[0] <= 0.0001]
    prism("Ceiling_Island_L", sorted(top, key=lambda p: math.atan2(p[1], p[0]) % (2 * math.pi)), Z0, Z1, m["satin"])
    bottom = [p for p in ring_in if p[0] >= -0.0001]
    prism("Ceiling_Island_R", sorted(bottom, key=lambda p: (math.atan2(p[1], p[0]) + math.pi / 2) % (2 * math.pi)), Z0, Z1, m["darkSatin"])
    glow_sheet(m)


def _panels(m, mat, grilles):
    """Five flat panels front to back with ten downlights (DD011, DD021)."""
    pitch = 2 * HALF_D / 5
    lights = [(x, -HALF_D + pitch * (i + 0.5)) for i in range(5) for x in (-0.36, 0.36)]
    holes = downlights(lights, m)
    if grilles:
        holes.append(grille("Ceiling_Grille_1", 0, -HALF_D + pitch * 0.5, 0.22, 0.04, Z0, m))
        holes.append(grille("Ceiling_Grille_2", 0, HALF_D - pitch * 0.5, 0.22, 0.04, Z0, m))
    prism("Ceiling_Plate", PLATE, Z0, Z1, mat, holes)
    for i in range(1, 5):
        d = -HALF_D + pitch * i
        seam(f"Ceiling_Seam_{i}", -HALF_X, d, HALF_X, d, Z0, m)


def dd011(m):
    """White painted steel panels with ten downlights and two vents."""
    _panels(m, m["white"], True)


def dd021(m):
    """Mirror steel panels with ten downlights."""
    _panels(m, m["satin"], False)


def dd024(m):
    """Steel frame, a lit border line, glowing panels either side of a black mirror spine with four spots."""
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], [box(-0.62, -0.74, 0.62, 0.74)])
    panels = []
    rows = [(-0.70, -0.36), (-0.34, -0.01), (0.01, 0.34), (0.36, 0.70)]
    for sx in (-1, 1):
        for d0, d1 in rows:
            panels.append(box(sx * 0.58, d0, sx * 0.16, d1))
    prism("Ceiling_Grid", box(-0.605, -0.725, 0.605, 0.725), Z0 + 0.002, Z1 + 0.002, m["blackMirror"], panels)
    spots = [(0, d) for d in (-0.52, -0.175, 0.175, 0.52)]
    holes = downlights(spots, m, z=Z0 - 0.002, R=0.05, deep=0.016, gimbal=True, lens=0.0065)
    prism("Ceiling_Spine", box(-0.135, -0.725, 0.135, 0.725), Z0 - 0.002, Z0 + 0.002, m["blackMirror"], holes)
    glow_sheet(m)


def dd005(m):
    """Brushed steel with a ring of light round a stepped steel frame and a lit centre, corner downlights."""
    holes = [box(-0.56, -0.66, 0.56, 0.66)]
    holes += downlights([(x, d) for x in (-0.635, 0.635) for d in (-0.735, 0.735)], m, R=0.034)
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], holes)
    prism("Ceiling_Frame", box(-0.48, -0.58, 0.48, 0.58), Z0 + 0.004, Z1 + 0.004, m["mirror"], [box(-0.36, -0.46, 0.36, 0.46)])
    prism("Ceiling_Frame_Inner", box(-0.36, -0.46, 0.36, 0.46), Z1 - 0.004, Z1, m["steel"], [box(-0.30, -0.40, 0.30, 0.40)])
    glow_sheet(m)


def dd022(m):
    """Brushed steel band with downlights round two perforated panels of round lights."""
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"],
          [box(-0.57, -0.72, 0.57, 0.72)] + downlights([(x, d) for x in (-0.635, 0.635) for d in (-0.55, 0.0, 0.55)], m, R=0.032))
    for i, (d0, d1) in enumerate(((-0.71, -0.02), (0.02, 0.71))):
        cd = (d0 + d1) / 2
        circles = [ellipse(x, cd + dd, 0.052, 0.052, n=36) for x in (-0.40, -0.20, 0.0, 0.20, 0.40) for dd in (-0.2, 0.0, 0.2)]
        prism(f"Ceiling_Perforated_{i + 1}", box(-0.565, d0, 0.565, d1), Z0 + 0.006, Z1 + 0.002, m["steel"], circles)
    glow_sheet(m)


def dd023(m):
    """Steel frame with louvred side bands, a lit centre crossed by triple bars and arcs."""
    prism("Ceiling_Plate", PLATE, Z0, Z1, m["steel"], [box(-0.60, -0.74, 0.60, 0.74)])
    for sx in (-1, 1):
        for i in range(60):
            d = -0.72 + i * (1.44 / 59)
            prism(f"Ceiling_Louvre_{'L' if sx < 0 else 'R'}_{i + 1}", rect(sx * 0.53, d, 0.13, 0.004), Z0 + 0.003, Z1, m["steel"], bevel_width=0)
    k = 0
    for off in (-0.018, 0.0, 0.018):
        k += 1
        prism(f"Ceiling_Bar_{k}", box(-0.46, off - 0.003, 0.46, off + 0.003), Z1 + 0.001, Z1 + 0.004, m["blackMirror"], bevel_width=0)
        k += 1
        prism(f"Ceiling_Bar_{k}", box(off - 0.003, -0.74, off + 0.003, 0.74), Z1 + 0.001, Z1 + 0.004, m["blackMirror"], bevel_width=0)
    for sx in (-1, 1):
        for r in (0.30, 0.318, 0.336):
            k += 1
            prism(f"Ceiling_Bar_{k}", ribbon(arc(sx * 0.62, 0, r, 120 if sx > 0 else -60, 240 if sx > 0 else 60), 0.005),
                  Z1 + 0.001, Z1 + 0.004, m["blackMirror"], bevel_width=0)
    glow_sheet(m)


DESIGNS = {
    "DD005": dd005, "DD011": dd011, "DD021": dd021, "DD022": dd022, "DD023": dd023, "DD024": dd024,
    "DD101": dd101, "DD102": dd102, "DD103": dd103, "DD105": dd105, "DD201": dd201, "DD202": dd202,
    "DD203": dd203, "DD301": dd301, "DD302": dd302, "DD303": dd303, "DD304": dd304, "DD501": dd501,
    "DD502": dd502,
}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    preview_dir = None
    if "--preview" in argv:
        i = argv.index("--preview")
        preview_dir = argv[i + 1]
        del argv[i:i + 2]
    codes = argv or list(DESIGNS)
    os.makedirs(OUT_DIR, exist_ok=True)
    for code in codes:
        reset()
        mats = Mats(palette(code))
        shell(mats)
        DESIGNS[code](mats)
        out = os.path.join(OUT_DIR, f"ceiling_{code}.glb")
        export(out)
        print(f"[ceiling] {code}: {len(bpy.context.scene.objects)} objects -> {out}", flush=True)
        if preview_dir:
            # from the middle of the cabin, looking straight up
            render_preview(os.path.join(preview_dir, f"{code}.png"), (0, 0, 1.25), (math.pi, 0, 0), 17)


main()
