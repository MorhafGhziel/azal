# AZAL — volumetric cloud layers, rendered one layer per transparent PNG.
# blender -b --factory-startup -P clouds2.py -- <preset> <outdir> <rx> <ry> <samples> [layers,comma]
import bpy, sys, math, random, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PRESET = argv[0] if len(argv) > 0 else 'dawn'
OUT = argv[1] if len(argv) > 1 else 'out'
RX = int(argv[2]) if len(argv) > 2 else 960
RY = int(argv[3]) if len(argv) > 3 else 540
SAMPLES = int(argv[4]) if len(argv) > 4 else 64
ONLY = argv[5].split(',') if len(argv) > 5 and argv[5] != 'all' else None
GRAD = float(argv[6]) if len(argv) > 6 else 6.0
BLUR = int(argv[7]) if len(argv) > 7 else 3

PAL = {
    'dawn': dict(sky=[(0.0, (0.98, 0.70, 0.45)), (0.28, (0.96, 0.76, 0.60)), (0.55, (0.72, 0.72, 0.78)), (1.0, (0.33, 0.44, 0.62))],
                 sun=(1.0, 0.64, 0.36), sun_e=20.0, sun_dir=(0.85, -0.16, -0.50),
                 amb=(0.46, 0.48, 0.78), amb_e=0.48, alb=(1.0, 0.94, 0.90)),
    'dusk': dict(sky=[(0.0, (0.95, 0.58, 0.40)), (0.3, (0.84, 0.52, 0.55)), (0.62, (0.50, 0.40, 0.58)), (1.0, (0.22, 0.18, 0.36))],
                 sun=(1.0, 0.50, 0.32), sun_e=14.0, sun_dir=(-0.62, 0.45, -0.5),
                 amb=(0.46, 0.32, 0.66), amb_e=0.42, alb=(1.0, 0.92, 0.92)),
    'wine': dict(sky=[(0.0, (0.20, 0.05, 0.06)), (1.0, (0.12, 0.03, 0.04))],
                 sun=(1.0, 0.50, 0.38), sun_e=3.0, sun_dir=(0.8, 0.3, -0.35),
                 amb=(0.34, 0.08, 0.10), amb_e=0.7, alb=(0.95, 0.82, 0.80)),
}[PRESET]

scn = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

scn.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for d in prefs.devices: d.use = True
scn.cycles.device = 'GPU'
scn.cycles.samples = SAMPLES
scn.cycles.use_denoising = True
scn.cycles.volume_bounces = 4
scn.cycles.max_bounces = 8
scn.render.resolution_x, scn.render.resolution_y = RX, RY
scn.view_settings.view_transform = 'Standard'
scn.view_settings.look = 'None'
scn.render.image_settings.file_format = 'PNG'
scn.render.image_settings.color_mode = 'RGBA'

w = bpy.data.worlds.new('W'); scn.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = (*PAL['amb'], 1); bg.inputs[1].default_value = PAL['amb_e']

LENS = 32.0
cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = LENS; cam_d.sensor_width = 36; cam_d.clip_end = 3000; cam_d.sensor_fit = 'HORIZONTAL'
cam = bpy.data.objects.new('Cam', cam_d); scn.collection.objects.link(cam); scn.camera = cam
cam.location = (0, 0, 0); cam.rotation_euler = (math.radians(90), 0, 0)  # looks +Y
HW = 18.0 / LENS            # half-width per unit distance
HH = HW * RY / RX           # half-height per unit distance

def at(D, fx, fy):
    """World point at distance D whose screen position is fx,fy in [-1,1] (x right, y up)."""
    return Vector((fx * HW * D, D, fy * HH * D))

sd = bpy.data.lights.new('Sun', 'SUN'); sd.energy = PAL['sun_e']; sd.color = PAL['sun']; sd.angle = math.radians(2)
sun = bpy.data.objects.new('Sun', sd); scn.collection.objects.link(sun)
sun.rotation_euler = Vector(PAL['sun_dir']).normalized().to_track_quat('-Z', 'Y').to_euler()

