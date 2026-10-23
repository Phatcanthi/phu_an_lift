"""
Bake the room's lighting (shadows, bounce light) and procedural textures into one lightmap
atlas, then export the web model (frontend/public/models/thang-may-room.glb).

Why: glTF cannot carry Blender's procedural node textures or Cycles' global illumination, so
an export without baking shows flat single-colour surfaces on the website. After baking, every
matte surface carries its final lit look in a texture; metals, mirrors, glass and glowing
materials stay real-time so their reflections still react to the moving camera (and the cabin
finish selector on the website keeps working).

How to run (Blender 4.2+ / 5.x):
  1. Open the room .blend (the one Thang_May_Room.glb was exported from) and save it.
  2. Scripting tab > Open > this file > Run Script. Window > Toggle System Console shows progress.
  3. When it finishes, the GLB is written to OUTPUT_GLB. The open scene has been modified
     (UVs, applied scale, baked materials): close it WITHOUT saving, or File > Revert.
     A copy of the original is saved next to it as <name>_before_bake.blend just in case.

Rules for what gets baked (per material, see is_bakeable):
  baked:     non-metallic, opaque, non-emissive Principled BSDF materials (walls, floor, wood,
             fabric, rug, stone, leaves, marble ...)
  real-time: metallic > 0.5, glass/transmission, transparent, emissive, or non-Principled
             materials, and objects named in EXCLUDE_PREFIXES (moving parts such as the doors).
An object is baked only if all of its materials are bakeable.
"""

import math
import os
import time

import bpy
import numpy as np

# ---------------------------------------------------------------- settings
SETTINGS = {
    # Where the web model goes. The website loads /models/thang-may-room.glb.
    "OUTPUT_GLB": r"D:\WorkSpace\PhuAnLift\WebApp\frontend\public\models\thang-may-room.glb",
    # Lightmap atlas size in pixels. 4096 is a good web trade-off (about 7 mm per pixel for this
    # room); 8192 is sharper but makes the download and GPU memory four times larger.
    "ATLAS_SIZE": 4096,
    # Cycles samples per pixel. Bake time grows linearly: on an RTX card 512 samples at 4096 px take
    # roughly 15-30 min for this room. Use 64 at 2048 px for a quick test; raise if corners look grainy.
    "SAMPLES": 512,
    # Baked light is stored divided by this and multiplied back on the web (emission strength),
    # so surfaces brighter than white keep some detail instead of clipping.
    "HEADROOM": 2.0,
    # Bake margin (pixels bled around each UV island) and UV island spacing (0..1 UV units).
    "MARGIN_PX": 8,
    "ISLAND_MARGIN": 0.003,
    # Objects never baked: they move on the website, so baked shadows would be wrong.
    "EXCLUDE_PREFIXES": ("Car_Door_",),
}
# A test harness can override settings by defining BAKE_OVERRIDES before running this file.
SETTINGS.update(globals().get("BAKE_OVERRIDES", {}))

BAKE_UV = "BakeUV"
ATLAS_NAME = "RoomLightmap"
NON_BAKE_NODES = {"EMISSION", "BSDF_GLASS", "BSDF_TRANSPARENT", "BSDF_REFRACTION", "BACKGROUND", "HOLDOUT"}


def log(msg):
    print(f"[bake_room] {msg}", flush=True)


# ---------------------------------------------------------------- material inspection
def principled(mat):
    if not mat or not mat.node_tree:
        return None
    return next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


def socket(node, *names):
    """Input socket by name; names differ between Blender versions (e.g. 'Emission' vs 'Emission Color')."""
    return next((node.inputs[n] for n in names if n in node.inputs), None)


def scalar(sock, default=0.0):
    """Unlinked socket value (largest channel for colours), or None if it is driven by other nodes."""
    if sock is None:
        return default
    if sock.is_linked:
        return None
    v = sock.default_value
    try:
        return max(v[:3])
    except TypeError:
        return float(v)


