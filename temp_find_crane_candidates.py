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

candidates = []
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
    dx = max_x - min_x
    dy = max_y - min_y
    dz = max_z - min_z
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    cz = (min_z + max_z) / 2
    tall = sorted([dx, dy, dz], reverse=True)
    ratio = tall[0] / max(tall[1], 1e-6)
    if tall[0] > 0.16 and ratio > 2.2:
        candidates.append((part.name, len(part.data.vertices), dx, dy, dz, cx, cy, cz))

for item in sorted(candidates, key=lambda row: (-max(row[2], row[3], row[4]), row[0])):
    name, verts, dx, dy, dz, cx, cy, cz = item
    print(
        f"{name}|verts={verts}|dims=({dx:.3f},{dy:.3f},{dz:.3f})|"
        f"center=({cx:.3f},{cy:.3f},{cz:.3f})"
    )
