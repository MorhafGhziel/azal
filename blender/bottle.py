"""AZAL bottle renderer (Blender 5.2, Cycles GPU, headless).

  blender -b --factory-startup -P bottle.py -- --mode fronts [--variants no1,no3] [--samples 768] [--pct 100] [--out DIR]
  blender -b --factory-startup -P bottle.py -- --mode turn   [--samples 512] [--out DIR]

fronts : 1400x1800 RGBA PNG per variant  -> DIR/noN_front.png
turn   : 25 frames of no1, yaw -12..+12, 1000x1286 -> DIR/no1_turn/0000.png ...
"""
import bpy, bmesh, math, sys, os, argparse
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--mode', default='fronts')
ap.add_argument('--variants', default='no1,no2,no3,no4,no5')
ap.add_argument('--samples', type=int, default=768)
ap.add_argument('--pct', type=int, default=100)
ap.add_argument('--yaw', type=float, default=0.0)
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'bottle'))
ap.add_argument('--frames', default='')  # e.g. "0,12,24" subset for turn
ap.add_argument('--variant', default='no1')
ap.add_argument('--yawmax', type=float, default=12.0)
ap.add_argument('--nframes', type=int, default=25)
ap.add_argument('--nologo', action='store_true')
ap.add_argument('--fill', type=float, default=1.0)   # 0..1 of the cavity (notes stages)
ap.add_argument('--liq', default='')                 # "r,g,b,density" override (linear)
ap.add_argument('--tag', default='')                 # output name suffix
A = ap.parse_args(argv)

# ---------------------------------------------------------------- dimensions
W = 1.0            # bottle width
H = 1.35           # bottle body height (w:h = 1:1.35)
D = 0.45           # depth
BEV = 0.075        # outer edge bevel radius
CORNER = 0.07      # in-plane radius of the bottom corners
WALL = 0.135       # side / top wall
FRONT = 0.08       # front/back wall
BASE = 0.18 * H    # thick base
NECK_R, NECK_TOP = 0.095, H + 0.045
CAP_R, CAP_H = 0.19, 0.22 * H
MENISCUS = 0.18 * 1.35 + (1.05 - 0.18 * 1.35) * A.fill
TOTAL_H = NECK_TOP + CAP_H

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def link(o):
    sc.collection.objects.link(o)
    return o


def arch_outline(w, h, z0, corner, n_arc=96, n_corner=12):
    """Closed outline (x, z) of a round-arch window: rectangle w x h (from z0) with a semicircle top."""
    r = w / 2.0
    zc = z0 + h - r
    pts = []
    # bottom-left corner -> bottom-right corner (rounded)
    for i in range(n_corner + 1):
        a = math.pi + (math.pi / 2) * i / n_corner  # 180..270
        pts.append((-r + corner + corner * math.cos(a), z0 + corner + corner * math.sin(a)))
    for i in range(n_corner + 1):
        a = 1.5 * math.pi + (math.pi / 2) * i / n_corner  # 270..360
        pts.append((r - corner + corner * math.cos(a), z0 + corner + corner * math.sin(a)))
    # right side up, semicircle over the top
    for i in range(n_arc + 1):
        a = (math.pi) * i / n_arc  # 0..180
        pts.append((r * math.cos(a), zc + r * math.sin(a)))
    return pts


def arch_solid(name, w, h, d, z0, bev, corner, n_arc=128):
    """Rounded-edge arch slab: outline path inset by bev, curve extrude + round bevel."""
    pts = arch_outline(w - 2 * bev, h - 2 * bev, z0 + bev, max(corner - bev, 0.004), n_arc=n_arc)
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, (x, z) in zip(sp.points, pts):
        p.co = (x, z, 0, 1)
    sp.use_cyclic_u = True
    cu.extrude = d / 2 - bev
    cu.bevel_depth = bev
    cu.bevel_resolution = 10
    ob = link(bpy.data.objects.new(name, cu))
    ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    # sharp edges only between flat caps and the (tangent) bevel -> caps keep true planar normals
    for e in bm.edges:
        if len(e.link_faces) == 2:
            f1, f2 = e.link_faces
            capf = [abs(f.normal.y) > 0.9999 for f in (f1, f2)]
            if capf[0] != capf[1]:
                e.smooth = False
    bm.to_mesh(me); bm.free()
    return ob