def is_bakeable(mat):
    p = principled(mat)
    if p is None:
        return False
    if any(n.type in NON_BAKE_NODES for n in mat.node_tree.nodes):
        return False
    metallic = scalar(socket(p, "Metallic"))
    transmission = scalar(socket(p, "Transmission Weight", "Transmission"))
    alpha = scalar(socket(p, "Alpha"), 1.0)
    strength = scalar(socket(p, "Emission Strength"), 1.0)
    emission = scalar(socket(p, "Emission Color", "Emission"))
    if metallic is None or metallic > 0.5:
        return False
    if transmission is None or transmission > 0.5:
        return False
    if alpha is None or alpha < 0.999:
        return False
    if strength is None or emission is None or strength * emission > 0:
        return False
    return True


def roughness_of(mat):
    r = scalar(socket(principled(mat), "Roughness"), 0.5)
    return 0.5 if r is None else r


# ---------------------------------------------------------------- steps
def collect_objects(view_layer):
    prefixes = tuple(SETTINGS["EXCLUDE_PREFIXES"])
    objs = []
    for o in view_layer.objects:
        if o.type != "MESH" or not o.visible_get() or o.hide_render or o.name.startswith(prefixes):
            continue
        if not o.data.polygons or not o.material_slots:
            continue
        if all(s.material and is_bakeable(s.material) for s in o.material_slots):
            objs.append(o)
    return objs


def select_only(objs, view_layer):
    for o in view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    view_layer.objects.active = objs[0]


def prepare_geometry(objs):
    """Give every object its own mesh and apply scale, so UV islands get sizes true to the world."""
    bpy.ops.object.make_single_user(type="SELECTED_OBJECTS", object=True, obdata=True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def unwrap(objs):
    """One shared UV layout for all baked objects (multi-object edit mode packs them together)."""
    for o in objs:
        uvs = o.data.uv_layers
        if BAKE_UV in uvs:
            uvs.remove(uvs[BAKE_UV])
        uvs.active = uvs.new(name=BAKE_UV)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.reveal()
    bpy.ops.mesh.select_all(action="SELECT")
    margin = SETTINGS["ISLAND_MARGIN"]
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    try:
        bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    except Exception as e:  # smart_project has already packed; this pass only tightens the layout
        log(f"pack_islands skipped: {e}")
    bpy.ops.object.mode_set(mode="OBJECT")


def setup_cycles(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SETTINGS["SAMPLES"]
    scene.cycles.device = "CPU"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
            try:
                prefs.compute_device_type = kind
            except TypeError:
                continue
            prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = "GPU"
                return kind
    except Exception as e:
        log(f"GPU setup failed, baking on CPU: {e}")
    return "CPU"


def bake(objs, materials, size):
    target = bpy.data.images.new(ATLAS_NAME + "_linear", size, size, alpha=False, float_buffer=True)
    nodes = []
    for mat in materials:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = target
        mat.node_tree.nodes.active = node
        nodes.append((mat, node))
    try:
        bpy.ops.object.bake(
            type="DIFFUSE",
            pass_filter={"DIRECT", "INDIRECT", "COLOR"},
            margin=SETTINGS["MARGIN_PX"],
            use_clear=True,
            uv_layer=BAKE_UV,
        )
    finally:
        for mat, node in nodes:
            mat.node_tree.nodes.remove(node)
    return target


def to_srgb_image(linear, path):
    """Scale by 1/HEADROOM, encode to sRGB and save as an 8-bit JPEG (which the glTF exporter embeds)."""
    size = linear.size[0]
    px = np.empty(size * size * 4, dtype=np.float32)
    linear.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    rgb = np.clip(px[:, :3] / SETTINGS["HEADROOM"], 0.0, 1.0)
    px[:, :3] = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(rgb, 1 / 2.4) - 0.055)
    px[:, 3] = 1.0

    image = bpy.data.images.new(ATLAS_NAME, size, size, alpha=False, float_buffer=False)
    image.pixels.foreach_set(px.ravel())
    image.filepath_raw = path
    image.file_format = "JPEG"
    try:
        image.save(filepath=path, quality=90)
    except TypeError:
        image.save()
    bpy.data.images.remove(linear)
    return image


def baked_material(src, atlas):
    """Emission-only copy of a material: shows the baked texture as is, keeps the original roughness for reflections."""
    name = f"{src.name}_Baked"
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    if not mat.node_tree:  # Blender 4.x; from 5.0 every material has a node tree
        mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    uv = nt.nodes.new("ShaderNodeUVMap")
    tex.image = atlas
    uv.uv_map = BAKE_UV
    socket(bsdf, "Base Color").default_value = (0, 0, 0, 1)
    socket(bsdf, "Metallic").default_value = 0.0
    socket(bsdf, "Roughness").default_value = roughness_of(src)
    socket(bsdf, "Emission Strength").default_value = SETTINGS["HEADROOM"]
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], socket(bsdf, "Emission Color", "Emission"))
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def apply_baked_materials(objs, atlas):
    cache = {}
    for o in objs:
        for slot in o.material_slots:
            src = slot.material
            if src.name not in cache:
                cache[src.name] = baked_material(src, atlas)
            slot.material = cache[src.name]
        # keep only the bake UVs, so they are exported as the model's first texture coordinates
        uvs = o.data.uv_layers
        for layer in [l for l in uvs if l.name != BAKE_UV]:
            uvs.remove(layer)


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    full = dict(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        # only what shows in the render: hidden leftovers (e.g. the default cube) stay out of the web model
        use_visible=True,
        use_renderable=True,
        export_apply=True,
        export_lights=False,
        export_cameras=False,
        export_image_format="AUTO",
    )
    try:
        bpy.ops.export_scene.gltf(**full)
    except TypeError as e:  # an option renamed in this Blender version; fall back to the essentials
        log(f"export option not supported ({e}); exporting with defaults")
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB")


