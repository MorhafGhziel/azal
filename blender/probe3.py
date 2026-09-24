import bpy
print([t for t in dir(bpy.types) if t.startswith('GeometryNode') and ('Grid' in t or 'SDF' in t or 'Volume' in t)])