def lathe(name, prof, seg=192):
    """prof: list of (r, z) from axis-bottom to axis-top."""
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        ring = []
        if r < 1e-6:
            ring = [bm.verts.new((0, 0, z))]
        else:
            for i in range(seg):
                a = 2 * math.pi * i / seg
                ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for ra, rb in zip(rings[:-1], rings[1:]):
        if len(ra) == 1 and len(rb) == 1:
            continue
        for i in range(seg):
            j = (i + 1) % seg
            if len(ra) == 1:
                bm.faces.new((ra[0], rb[i], rb[j]))
            elif len(rb) == 1:
                bm.faces.new((ra[i], ra[j], rb[0]))
            else:
                bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))


def quarter(rc, zc, rad, a0, a1, n):
    return [(rc + rad * math.cos(a0 + (a1 - a0) * i / n), zc + rad * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


# ---------------------------------------------------------------- geometry
outer = arch_solid('Glass', W, H, D, 0.0, BEV, CORNER)
# neck: short glass cylinder rising from the arch crown
neck_prof = [(0, H - 0.06), (NECK_R, H - 0.06)] + quarter(NECK_R - 0.012, NECK_TOP - 0.012, 0.012, 0, math.pi / 2, 6) + [(0, NECK_TOP)]
neck = lathe('Neck', neck_prof, seg=128)
bpy.context.view_layer.objects.active = outer
mod = outer.modifiers.new('u', 'BOOLEAN'); mod.operation = 'UNION'; mod.object = neck; mod.solver = 'EXACT'
bpy.ops.object.modifier_apply(modifier='u')
bpy.data.objects.remove(neck)

# cavity (inner arch) -> flipped normals, joined into the glass
cav = arch_solid('Cavity', W - 2 * WALL, H - BASE - WALL, D - 2 * FRONT, BASE, 0.045, 0.06)
bm = bmesh.new(); bm.from_mesh(cav.data)
bmesh.ops.reverse_faces(bm, faces=bm.faces)
bm.to_mesh(cav.data); bm.free()
for o in bpy.context.selected_objects:
    o.select_set(False)
outer.select_set(True); cav.select_set(True)
bpy.context.view_layer.objects.active = outer
bpy.ops.object.join()
glass = outer

# liquid: cavity shrunk slightly, cut flat at the meniscus
g = 0.003
liq = arch_solid('Liquid', W - 2 * WALL - 2 * g, H - BASE - WALL - 2 * g, D - 2 * FRONT - 2 * g, BASE + g, 0.043, 0.058)
bm = bmesh.new(); bm.from_mesh(liq.data)
res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, MENISCUS), plane_no=(0, 0, 1), clear_outer=True)
edges = [e for e in bm.edges if e.is_boundary]
top = bmesh.ops.holes_fill(bm, edges=edges, sides=0)['faces']
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
# curved meniscus: inset rings near the wall and lift them (liquid climbs the glass a little)
lift = {v: 0.0 for f in top for v in f.verts}
dist = 0.0
for t in (0.003, 0.006, 0.010, 0.016):
    bmesh.ops.inset_region(bm, faces=top, thickness=t, depth=0.0, use_even_offset=False, use_boundary=False)
    dist += t
    for f in top:
        for v in f.verts:
            lift.setdefault(v, dist)
R_IN = (W - 2 * WALL) / 2 - g
ZC_IN = H - WALL - (W - 2 * WALL) / 2
for v, d in lift.items():
    dz = 0.011 * math.exp(-d / 0.0055)
    z0_ = v.co.z
    if z0_ > ZC_IN:
        a0 = R_IN * R_IN - (z0_ - ZC_IN) ** 2; a1 = R_IN * R_IN - (z0_ + dz - ZC_IN) ** 2
        if a0 > 0 and a1 > 0:
            v.co.x *= math.sqrt(a1 / a0)
    v.co.z += dz
for f in bm.faces:
    f.smooth = True
bm.to_mesh(liq.data); bm.free()

# cap: squat cylinder with softly rounded top edge, tiny eased bottom edge
rt, rb = 0.05, 0.006
z0 = NECK_TOP - 0.004
cap_prof = [(0, z0), (CAP_R - rb, z0)] + quarter(CAP_R - rb, z0 + rb, rb, -math.pi / 2, 0, 4)[1:] \
    + quarter(CAP_R - rt, z0 + CAP_H - rt, rt, 0, math.pi / 2, 16) + [(0, z0 + CAP_H)]
