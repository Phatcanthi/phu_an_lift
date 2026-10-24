"""
Shared building blocks for the generated lift parts (build_ceilings.py, build_doors.py): materials laid out
the way the glTF exporter understands them, 2D outlines, extruded solids with real cut-outs and bevelled
edges, turned (lathe) parts, UVs for the brushed-metal and wood textures, and the GLB export.

2D outlines are lists of (a, b) points. A `frame` turns (a, b, h) into Blender coordinates, so the same
outline code serves a ceiling (plan seen from below, h = height) and a door (face seen from the front,
h = how far a part stands proud of the door face).
"""

import math
import os

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
TEXTURES = os.path.join(HERE, "textures")
VARIANTS = os.path.normpath(os.path.join(HERE, "..", "..", "frontend", "public", "models", "variants"))


# ---------------------------------------------------------------- materials

_images = {}


def _image(name, non_color):
    if name not in _images:
        img = bpy.data.images.load(os.path.join(TEXTURES, name))
        if non_color:
            img.colorspace_settings.name = "Non-Color"
        _images[name] = img
    return _images[name]


def material(name, color=(0.8, 0.8, 0.8), metallic=0.0, roughness=0.5, *, brushed=False, wood=False,
             emission=None, strength=0.0, coat=0.0, texture=None):
    """A Principled material. `brushed` adds the hairline steel normal and roughness maps, `wood` the wood
    grain (True for the walnut texture, or a file name in textures/), `texture` a colour map (a file in textures/)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.08
    if brushed or wood:
        prefix = "wood" if wood else "steel"
        # metallic/roughness packed the glTF way: G = roughness, B = metallic
        mr = nt.nodes.new("ShaderNodeTexImage")
        mr.image = _image(f"{prefix}_mr.jpg", True)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(mr.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
        nrm = nt.nodes.new("ShaderNodeTexImage")
        nrm.image = _image(f"{prefix}_normal.jpg", True)
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = 0.6 if brushed else 0.8
        nt.links.new(nrm.outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
        if wood:
            base = nt.nodes.new("ShaderNodeTexImage")
            base.image = _image(wood if isinstance(wood, str) else "wood_base.jpg", False)
            nt.links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
    if texture:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = _image(texture, False)
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return m


class Mats:
    """Creates each material of a palette ({key: factory}) on first use."""

    def __init__(self, palette):
        self._make = palette
        self._made = {}

    def __getitem__(self, key):
        if key not in self._made:
            self._made[key] = self._make[key]()
        return self._made[key]


# ---------------------------------------------------------------- 2D outlines

def rect(ca, cb, w, l, r=0.0, seg=6):
    """Rectangle centred on (ca, cb), w along a and l along b, with optional rounded corners."""
    hx, hd = w / 2, l / 2
    if r <= 0:
        return [(ca - hx, cb - hd), (ca + hx, cb - hd), (ca + hx, cb + hd), (ca - hx, cb + hd)]
    r = min(r, hx, hd)
    pts = []
    for (ox, od, a0) in ((hx - r, -hd + r, -90), (hx - r, hd - r, 0), (-hx + r, hd - r, 90), (-hx + r, -hd + r, 180)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((ca + ox + r * math.cos(a), cb + od + r * math.sin(a)))
    return pts


def box(a0, b0, a1, b1, r=0.0):
    return rect((a0 + a1) / 2, (b0 + b1) / 2, abs(a1 - a0), abs(b1 - b0), r)


def ellipse(ca, cb, ra, rb, rot=0.0, n=48):
    c, s = math.cos(rot), math.sin(rot)
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x, d = ra * math.cos(t), rb * math.sin(t)
        pts.append((ca + x * c - d * s, cb + x * s + d * c))
    return pts


def ribbon(path, width):
    """A strip of the given width along a polyline, as one closed outline."""
    left, right = [], []
    for i, (x, d) in enumerate(path):
        xa, da = path[max(i - 1, 0)]
        xb, db = path[min(i + 1, len(path) - 1)]
        tx, td = xb - xa, db - da
        ln = math.hypot(tx, td) or 1.0
        nx, nd = -td / ln * width / 2, tx / ln * width / 2
        left.append((x + nx, d + nd))
        right.append((x - nx, d - nd))
    return left + right[::-1]


def arc(ca, cb, r, a0, a1, n=40):
    """Points on a circle of radius r from angle a0 to a1 (degrees)."""
    return [(ca + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cb + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


# ---------------------------------------------------------------- frames

def plan(a, b, h):
    """Ceiling plan: a across the cabin, b from the back wall (-) to the door (+), h the height."""
    return (a, -b, h)


def face(y, outward):
    """A door face at Blender y, parts standing proud towards `outward` (+1 or -1); a across, b up."""
    return lambda a, b, h: (a, y + outward * h, b)


# ---------------------------------------------------------------- solids

def link(name, mesh, mat_list):
    mesh.name = name
    obj = bpy.data.objects.new(name, mesh)
    for m in mat_list:
        mesh.materials.append(m)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def uv_and_shade(mesh, scale=2.0, smooth_angle=35.0, vertical=False, offset=(0.0, 0.0)):
    """Box-projected UVs in metres x scale, smooth shading split at hard edges. The brushed grain runs along
    the texture's u: horizontal by default, up and down on upright faces when `vertical`. `offset` moves the
    texture, so neighbouring stones of one kind each show a different part of it."""
    # a boolean can leave several layers (or none active) behind; keep exactly one
    while mesh.uv_layers:
        mesh.uv_layers.remove(mesh.uv_layers[0])
    uv = mesh.uv_layers.new(name="UVMap").data
    for poly in mesh.polygons:
        n = poly.normal
        ax = max(range(3), key=lambda k: abs(n[k]))
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            if ax == 2:
                u, v = co.x, co.y
            elif ax == 0:
                u, v = co.y, co.z
            else:
                u, v = co.x, co.z
            if vertical and ax != 2:
                u, v = v, u
            uv[li].uv = (u * scale + offset[0], v * scale + offset[1])
    mesh.shade_smooth()
    mesh.set_sharp_from_angle(angle=math.radians(smooth_angle))


def join(target, other):
    bm = bmesh.new()
    bm.from_mesh(target.data)
    bm.from_mesh(other.data)
    bm.to_mesh(target.data)
    bm.free()
    m = other.data
    bpy.data.objects.remove(other)
    bpy.data.meshes.remove(m)


def apply(obj):
    """Bakes the modifier stack into the mesh (no operator context needed)."""
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = obj.evaluated_get(dg)
    new = bpy.data.meshes.new_from_object(ev)
    old = obj.data
    obj.modifiers.clear()
    obj.data = new
    new.name = obj.name
    bpy.data.meshes.remove(old)


def _solid(name, poly, h0, h1, mat, frame):
    bm = bmesh.new()
    n = len(poly)
    bottom = [bm.verts.new(frame(a, b, h0)) for a, b in poly]
    top = [bm.verts.new(frame(a, b, h1)) for a, b in poly]
    bm.faces.new(bottom)
    bm.faces.new(top)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return link(name, mesh, [mat])


def boolean(obj, outlines, h0, h1, frame, operation="DIFFERENCE"):
    """Cuts (or keeps only, with INTERSECT) the outlines, extruded a little beyond h0 .. h1, from obj."""
    cutter = _solid(obj.name + "_cut", outlines[0], h0 - 0.01, h1 + 0.01, obj.data.materials[0], frame)
    for o in outlines[1:]:
        join(cutter, _solid(obj.name + "_cutx", o, h0 - 0.01, h1 + 0.01, obj.data.materials[0], frame))
    mod = obj.modifiers.new("cut", "BOOLEAN")
    mod.operation = operation
    mod.solver = "EXACT"
    mod.use_self = True  # overlapping cutters (petals, lattices) intersect each other
    mod.object = cutter
    apply(obj)
    m = cutter.data
    bpy.data.objects.remove(cutter)
    bpy.data.meshes.remove(m)


def bevel(obj, width, segments=3):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(40)
    apply(obj)


def prism(name, poly, h0, h1, mat, holes=(), bevel_width=0.0015, frame=plan, clip=None, vertical=False, uv_scale=2.0,
          uv_offset=(0.0, 0.0)):
    """Extrudes an outline between h0 and h1. `holes` are outlines cut right through, `clip` outlines the
    part is trimmed to (a lattice kept inside an arch)."""
    obj = _solid(name, poly, h0, h1, mat, frame)
    if holes:
        boolean(obj, list(holes), h0, h1, frame)
    if clip:
        boolean(obj, list(clip), h0, h1, frame, "INTERSECT")
    if bevel_width:
        bevel(obj, bevel_width)
    uv_and_shade(obj.data, scale=uv_scale, vertical=vertical, offset=uv_offset)
    return obj


def prisms(name, polys, h0, h1, mat, bevel_width=0.0006, frame=plan, vertical=False, steps=None):
    """Many small outlines (a lattice, a tile grid) extruded into one object, cheaper than one each.
    `steps` gives each outline a height h1 + steps[i], so crossing strips do not share a top face."""
    bm = bmesh.new()
    for i, poly in enumerate(polys):
        top_h = h1 + (steps[i] if steps else 0.0)
        bottom = [bm.verts.new(frame(a, b, h0)) for a, b in poly]
        top = [bm.verts.new(frame(a, b, top_h)) for a, b in poly]
        bm.faces.new(bottom)
        bm.faces.new(top)
        n = len(poly)
        for k in range(n):
            j = (k + 1) % n
            bm.faces.new((bottom[k], bottom[j], top[j], top[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = link(name, mesh, [mat])
    if bevel_width:
        bevel(obj, bevel_width, segments=2)
    uv_and_shade(obj.data, vertical=vertical)
    return obj


def plane(name, poly, h, mat, frame=plan, facing=(0, 0, -1)):
    """A single face at h, its front turned towards `facing`."""
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new(frame(a, b, h)) for a, b in poly])
    f.normal_update()
    if f.normal.dot(facing) < 0:
        f.normal_flip()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = link(name, mesh, [mat])
    uv_and_shade(obj.data)
    return obj


def lathe(profile, seg=40):
    """Revolves a (radius, height) profile around the Z axis into a bmesh."""
    bm = bmesh.new()
    rings = []
    for k in range(seg):
        a = 2 * math.pi * k / seg
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    for k in range(seg):
        a, b = rings[k], rings[(k + 1) % seg]
        for i in range(len(profile) - 1):
            bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
    return bm


# ---------------------------------------------------------------- scene and export

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _images.clear()


def export(path):
    for o in bpy.context.scene.objects:
        o.select_set(o.type == "MESH")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
    )


def render_preview(path, location, rotation, lens, size=(700, 800), fill=(0.3, 0.3, 1.5)):
    """A quick EEVEE still for checking a model by eye."""
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = location
    cam.rotation_euler = rotation
    scene.collection.objects.link(cam)
    scene.camera = cam
    light = bpy.data.lights.new("fill", "POINT")
    light.energy = 60
    lo = bpy.data.objects.new("fill", light)
    lo.location = fill
    scene.collection.objects.link(lo)
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.25, 0.25, 0.26, 1)
    scene.world = world
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in engines else "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
