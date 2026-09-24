import re
s=open('clouds.py',encoding='utf8').read()
start=s.index('def bank('); end=s.index('# ---------- layouts')
new='''def bank(name, cx, cy, cz, width, height, n, seed, rmin, rmax, dome=1.0, flat_base=True, levels=3):
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
        prof = max(0.25, (1 - abs(u) ** 2) ** 0.7 * dome)
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

'''
s=s[:start]+new+s[end:]
# sun from a direction vector: light travels along DIR
s=s.replace("sun = bpy.data.objects.new('Sun', sd); scn.collection.objects.link(sun); sun.rotation_euler = PAL['sun_rot']",
"sun = bpy.data.objects.new('Sun', sd); scn.collection.objects.link(sun)\nsun.rotation_euler = Vector(PAL['sun_dir']).normalized().to_track_quat('-Z', 'Y').to_euler()")
s=s.replace("sun_rot=(math.radians(84), 0, math.radians(-128))","sun_dir=(0.75, 0.55, -0.38)")
s=s.replace("sun_rot=(math.radians(86), 0, math.radians(128))","sun_dir=(-0.75, 0.55, -0.35)")
s=s.replace("sun_rot=(math.radians(70), 0, math.radians(-110))","sun_dir=(0.6, 0.7, -0.4)")
s=s.replace("b.inputs['Subsurface Scale'].default_value = 2.2","b.inputs['Subsurface Scale'].default_value = 0.8")
s=s.replace("MAT = cloud_mat('Cloud', PAL['alb'])","MAT = cloud_mat('Cloud', PAL['alb'], 0.35)")
open('clouds.py','w',encoding='utf8').write(s)
