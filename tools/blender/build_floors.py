"""
Build the cabin floor variants as real stone floors and export them for the website
(frontend/public/models/variants/floor/floor_KA-<code>.glb).

Why: the earlier floor files were the catalogue picture flattened onto one square, blurry and with the
photo's own lighting in it. Here each floor is laid like the real thing: separate polished stone pieces
(field, bands, corner squares, inlays) with bevelled edges and a grout joint between them, each stone kind
with its own generated vein texture (textures/stone_<kind>.jpg) and a clear-coat polish.

How to run (Blender 4.2+ / 5.x, no scene needed):
  blender -b --python tools/blender/build_floors.py                     # every floor
  blender -b --python tools/blender/build_floors.py -- DB002 DB030      # some of them
  blender -b --python tools/blender/build_floors.py -- --preview <dir>  # also render a PNG each
  blender -b --python tools/blender/build_floors.py -- --textures       # regenerate the stone textures

Layouts follow the catalogue pictures (D:/WorkSpace/PhuAnLift/image/floor), in plan coordinates (x across
-0.7 .. 0.7, d from the back wall -0.8 to the door 0.8). The whole floor is one node named `Floor`, which
is what the configurator swaps.
"""

import math
import os
import random
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import (  # noqa: E402  (Blender runs this file directly, so its folder goes on the path first)
    Mats, TEXTURES, VARIANTS, box, ellipse, export, material, prism, rect, render_preview, reset, ribbon,
)

HX, HD = 0.70, 0.80
JOINT = 0.0012  # half the grout joint between two stones
TOP = 0.0  # stone surface
THICK = 0.012  # stone thickness above the bed
BED = -0.06  # underside of the floor slab, as in the room model

TEX_PX = 1024
TEX_M = 1.3  # metres one stone texture covers


# ---------------------------------------------------------------- stone textures (numpy)

def _hash2(ix, iy, seed):
    h = (ix.astype(np.uint32) * np.uint32(374761393)) ^ (iy.astype(np.uint32) * np.uint32(668265263)) \
        ^ np.uint32((seed * 1442695041) & 0xFFFFFFFF)
    h = (h ^ (h >> np.uint32(13))) * np.uint32(1274126177)
    h = h ^ (h >> np.uint32(16))
    return h.astype(np.float32) / np.float32(4294967295.0)


def _vnoise(x, y, seed):
    xi, yi = np.floor(x), np.floor(y)
    fx, fy = (x - xi).astype(np.float32), (y - yi).astype(np.float32)
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    xi, yi = xi.astype(np.int64), yi.astype(np.int64)
    a, b = _hash2(xi, yi, seed), _hash2(xi + 1, yi, seed)
    c, d = _hash2(xi, yi + 1, seed), _hash2(xi + 1, yi + 1, seed)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy


def _fbm(x, y, octaves, seed):
    total, amp, norm = 0.0, 0.5, 0.0
    for o in range(octaves):
        f = 2.0 ** o
        total = total + amp * _vnoise(x * f + o * 17.3, y * f + o * 9.1, seed + o)
        norm += amp
        amp *= 0.5
    return total / norm