cap = lathe('Cap', cap_prof, seg=192)

# pivot for yaw
pivot = link(bpy.data.objects.new('Pivot', None))
for o in (glass, liq, cap):
    o.parent = pivot

# ---------------------------------------------------------------- materials
def mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    return m, nt, out


DISPERSION = False


def glass_mat():
    m, nt, out = mat('GlassM')
    # optional cheap dispersion (3 lobes, per-channel IOR) -- off by default: it adds heavy chroma noise
    tint = (1.0, 0.992, 0.978)
    prev = None
    lobes = ((0, 1.488), (1, 1.500), (2, 1.514)) if DISPERSION else ((-1, 1.5),)
    for c, ior in lobes:
        gb = nt.nodes.new('ShaderNodeBsdfGlass')
        if c < 0:
            col = [*tint, 1]
        else:
            col = [0, 0, 0, 1]; col[c] = tint[c]
        gb.inputs['Color'].default_value = col
        gb.inputs['IOR'].default_value = ior
        gb.inputs['Roughness'].default_value = 0.0
        gb.distribution = 'MULTI_GGX' if 'MULTI_GGX' in [e.identifier for e in gb.bl_rna.properties['distribution'].enum_items] else gb.distribution
        if prev is None:
            prev = gb.outputs[0]
        else:
            add = nt.nodes.new('ShaderNodeAddShader')
            nt.links.new(prev, add.inputs[0]); nt.links.new(gb.outputs[0], add.inputs[1])
            prev = add.outputs[0]
    nt.links.new(prev, out.inputs['Surface'])
    return m


def liquid_mat(col, dens, milk=0.0):
    m, nt, out = mat('LiquidM')
    gb = nt.nodes.new('ShaderNodeBsdfGlass')
    gb.inputs['IOR'].default_value = 1.36
    gb.inputs['Roughness'].default_value = 0.0
    gb.inputs['Color'].default_value = (1, 1, 1, 1)
    nt.links.new(gb.outputs[0], out.inputs['Surface'])
    pv = nt.nodes.new('ShaderNodeVolumePrincipled')
    pv.inputs['Color'].default_value = (0.95, 0.93, 0.9, 1)
    pv.inputs['Density'].default_value = milk
    pv.inputs['Absorption Color'].default_value = (*col, 1)
    # Principled Volume: absorption colour = what is absorbed -> invert tint
    pv.inputs['Absorption Color'].default_value = (1 - col[0], 1 - col[1], 1 - col[2], 1)
    pv.inputs['Density'].default_value = milk
    # separate absorption via Volume Absorption for clean control
    va = nt.nodes.new('ShaderNodeVolumeAbsorption')
    va.inputs['Color'].default_value = (*col, 1)
    va.inputs['Density'].default_value = dens
    tcl = nt.nodes.new('ShaderNodeTexCoord'); sz = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tcl.outputs['Object'], sz.inputs[0])
    gr = nt.nodes.new('ShaderNodeMapRange'); gr.inputs['From Min'].default_value = BASE; gr.inputs['From Max'].default_value = MENISCUS
    gr.inputs['To Min'].default_value = dens * 1.3; gr.inputs['To Max'].default_value = dens * 0.78
    nt.links.new(sz.outputs['Z'], gr.inputs['Value']); nt.links.new(gr.outputs['Result'], va.inputs['Density'])
    if milk > 0:
        sc_ = nt.nodes.new('ShaderNodeVolumeScatter')
        sc_.inputs['Color'].default_value = (1.0, 0.97, 0.93, 1)
        sc_.inputs['Density'].default_value = milk
        sc_.inputs['Anisotropy'].default_value = 0.6
        add = nt.nodes.new('ShaderNodeAddShader')
        nt.links.new(va.outputs[0], add.inputs[0]); nt.links.new(sc_.outputs[0], add.inputs[1])
        nt.links.new(add.outputs[0], out.inputs['Volume'])
    else:
        nt.links.new(va.outputs[0], out.inputs['Volume'])
    nt.nodes.remove(pv)
    return m


def principled(nt):
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    return p


def texco(nt):
    return nt.nodes.new('ShaderNodeTexCoord').outputs['Object']