# ---------- volume material ----------
def vol_mat(name, density, alb, edge=0.5, nscale=0.08):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    pv = nt.nodes.new('ShaderNodeVolumePrincipled')
    pv.inputs['Color'].default_value = (*alb, 1)
    pv.inputs['Anisotropy'].default_value = 0.5
    attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'density'
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noi = nt.nodes.new('ShaderNodeTexNoise'); noi.inputs['Scale'].default_value = nscale
    noi.inputs['Detail'].default_value = 8; noi.inputs['Roughness'].default_value = 0.62
    noi.inputs['Distortion'].default_value = 0.3
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.55; mr.inputs['From Max'].default_value = 1.25; mr.inputs['To Min'].default_value = 0.0
    # density attr (0..1 inside spheres, softened) + noise erosion
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    s2 = nt.nodes.new('ShaderNodeMath'); s2.operation = 'MULTIPLY'; s2.inputs[1].default_value = density
    nt.links.new(tc.outputs['Object'], noi.inputs['Vector'])
    # erosion: noise shifted by density so the core stays solid, edges break up
    nt.links.new(noi.outputs['Fac'], add.inputs[0])
    nt.links.new(attr.outputs['Fac'], mul.inputs[0]); mul.inputs[1].default_value = 1.0
    nt.links.new(mul.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], s2.inputs[0])
    nt.links.new(s2.outputs[0], pv.inputs['Density'])
    nt.links.new(pv.outputs[0], out.inputs['Volume'])
    return m

def lobes(rnd, width, rmax, rmin, dome, levels, ceiling):
    balls = []
    nprim = max(3, int(width / (rmax * 0.62)))
    for i in range(nprim):
        u = (i + rnd.uniform(-0.3, 0.3)) / max(nprim - 1, 1) * 2 - 1
        prof = max(0.3, max(0.0, 1 - abs(u) ** 2) ** 0.6 * dome)
        r = rmax * rnd.uniform(0.7, 1.0) * (0.55 + 0.45 * prof)
        balls.append((Vector((u * width / 2, rnd.uniform(-1, 1) * rmax * 0.8, r * 0.25)), r))
    frontier = list(balls)
    for lvl in range(levels):
        nxt = []
        for c, r in frontier:
            for j in range(rnd.randint(3, 5) if lvl < 2 else rnd.randint(2, 4)):
                a = rnd.uniform(0, 2 * math.pi); el = rnd.uniform(math.radians(8), math.radians(80))
                d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el) * 0.7, math.sin(el)))
                cr = r * rnd.uniform(0.42, 0.62)
                if cr < rmin: continue
                p = c + d * (r * rnd.uniform(0.7, 0.9))
                if p.z > ceiling: continue
                nxt.append((p, cr))
        balls += nxt; frontier = nxt
    return balls

