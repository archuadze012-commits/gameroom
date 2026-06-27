import bpy
from mathutils import Vector

BLEND = r"C:\Users\LEONSIO\Desktop\ბლენდერი\Untitlგგგed.blend"

bpy.ops.wm.open_mainfile(filepath=BLEND)

for obj in bpy.data.objects:
    if obj.type != "MESH":
        continue
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_x = min(v.x for v in corners)
    min_y = min(v.y for v in corners)
    min_z = min(v.z for v in corners)
    max_x = max(v.x for v in corners)
    max_y = max(v.y for v in corners)
    max_z = max(v.z for v in corners)
    print(
        f"{obj.name}|verts={len(obj.data.vertices)}|"
        f"min=({min_x:.3f},{min_y:.3f},{min_z:.3f})|"
        f"max=({max_x:.3f},{max_y:.3f},{max_z:.3f})"
    )
