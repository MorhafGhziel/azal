"""AZAL rose petal (Blender 5.2, Cycles GPU, headless).

  blender -b --factory-startup -P petal.py -- --mode loop   [--samples 256] [--frames 0,12] [--out DIR]
  blender -b --factory-startup -P petal.py -- --mode stills [--samples 512] [--out DIR]

loop   : 48 frames, 384x384 RGBA -> DIR/loop/0000.png ... (seamless tumble)
stills : 768x768 RGBA -> DIR/petal_a.png, petal_b.png, petal_c.png (c = lying flat, seen from above)
"""
import bpy, bmesh, math, sys, os, argparse
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--mode', default='loop')
ap.add_argument('--samples', type=int, default=256)
ap.add_argument('--frames', default='')
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'petal'))
A = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def link(o):
    sc.collection.objects.link(o)
    return o


def smooth(e0, e1, x):
    t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- outline (flat, y = 0 base .. 1 top)
def half_width(y):
    if y <= 0.60:
        t = y / 0.60
        return 0.045 + 0.495 * math.sin(math.pi / 2 * t) ** 1.5
    t = (y - 0.60) / 0.40
    return 0.54 * max(1 - t * t, 0) ** 0.5


def outline(n=240):
    ys = [i / n for i in range(n + 1)]
    right = [(half_width(y) * (1 + 0.035 * math.sin(7 * y)), y) for y in ys]
    left = [(-half_width(y) * (1 - 0.03 * math.sin(5 * y + 1)), y) for y in reversed(ys)]
    pts = right + left[1:]
    # a whisper of a notch at the very top, slightly off-centre (real petals are never symmetric)
    out = []
    for x, y in pts:
        y -= 0.022 * math.exp(-((x - 0.03) / 0.07) ** 2) * smooth(0.9, 1.0, y)
        out.append((x, y))
    return out


OUT = outline()
C = Vector((0.0, 0.47))


def ray_dist(theta):
    d = Vector((math.cos(theta), math.sin(theta)))
    best = None
    for i in range(len(OUT)):
        a = Vector(OUT[i]); b = Vector(OUT[(i + 1) % len(OUT)])
        e = b - a
        den = d.x * (-e.y) - d.y * (-e.x)
        if abs(den) < 1e-12:
            continue
        w = a - C
        t = (w.x * (-e.y) - w.y * (-e.x)) / den
        u = (d.x * w.y - d.y * w.x) / den
        if t > 0 and 0 <= u <= 1:
            best = t if best is None else min(best, t)
    return best


NU, NV = 90, 140
V_TOP = 0.992
bm = bmesh.new()
uvl = bm.loops.layers.uv.new('UV')
grid = []
flat = {}
for j in range(NV + 1):
    v = V_TOP * j / NV
    row = []
    for i in range(NU + 1):
        u = -1 + 2 * i / NU
        h = half_width(v)
        x = u * h * (1 + (0.035 * math.sin(7 * v) if u > 0 else -0.03 * math.sin(5 * v + 1)))
        y = v - 0.006 * math.exp(-((x - 0.05) / 0.12) ** 2) * smooth(0.9, 1.0, v)
        vert = bm.verts.new((x, y, 0))
        # edge proximity 0..1 (1 on the rim) and a coordinate running along the rim
        e = max(abs(u), smooth(0.86, V_TOP, v))
        along = v * (1 if u >= 0 else -1) + (1 - abs(u)) * 0.6 * smooth(0.8, 1.0, v)
        flat[vert] = (x, y, e, along)
        row.append(vert)
    grid.append(row)
for j in range(NV):
    for i in range(NU):
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
for f in bm.faces:
    for l in f.loops:
        x, y, _, _ = flat[l.vert]
        l[uvl].uv = (x + 0.5, y)