def cloud(name, D, fx, fy_base, width_frac, height_frac, seed, rmax_frac=0.13, dome=1.0, levels=3,
          density=18.0, edge=0.52, nscale=None, flat=True):
    """A cumulus mass at camera distance D. fx = centre x in screen units, fy_base = base in screen units,
    width_frac/height_frac in screen widths/heights."""
    rnd = random.Random(seed)
    width = width_frac * 2 * HW * D; height = height_frac * 2 * HH * D
    rmax = max(width, height) * rmax_frac
    balls = lobes(rnd, width, rmax, rmax * 0.07, dome, levels, height)
    mb = bpy.data.metaballs.new(name + '_mb'); mb.resolution = rmax * 0.035; mb.render_resolution = mb.resolution
    mb.threshold = 0.6
    ob = bpy.data.objects.new(name, mb); scn.collection.objects.link(ob)
    for c, r in balls:
        el = mb.elements.new(); el.co = c; el.radius = r * 1.3; el.stiffness = 2.0
    ob.location = at(D, fx, fy_base)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.object; ob.name = name
    if flat:
        zb = min(v.co.z for v in ob.data.vertices) + rmax * 0.5
        for v in ob.data.vertices:
            if v.co.z < zb: v.co.z = zb + (v.co.z - zb) * 0.12
    t1 = bpy.data.textures.new(name + '_t1', 'CLOUDS'); t1.noise_scale = rmax * 0.45; t1.noise_depth = 3
    d1 = ob.modifiers.new('D1', 'DISPLACE'); d1.texture = t1; d1.strength = rmax * 0.22; d1.mid_level = 0.5
    t2 = bpy.data.textures.new(name + '_t2', 'CLOUDS'); t2.noise_scale = rmax * 0.08; t2.noise_depth = 2
    d2 = ob.modifiers.new('D2', 'DISPLACE'); d2.texture = t2; d2.strength = rmax * 0.07; d2.mid_level = 0.5
    ng = bpy.data.node_groups.new(name + '_gn', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gi = ng.nodes.new('NodeGroupInput'); go = ng.nodes.new('NodeGroupOutput')
    m2v = ng.nodes.new('GeometryNodeMeshToVolume')
    m2v.inputs['Resolution Mode'].default_value = 'Size'
    m2v.inputs['Voxel Size'].default_value = rmax * 0.03
    dg = ng.nodes.new('GeometryNodeMeshToDensityGrid')
    dg.inputs['Voxel Size'].default_value = rmax * 0.03
    dg.inputs['Density'].default_value = 1.0
    dg.inputs['Gradient Width'].default_value = GRAD
    gm = ng.nodes.new('GeometryNodeGridMean')
    gm.inputs['Width'].default_value = 2; gm.inputs['Iterations'].default_value = BLUR
    st = ng.nodes.new('GeometryNodeStoreNamedGrid'); st.inputs['Name'].default_value = 'density'
    sm = ng.nodes.new('GeometryNodeSetMaterial'); sm.inputs['Material'].default_value = vol_mat(
        name + '_m', density / rmax, PAL['alb'], edge, 4.0 / rmax)
    ng.links.new(gi.outputs[0], m2v.inputs['Mesh'])
    ng.links.new(gi.outputs[0], dg.inputs['Mesh'])
    ng.links.new(dg.outputs[0], gm.inputs['Grid'])
    ng.links.new(m2v.outputs[0], st.inputs['Volume'])
    ng.links.new(gm.outputs[0], st.inputs['Grid'])
    ng.links.new(st.outputs[0], sm.inputs['Geometry'])
    ng.links.new(sm.outputs[0], go.inputs[0])
    mod = ob.modifiers.new('GN', 'NODES'); mod.node_group = ng
    ob['rmax'] = rmax
    return ob

def backdrop():
    D = 1500
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, D, 0), rotation=(math.radians(90), 0, 0))
    p = bpy.context.object; p.name = 'SKY'; p.scale = (2 * HW * D * 1.05, 2 * HH * D * 1.05, 1)
    m = bpy.data.materials.new('Sky'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    noi = nt.nodes.new('ShaderNodeTexNoise'); noi.inputs['Scale'].default_value = 2.5; noi.inputs['Detail'].default_value = 5
    mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'MULTIPLY_ADD'; mix.inputs[1].default_value = 0.10
    off = nt.nodes.new('ShaderNodeMath'); off.operation = 'SUBTRACT'; off.inputs[1].default_value = 0.05
    ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; st = PAL['sky']
    cr.elements[0].position = st[0][0]; cr.elements[0].color = (*st[0][1], 1)
    cr.elements[1].position = st[-1][0]; cr.elements[1].color = (*st[-1][1], 1)
    for pos, col in st[1:-1]:
        e = cr.elements.new(pos); e.color = (*col, 1)
    nt.links.new(tc.outputs['UV'], sep.inputs[0]); nt.links.new(tc.outputs['UV'], noi.inputs['Vector'])
    nt.links.new(noi.outputs['Fac'], mix.inputs[0]); nt.links.new(sep.outputs['Y'], mix.inputs[2])
    nt.links.new(mix.outputs[0], off.inputs[0]); nt.links.new(off.outputs[0], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs[0])
    p.data.materials.append(m); p.visible_shadow = False
    return p

LAYERS = {}
if PRESET in ('dawn', 'dusk'):
    s = 0 if PRESET == 'dawn' else 100
    LAYERS['sky'] = [backdrop()]
    if RY > RX:  # portrait: recomposed, not cropped
        LAYERS['far'] = [
            cloud('far_a', 1000, -0.45, -0.02, 0.95, 0.06, s + 11, rmax_frac=0.09, dome=0.8, levels=2, density=12),
            cloud('far_c', 1050, 0.55, 0.14, 0.75, 0.05, s + 12, rmax_frac=0.09, dome=0.8, levels=2, density=12),
        ]
        LAYERS['mid'] = [
            cloud('mid_l', 420, -0.72, -1.0, 1.05, 0.44, s + 21, rmax_frac=0.22, dome=1.3, levels=4, density=26, flat=False),
            cloud('mid_r', 450, 0.80, -1.08, 1.15, 0.52, s + 22, rmax_frac=0.22, dome=1.4, levels=4, density=26, flat=False),
        ]
        LAYERS['near'] = [cloud('near_a', 220, 0.0, -1.22, 2.6, 0.34, s + 31, rmax_frac=0.10, dome=0.7, levels=4, density=30, flat=False)]
        LAYERS['front'] = [
            cloud('front_l', 90, -1.0, -1.12, 1.0, 0.26, s + 41, rmax_frac=0.2, dome=1.0, density=16),
            cloud('front_r', 95, 1.02, -1.16, 1.1, 0.28, s + 42, rmax_frac=0.2, dome=1.0, density=16),
        ]
    else:
        LAYERS['far'] = [
            cloud('far_a', 1000, -0.70, -0.02, 0.42, 0.16, s + 11, rmax_frac=0.10, dome=0.9, levels=2, density=12),
            cloud('far_b', 1050, -0.12, -0.20, 0.30, 0.10, s + 13, rmax_frac=0.10, dome=0.7, levels=2, density=12),
            cloud('far_c', 1050, 0.62, -0.12, 0.50, 0.18, s + 12, rmax_frac=0.10, dome=0.9, levels=2, density=12),
        ]
        LAYERS['mid'] = [
            cloud('mid_l', 420, -0.80, -1.0, 0.70, 1.05, s + 21, rmax_frac=0.15, dome=1.3, levels=4, density=26, flat=False),
            cloud('mid_r', 450, 0.84, -1.1, 0.74, 1.25, s + 22, rmax_frac=0.15, dome=1.4, levels=4, density=26, flat=False),
        ]
        LAYERS['near'] = [
            cloud('near_a', 220, 0.0, -1.45, 1.6, 0.78, s + 31, rmax_frac=0.10, dome=0.7, levels=4, density=30, flat=False),
        ]
        LAYERS['front'] = [
            cloud('front_l', 90, -1.0, -1.3, 0.62, 0.55, s + 41, rmax_frac=0.16, dome=1.0, density=16),
            cloud('front_r', 95, 1.02, -1.35, 0.66, 0.6, s + 42, rmax_frac=0.16, dome=1.0, density=16),
        ]
elif PRESET == 'wine':
    LAYERS['wine_back'] = [cloud('wb', 400, 0.0, -1.2, 1.5, 0.6, 51, rmax_frac=0.1, dome=0.8, density=14)]
    LAYERS['wine_mist'] = [cloud('wm_l', 120, -0.85, -1.2, 0.6, 0.5, 52, rmax_frac=0.18, density=10),
                           cloud('wm_r', 125, 0.9, -1.25, 0.6, 0.55, 53, rmax_frac=0.18, density=10)]

os.makedirs(OUT, exist_ok=True)
allobjs = [o for L in LAYERS.values() for o in L]
for lname, objs in LAYERS.items():
    if ONLY and lname not in ONLY: continue
    for o in allobjs: o.hide_render = o not in objs
    scn.render.film_transparent = (lname != 'sky')
    scn.render.filepath = os.path.join(OUT, f'{PRESET}_{lname}_raw.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', scn.render.filepath)