def _smooth(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _ridge(n):
    return 1.0 - np.abs(2.0 * n - 1.0)


def _c(hexstr):
    """sRGB hex to a 0..1 colour."""
    return np.array([int(hexstr[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)


# kind: light, shade, vein colour, vein strength (0 none .. 1 bold), cloud contrast, speckle
STONES = {
    "carrara": ("#efede8", "#d6d7d6", "#7d868c", 0.55, 0.45, 0.0),
    "arabescato": ("#f1efea", "#d9d9d6", "#5f666b", 0.95, 0.4, 0.0),
    "green": ("#1d5a45", "#0f3a2c", "#c8dccf", 0.8, 0.6, 0.0),
    "nero": ("#1d1d1f", "#0c0c0d", "#d8d8d6", 0.75, 0.4, 0.0),
    "crema": ("#efe3c8", "#dfcfaa", "#b9a27a", 0.25, 0.5, 0.0),
    "botticino": ("#e3d3b0", "#cfba8e", "#a88b5c", 0.35, 0.55, 0.0),
    "salmon": ("#e9a68b", "#d88d70", "#f3cdb8", 0.35, 0.6, 0.0),
    "terracotta": ("#e08550", "#c96c38", "#f0b48a", 0.3, 0.6, 0.0),
    "rosa": ("#f1d2bb", "#e2b896", "#b47d5c", 0.45, 0.55, 0.0),
    "lilac": ("#ebe4e6", "#d8cdd2", "#9a8794", 0.6, 0.45, 0.0),
    "grey": ("#c9ccd0", "#b3b7bc", "#8d9298", 0.35, 0.45, 0.0),
    "darkgrey": ("#6e7174", "#56595c", "#9da1a5", 0.4, 0.5, 0.0),
    "emperador": ("#4a3424", "#33231a", "#a88660", 0.7, 0.55, 0.0),
    "beige": ("#d8b48c", "#c49c72", "#ead2b4", 0.35, 0.5, 0.0),
    "red": ("#b8452c", "#93321d", "#e09a7e", 0.3, 0.5, 0.0),
    "terrazzo": ("#e6e6e2", "#d9d9d4", "#7c7f82", 0.0, 0.25, 1.0),
}


def stone_pixels(kind, seed):
    light, shade, vein, strength, contrast, speckle = STONES[kind]
    light, shade, vein = _c(light), _c(shade), _c(vein)
    t = (np.arange(TEX_PX, dtype=np.float32) + 0.5) / TEX_PX * TEX_M
    u, v = np.meshgrid(t, t)
    cloud = _fbm(u * 1.6, v * 1.6, 5, seed)
    warp = _fbm(u * 2.0 + 11, v * 2.0 + 5, 4, seed + 50)
    grain = (_fbm(u * 70.0, v * 70.0, 2, seed + 61) - 0.5) * 0.03
    rgb = light + (shade - light) * (_smooth(0.35, 0.85, cloud) * contrast)[..., None] + grain[..., None]
    if strength:
        main = _smooth(0.93, 0.994, _ridge(_fbm(u * 1.1 + warp * 1.6, v * 3.2 + warp * 1.6, 5, seed + 7)))
        fine = _smooth(0.95, 0.997, _ridge(_fbm(u * 4.0 + warp * 2.3, v * 7.0 + warp * 2.3, 4, seed + 21)))
        k = np.clip((main * 0.7 + fine * 0.4) * strength, 0.0, 0.9)[..., None]
        rgb = rgb * (1 - k) + vein * k
    if speckle:
        # terrazzo: chips of grey, black and warm stone in a pale matrix
        for i, col in enumerate(("#5a5d60", "#2a2a2c", "#b49a7a", "#9aa0a6")):
            chips = _smooth(0.78, 0.8, _vnoise(u * 90 + i * 31, v * 90 + i * 17, seed + 90 + i))
            rgb = rgb * (1 - chips[..., None]) + _c(col) * chips[..., None]
    return np.clip(rgb, 0.0, 1.0)


def make_texture(kind, force=False):
    path = os.path.join(TEXTURES, f"stone_{kind}.jpg")
    if os.path.exists(path) and not force:
        return
    rgb = stone_pixels(kind, 100 + sorted(STONES).index(kind) * 37)
    rgba = np.concatenate([rgb, np.ones((TEX_PX, TEX_PX, 1), np.float32)], axis=2)[::-1]
    img = bpy.data.images.new(f"stone_{kind}", TEX_PX, TEX_PX, alpha=False)
    img.pixels.foreach_set(np.ascontiguousarray(rgba, np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "JPEG"
    bpy.context.scene.render.image_settings.quality = 86
    img.save()
    bpy.data.images.remove(img)
    print(f"[floor] texture {path}", flush=True)


# ---------------------------------------------------------------- laying stones

def palette(code):
    p = lambda kind: f"Floor_{code}_{kind}"
    mats = {kind: (lambda kind=kind: material(p(kind), roughness=0.16, coat=0.5, texture=f"stone_{kind}.jpg"))
            for kind in STONES}
    mats["grout"] = lambda: material(p("Grout"), (0.32, 0.31, 0.29), 0.0, 0.8)
    return mats


def inset(poly, g):
    """Shrinks a convex outline by g on every side (the grout joint)."""
    n = len(poly)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    sign = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % n]
        dx, dy = x1 - x0, y1 - y0
        ln = math.hypot(dx, dy)
        nx, ny = -dy / ln * sign, dx / ln * sign  # inward normal
        lines.append(((x0 + nx * g, y0 + ny * g), (dx, dy)))
    out = []
    for i in range(n):
        (p0, d0), (p1, d1) = lines[i - 1], lines[i]
        den = d0[0] * d1[1] - d0[1] * d1[0]
        if abs(den) < 1e-12:
            out.append(p1)
            continue
        t = ((p1[0] - p0[0]) * d1[1] - (p1[1] - p0[1]) * d1[0]) / den
        out.append((p0[0] + d0[0] * t, p0[1] + d0[1] * t))
    return out


class Floor:
    def __init__(self, m):
        self.m = m
        self.n = 0
        self.rng = random.Random(11)

    def stone(self, poly, kind, holes=(), joint=JOINT, lift=0.0):
        """One polished stone piece; each gets its own patch of the texture."""
        self.n += 1
        prism(f"part_{self.n}", inset(poly, joint) if joint else poly, TOP - THICK, TOP + lift, self.m[kind],
              holes=holes, bevel_width=0.0008, uv_scale=1 / TEX_M,
              uv_offset=(self.rng.uniform(0, 1), self.rng.uniform(0, 1)))

    def inlay(self, poly, kind):
        """A thin piece set into the stone it sits on (a hair proud, so it never flickers with it)."""
        self.stone(poly, kind, joint=0, lift=0.0004)

    # common layouts -------------------------------------------------------

    def ring(self, out, width, kind):
        """A band of four mitred pieces whose outer edge is `out` from the walls."""
        x0, d0 = HX - out, HD - out
        x1, d1 = x0 - width, d0 - width
        self.stone([(-x0, -d0), (x0, -d0), (x1, -d1), (-x1, -d1)], kind)
        self.stone([(x0, d0), (-x0, d0), (-x1, d1), (x1, d1)], kind)
        self.stone([(-x0, d0), (-x0, -d0), (-x1, -d1), (-x1, d1)], kind)
        self.stone([(x0, -d0), (x0, d0), (x1, d1), (x1, -d1)], kind)

    def frame(self, size, corner_kind, strip_kind):
        """Edge strips of `size` along the walls with square corner pieces."""
        for sx in (-1, 1):
            for sd in (-1, 1):
                self.stone(box(sx * HX, sd * HD, sx * (HX - size), sd * (HD - size)), corner_kind)
        for sd in (-1, 1):
            self.stone(box(-(HX - size), sd * HD, HX - size, sd * (HD - size)), strip_kind)
        for sx in (-1, 1):
            self.stone(box(sx * HX, -(HD - size), sx * (HX - size), HD - size), strip_kind)

    def field(self, out, kind, holes=()):
        self.stone(box(-(HX - out), -(HD - out), HX - out, HD - out), kind, holes)

    def bed(self):
        prism("part_bed", box(-HX, -HD, HX, HD), BED, TOP - 0.002, self.m["grout"], bevel_width=0)


# ---------------------------------------------------------------- the designs

def db002(f):
    """White arabescato with a black band, black corner squares and white edge strips."""
    f.frame(0.17, "nero", "arabescato")
    f.ring(0.17, 0.06, "nero")
    f.field(0.23, "arabescato")


def db003(f):
    """Salmon field, cream band and cream corner squares."""
    f.frame(0.17, "crema", "salmon")
    f.ring(0.17, 0.05, "crema")
    f.field(0.22, "salmon")


def db004(f):
    """White Carrara field in a wide green marble border with a fine gold-toned line."""
    f.ring(0, 0.12, "green")
    f.ring(0.12, 0.012, "botticino")
    f.field(0.132, "carrara")


def db005(f):
    """Crema marfil field with a botticino border."""
    f.ring(0, 0.08, "botticino")
    f.field(0.08, "crema")


def db011(f):
    """White Carrara field, green band, botticino edge."""
    f.ring(0, 0.05, "botticino")
    f.ring(0.05, 0.08, "green")
    f.field(0.13, "carrara")


def db012(f):
    """Rosa border, green band, lilac-veined field in four slabs."""
    f.ring(0, 0.18, "rosa")
    f.ring(0.18, 0.04, "green")
    a, b = HX - 0.22, HD - 0.22
    for sx in (-1, 1):
        for sd in (-1, 1):
            f.stone(box(0, 0, sx * a, sd * b), "lilac")


def db013(f):
    """Green border with black corners, a pale field in four slabs and a green diamond in the middle."""
    f.frame(0.15, "nero", "green")
    a, b = HX - 0.15, HD - 0.15
    r = 0.17
    diamond = [(0, -r), (r, 0), (0, r), (-r, 0)]
    for sx in (-1, 1):
        for sd in (-1, 1):
            quarter = box(0, 0, sx * a, sd * b)
            f.stone(quarter, "grey", holes=[diamond])
    for sx in (-1, 1):
        for sd in (-1, 1):
            f.stone([(0, 0), (sx * r, 0), (0, sd * r)], "green")


def db014(f):
    """Terracotta field and edges, a cream band with green squares where it turns."""
    f.frame(0.15, "terracotta", "terracotta")
    f.ring(0.15, 0.05, "crema")
    for sx in (-1, 1):
        for sd in (-1, 1):
            f.inlay(box(sx * (HX - 0.15), sd * (HD - 0.15), sx * (HX - 0.2), sd * (HD - 0.2)), "green")
    f.field(0.2, "terracotta")


def db030(f):
    """White Carrara field, a botticino border and a fine botticino line with stepped corners."""
    f.ring(0, 0.1, "botticino")
    a, b, s = HX - 0.16, HD - 0.16, 0.12  # the line, and how far its corners step in
    line = [(-a + s, -b), (a - s, -b), (a - s, -b + s), (a, -b + s), (a, b - s), (a - s, b - s), (a - s, b),
            (-a + s, b), (-a + s, b - s), (-a, b - s), (-a, -b + s), (-a + s, -b + s), (-a + s, -b)]
    f.field(0.1, "carrara")
    f.inlay(ribbon(line, 0.018), "botticino")


def db031(f):
    """Grey edge, black band, white Carrara field."""
    f.ring(0, 0.12, "grey")
    f.ring(0.12, 0.06, "nero")
    f.field(0.18, "carrara")


def db032(f):
    """A terrazzo runner down the middle between dark grey sides."""
    for sx in (-1, 1):
        f.stone(box(sx * HX, -HD, sx * 0.34, HD), "darkgrey")
    f.stone(box(-0.34, -HD, 0.34, HD), "terrazzo")


def db033(f):
    """Beige field framed by an emperador band, beige edge."""
    f.ring(0, 0.12, "beige")
    f.ring(0.12, 0.05, "emperador")
    f.field(0.17, "botticino")


def db034(f):
    """Pale grey floor with a ring-and-star medallion, red centre and dark quarter-circle corners."""
    holes = [ellipse(sx * HX, sd * HD, 0.2, 0.2, n=48) for sx in (-1, 1) for sd in (-1, 1)]
    f.stone(box(-HX, -HD, HX, HD), "grey", holes=holes)
    for sx in (-1, 1):
        for sd in (-1, 1):
            quarter = [(sx * HX, sd * HD)] + [(sx * HX - sx * 0.2 * math.cos(math.pi / 2 * i / 16),
                                               sd * HD - sd * 0.2 * math.sin(math.pi / 2 * i / 16)) for i in range(17)]
            f.stone(quarter, "darkgrey")
    ring = [(0.36 * math.cos(2 * math.pi * i / 72), 0.36 * math.sin(2 * math.pi * i / 72)) for i in range(73)]
    f.inlay(ribbon(ring, 0.012), "darkgrey")
    r_out, r_in = 0.36, 0.1
    star = []
    for i in range(8):
        a = math.pi / 4 * i
        r = r_out if i % 2 == 0 else r_in
        star.append((r * math.cos(a), r * math.sin(a)))
    star.append(star[0])
    f.inlay(ribbon(star, 0.008), "darkgrey")
    f.inlay([(0, -0.07), (0.07, 0), (0, 0.07), (-0.07, 0)], "red")


def db035(f):
    """Grey with dark grey stripes across the floor."""
    rows = [(-HD, -0.5, "grey"), (-0.5, -0.38, "darkgrey"), (-0.38, -0.12, "grey"), (-0.12, 0.0, "darkgrey"),
            (0.0, 0.26, "grey"), (0.26, 0.38, "darkgrey"), (0.38, HD, "grey")]
    for d0, d1, kind in rows:
        f.stone(box(-HX, d0, HX, d1), kind)


def db036(f):
    """Crema field inside a wide emperador border."""
    f.ring(0, 0.15, "emperador")
    f.field(0.15, "crema")


def db037(f):
    """Plain crema marfil in four slabs."""
    for sx in (-1, 1):
        for sd in (-1, 1):
            f.stone(box(0, 0, sx * HX, sd * HD), "crema")


DESIGNS = {
    "DB002": db002, "DB003": db003, "DB004": db004, "DB005": db005, "DB011": db011, "DB012": db012,
    "DB013": db013, "DB014": db014, "DB030": db030, "DB031": db031, "DB032": db032, "DB033": db033,
    "DB034": db034, "DB035": db035, "DB036": db036, "DB037": db037,
}


def assemble():
    parts = [o for o in bpy.context.scene.objects if o.name.startswith("part_")]
    target = parts[0]
    with bpy.context.temp_override(active_object=target, object=target, selected_objects=parts,
                                   selected_editable_objects=parts):
        bpy.ops.object.join()
    target.name = target.data.name = "Floor"


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    force = "--textures" in argv
    argv = [a for a in argv if a != "--textures"]
    preview_dir = None
    if "--preview" in argv:
        i = argv.index("--preview")
        preview_dir = argv[i + 1]
        del argv[i:i + 2]
    reset()
    for kind in STONES:
        make_texture(kind, force)
    for code in argv or list(DESIGNS):
        reset()
        f = Floor(Mats(palette(code)))
        f.bed()
        DESIGNS[code](f)
        assemble()
        out = os.path.join(VARIANTS, "floor", f"floor_KA-{code}.glb")
        export(out)
        print(f"[floor] {code} -> {out}", flush=True)
        if preview_dir:
            render_preview(os.path.join(preview_dir, f"{code}.png"), (0, 0, 2.3), (0, 0, 0), 22, size=(700, 800),
                           fill=(0.3, 0.3, 1.6))


main()