# ---------------------------------------------------------------- 3D shaping
def fold_d(x, y):
    p0 = Vector((-0.16, 0.30)); p1 = Vector((0.30, 0.98))
    e = (p1 - p0).normalized()
    w = Vector((x, y)) - p0
    return (w - e * w.dot(e)).length


for vert in bm.verts:
    x, y, e, along = flat[vert]
    z = 0.0
    z += 0.62 * x * x * (0.35 + 0.8 * y)                  # cupped across the width
    z += 0.30 * y * y                                      # whole petal bends toward its inside
    z -= 0.10 * smooth(0.80, 1.0, e) ** 1.6 * smooth(0.35, 0.9, y)   # rim rolls back at the top
    ed = e ** 6
    z += ed * (0.014 * math.sin(along * 17 + 1.3) + 0.006 * math.sin(along * 31 + 0.4) + 0.002 * math.sin(along * 67 + 2.0))
    z -= 0.02 * math.exp(-(fold_d(x, y) / 0.11) ** 2) * smooth(0.2, 0.6, y)   # one soft fold
    z += 0.06 * x * y                                       # slight twist
    z += 0.05 * (1 - smooth(0.0, 0.25, y))                  # claw lifts a little
    vert.co = Vector((x, y, z))
for f in bm.faces:
    f.smooth = True
me = bpy.data.meshes.new('Petal'); bm.to_mesh(me); bm.free()
petal = link(bpy.data.objects.new('Petal', me))
sol = petal.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = 0.007; sol.offset = 0.0
sol.use_even_offset = False

# centre the petal on its bounds
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
ev = petal.evaluated_get(dg)
cs = [ev.matrix_world @ Vector(b) for b in ev.bound_box]
mid = sum(cs, Vector()) / 8
petal.location = -mid
pivot = link(bpy.data.objects.new('Pivot', None))
petal.parent = pivot