# ---------------------------------------------------------------- main
def main():
    start = time.time()
    if not bpy.data.filepath:
        raise RuntimeError("Save the .blend file first (the script keeps a backup copy next to it).")
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    backup = bpy.data.filepath[:-6] + "_before_bake.blend"
    bpy.ops.wm.save_as_mainfile(filepath=backup, copy=True)
    log(f"backup saved: {backup}")

    scene = bpy.context.scene
    view_layer = bpy.context.view_layer
    objs = collect_objects(view_layer)
    if not objs:
        raise RuntimeError("No bakeable objects found.")
    materials = sorted({s.material for o in objs for s in o.material_slots}, key=lambda m: m.name)
    log(f"{len(objs)} objects / {len(materials)} materials to bake: {', '.join(m.name for m in materials)}")

    select_only(objs, view_layer)
    prepare_geometry(objs)
    unwrap(objs)
    log("UVs ready")

    device = setup_cycles(scene)
    size = SETTINGS["ATLAS_SIZE"]
    log(f"baking {size}x{size} at {SETTINGS['SAMPLES']} samples on {device} (this can take a while) ...")
    select_only(objs, view_layer)
    linear = bake(objs, materials, size)
    log(f"bake done in {time.time() - start:.0f}s")

    atlas_path = bpy.path.abspath(f"//{ATLAS_NAME}.jpg")
    atlas = to_srgb_image(linear, atlas_path)
    apply_baked_materials(objs, atlas)
    log(f"lightmap saved: {atlas_path}")

    export(SETTINGS["OUTPUT_GLB"])
    mb = os.path.getsize(SETTINGS["OUTPUT_GLB"]) / 1e6
    log(f"exported {SETTINGS['OUTPUT_GLB']} ({mb:.1f} MB) in {time.time() - start:.0f}s total")
    log("The open scene is now modified: close it without saving (or File > Revert).")


main()
