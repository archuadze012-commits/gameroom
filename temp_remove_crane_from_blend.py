import bpy

BLEND = r"C:\Users\LEONSIO\Desktop\ბლენდერი\Untitlგგგed.blend"
TARGETS = {"Mesh_0.001"}

bpy.ops.wm.open_mainfile(filepath=BLEND)

for name in list(TARGETS):
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)
        print(f"removed: {name}")
    else:
        print(f"missing: {name}")

bpy.ops.wm.save_mainfile(filepath=BLEND)
print("saved")