# ---------------------------------------------------------------- material
m = bpy.data.materials.new('PetalM'); m.use_nodes = True
nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
out = nt.nodes.new('ShaderNodeOutputMaterial')
p = nt.nodes.new('ShaderNodeBsdfPrincipled')
uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UV'
sep = nt.nodes.new('ShaderNodeSeparateXYZ'); L(uv.outputs[0], sep.inputs[0])
# colour gradient base -> tip
ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp
cr.elements[0].position = 0.0; cr.elements[0].color = (0.90, 0.64, 0.42, 1)     # warm, slightly yellow claw
cr.elements[1].position = 0.55; cr.elements[1].color = (0.88, 0.60, 0.57, 1)    # #EED3C8-ish blush ivory
e = cr.elements.new(0.22); e.color = (0.89, 0.58, 0.48, 1)
e = cr.elements.new(1.0); e.color = (0.90, 0.66, 0.63, 1)
L(sep.outputs['Y'], ramp.inputs['Fac'])
# low-frequency blotch variation
tc = nt.nodes.new('ShaderNodeTexCoord')
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 3
L(tc.outputs['UV'], nz.inputs['Vector'])
blot = nt.nodes.new('ShaderNodeMapRange'); blot.inputs['To Min'].default_value = 0.94; blot.inputs['To Max'].default_value = 1.04
L(nz.outputs['Fac'], blot.inputs['Value'])
# veins: faint lines fanning from the base
ox = nt.nodes.new('ShaderNodeMath'); ox.operation = 'SUBTRACT'; ox.inputs[1].default_value = 0.5
L(sep.outputs['X'], ox.inputs[0])
oy = nt.nodes.new('ShaderNodeMath'); oy.operation = 'ADD'; oy.inputs[1].default_value = 0.10
L(sep.outputs['Y'], oy.inputs[0])
at = nt.nodes.new('ShaderNodeMath'); at.operation = 'ARCTAN2'
L(ox.outputs[0], at.inputs[0]); L(oy.outputs[0], at.inputs[1])
nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 3.5; nz2.inputs['Detail'].default_value = 4
L(tc.outputs['UV'], nz2.inputs['Vector'])
wob = nt.nodes.new('ShaderNodeMath'); wob.operation = 'MULTIPLY_ADD'
nzm = nt.nodes.new('ShaderNodeMath'); nzm.operation = 'MULTIPLY'; nzm.inputs[1].default_value = 5.0
L(nz2.outputs['Fac'], nzm.inputs[0])
L(at.outputs[0], wob.inputs[0]); wob.inputs[1].default_value = 52.0; L(nzm.outputs[0], wob.inputs[2])
cs_ = nt.nodes.new('ShaderNodeMath'); cs_.operation = 'COSINE'; L(wob.outputs[0], cs_.inputs[0])
ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L(cs_.outputs[0], ab.inputs[0])
vv = nt.nodes.new('ShaderNodeMapRange'); vv.interpolation_type = 'SMOOTHSTEP'
vv.inputs['From Min'].default_value = 0.94; vv.inputs['From Max'].default_value = 1.0
L(ab.outputs[0], vv.inputs['Value'])
fadev = nt.nodes.new('ShaderNodeMapRange'); fadev.inputs['From Min'].default_value = 0.05; fadev.inputs['From Max'].default_value = 0.95
fadev.inputs['To Min'].default_value = 1.0; fadev.inputs['To Max'].default_value = 0.25
L(sep.outputs['Y'], fadev.inputs['Value'])
vmul = nt.nodes.new('ShaderNodeMath'); vmul.operation = 'MULTIPLY'
L(vv.outputs['Result'], vmul.inputs[0]); L(fadev.outputs['Result'], vmul.inputs[1])
vamt = nt.nodes.new('ShaderNodeMath'); vamt.operation = 'MULTIPLY_ADD'
L(vmul.outputs[0], vamt.inputs[0]); vamt.inputs[1].default_value = -0.045; vamt.inputs[2].default_value = 1.0
tot = nt.nodes.new('ShaderNodeMath'); tot.operation = 'MULTIPLY'
L(vamt.outputs[0], tot.inputs[0]); L(blot.outputs['Result'], tot.inputs[1])
col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'; col.blend_type = 'MULTIPLY'; col.inputs['Factor'].default_value = 1.0
L(ramp.outputs['Color'], col.inputs['A'])
cc = nt.nodes.new('ShaderNodeCombineXYZ')
for k in range(3):
    L(tot.outputs[0], cc.inputs[k])
L(cc.outputs[0], col.inputs['B'])
L(col.outputs['Result'], p.inputs['Base Color'])
p.inputs['Roughness'].default_value = 0.56
p.inputs['Specular IOR Level'].default_value = 0.35
p.inputs['Subsurface Weight'].default_value = 1.0
p.inputs['Subsurface Radius'].default_value = (1.0, 0.42, 0.28)
p.inputs['Subsurface Scale'].default_value = 0.012
p.inputs['Sheen Weight'].default_value = 0.2
p.inputs['Sheen Roughness'].default_value = 0.4
p.inputs['Sheen Tint'].default_value = (1.0, 0.95, 0.92, 1)
# micro bump (cell texture of petal epidermis) + vein relief
vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 900
L(tc.outputs['UV'], vor.inputs['Vector'])
bsum = nt.nodes.new('ShaderNodeMath'); bsum.operation = 'MULTIPLY_ADD'
L(vmul.outputs[0], bsum.inputs[0]); bsum.inputs[1].default_value = -1.0; L(vor.outputs['Distance'], bsum.inputs[2])
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08; bump.inputs['Distance'].default_value = 0.0015
L(bsum.outputs[0], bump.inputs['Height']); L(bump.outputs['Normal'], p.inputs['Normal'])
# a touch of thin translucency for backlight glow
tr = nt.nodes.new('ShaderNodeBsdfTranslucent'); L(col.outputs['Result'], tr.inputs['Color'])
mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = 0.16
L(p.outputs[0], mx.inputs[1]); L(tr.outputs[0], mx.inputs[2])
L(mx.outputs[0], out.inputs['Surface'])
me.materials.append(m)

