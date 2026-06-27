import importlib

import bpy

MODULE_NAME = "blender_mcp_local"
PORT = 9876


def ensure_addon_enabled():
    try:
        bpy.ops.preferences.addon_enable(module=MODULE_NAME)
    except Exception as exc:
        print(f"Failed to enable addon: {exc}")
        raise

    module = importlib.import_module(MODULE_NAME)
    scene = bpy.context.scene
    scene.blendermcp_port = PORT

    if not hasattr(bpy.types, "blendermcp_server") or not bpy.types.blendermcp_server:
        bpy.types.blendermcp_server = module.BlenderMCPServer(port=PORT)

    bpy.types.blendermcp_server.start()

    try:
        bpy.ops.wm.save_userpref()
    except Exception as exc:
        print(f"Could not save user preferences: {exc}")

    print(f"Blender MCP enabled and listening on localhost:{PORT}")


ensure_addon_enabled()
