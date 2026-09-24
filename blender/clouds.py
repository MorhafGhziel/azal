# AZAL — painterly cloud layers.
# Usage: blender -b --factory-startup -P clouds.py -- <preset> <outdir> <res_x> <res_y> <samples>
# preset: dawn | dusk | wine
import bpy, sys, math, random, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PRESET = argv[0] if len(argv) > 0 else 'dawn'
OUT = argv[1] if len(argv) > 1 else '//out'
RX = int(argv[2]) if len(argv) > 2 else 1280
RY = int(argv[3]) if len(argv) > 3 else 720
SAMPLES = int(argv[4]) if len(argv) > 4 else 64
ONLY = argv[5].split(',') if len(argv) > 5 else None

PAL = {
    # sky gradient stops (bottom -> top), sun colour/strength, ambient colour/strength, cloud albedo
    'dawn': dict(sky=[(0.0, (0.96, 0.66, 0.44)), (0.35, (0.93, 0.72, 0.58)), (0.62, (0.62, 0.66, 0.74)), (1.0, (0.30, 0.40, 0.56))],
                 sun=(1.0, 0.70, 0.46), sun_e=5.2, amb=(0.42, 0.44, 0.62), amb_e=0.85, alb=(1.0, 0.95, 0.90),
                 sun_dir=(0.8, -0.25, -0.42)),
    'dusk': dict(sky=[(0.0, (0.93, 0.55, 0.40)), (0.3, (0.80, 0.50, 0.55)), (0.62, (0.45, 0.36, 0.52)), (1.0, (0.20, 0.17, 0.33))],
                 sun=(1.0, 0.56, 0.36), sun_e=4.2, amb=(0.36, 0.28, 0.50), amb_e=0.9, alb=(1.0, 0.92, 0.90),
                 sun_dir=(-0.75, 0.55, -0.35)),
    'wine': dict(sky=[(0.0, (0.20, 0.05, 0.06)), (1.0, (0.12, 0.03, 0.04))],
                 sun=(1.0, 0.45, 0.35), sun_e=2.4, amb=(0.30, 0.07, 0.09), amb_e=0.9, alb=(0.95, 0.80, 0.78),
                 sun_dir=(0.6, 0.7, -0.4)),
}[PRESET]

scn = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ---------- render ----------
scn.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    scn.cycles.device = 'GPU'
except Exception as e:
    print('GPU fail', e)
scn.cycles.samples = SAMPLES
scn.cycles.use_denoising = True
scn.cycles.max_bounces = 6
scn.render.resolution_x, scn.render.resolution_y = RX, RY
scn.render.film_transparent = True
scn.view_settings.view_transform = 'Standard'
scn.view_settings.look = 'None'
scn.view_settings.exposure = 0.0
scn.render.image_settings.file_format = 'PNG'
scn.render.image_settings.color_mode = 'RGBA'

# ---------- world (ambient only) ----------
w = bpy.data.worlds.new('W'); scn.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = (*PAL['amb'], 1); bg.inputs[1].default_value = PAL['amb_e']

# ---------- camera ----------
cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = 32; cam_d.sensor_width = 36
cam = bpy.data.objects.new('Cam', cam_d); scn.collection.objects.link(cam); scn.camera = cam
cam.location = (0, -90, 0); cam.rotation_euler = (math.radians(90), 0, 0)

# ---------- sun ----------
sd = bpy.data.lights.new('Sun', 'SUN'); sd.energy = PAL['sun_e']; sd.color = PAL['sun']; sd.angle = math.radians(4)
sun = bpy.data.objects.new('Sun', sd); scn.collection.objects.link(sun)
sun.rotation_euler = Vector(PAL['sun_dir']).normalized().to_track_quat('-Z', 'Y').to_euler()

# ---------- materials ----------
def cloud_mat(name, alb, sss=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*alb, 1)
    b.inputs['Roughness'].default_value = 1.0
    b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Subsurface Radius'].default_value = (1.0, 0.75, 0.6)
    b.inputs['Subsurface Scale'].default_value = 0.8
    b.inputs['Sheen Weight'].default_value = 0.6
    b.inputs['Sheen Roughness'].default_value = 0.6
    b.inputs['Sheen Tint'].default_value = (*PAL['sun'], 1)
    return m

MAT = cloud_mat('Cloud', PAL['alb'], 0.35)

