import bpy
import os
import mathutils
from math import radians


WORKSPACE = r"C:\Users\LEONSIO\Desktop\gamingweb - Copy"
OUTPUT_DIR = os.path.join(WORKSPACE, "public", "playmanager", "models")
BLEND_PATH = os.path.join(OUTPUT_DIR, "playmanager-city-assets.blend")
KENNEY_DIR = os.path.join(WORKSPACE, "scratch", "playmanager-assets")


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def make_material(name, color, roughness=0.65, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def assign_material(obj, material):
    obj.data.materials.append(material)
    obj.color = material.diffuse_color


def shade_flat(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_flat()
    obj.select_set(False)


def link_to_collection(obj, collection):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)


def add_cube(collection, name, location, scale, material, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    shade_flat(obj)
    link_to_collection(obj, collection)
    return obj


def add_cylinder(collection, name, location, radius, depth, vertices, material, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    shade_flat(obj)
    link_to_collection(obj, collection)
    return obj


def add_torus(collection, name, location, major_radius, minor_radius, material, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=28,
        minor_segments=6,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    shade_flat(obj)
    link_to_collection(obj, collection)
    return obj


def add_plane(collection, name, location, scale, material):
    bpy.ops.mesh.primitive_plane_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    assign_material(obj, material)
    shade_flat(obj)
    link_to_collection(obj, collection)
    return obj


def add_text(collection, name, text, location, size, material, rotation=(radians(90), 0, 0)):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.015
    assign_material(obj, material)
    link_to_collection(obj, collection)
    return obj


def create_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def create_stadium(materials):
    col = create_collection("01_stadium_real_football")

    add_cylinder(col, "stadium_foundation", (0, 0, 0.12), 2.55, 0.24, 28, materials["asphalt"], scale=(1.35, 0.82, 1))
    add_torus(col, "stadium_outer_bowl", (0, 0, 0.58), 1.85, 0.22, materials["concrete"], rotation=(radians(90), 0, 0), scale=(1.35, 0.82, 0.26))
    add_torus(col, "stadium_upper_ring", (0, 0, 0.96), 1.52, 0.16, materials["steel"], rotation=(radians(90), 0, 0), scale=(1.28, 0.78, 0.22))
    add_cube(col, "stadium_pitch", (0, 0, 0.42), (1.42, 0.76, 0.035), materials["pitch"])
    add_cube(col, "stadium_center_line", (0, 0, 0.47), (0.018, 0.76, 0.012), materials["line"])
    add_torus(col, "stadium_center_circle", (0, 0, 0.485), 0.22, 0.01, materials["line"], rotation=(radians(90), 0, 0), scale=(1, 1, 0.1))

    for y in [-0.9, 0.9]:
        add_cube(col, f"stadium_goal_{y}", (0, y, 0.52), (0.28, 0.035, 0.16), materials["line"])

    for idx, x in enumerate([-1.38, -0.7, 0, 0.7, 1.38]):
        add_cube(col, f"stadium_left_stand_{idx}", (x, -1.16, 0.78 + abs(x) * 0.04), (0.32, 0.18, 0.22), materials["seat_red"])
        add_cube(col, f"stadium_right_stand_{idx}", (x, 1.16, 0.78 + abs(x) * 0.04), (0.32, 0.18, 0.22), materials["seat_blue"])

    for idx, coords in enumerate([(-2.12, -1.18), (2.12, -1.18), (-2.12, 1.18), (2.12, 1.18)]):
        add_cube(col, f"stadium_floodlight_mast_{idx}", (coords[0], coords[1], 1.55), (0.045, 0.045, 1.1), materials["steel"])
        add_cube(col, f"stadium_floodlight_panel_{idx}", (coords[0], coords[1], 2.24), (0.26, 0.035, 0.11), materials["light"], rotation=(0, 0, radians(18 if idx % 2 else -18)))

    add_cube(col, "stadium_entrance_block", (0, -1.78, 0.36), (0.72, 0.22, 0.28), materials["concrete"])
    add_text(col, "stadium_sign", "ARENA", (0, -2.02, 0.72), 0.23, materials["light"])
    return col


def create_training_base(materials):
    col = create_collection("02_training_academy_base")

    add_cube(col, "training_main_pitch", (0, 0, 0.05), (1.7, 1.05, 0.05), materials["pitch_dark"])
    add_cube(col, "training_pitch_line_x", (0, 0, 0.1), (0.018, 1.02, 0.008), materials["line"])
    add_cube(col, "training_pitch_line_y", (0, 0, 0.11), (1.65, 0.018, 0.008), materials["line"])

    add_cube(col, "training_gym_base", (1.55, -0.45, 0.34), (0.58, 0.42, 0.34), materials["teal"])
    add_cube(col, "training_gym_roof", (1.55, -0.45, 0.72), (0.64, 0.48, 0.08), materials["steel"])
    add_cube(col, "training_glass_wall", (1.08, -0.45, 0.38), (0.025, 0.34, 0.24), materials["glass"])

    add_cube(col, "training_recovery_center", (-1.42, 0.62, 0.28), (0.44, 0.32, 0.28), materials["concrete"])
    add_cube(col, "training_recovery_roof", (-1.42, 0.62, 0.6), (0.5, 0.38, 0.07), materials["lime"])
    add_text(col, "training_sign", "TRAIN", (0, -1.32, 0.16), 0.22, materials["light"])

    for idx, x in enumerate([-1.2, -0.7, -0.2, 0.3, 0.8, 1.3]):
        add_cylinder(col, f"training_cone_{idx}", (x, -0.62 if idx % 2 == 0 else 0.55, 0.18), 0.08, 0.22, 4, materials["orange"], rotation=(radians(180), 0, 0))

    for idx, x in enumerate([-0.9, -0.3, 0.3, 0.9]):
        add_cube(col, f"training_speed_ladder_{idx}", (x, 1.18, 0.09), (0.22, 0.025, 0.015), materials["light"])

    add_cube(col, "training_parking_strip", (0, 1.58, 0.04), (1.85, 0.18, 0.03), materials["asphalt"])
    for idx, x in enumerate([-0.9, -0.35, 0.35, 0.9]):
        add_cube(col, f"training_car_{idx}", (x, 1.58, 0.16), (0.16, 0.08, 0.07), materials["car"])
    return col


def create_transfer_center(materials):
    col = create_collection("03_transfer_finance_center")

    add_cylinder(col, "market_hex_plaza", (0, 0, 0.09), 1.35, 0.18, 6, materials["asphalt"])
    add_cube(col, "market_main_tower", (0, 0, 0.9), (0.42, 0.42, 0.9), materials["glass"])
    add_cube(col, "market_left_office", (-0.68, 0.1, 0.52), (0.34, 0.36, 0.52), materials["cyan"])
    add_cube(col, "market_right_office", (0.68, 0.1, 0.62), (0.34, 0.36, 0.62), materials["cyan"])
    add_cube(col, "market_boardroom", (0, -0.68, 0.36), (0.88, 0.22, 0.36), materials["steel"])
    add_torus(col, "market_holo_ring", (0, 0, 1.92), 0.82, 0.025, materials["light_blue"], rotation=(radians(90), 0, 0), scale=(1, 1, 0.1))

    add_text(col, "market_sign", "TRANSFER", (0, -1.08, 0.72), 0.18, materials["light_blue"])
    add_cube(col, "market_screen", (0, -1.02, 0.58), (0.82, 0.025, 0.28), materials["dark_blue"])

    for idx, x in enumerate([-0.86, -0.43, 0.43, 0.86]):
        add_cylinder(col, f"market_agent_marker_{idx}", (x, 0.92, 0.2), 0.08, 0.22, 8, materials["light"], scale=(1, 1, 1))

    for idx, x in enumerate([-1.12, 1.12]):
        add_cube(col, f"market_gate_{idx}", (x, -0.72, 0.38), (0.05, 0.12, 0.38), materials["light_blue"])
    return col


def create_city_context(materials):
    col = create_collection("00_city_context")
    add_plane(col, "city_ground", (0, 0, -0.012), (8.8, 3.6, 1), materials["ground"])
    add_cube(col, "city_main_road", (0, -1.55, 0.015), (7.6, 0.16, 0.015), materials["asphalt"])
    add_cube(col, "city_vertical_road", (0, 0, 0.018), (0.16, 2.8, 0.015), materials["asphalt"])

    for idx, x in enumerate([-3.6, -2.9, 2.9, 3.6]):
        add_cylinder(col, f"city_tree_trunk_{idx}", (x, 1.55, 0.18), 0.035, 0.34, 6, materials["wood"])
        add_cylinder(col, f"city_tree_top_{idx}", (x, 1.55, 0.48), 0.18, 0.34, 7, materials["tree"])
    return col


def glb_path(pack, name):
    return os.path.join(KENNEY_DIR, pack, "Models", "GLB format", name)


def import_asset(collection, path, name, location, scale=1.0, rotation=(0, 0, 0)):
    if not os.path.exists(path):
        print("Missing vendor asset:", path)
        return []

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    root.location = location
    root.rotation_euler = rotation
    root.scale = (scale, scale, scale)

    for obj in imported:
        link_to_collection(obj, collection)
        obj.parent = root
        obj.name = f"{name}_{obj.name}"
        if obj.type == "MESH":
            obj.data.name = f"{name}_{obj.data.name}"
            flatten_asset_materials(obj)
            shade_flat(obj)

    return imported + [root]


def flatten_asset_materials(obj):
    for slot_index, source in enumerate(list(obj.data.materials)):
        color = getattr(source, "diffuse_color", (0.55, 0.62, 0.58, 1.0)) if source else (0.55, 0.62, 0.58, 1.0)
        flat = make_material(f"flat_{obj.name}_{slot_index}", color, 0.84)
        obj.data.materials[slot_index] = flat


def normalize_imported_asset(root, imported):
    mesh_objects = [obj for obj in imported if obj.type == "MESH"]
    if not mesh_objects:
        return

    bpy.context.view_layer.update()

    min_x = min((obj.matrix_world @ mathutils.Vector(corner)).x for obj in mesh_objects for corner in obj.bound_box)
    max_x = max((obj.matrix_world @ mathutils.Vector(corner)).x for obj in mesh_objects for corner in obj.bound_box)
    min_y = min((obj.matrix_world @ mathutils.Vector(corner)).y for obj in mesh_objects for corner in obj.bound_box)
    max_y = max((obj.matrix_world @ mathutils.Vector(corner)).y for obj in mesh_objects for corner in obj.bound_box)
    min_z = min((obj.matrix_world @ mathutils.Vector(corner)).z for obj in mesh_objects for corner in obj.bound_box)

    offset_x = (min_x + max_x) * 0.5 - root.location.x
    offset_y = (min_y + max_y) * 0.5 - root.location.y
    offset_z = min_z - root.location.z

    for obj in imported:
        obj.location.x -= offset_x
        obj.location.y -= offset_y
        obj.location.z -= offset_z


def create_vendor_city_layer(materials):
    col = create_collection("04_vendor_cc0_city_layer")

    placements = [
        ("roads", "road-crossroad.glb", "vendor_crossroad_center", (0, 0.02, 0), 1.35, (0, 0, 0)),
        ("roads", "road-straight.glb", "vendor_road_west", (-2.65, 0.02, 0), 1.35, (0, 0, 0)),
        ("roads", "road-straight.glb", "vendor_road_east", (2.65, 0.02, 0), 1.35, (0, 0, 0)),
        ("roads", "road-straight.glb", "vendor_road_north", (0, 0.02, 2.65), 1.35, (0, radians(90), 0)),
        ("roads", "road-straight.glb", "vendor_road_south", (0, 0.02, -2.65), 1.35, (0, radians(90), 0)),
        ("roads", "road-roundabout.glb", "vendor_roundabout_market", (3.35, 0.02, -1.75), 1.0, (0, 0, 0)),
        ("commercial", "building-b.glb", "vendor_market_office_a", (4.7, 0.02, -0.35), 0.92, (0, radians(-18), 0)),
        ("commercial", "building-f.glb", "vendor_market_office_b", (5.05, 0.02, -2.8), 0.92, (0, radians(22), 0)),
        ("commercial", "building-skyscraper-a.glb", "vendor_market_tower_a", (3.75, 0.02, -3.45), 0.74, (0, radians(8), 0)),
        ("commercial", "building-skyscraper-c.glb", "vendor_market_tower_b", (5.85, 0.02, -1.65), 0.62, (0, radians(-12), 0)),
        ("commercial", "detail-parasol-a.glb", "vendor_agent_plaza_parasol", (3.2, 0.04, -0.48), 0.8, (0, radians(18), 0)),
        ("suburban", "building-type-a.glb", "vendor_training_dorm_a", (1.75, 0.02, 3.15), 0.72, (0, radians(14), 0)),
        ("suburban", "building-type-f.glb", "vendor_training_dorm_b", (3.0, 0.02, 3.25), 0.72, (0, radians(-8), 0)),
        ("suburban", "fence-3x3.glb", "vendor_training_fence_a", (1.65, 0.04, 2.05), 0.95, (0, radians(90), 0)),
        ("suburban", "fence-3x2.glb", "vendor_training_fence_b", (3.45, 0.04, 2.05), 0.95, (0, radians(90), 0)),
        ("suburban", "tree-large.glb", "vendor_tree_a", (-5.6, 0.02, 1.9), 0.95, (0, 0, 0)),
        ("suburban", "tree-large.glb", "vendor_tree_b", (-5.2, 0.02, -2.2), 0.8, (0, radians(26), 0)),
        ("suburban", "tree-small.glb", "vendor_tree_c", (1.05, 0.02, 2.25), 0.82, (0, radians(-12), 0)),
        ("roads", "light-square-double.glb", "vendor_light_stadium_a", (-5.3, 0.04, -0.2), 0.8, (0, radians(90), 0)),
        ("roads", "light-square-double.glb", "vendor_light_market_a", (4.12, 0.04, -0.9), 0.8, (0, radians(-10), 0)),
    ]

    for pack, file_name, name, location, scale, rotation in placements:
        imported = import_asset(col, glb_path(pack, file_name), name, location, scale, rotation)
        if imported:
            normalize_imported_asset(imported[-1], imported[:-1])

    add_text(col, "vendor_city_label", "PLAYMANAGER CITY", (-1.05, -2.58, 0.18), 0.24, materials["light"])
    return col


def setup_world():
    world = bpy.data.worlds["World"]
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.012, 0.02, 0.018, 1.0)
    bg.inputs[1].default_value = 0.8

    bpy.ops.object.light_add(type="SUN", location=(4.5, -6.0, 8.5))
    sun = bpy.context.active_object
    sun.name = "Sun_key_light"
    sun.data.energy = 2.6
    sun.rotation_euler = (radians(35), 0.0, radians(40))

    bpy.ops.object.light_add(type="AREA", location=(-2.5, 3.5, 4.5))
    area = bpy.context.active_object
    area.name = "Area_soft_green_fill"
    area.data.energy = 1200
    area.data.color = (0.48, 1.0, 0.78)
    area.scale = (3.0, 3.0, 3.0)


def move_collection(collection, x):
    for obj in collection.objects:
        obj.location.x += x


def collection_objects(collection):
    return [obj for obj in collection.objects]


def export_collection(collection, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection_objects(collection):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = collection_objects(collection)[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_animations=False,
        export_lights=False,
        export_cameras=False,
    )


def main():
    ensure_output_dir()
    reset_scene()

    materials = {
        "ground": make_material("pm_ground", (0.07, 0.1, 0.08, 1.0), 0.9),
        "asphalt": make_material("pm_asphalt", (0.035, 0.05, 0.05, 1.0), 0.86),
        "concrete": make_material("pm_concrete_warm", (0.66, 0.78, 0.68, 1.0), 0.72),
        "steel": make_material("pm_steel", (0.25, 0.33, 0.34, 1.0), 0.48, 0.12),
        "pitch": make_material("pm_pitch", (0.09, 0.78, 0.32, 1.0), 0.88),
        "pitch_dark": make_material("pm_training_pitch", (0.04, 0.5, 0.22, 1.0), 0.9),
        "line": make_material("pm_field_lines", (0.93, 1.0, 0.88, 1.0), 0.38),
        "light": make_material("pm_warm_light", (0.95, 1.0, 0.62, 1.0), 0.24),
        "seat_red": make_material("pm_seat_red", (0.42, 0.05, 0.06, 1.0), 0.66),
        "seat_blue": make_material("pm_seat_blue", (0.04, 0.16, 0.34, 1.0), 0.66),
        "teal": make_material("pm_teal_facility", (0.08, 0.42, 0.45, 1.0), 0.55),
        "glass": make_material("pm_glass_green", (0.36, 0.72, 0.64, 0.82), 0.32, 0.04),
        "orange": make_material("pm_training_orange", (1.0, 0.54, 0.12, 1.0), 0.64),
        "lime": make_material("pm_lime_roof", (0.62, 0.88, 0.2, 1.0), 0.56),
        "car": make_material("pm_staff_car", (0.1, 0.18, 0.22, 1.0), 0.5),
        "cyan": make_material("pm_market_cyan", (0.04, 0.36, 0.44, 1.0), 0.48, 0.08),
        "light_blue": make_material("pm_light_blue", (0.52, 0.94, 1.0, 1.0), 0.24),
        "dark_blue": make_material("pm_dark_screen", (0.02, 0.07, 0.11, 1.0), 0.5),
        "wood": make_material("pm_tree_wood", (0.28, 0.14, 0.06, 1.0), 0.82),
        "tree": make_material("pm_tree_green", (0.08, 0.36, 0.14, 1.0), 0.9),
    }

    city_context = create_city_context(materials)
    stadium = create_stadium(materials)
    training = create_training_base(materials)
    market = create_transfer_center(materials)
    vendor_city = create_vendor_city_layer(materials)

    move_collection(stadium, -4.2)
    move_collection(training, 0.0)
    move_collection(market, 4.2)
    setup_world()

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

    export_collection(stadium, "stadium-lowpoly.glb")
    export_collection(training, "training-base-lowpoly.glb")
    export_collection(market, "transfer-center-lowpoly.glb")
    export_collection(vendor_city, "city-context-lowpoly.glb")

    print("Exported richer PlayManager football city assets to:", OUTPUT_DIR)


main()
