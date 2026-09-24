import bpy
s=bpy.context.scene
print('has cng', hasattr(s,'compositing_node_group'))
ng=bpy.data.node_groups.new('C','CompositorNodeTree')
k=[t for t in dir(bpy.types) if 'Kuwahara' in t]; print(k)
n=ng.nodes.new('CompositorNodeKuwahara'); print([i.name for i in n.inputs],[p for p in dir(n) if not p.startswith('_')][:60])
print(bpy.context.preferences.addons['cycles'].preferences.compute_device_type)
