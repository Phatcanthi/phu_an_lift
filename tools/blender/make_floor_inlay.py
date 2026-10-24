"""
Generate the marble-inlay floor texture for the cabin (frontend/public/textures/floor-inlay.jpg).

Layout, in real metres so the border widths are right on the 1.4 x 1.6 m cabin floor: a white marble field
framed by a dark green marble band, white marble strips along the edges and green marble squares in the four
corners. Every stone is its own piece with its own vein pattern, separated by a thin grout line.

Why a file instead of the room's lightmap atlas: the atlas gives the floor only ~150 px, far too little for
marble veins. This texture is multiplied onto the baked light in the web viewer (see
frontend/src/components/marbleFloor.ts), so the veins stay sharp and the baked shading is kept.

Run (no Blender window needed):
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --python tools/blender/make_floor_inlay.py
"""

import os

import bpy
import numpy as np

# ---------------------------------------------------------------- settings
FLOOR_W, FLOOR_H = 1.4, 1.6  # metres: x and z extent of the `Floor` mesh in room.glb
PX_PER_M = 1280  # about 0.8 mm per pixel
CORNER = 0.20  # side of the green corner squares, and width of the white edge strips
BAND = 0.055  # width of the green band
GROUT = 0.0016  # grout line half width, metres
OUTPUT = r"D:\WorkSpace\PhuAnLift\WebApp\frontend\public\textures\floor-inlay.jpg"

# colours as they should look on screen (sRGB, 0..1)
WHITE_LIGHT = np.array([0.935, 0.925, 0.900], np.float32)
WHITE_SHADE = np.array([0.800, 0.805, 0.800], np.float32)
WHITE_VEIN = np.array([0.470, 0.500, 0.510], np.float32)
GREEN_DARK = np.array([0.070, 0.235, 0.180], np.float32)
GREEN_LIGHT = np.array([0.150, 0.390, 0.310], np.float32)
GREEN_VEIN = np.array([0.760, 0.860, 0.810], np.float32)
GROUT_COLOUR = np.array([0.20, 0.20, 0.19], np.float32)


# ---------------------------------------------------------------- noise
def hash2(ix, iy, seed):
    h = (
        (ix.astype(np.uint32) * np.uint32(374761393))
        ^ (iy.astype(np.uint32) * np.uint32(668265263))
        ^ np.uint32((seed * 1442695041) & 0xFFFFFFFF)
    )
    h = (h ^ (h >> np.uint32(13))) * np.uint32(1274126177)
    h = h ^ (h >> np.uint32(16))
    return h.astype(np.float32) / np.float32(4294967295.0)


def vnoise(x, y, seed):
    xi, yi = np.floor(x), np.floor(y)
    fx, fy = (x - xi).astype(np.float32), (y - yi).astype(np.float32)
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    xi, yi = xi.astype(np.int64), yi.astype(np.int64)
    a, b = hash2(xi, yi, seed), hash2(xi + 1, yi, seed)
    c, d = hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy


def fbm(x, y, octaves, seed):
    total, amp, norm = 0.0, 0.5, 0.0
    for o in range(octaves):
        f = 2.0**o
        total = total + amp * vnoise(x * f + o * 17.3, y * f + o * 9.1, seed + o)
        norm += amp
        amp *= 0.5
    return total / norm


