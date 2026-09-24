# Notes ingredients as separate transparent cut-outs (later painted with strokes.py 'ing').
# blender -b --factory-startup -P ingredients.py -- OUTDIR [samples] [size] [only=a,b]
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
SAMPLES = int(argv[1]) if len(argv) > 1 else 160
SIZE = int(argv[2]) if len(argv) > 2 else 1024
ONLY = argv[3].split(',') if len(argv) > 3 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'GPU'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices: d.use = True
sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = SIZE
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
wd = bpy.data.worlds.new('W'); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes['Background'].inputs[0].default_value = (0.95, 0.86, 0.8, 1)
wd.node_tree.nodes['Background'].inputs[1].default_value = 0.25


def link(o, col=None): (col or sc.collection).objects.link(o); return o


def mat(name, col, rough=0.5, sss=0.0, sss_r=(0.3, 0.2, 0.1), coat=0.0, bump=0.0, bscale=40.0, sheen=0.0, noise_col=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Subsurface Radius'].default_value = sss_r
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Sheen Weight'].default_value = sheen
    if noise_col:  # colour variation
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6
        rp = nt.nodes.new('ShaderNodeValToRGB')
        rp.color_ramp.elements[0].color = (*col, 1); rp.color_ramp.elements[1].color = (*noise_col, 1)
        nt.links.new(nz.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    if bump:
        v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = bscale
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
        nt.links.new(v.outputs['Distance'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def new_col(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c


def cyl(r, h, z, m, col, verts=128):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(0, 0, z))
    o = bpy.context.object; o.data.materials.append(m)
    for c in o.users_collection: c.objects.unlink(o)
    link(o, col)
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = min(0.02, h * 0.3); bv.segments = 3
    bpy.ops.object.shade_smooth()
    return o


def mesh_obj(name, bm, m, col):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = link(bpy.data.objects.new(name, me), col); o.data.materials.append(m); return o


# ---------------------------------------------------------------- materials
RIND = mat('Rind', (0.36, 0.50, 0.06), 0.35, 0.05, bump=0.25, bscale=140, noise_col=(0.62, 0.62, 0.10))
PITH = mat('Pith', (0.86, 0.84, 0.66), 0.6, 0.5, (0.4, 0.4, 0.3))
FLESH = mat('Flesh', (0.80, 0.76, 0.22), 0.15, 0.8, (0.6, 0.55, 0.15), coat=0.5, bump=0.45, bscale=30, noise_col=(0.90, 0.70, 0.18))
LEAF = mat('Leaf', (0.08, 0.22, 0.05), 0.35, 0.1, coat=0.3)
SAFF = mat('Saffron', (0.30, 0.012, 0.004), 0.4, 0.3, (0.5, 0.06, 0.02), noise_col=(0.62, 0.10, 0.01))
STIG = mat('Style', (0.85, 0.60, 0.12), 0.5)
PEPP = mat('Pepper', (0.70, 0.16, 0.20), 0.35, 0.1, coat=0.2, bump=0.35, bscale=45, noise_col=(0.52, 0.08, 0.14))
ROSE = mat('Rose', (0.80, 0.30, 0.42), 0.45, 0.45, (0.6, 0.2, 0.25), sheen=0.4, noise_col=(0.92, 0.52, 0.60))
JAS = mat('Jasmine', (0.95, 0.93, 0.86), 0.5, 0.6, (0.5, 0.5, 0.4), sheen=0.3)
JASC = mat('JasC', (0.85, 0.72, 0.30), 0.5)
OUD = mat('Oud', (0.16, 0.08, 0.04), 0.6)
_nt = OUD.node_tree; _b = _nt.nodes['Principled BSDF']
_w = _nt.nodes.new('ShaderNodeTexWave'); _w.inputs['Scale'].default_value = 1.6; _w.inputs['Distortion'].default_value = 14; _w.inputs['Detail'].default_value = 6
_r = _nt.nodes.new('ShaderNodeValToRGB'); _r.color_ramp.elements[0].color = (0.10, 0.05, 0.02, 1); _r.color_ramp.elements[1].color = (0.36, 0.22, 0.11, 1)
_r.color_ramp.elements[0].position = 0.15; _r.color_ramp.elements[1].position = 0.95
_nt.links.new(_w.outputs['Fac'], _r.inputs['Fac']); _nt.links.new(_r.outputs['Color'], _b.inputs['Base Color'])
_bp = _nt.nodes.new('ShaderNodeBump'); _bp.inputs['Strength'].default_value = 0.35
_nt.links.new(_w.outputs['Fac'], _bp.inputs['Height']); _nt.links.new(_bp.outputs['Normal'], _b.inputs['Normal'])
AMBER = mat('Amber', (0.80, 0.36, 0.05), 0.25, 0.9, (0.9, 0.45, 0.1), coat=0.3, noise_col=(0.45, 0.14, 0.02))

rnd = random.Random(11)
GROUPS = {}

# bergamot slice: rind / pith / flesh wedges stacked (no booleans)
c = new_col('slice'); GROUPS['slice'] = c
cyl(1.0, 0.12, 0, RIND, c); cyl(0.93, 0.10, -0.008, PITH, c)
for i in range(10):
    a0, a1 = 2 * math.pi * i / 10 + 0.045, 2 * math.pi * (i + 1) / 10 - 0.045
    bm = bmesh.new(); pts = [(0.87 * math.cos(a0 + (a1 - a0) * t / 16), 0.87 * math.sin(a0 + (a1 - a0) * t / 16)) for t in range(17)]
    pts.append((0.07 * math.cos((a0 + a1) / 2), 0.07 * math.sin((a0 + a1) / 2)))
    f = bm.faces.new([bm.verts.new((x, y, -0.055)) for x, y in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ex['geom']:
        if isinstance(v, bmesh.types.BMVert): v.co.z += 0.12
    o = mesh_obj('Seg', bm, FLESH, c)
    b = o.modifiers.new('bv', 'BEVEL'); b.width = 0.025; b.segments = 3
    s = o.modifiers.new('ss', 'SUBSURF'); s.levels = s.render_levels = 2
cyl(0.06, 0.10, 0.0, PITH, c, 32)

# whole bergamot + leaf
c = new_col('fruit'); GROUPS['fruit'] = c
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=96, ring_count=64)
o = bpy.context.object; o.scale = (1, 1, 0.93)
for v in o.data.vertices:
    v.co.z += 0.12 * max(0, v.co.z) ** 3  # small nipple at the top
o.data.materials.append(RIND); bpy.ops.object.shade_smooth()
for cc in o.users_collection: cc.objects.unlink(o)
link(o, c)
bm = bmesh.new(); n = 20
ptsL = [(0.9 * t / n, 0.28 * math.sin(math.pi * t / n)) for t in range(n + 1)]
ptsR = [(0.9 * t / n, -0.28 * math.sin(math.pi * t / n)) for t in range(n - 1, 0, -1)]
f = bm.faces.new([bm.verts.new((x, y, 0)) for x, y in ptsL + ptsR])
bmesh.ops.triangulate(bm, faces=[f]); bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
for v in bm.verts: v.co.z = 0.18 * (v.co.x / 0.9) ** 2 - 0.3 * v.co.y ** 2
lf = mesh_obj('Leaf', bm, LEAF, c); lf.location = (0.05, 0.1, 0.92); lf.rotation_euler = (0.3, -0.5, 0.6)
lf.modifiers.new('so', 'SOLIDIFY').thickness = 0.015

# saffron threads
c = new_col('saffron'); GROUPS['saffron'] = c
for i in range(26):
    cu = bpy.data.curves.new('T', 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(3)
    a = rnd.uniform(0, 2 * math.pi); base = Vector((rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35), rnd.uniform(0, 0.12)))
    d = Vector((math.cos(a), math.sin(a), rnd.uniform(-0.2, 0.3))).normalized(); side = Vector((-d.y, d.x, 0))
    L = rnd.uniform(0.7, 1.05)
    for k, bp in enumerate(sp.bezier_points):
        t = k / 3
        bp.co = base + d * L * t + side * math.sin(t * math.pi * 1.3) * rnd.uniform(-0.18, 0.18)
        bp.handle_left_type = bp.handle_right_type = 'AUTO'; bp.radius = 0.5 + 1.4 * t ** 2
    cu.bevel_depth = 0.022; cu.bevel_resolution = 4
    link(bpy.data.objects.new('T', cu), c).data.materials.append(SAFF if i % 9 else STIG)

# pink peppercorns
c = new_col('pepper'); GROUPS['pepper'] = c
for i in range(7):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=rnd.uniform(0.2, 0.26), segments=48, ring_count=32,
                                         location=(rnd.uniform(-0.45, 0.45), rnd.uniform(-0.45, 0.45), rnd.uniform(0, 0.25)))
    o = bpy.context.object; o.scale = (1, rnd.uniform(0.9, 1.05), rnd.uniform(0.85, 1)); bpy.ops.object.shade_smooth()
    o.data.materials.append(PEPP)
    for cc in o.users_collection: cc.objects.unlink(o)
    link(o, c)


def petal_mesh(w, h, cup, curl, m, col):
    """A cupped petal: grid shaped to a round-top outline, bent into a cup, rim rolled back."""
    bm = bmesh.new(); nx, ny = 14, 18; grid = []
    for j in range(ny + 1):
        y = j / ny; hw = w * (0.18 + 0.82 * math.sin(min(1, y * 1.15) * math.pi / 2) ** 0.8) * (1 - 0.25 * max(0, y - 0.75) / 0.25)
        row = []
        for i in range(nx + 1):
            x = (i / nx - 0.5) * 2 * hw
            z = cup * (x / max(w, 1e-3)) ** 2 - curl * max(0, y - 0.7) ** 2 * 4
            row.append(bm.verts.new((x, y * h, z)))
        grid.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    o = mesh_obj('P', bm, m, col); o.modifiers.new('so', 'SOLIDIFY').thickness = 0.012
    s = o.modifiers.new('ss', 'SUBSURF'); s.levels = s.render_levels = 1
    return o


# Taif rose: petals on a spiral, inner ones tight and upright, outer ones open
c = new_col('rose'); GROUPS['rose'] = c
N = 26
for i in range(N):
    t = i / (N - 1)
    p = petal_mesh(0.34 + 0.34 * t, 0.62 + 0.4 * t, 0.55 - 0.25 * t, 0.05 + 0.4 * t, ROSE, c)
    ang = i * 2.39996
    tilt = math.radians(4 + 70 * t ** 1.6)
    r = 0.03 + 0.16 * t
    p.matrix_world = Matrix.Rotation(ang, 4, 'Z') @ Matrix.Translation((0, r, 0.02 * (1 - t))) @ Matrix.Rotation(math.pi / 2 - tilt, 4, 'X')
# a couple of sepals
for i in range(5):
    p = petal_mesh(0.12, 0.7, 0.1, 0.2, LEAF, c)
    p.matrix_world = Matrix.Rotation(i * 1.2566, 4, 'Z') @ Matrix.Translation((0, 0.1, -0.08)) @ Matrix.Rotation(math.radians(-15), 4, 'X')

# jasmine: two small five-petal stars
c = new_col('jasmine'); GROUPS['jasmine'] = c
for fx, fy, fr in ((0, 0, 0), (1.05, 0.55, 0.5)):
    for i in range(5):
        p = petal_mesh(0.28, 0.7, 0.08, -0.05, JAS, c)
        p.matrix_world = Matrix.Translation((fx, fy, 0)) @ Matrix.Rotation(fr + i * 1.2566, 4, 'Z') @ Matrix.Translation((0, 0.05, 0)) @ Matrix.Rotation(math.radians(-8), 4, 'X')
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(fx, fy, 0.03))
    o = bpy.context.object; o.data.materials.append(JASC)
    for cc in o.users_collection: cc.objects.unlink(o)
    link(o, c)

# oud chips: irregular split slabs
c = new_col('oud'); GROUPS['oud'] = c
for k, (x, y, rz) in enumerate(((-0.5, 0, 0.3), (0.6, 0.3, -0.5), (0.1, -0.6, 1.2))):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0))
    o = bpy.context.object; o.scale = (rnd.uniform(0.9, 1.3), rnd.uniform(0.35, 0.5), rnd.uniform(0.12, 0.2)); o.rotation_euler = (0, 0, rz)
    bpy.ops.object.transform_apply(scale=True)
    s = o.modifiers.new('ss', 'SUBSURF'); s.levels = s.render_levels = 4; s.subdivision_type = 'SIMPLE'
    tx = bpy.data.textures.new(f'n{k}', 'CLOUDS'); tx.noise_scale = 0.35
    dp = o.modifiers.new('d', 'DISPLACE'); dp.texture = tx; dp.strength = 0.12
    o.data.materials.append(OUD); bpy.ops.object.shade_smooth()
    for cc in o.users_collection: cc.objects.unlink(o)
    link(o, c)

# amber resin nuggets
c = new_col('amber'); GROUPS['amber'] = c
for k, (x, y, r) in enumerate(((-0.4, 0, 0.55), (0.55, 0.2, 0.4), (0.1, -0.55, 0.3))):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, y, 0))
    o = bpy.context.object
    tx = bpy.data.textures.new(f'a{k}', 'VORONOI'); tx.noise_scale = 0.5
    dp = o.modifiers.new('d', 'DISPLACE'); dp.texture = tx; dp.strength = 0.22
    o.data.materials.append(AMBER)
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = 0.02; bv.segments = 2
    for cc in o.users_collection: cc.objects.unlink(o)
    link(o, c)

