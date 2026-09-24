import bpy
ng=bpy.data.node_groups.new('x','GeometryNodeTree')
for t in ['GeometryNodeGetNamedGrid','GeometryNodeGridMean','GeometryNodeStoreNamedGrid','GeometryNodeMeshToDensityGrid','GeometryNodeGridToVolume' ]:
    try:
        n=ng.nodes.new(t)
        print(t,'IN',[(i.name,i.type) for i in n.inputs],'OUT',[(o.name,o.type) for o in n.outputs], [p for p in n.bl_rna.properties.keys() if p in ('data_type','mode')])
    except Exception as e: print(t,'ERR',e)
