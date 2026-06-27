import math
import os

import bpy
from mathutils import Vector

ASSET = r"C:\Users\LEONSIO\Desktop\gamingweb - Copy\public\playmanager\models\meshy\emerald-tower\emerald-tower.gltf"
OUTPUT = r"C:\Users\LEONSIO\Desktop\gamingweb - Copy\public\playmanager\models\meshy\emerald-tower-no-cranes.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ASSET)

root = bpy.data.objects["Mesh_0"]
bpy.context.view_layer.objects.active = root
root.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")

to_delete = []
for obj in list(bpy.data.objects):
    if obj.type != "MESH":
        continue

    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_x = min(v.x for v in corners)
    min_y = min(v.y for v in corners)
    min_z = min(v.z for v in corners)
    max_x = max(v.x for v in corners)
    max_y = max(v.y for v in corners)
    max_z = max(v.z for v in corners)

    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    cz = (min_z + max_z) / 2
    dx = max_x - min_x
    dy = max_y - min_y
    dz = max_z - min_z

    horizontal_radius = math.hypot(cx, cy)
    largest_dim = max(dx, dy, dz)
    smallest_dim = min(dx, dy, dz)
    elongated = largest_dim / max(smallest_dim, 1e-6) > 2.5

    # Remove crane-like outer clusters around the tower.
    if horizontal_radius > 0.42 and largest_dim < 0.42 and elongated:
        to_delete.append(obj)

for obj in to_delete:
    bpy.data.objects.remove(obj, do_unlink=True)

for obj in bpy.data.objects:
    obj.select_set(obj.type == "MESH")

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUTPUT, export_format="GLB", use_selection=True)

print(f"Deleted {len(to_delete)} objects")
for obj in to_delete[:50]:
    print(f"removed: {obj.name}")
print(f"Saved: {OUTPUT}")