# ---------------------------------------------------------------- camera (looks down -Z), lights
FOCAL, SENSOR = 85.0, 36.0
FRAME = 1.55
cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = FOCAL; cam_d.sensor_width = SENSOR; cam_d.sensor_fit = 'AUTO'
cam = link(bpy.data.objects.new('Cam', cam_d))
cam.location = (0, 0, FRAME * FOCAL / SENSOR)
cam.rotation_euler = (0, 0, 0)
sc.camera = cam
target = Vector((0, 0, 0))


def area(name, loc, size, power, color):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'
    ld.size, ld.size_y = size; ld.energy = power; ld.color = color
    ob = link(bpy.data.objects.new(name, ld)); ob.location = loc
    ob.rotation_euler = (target - Vector(loc)).normalized().to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False
    return ob


# image-left = -X. Key: large soft warm window light from the left-front (towards camera).
area('Key', (-3.2, 0.8, 2.6), (2.2, 3.0), 175, (1.0, 0.91, 0.84))
area('Back', (1.8, 1.2, -2.2), (1.6, 1.6), 90, (1.0, 0.82, 0.68))     # from behind: translucency glow
area('Fill', (2.6, -1.6, 2.0), (2.5, 2.5), 22, (0.95, 0.93, 0.95))
area('Bounce', (0.0, -2.6, -0.6), (3.0, 1.0), 14, (1.0, 0.70, 0.46))

world = bpy.data.worlds.new('W'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background') or world.node_tree.nodes.new('ShaderNodeBackground')
bg.inputs['Color'].default_value = (0.012, 0.011, 0.010, 1)
wo = world.node_tree.nodes.get('World Output') or world.node_tree.nodes.new('ShaderNodeOutputWorld')
world.node_tree.links.new(bg.outputs[0], wo.inputs['Surface'])

pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'OPTIX'
sc.render.engine = 'CYCLES'
cy = sc.cycles; cy.device = 'GPU'; cy.samples = A.samples
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.005
cy.use_denoising = True; cy.denoiser = 'OPTIX'
cy.max_bounces = 16; cy.diffuse_bounces = 6; cy.transmission_bounces = 8
cy.seed = 3
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.image_settings.color_depth = '8'
sc.render.use_persistent_data = True


def orient(rx, ry, rz):
    pivot.rotation_mode = 'XYZ'
    pivot.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))


os.makedirs(A.out, exist_ok=True)
if A.mode == 'loop':
    sc.render.resolution_x = sc.render.resolution_y = 384
    d = os.path.join(A.out, 'loop'); os.makedirs(d, exist_ok=True)
    frames = [int(x) for x in A.frames.split(',')] if A.frames else range(48)
    for i in frames:
        t = i / 48.0
        # seamless: X one full flip, Z one full spin (opposite phase), Y a gentle 2x rock
        orient(360 * t + 20, 28 * math.sin(4 * math.pi * t) + 10, -360 * t + 35)
        sc.render.filepath = os.path.join(d, f'{i:04d}.png')
        bpy.ops.render.render(write_still=True)
        print('WROTE', sc.render.filepath, flush=True)
elif A.mode == 'stills':
    sc.render.resolution_x = sc.render.resolution_y = 768
    cam_d.lens = FOCAL * 1.12
    shots = {
        'petal_a': (-38, 22, 30),     # three-quarter, cup visible
        'petal_b': (62, -18, -115),   # tilted on edge, showing the curl and the rolled rim
        'petal_c': (0, 0, 18),        # lying flat, seen from above (landing)
    }
    for name, r in shots.items():
        orient(*r)
        sc.render.filepath = os.path.join(A.out, f'{name}.png')
        bpy.ops.render.render(write_still=True)
        print('WROTE', sc.render.filepath, flush=True)
