import bpy
import os
from mathutils import Vector

SOURCE = r"C:\Users\LEONSIO\Downloads\Meshy_AI_Training_Center_0623060904_image-to-3d-texture.glb"
OUTPUT = r"C:\Users\LEONSIO\Desktop\gamingweb - Copy\public\playmanager\models\meshy\training-center.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)

# Meshy exports occasionally include cameras/lights that are not useful in the
# game scene; the runtime owns these instead.
for obj in list(bpy.data.objects):
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("No mesh found in source GLB")

# Compute world-space bounds, then place the game pivot at bottom-centre.
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
min_corner = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
max_corner = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
offset = Vector((-(min_corner.x + max_corner.x) / 2, -(min_corner.y + max_corner.y) / 2, -min_corner.z))

roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
for obj in roots:
    obj.location += offset

# Stable, readable object names help debugging and future scene assembly.
for index, obj in enumerate(meshes, start=1):
    obj.name = "TrainingCenter" if index == 1 else f"TrainingCenter_Part_{index:02d}"
    obj.data.name = f"{obj.name}_Mesh"
    for material in obj.data.materials:
        if material:
            material.name = material.name.replace(" ", "_")

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_extras=True,
)

print(f"EXPORTED={OUTPUT}")
print(f"MESHES={len(meshes)}")
print(f"SIZE_METERS={(max_corner - min_corner).x:.3f},{(max_corner - min_corner).y:.3f},{(max_corner - min_corner).z:.3f}")
