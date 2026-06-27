import bpy

ASSET = r"C:\Users\LEONSIO\Desktop\gamingweb - Copy\public\playmanager\models\meshy\emerald-tower\emerald-tower.gltf"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ASSET)

for obj in bpy.data.objects:
    print(f"{obj.name} | {obj.type}")