def stone_mat(name, base, dark, sss, rough, grain=0.03, pores=0.0, veins=0.0):
    m, nt, out = mat(name)
    p = principled(nt)
    tc = texco(nt)
    # soft cloudy colour variation
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 3.5; n1.inputs['Detail'].default_value = 6
    nt.links.new(tc, n1.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.75; ramp.color_ramp.elements[1].color = (*base, 1)
    nt.links.new(n1.outputs['Fac'], ramp.inputs['Fac'])
    col_out = ramp.outputs['Color']
    if veins > 0:
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 2.2
        wv.inputs['Distortion'].default_value = 9; wv.inputs['Detail'].default_value = 6
        nt.links.new(tc, wv.inputs['Vector'])
        vr = nt.nodes.new('ShaderNodeValToRGB')
        vr.color_ramp.elements[0].position = 0.0; vr.color_ramp.elements[0].color = (1, 1, 1, 1)
        vr.color_ramp.elements[1].position = 0.08; vr.color_ramp.elements[1].color = (1, 1, 1, 1)
        e = vr.color_ramp.elements.new(0.04); e.color = (1 - veins, 1 - veins * 1.05, 1 - veins * 1.15, 1)
        nt.links.new(wv.outputs['Fac'], vr.inputs['Fac'])
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
        mx.inputs['Factor'].default_value = 1.0
        nt.links.new(col_out, mx.inputs['A']); nt.links.new(vr.outputs['Color'], mx.inputs['B'])
        col_out = mx.outputs['Result']
    nt.links.new(col_out, p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    p.inputs['Subsurface Weight'].default_value = sss
    p.inputs['Subsurface Radius'].default_value = (1.0, 0.75, 0.55)
    p.inputs['Subsurface Scale'].default_value = 0.03
    # grain / pores bump
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 420; n2.inputs['Detail'].default_value = 4
    nt.links.new(tc, n2.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = grain; bump.inputs['Distance'].default_value = 0.002
    h = n2.outputs['Fac']
    if pores > 0:
        vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'F1'; vo.inputs['Scale'].default_value = 90
        nt.links.new(tc, vo.inputs['Vector'])
        pr = nt.nodes.new('ShaderNodeMapRange'); pr.inputs['From Min'].default_value = 0.0; pr.inputs['From Max'].default_value = 0.12
        nt.links.new(vo.outputs['Distance'], pr.inputs['Value'])
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY_ADD'
        nt.links.new(h, mm.inputs[0]); mm.inputs[1].default_value = 0.3; nt.links.new(pr.outputs['Result'], mm.inputs[2])
        h = mm.outputs[0]
        bump.inputs['Strength'].default_value = pores
    nt.links.new(h, bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    nt.links.new(p.outputs[0], out.inputs['Surface'])
    return m


def wood_mat():
    m, nt, out = mat('OudWood')
    p = principled(nt); tc = texco(nt)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'
    wv.inputs['Scale'].default_value = 22; wv.inputs['Distortion'].default_value = 7; wv.inputs['Detail'].default_value = 5; wv.inputs['Detail Scale'].default_value = 1.2; wv.inputs['Detail Roughness'].default_value = 0.6
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 0.6, 0.06)
    nt.links.new(tc, mp.inputs['Vector']); nt.links.new(mp.outputs[0], wv.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.012, 0.007, 0.004, 1)
    r.color_ramp.elements[1].color = (0.05, 0.027, 0.014, 1)
    nt.links.new(wv.outputs['Fac'], r.inputs['Fac'])
    nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.55; p.inputs['Specular IOR Level'].default_value = 0.35
    p.inputs['Coat Weight'].default_value = 0.18
    p.inputs['Coat Roughness'].default_value = 0.32
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.02; bump.inputs['Distance'].default_value = 0.002
    nt.links.new(wv.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    nt.links.new(p.outputs[0], out.inputs['Surface'])
    return m


def brass_mat():
    m, nt, out = mat('Brass')
    p = principled(nt); tc = texco(nt)
    p.inputs['Base Color'].default_value = (0.52, 0.40, 0.24, 1)
    p.inputs['Metallic'].default_value = 1.0
    p.inputs['Roughness'].default_value = 0.42
    p.inputs['Anisotropic'].default_value = 0.65
    tg = nt.nodes.new('ShaderNodeTangent'); tg.direction_type = 'RADIAL'; tg.axis = 'Z'
    nt.links.new(tg.outputs[0], p.inputs['Tangent'])
    # fine horizontal brushing lines
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 60; n.inputs['Detail'].default_value = 8
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.3, 0.3, 40)
    nt.links.new(tc, mp.inputs['Vector']); nt.links.new(mp.outputs[0], n.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.05; bump.inputs['Distance'].default_value = 0.001
    nt.links.new(n.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    nt.links.new(p.outputs[0], out.inputs['Surface'])
    return m


VARIANTS = {
    # liquid transmit colour (linear), absorption density, milk, cap material factory
    'no1': dict(glow=1.5, gmix=0.72, liq=((0.90, 0.42, 0.24), 11.0, 0.0), cap=lambda: stone_mat('Alabaster', (0.66, 0.59, 0.49), (0.58, 0.51, 0.41), 0.35, 0.55, grain=0.03)),
    'no2': dict(glow=1.7, gmix=0.8, liq=((0.72, 0.36, 0.10), 22.0, 0.0), cap=wood_mat),
    'no3': dict(glow=0.62, gmix=0.55, liq=((0.985, 0.955, 0.91), 1.5, 0.25), cap=lambda: stone_mat('WhiteAlabaster', (0.74, 0.72, 0.68), (0.66, 0.64, 0.60), 0.5, 0.5, grain=0.025, veins=0.10)),
    'no4': dict(glow=1.45, gmix=0.72, liq=((0.96, 0.60, 0.07), 12.0, 0.0), cap=brass_mat),
    'no5': dict(glow=0.8, gmix=0.6, liq=((0.80, 0.72, 0.93), 5.0, 0.0), cap=lambda: stone_mat('Travertine', (0.40, 0.37, 0.33), (0.31, 0.28, 0.245), 0.1, 0.72, grain=0.05, pores=0.18)),
}

for o in (glass, liq, cap):
    o.data.materials.clear()
glass.data.materials.append(glass_mat())
liq.data.materials.append(bpy.data.materials.new('tmp'))
cap.data.materials.append(bpy.data.materials.new('tmp2'))


# ---------------------------------------------------------------- printed logo (foil decal on the front face)
HERE = os.path.dirname(os.path.abspath(__file__))
DSIZE = 0.54
DTOP = 0.835 + (595 / 2048) * DSIZE          # emblem top sits just below where the inner arch starts curving
PRINT = {'no1': '#D9B97A', 'no2': '#E2C58A', 'no3': '#A8844B', 'no4': '#F1E6D2', 'no5': '#B8955A'}


def hex_lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def make_decal():
    me = bpy.data.meshes.new('Decal'); bm = bmesh.new()
    y = -D / 2 - 0.0008
    x0, x1, z0_, z1 = -DSIZE / 2, DSIZE / 2, DTOP - DSIZE, DTOP
    vs = [bm.verts.new(p) for p in ((x0, y, z0_), (x1, y, z0_), (x1, y, z1), (x0, y, z1))]
    f = bm.faces.new(vs)
    uvl = bm.loops.layers.uv.new('UV')
    for l, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):   # +X = image right as seen from the camera -> not mirrored
        l[uvl].uv = uv
    bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new('Decal', me))


def decal_mat(img_name, colour_hex):
    m, nt, out = mat('Foil_' + img_name)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(HERE, 'decal', img_name), check_existing=True)
    tex.image.alpha_mode = 'STRAIGHT'
    tex.interpolation = 'Cubic'; tex.extension = 'CLIP'
    p = principled(nt)
    p.inputs['Base Color'].default_value = (*hex_lin(colour_hex), 1)
    p.inputs['Metallic'].default_value = 0.85
    p.inputs['Roughness'].default_value = 0.3
    nt.links.new(tex.outputs['Alpha'], p.inputs['Alpha'])
    nt.links.new(p.outputs[0], out.inputs['Surface'])
    return m


decal = make_decal()
decal.parent = pivot
decal.data.materials.append(bpy.data.materials.new('tmp3'))
decal.hide_render = A.nologo
FOILRX = bpy.data.collections.new('FoilReceivers'); FOILRX.objects.link(decal)


# ---------------------------------------------------------------- backlight card (seen only through the liquid)
def glow_card(ctl=None):
    ctl = GLOWCTL if ctl is None else ctl
    me = bpy.data.meshes.new('Glow')
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new('Glow', me))
    ob.scale = (1.1, 1.2, 1)
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.location = (0, 1.4, 0.75)
    m, nt, out = mat('GlowM')
    lp = nt.nodes.new('ShaderNodeLightPath')
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 5.5
    nt.links.new(lp.outputs['Transmission Depth'], gt.inputs[0])
    # soft radial glow: bright warm heart low-centre, falling off to the edges
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (0.12, 0.2, 0)
    mp.inputs['Scale'].default_value = (1.0, 0.85, 0.0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
    nt.links.new(mp.outputs[0], ln.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (GLOW, GLOW * 0.93, GLOW * 0.84, 1)
    ramp.color_ramp.elements[1].position = 0.75; ramp.color_ramp.elements[1].color = (GLOW * 0.22, GLOW * 0.19, GLOW * 0.16, 1)
    nt.links.new(ln.outputs['Value'], ramp.inputs['Fac'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    gm = nt.nodes.new('ShaderNodeMath'); gm.operation = 'MULTIPLY'; gm.inputs[1].default_value = 0.75
    nt.links.new(gt.outputs[0], gm.inputs[0])
    nt.links.new(gm.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    ctl['strength'] = em.inputs['Strength']; ctl['mix'] = gm.inputs[1]
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    if hasattr(m, 'emission_sampling'):
        m.emission_sampling = 'NONE'
    me.materials.append(m)
    ob.visible_diffuse = False; ob.visible_glossy = False; ob.visible_shadow = False; ob.visible_volume_scatter = False
    return ob


GLOW = 1.0
GLOWCTL = {}
glow = glow_card()

# ---------------------------------------------------------------- lights
target = Vector((0, 0, 0.8))


def area(name, loc, size, power, color, shape='RECTANGLE'):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = shape
    ld.size, ld.size_y = size
    ld.energy = power
    ld.color = color
    ob = link(bpy.data.objects.new(name, ld))
    ob.location = loc
    d = (target - Vector(loc)).normalized()
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False
    return ob


key = area('Key', (-3.4, -2.8, 1.9), (2.4, 3.4), 280, (1.0, 0.87, 0.72))
rim = area('Rim', (2.4, 2.3, 0.95), (0.10, 3.2), 260, (1.0, 0.96, 0.9))
rim2 = area('RimL', (-2.2, 2.6, 1.1), (0.10, 3.0), 60, (1.0, 0.93, 0.85))
# soft "window" sheen card behind the camera, only seen in reflections -> graded sheen on the front face
def sheen_card():
    me = bpy.data.meshes.new('Sheen'); bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new('Sheen', me))
    ob.location = (-1.6, -dist_guess - 1.5, 1.5); ob.scale = (1.6, 2.2, 1)
    d = (Vector((0, 0, 0.8)) - ob.location).normalized()
    ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    m, nt, out = mat('SheenM')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'] if False else tc.outputs['Object'], sep.inputs[0])
    r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = -1; r.inputs['From Max'].default_value = 1
    r.interpolation_type = 'SMOOTHSTEP'
    nt.links.new(sep.outputs['X'], r.inputs['Value'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.9, 0.78, 1)
    mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = SHEEN
    nt.links.new(r.outputs['Result'], mm.inputs[0]); nt.links.new(mm.outputs[0], em.inputs['Strength'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    me.materials.append(m)
    ob.visible_camera = False; ob.visible_diffuse = False; ob.visible_shadow = False; ob.visible_transmission = False
    ob.visible_volume_scatter = False
    return ob


SHEEN = 1.2
FOIL_P = 160
dist_guess = 5.2
sheen = sheen_card()
# foil light: a soft card near the camera axis, light-linked to the print only, so the foil catches a moving highlight
foil_key = area('FoilKey', (-1.3, -4.6, 2.2), (1.6, 2.4), FOIL_P, (1.0, 0.93, 0.82))
foil_key.light_linking.receiver_collection = FOILRX
bounce = area('Bounce', (0.2, -0.6, -1.4), (3.0, 1.6), 45, (1.0, 0.66, 0.40))

# ---------------------------------------------------------------- world
# Studio is near-black. Rays that have passed THROUGH the glass (transmission depth >= 1) or camera rays
# see "the page" colour K instead, except when bent far sideways (black flags) -> edges read thick & dark.
# We render K=0 and K=1 and difference-matte them: alpha = 1 - (img(K=1) - img(K=0)).
world = bpy.data.worlds.new('W'); sc.world = world
world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links
wn.clear()
wo = wn.new('ShaderNodeOutputWorld')
bg = wn.new('ShaderNodeBackground')
tc = wn.new('ShaderNodeTexCoord')
sep = wn.new('ShaderNodeSeparateXYZ'); wl.new(tc.outputs['Generated'], sep.inputs[0])
flag = wn.new('ShaderNodeMapRange'); flag.interpolation_type = 'SMOOTHSTEP'
flag.inputs['From Min'].default_value = 0.62; flag.inputs['From Max'].default_value = 0.9
wl.new(sep.outputs['Y'], flag.inputs['Value'])
lp = wn.new('ShaderNodeLightPath')
thr = wn.new('ShaderNodeMath'); thr.operation = 'GREATER_THAN'; thr.inputs[1].default_value = 0.5
wl.new(lp.outputs['Transmission Depth'], thr.inputs[0])
orr = wn.new('ShaderNodeMath'); orr.operation = 'MAXIMUM'
wl.new(thr.outputs[0], orr.inputs[0]); wl.new(lp.outputs['Is Camera Ray'], orr.inputs[1])
mul = wn.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
wl.new(orr.outputs[0], mul.inputs[0]); wl.new(flag.outputs['Result'], mul.inputs[1])
mixc = wn.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
wl.new(mul.outputs[0], mixc.inputs['Factor'])
mixc.inputs['A'].default_value = (0.004, 0.0036, 0.0032, 1)
KNODE = mixc.inputs['B']
wl.new(mixc.outputs['Result'], bg.inputs['Color'])
bg.inputs['Strength'].default_value = 1.0
wl.new(bg.outputs[0], wo.inputs['Surface'])

# ---------------------------------------------------------------- camera
FOCAL, SENSOR = 85.0, 36.0
frame_h = TOTAL_H / 0.78
dist = frame_h * FOCAL / SENSOR
cam_d = bpy.data.cameras.new('Cam')
cam_d.lens = FOCAL; cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = SENSOR
cam = link(bpy.data.objects.new('Cam', cam_d))
cz = TOTAL_H / 2 - 0.14                       # slightly below centre, level
cam.location = (0, -dist, cz)
cam.rotation_euler = (math.radians(90), 0, 0)
cam_d.shift_y = (TOTAL_H / 2 - cz) / frame_h
cam_d.clip_start = 0.1; cam_d.clip_end = 100
sc.camera = cam

# ---------------------------------------------------------------- render settings
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'OPTIX'
sc.render.engine = 'CYCLES'
cy = sc.cycles
cy.device = 'GPU'
cy.samples = A.samples
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.003
cy.use_denoising = True; cy.denoiser = 'OPTIX'
cy.max_bounces = 64; cy.transmission_bounces = 48; cy.transparent_max_bounces = 32
cy.glossy_bounces = 16; cy.diffuse_bounces = 4; cy.volume_bounces = 4
cy.caustics_reflective = True; cy.caustics_refractive = True
cy.sample_clamp_indirect = 20.0
cy.seed = 7
sc.render.film_transparent = False
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0.0
sc.render.image_settings.file_format = 'OPEN_EXR'
sc.render.image_settings.color_mode = 'RGB'
sc.render.image_settings.color_depth = '32'
sc.render.use_persistent_data = True


def set_variant(v):
    cfg = VARIANTS[v]
    col, dens, milk = cfg['liq']
    if A.liq:
        r, g_, b, d_ = (float(x) for x in A.liq.split(',')); col, dens = (r, g_, b), d_
    liq.data.materials[0] = liquid_mat(col, dens, milk)
    GLOWCTL['strength'].default_value = cfg.get('glow', 1.5)
    GLOWCTL['mix'].default_value = cfg.get('gmix', 0.75)
    cap.data.materials[0] = cfg['cap']()
    decal.data.materials[0] = decal_mat(f'front_{v}.png', PRINT[v])


def srgb(x):
    x = np.clip(x, 0.0, 1.0)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def render_matte(path_png):
    tmp = os.path.join(A.out, '_tmp'); os.makedirs(tmp, exist_ok=True)
    bufs = []
    for k in (0.0, 1.0):
        KNODE.default_value = (k, k, k, 1)
        sc.render.filepath = os.path.join(tmp, f'k{int(k)}.exr')
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(sc.render.filepath, check_existing=False)
        w, h = im.size
        a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a)
        bufs.append(a.reshape(h, w, 4)[..., :3].copy())
        bpy.data.images.remove(im)
    F, W1 = bufs
    T = np.clip(W1 - F, 0.0, 1.0)                 # per-channel background transmission
    alpha = 1.0 - T.mean(axis=2)
    alpha = np.maximum(alpha, F.max(axis=2))       # additive highlights need coverage
    alpha = np.clip(alpha, 0.0, 1.0)
    alpha[alpha < 0.004] = 0.0
    straight = F / np.maximum(alpha, 1e-4)[..., None]
    rgba = np.concatenate([srgb(straight), alpha[..., None]], axis=2).astype(np.float32)
    out = bpy.data.images.new('out', w, h, alpha=True)
    out.colorspace_settings.name = 'Non-Color'
    out.alpha_mode = 'STRAIGHT'
    out.pixels.foreach_set(rgba.ravel())
    out.filepath_raw = path_png; out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)
    print('WROTE', path_png, flush=True)


import numpy as np
os.makedirs(A.out, exist_ok=True)
if A.mode == 'fronts':
    sc.render.resolution_x, sc.render.resolution_y = 1400, 1800
    sc.render.resolution_percentage = A.pct
    pivot.rotation_euler = (0, 0, math.radians(A.yaw))
    for v in A.variants.split(','):
        set_variant(v)
        render_matte(os.path.join(A.out, f'{v}{A.tag}_front.png'))
elif A.mode == 'turn':
    v = A.variant
    set_variant(v)
    sc.render.resolution_x, sc.render.resolution_y = 1000, 1286
    sc.render.resolution_percentage = A.pct
    td = os.path.join(A.out, f'{v}_turn'); os.makedirs(td, exist_ok=True)
    n = A.nframes
    frames = [int(x) for x in A.frames.split(',')] if A.frames else range(n)
    for i in frames:
        yaw = -A.yawmax + 2 * A.yawmax * i / (n - 1)
        pivot.rotation_euler = (0, 0, math.radians(yaw))
        render_matte(os.path.join(td, f'{i:04d}.png'))
elif A.mode == 'set':
    # discovery set: five 10 ml minis in a shallow arc
    S = 0.42
    order = ['no1', 'no2', 'no3', 'no4', 'no5']
    for o in (glass, liq, cap, decal, glow):
        o.hide_render = True
    for k, v in enumerate(order):
        x = (k - 2) * 0.405
        pv = link(bpy.data.objects.new(f'Mini_{v}', None))
        pv.location = (x, 0.22 * (x / 0.81) ** 2, 0)
        pv.rotation_euler = (0, 0, math.radians(-9 * x / 0.81))
        pv.scale = (S, S, S)
        cfg = VARIANTS[v]
        col, dens, milk = cfg['liq']
        for src, mt in ((glass, glass.data.materials[0]), (liq, liquid_mat(col, dens / S, milk / S)),
                        (cap, cfg['cap']()), (decal, decal_mat('front_set.png', PRINT[v]))):
            o = src.copy(); o.data = src.data.copy(); link(o)
            o.hide_render = False
            o.parent = pv; o.matrix_parent_inverse.identity()
            o.data.materials[0] = mt
            if src is decal:
                FOILRX.objects.link(o)
        ctl = {}
        gc = glow_card(ctl)
        gc.parent = pv; gc.matrix_parent_inverse.identity()
        gc.scale = (0.47, 1.2, 1)   # narrow: must not reach behind the neighbouring minis
        ctl['strength'].default_value = cfg.get('glow', 1.5); ctl['mix'].default_value = cfg.get('gmix', 0.75)
    sc.render.resolution_x, sc.render.resolution_y = 1800, 1400
    sc.render.resolution_percentage = A.pct
    FW = 2.45
    cam_d.sensor_fit = 'HORIZONTAL'; cam_d.sensor_width = SENSOR
    dset = FW * FOCAL / SENSOR
    czs = TOTAL_H * S / 2 - 0.06
    cam.location = (0, -dset + 0.1, czs)
    cam_d.shift_x = 0; cam_d.shift_y = (TOTAL_H * S / 2 - czs) / FW
    render_matte(os.path.join(A.out, 'set_front.png'))
