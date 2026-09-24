# blender -b --factory-startup -P paint.py -- in.png out.png size [sharpness eccentricity]
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]
src, dst, size = a[0], a[1], float(a[2])
sharp = float(a[3]) if len(a) > 3 else 0.6
ecc = float(a[4]) if len(a) > 4 else 1.2
scn = bpy.context.scene
img = bpy.data.images.load(src)
scn.render.resolution_x, scn.render.resolution_y = img.size
scn.render.resolution_percentage = 100
scn.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else scn.render.engine
scn.render.film_transparent = True
scn.view_settings.view_transform = 'Standard'
scn.render.image_settings.file_format = 'PNG'; scn.render.image_settings.color_mode = 'RGBA'
for o in list(scn.objects):
    if o.type != 'CAMERA': bpy.data.objects.remove(o, do_unlink=True)
ng = bpy.data.node_groups.new('P', 'CompositorNodeTree')
ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
im = ng.nodes.new('CompositorNodeImage'); im.image = img
k = ng.nodes.new('CompositorNodeKuwahara')
k.inputs['Type'].default_value = 'Anisotropic'
k.inputs['Size'].default_value = size
k.inputs['Sharpness'].default_value = sharp
k.inputs['Eccentricity'].default_value = ecc
k.inputs['High Precision'].default_value = True
go = ng.nodes.new('NodeGroupOutput')
ng.links.new(im.outputs['Image'], k.inputs['Image'])
ng.links.new(k.outputs[0], go.inputs[0])
scn.compositing_node_group = ng
scn.render.filepath = dst
bpy.ops.render.render(write_still=True)