def backdrop(dist=400):
    # emissive painted-sky card filling the frame
    h = 2 * dist * math.tan(math.atan(12 / 32)) * 1.25  # a bit bigger than frame height
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, dist - 90, 0), rotation=(math.radians(90), 0, 0))
    p = bpy.context.object; p.name = 'SKY'; p.scale = (h * RX / RY, h, 1)
    m = bpy.data.materials.new('Sky'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    noi = nt.nodes.new('ShaderNodeTexNoise'); noi.inputs['Scale'].default_value = 3.0; noi.inputs['Detail'].default_value = 6
    mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'MULTIPLY_ADD'
    mix.inputs[1].default_value = 0.08
    ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp
    stops = PAL['sky']
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = (*stops[0][1], 1)
    cr.elements[1].position = stops[-1][0]; cr.elements[1].color = (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos); e.color = (*col, 1)
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    nt.links.new(tc.outputs['UV'], noi.inputs['Vector'])
    nt.links.new(noi.outputs['Fac'], mix.inputs[0])
    nt.links.new(sep.outputs['Y'], mix.inputs[2])
    nt.links.new(mix.outputs[0], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs[0])
    p.data.materials.append(m)
    p.visible_shadow = False
    return p

def bank(name, cx, cy, cz, width, height, n, seed, rmin, rmax, dome=1.0, flat_base=True, levels=3):
    """Cumulus bank: primary lobes along a base line, child lobes grown on their upper surfaces."""
    rnd = random.Random(seed)
    mb = bpy.data.metaballs.new(name + '_mb'); mb.resolution = rmax * 0.09; mb.render_resolution = mb.resolution
    mb.threshold = 0.6
    obj = bpy.data.objects.new(name, mb); scn.collection.objects.link(obj)
    obj.location = (cx, cy, cz)
    balls = []
    nprim = max(3, n // 12)
    for i in range(nprim):
        u = (i + rnd.uniform(-0.35, 0.35)) / max(nprim - 1, 1) * 2 - 1
        prof = max(0.25, max(0.0, 1 - abs(u) ** 2) ** 0.7 * dome)
        r = rmax * rnd.uniform(0.75, 1.0) * (0.55 + 0.45 * prof)
        balls.append((Vector((u * width / 2, rnd.uniform(-1, 1) * width * 0.05, r * 0.3 * prof)), r, 0))
    frontier = list(balls)
    for lvl in range(1, levels + 1):
        nxt = []
        for c, r, _ in frontier:
            k = rnd.randint(2, 4)
            for j in range(k):
                a = rnd.uniform(0, 2 * math.pi); el = rnd.uniform(math.radians(15), math.radians(80))
                d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el) * 0.6, math.sin(el)))
                cr = r * rnd.uniform(0.45, 0.68)
                if cr < rmin: continue
                p = c + d * (r * 0.78)
                if p.z - cz > height * 1.2: continue
                nxt.append((p, cr, lvl))
        balls += nxt; frontier = nxt
    for c, r, _ in balls:
        el = mb.elements.new(); el.co = c; el.radius = r * 1.25; el.stiffness = 2.0
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    me = bpy.context.object; me.name = name
    if flat_base:
        zb = min(v.co.z for v in me.data.vertices) + rmax * 0.55
        for v in me.data.vertices:
            if v.co.z < zb: v.co.z = zb + (v.co.z - zb) * 0.15
    t1 = bpy.data.textures.new(name + '_t1', 'CLOUDS'); t1.noise_scale = rmax * 0.35; t1.noise_depth = 3
    d1 = me.modifiers.new('D1', 'DISPLACE'); d1.texture = t1; d1.strength = rmax * 0.28; d1.mid_level = 0.5
    t2 = bpy.data.textures.new(name + '_t2', 'CLOUDS'); t2.noise_scale = rmax * 0.1; t2.noise_depth = 2
    d2 = me.modifiers.new('D2', 'DISPLACE'); d2.texture = t2; d2.strength = rmax * 0.07; d2.mid_level = 0.5
    sm = me.modifiers.new('S', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 3
    bpy.ops.object.shade_smooth()
    me.data.materials.append(MAT)
    return me

# ---------- layouts (camera looks +Y from y=-90; frame half-height at dist d = d*12/32) ----------
LAYERS = {}
if PRESET in ('dawn', 'dusk'):
    LAYERS['sky'] = [backdrop()]
    LAYERS['far'] = [
        bank('far_a', -110, 200, 26, 170, 16, 60, 11, 2.5, 9, dome=0.5, levels=2),
        bank('far_b', 120, 210, -4, 190, 18, 60, 12, 2.5, 10, dome=0.5, levels=2),
    ]
    LAYERS['mid'] = [
        bank('mid_l', -84, 80, -30, 70, 40, 60, 21, 2.2, 15, dome=1.2),
        bank('mid_r', 90, 90, -38, 84, 46, 70, 22, 2.2, 17, dome=1.3),
    ]
    LAYERS['near'] = [
        bank('near_a', 0, 30, -52, 170, 26, 140, 31, 1.8, 13, dome=0.8),
    ]
    LAYERS['front'] = [
        bank('front_l', -40, -42, -22, 30, 12, 36, 41, 1.0, 7, dome=1.0),
        bank('front_r', 44, -40, -25, 34, 14, 36, 42, 1.0, 7.5, dome=1.0),
    ]
elif PRESET == 'wine':
    LAYERS['wine_back'] = [bank('wb', 0, 110, -48, 220, 30, 200, 51, 5, 13, dome=0.9)]
    LAYERS['wine_mist'] = [bank('wm_l', -46, 10, -30, 46, 16, 90, 52, 3, 8), bank('wm_r', 50, 14, -32, 50, 18, 90, 53, 3, 8)]

os.makedirs(bpy.path.abspath(OUT), exist_ok=True)
allobjs = [o for L in LAYERS.values() for o in L]
for lname, objs in LAYERS.items():
    if ONLY and lname not in ONLY: continue
    for o in allobjs:
        o.hide_render = o not in objs
    scn.render.film_transparent = (lname != 'sky')
    scn.render.filepath = os.path.join(bpy.path.abspath(OUT), f'{PRESET}_{lname}_raw.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', scn.render.filepath)
