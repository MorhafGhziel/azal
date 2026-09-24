import bpy
ng=bpy.data.node_groups.new('x','GeometryNodeTree')
n=ng.nodes.new('GeometryNodePointsToVolume')
for i in n.inputs: print('IN',i.name,i.type,getattr(i,'default_value',None))
print([p for p in n.bl_rna.properties.keys()])
