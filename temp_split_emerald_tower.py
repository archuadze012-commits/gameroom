import bpy
from mathutils import Vector

ASSET = r"C:\Users\LEONSIO\Desktop\gamingweb - Copy\public\playmanager\models\meshy\emerald-tower\emerald-tower.gltf"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ASSET)

obj = bpy.data.objects["Mesh_0"]
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")

for part in bpy.data.objects:
    if part.type != "MESH":
        continue
    corners = [part.matrix_world @ Vector(corner) for corner in part.bound_box]
    min_x = min(v.x for v in corners)
    min_y = min(v.y for v in corners)
    min_z = min(v.z for v in corners)
    max_x = max(v.x for v in corners)
    max_y = max(v.y for v in corners)
    max_z = max(v.z for v in corners)
    print(
        f"{part.name}|verts={len(part.data.vertices)}|"
        f"min=({min_x:.3f},{min_y:.3f},{min_z:.3f})|"
        f"max=({max_x:.3f},{max_y:.3f},{max_z:.3f})"
    )