# ---------------------------------------------------------------- light + camera
tgt = link(bpy.data.objects.new('T', None))
cam = link(bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))); cam.data.lens = 85; sc.camera = cam
cam.constraints.new('TRACK_TO').target = tgt


def area(name, loc, size, power, colr):
    l = link(bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA')))
    l.data.size = size; l.data.energy = power; l.data.color = colr; l.location = loc
    l.constraints.new('TRACK_TO').target = tgt


area('Key', (-5, -4, 6), 4, 700, (1.0, 0.88, 0.74))   # warm sun, upper left, like the hero sky
area('Fill', (5, -5, 2), 6, 120, (0.78, 0.8, 1.0))    # lavender fill
area('Rim', (2, 6, 3), 2.5, 500, (1.0, 0.8, 0.66))

VIEW = {'slice': (0.2, -1, 1.1), 'fruit': (0.3, -1, 0.35), 'saffron': (0.1, -1, 1.2), 'pepper': (0.2, -1, 0.9),
        'rose': (0.1, -1, 1.0), 'jasmine': (0.2, -1, 1.3), 'oud': (0.3, -1, 0.9), 'amber': (0.2, -1, 0.7)}

dg = bpy.context.evaluated_depsgraph_get
for name, col in GROUPS.items():
    if ONLY and name not in ONLY: continue
    for n2, c2 in GROUPS.items(): c2.hide_render = n2 != name
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(b) for o in col.all_objects for b in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2; rad = (hi - lo).length / 2
    tgt.location = ctr
    d = Vector(VIEW[name]).normalized()
    fov = 2 * math.atan(36 / 2 / cam.data.lens)
    cam.location = ctr + d * rad / math.sin(fov / 2) * 0.92
    sc.render.filepath = f'{OUT}/{name}.png'
    bpy.ops.render.render(write_still=True)
    print('WROTE', name, flush=True)