def smooth(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ridge(n):
    """1 along the lines where the noise crosses 0.5, falling off to 0 away from them."""
    return 1.0 - np.abs(2.0 * n - 1.0)


# ---------------------------------------------------------------- stones
def white_marble(u, v, seed):
    cloud = fbm(u * 1.5, v * 1.5, 5, seed)
    warp = fbm(u * 2.0 + 11, v * 2.0 + 5, 4, seed + 50)
    # thin, crisp veins: keep only the narrow band where the noise is closest to its zero crossing
    main = smooth(0.945, 0.995, ridge(fbm(u * 1.1 + warp * 1.5, v * 3.3 + warp * 1.5, 5, seed + 7)))
    fine = smooth(0.955, 0.997, ridge(fbm(u * 4.0 + warp * 2.2, v * 7.0 + warp * 2.2, 4, seed + 21)))
    grain = (fbm(u * 60.0, v * 60.0, 2, seed + 61) - 0.5) * 0.03  # fine crystalline speckle
    base = WHITE_LIGHT + (WHITE_SHADE - WHITE_LIGHT) * (smooth(0.4, 0.85, cloud) * 0.45)[..., None] + grain[..., None]
    k = np.clip(main * 0.62 + fine * 0.38, 0.0, 0.8)[..., None]
    return base * (1 - k) + WHITE_VEIN * k


def green_marble(u, v, seed):
    cloud = fbm(u * 3.0, v * 3.0, 5, seed)
    warp = fbm(u * 2.6 + 3, v * 2.6 + 9, 4, seed + 50)
    main = smooth(0.915, 0.992, ridge(fbm(u * 1.4 + warp * 1.8, v * 3.0 + warp * 1.8, 5, seed + 7)))
    fine = smooth(0.945, 0.996, ridge(fbm(u * 5.5 + warp * 2.4, v * 7.5 + warp * 2.4, 4, seed + 21)))
    cracks = smooth(0.965, 0.998, ridge(fbm(u * 9.0 + warp * 3.0, v * 4.0 + warp * 3.0, 3, seed + 41)))
    grain = (fbm(u * 60.0, v * 60.0, 2, seed + 61) - 0.5) * 0.025
    base = GREEN_DARK + (GREEN_LIGHT - GREEN_DARK) * (smooth(0.3, 0.9, cloud) * 0.55)[..., None] + grain[..., None]
    k = np.clip(main * 0.78 + fine * 0.5 + cracks * 0.35, 0.0, 0.88)[..., None]
    return base * (1 - k) + GREEN_VEIN * k


# ---------------------------------------------------------------- layout
def build():
    w, h = round(FLOOR_W * PX_PER_M), round(FLOOR_H * PX_PER_M)
    x = (np.arange(w, dtype=np.float32) + 0.5) / PX_PER_M  # metres from the left edge
    z = (np.arange(h, dtype=np.float32) + 0.5) / PX_PER_M  # metres from the top (back wall) edge
    X, Z = np.meshgrid(x, z)
    dx, dz = np.minimum(X, FLOOR_W - X), np.minimum(Z, FLOOR_H - Z)
    left, top = X < FLOOR_W / 2, Z < FLOOR_H / 2

    # one id per stone: 0-3 corners, 4-7 edge strips, 8-11 band sides, 12 centre field
    ident = np.full((h, w), 12, np.int32)
    in_ring = (dx < CORNER) | (dz < CORNER)
    corner = (dx < CORNER) & (dz < CORNER)
    band = ~in_ring & ((dx < CORNER + BAND) | (dz < CORNER + BAND))
    vertical = dx < dz  # mitre the band corners along the diagonal
    quad = np.where(top, 0, 2) + np.where(left, 0, 1)
    side_v = np.where(left, 0, 1)  # left / right
    side_h = np.where(top, 2, 3)  # top / bottom
    ident = np.where(corner, quad, ident)
    ident = np.where(in_ring & ~corner, 4 + np.where(dx < CORNER, side_v, side_h), ident)
    ident = np.where(band, 8 + np.where(vertical, side_v, side_h), ident)

    green = (ident < 4) | ((ident >= 8) & (ident < 12))

    # each stone gets its own rotation and offset so neighbouring pieces do not share veins
    rng = np.random.default_rng(7)
    angle = rng.uniform(0, 2 * np.pi, 13).astype(np.float32)[ident]
    ox = rng.uniform(0, 40, 13).astype(np.float32)[ident]
    oy = rng.uniform(0, 40, 13).astype(np.float32)[ident]
    u = (X * np.cos(angle) - Z * np.sin(angle)) + ox
    v = (X * np.sin(angle) + Z * np.cos(angle)) + oy

    white = white_marble(u, v, 101)
    dark = green_marble(u, v, 303)
    rgb = np.where(green[..., None], dark, white)

    # each stone is cut a little lighter or darker than the next
    tone = (1.0 + rng.uniform(-0.035, 0.035, 13).astype(np.float32))[ident]
    rgb = np.clip(rgb * tone[..., None], 0.0, 1.0)

    # grout line wherever two stones meet
    edge = np.zeros((h, w), bool)
    edge[:, 1:] |= ident[:, 1:] != ident[:, :-1]
    edge[1:, :] |= ident[1:, :] != ident[:-1, :]
    for _ in range(max(1, round(GROUT * PX_PER_M))):
        edge = edge | np.roll(edge, 1, 0) | np.roll(edge, -1, 0) | np.roll(edge, 1, 1) | np.roll(edge, -1, 1)
    g = edge[..., None] * 0.75
    rgb = rgb * (1 - g) + GROUT_COLOUR * g
    return np.clip(rgb, 0.0, 1.0)


def save(rgb):
    h, w, _ = rgb.shape
    rgba = np.concatenate([rgb, np.ones((h, w, 1), np.float32)], axis=2)[::-1]  # Blender rows start at the bottom
    img = bpy.data.images.new("floor_inlay", w, h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(np.ascontiguousarray(rgba, np.float32).ravel())
    settings = bpy.context.scene.render.image_settings
    settings.file_format, settings.color_mode, settings.quality = "JPEG", "RGB", 90
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    img.filepath_raw = OUTPUT
    img.file_format = "JPEG"
    img.save()
    print(f"wrote {OUTPUT} ({w}x{h}, {os.path.getsize(OUTPUT) / 1024:.0f} KB)")


if __name__ == "__main__":
    save(build())
