import bmesh
import bpy

obj = bpy.context.object
mesh = obj.data
verts = mesh.vertices

adjacency = [set() for _ in verts]
for poly in mesh.polygons:
    ids = list(poly.vertices)
    for index, current in enumerate(ids):
        nxt = ids[(index + 1) % len(ids)]
        adjacency[current].add(nxt)
        adjacency[nxt].add(current)

seen = set()
components = []
for start in range(len(verts)):
    if start in seen:
        continue
    stack = [start]
    seen.add(start)
    comp = []
    while stack:
        vertex_index = stack.pop()
        comp.append(vertex_index)
        for neighbor in adjacency[vertex_index]:
            if neighbor not in seen:
                seen.add(neighbor)
                stack.append(neighbor)

    points = [obj.matrix_world @ verts[i].co for i in comp]
    min_x = min(point.x for point in points)
    max_x = max(point.x for point in points)
    min_y = min(point.y for point in points)
    max_y = max(point.y for point in points)
    min_z = min(point.z for point in points)
    max_z = max(point.z for point in points)
    components.append((comp, min_x, max_x, min_y, max_y, min_z, max_z))

obj_min_x = min(component[1] for component in components)
obj_max_x = max(component[2] for component in components)
obj_min_z = min(component[5] for component in components)
obj_max_z = max(component[6] for component in components)

remove = set()
width = obj_max_x - obj_min_x
height = obj_max_z - obj_min_z

for comp, min_x, max_x, _min_y, _max_y, min_z, max_z in components:
    center_x = (min_x + max_x) / 2
    center_z = (min_z + max_z) / 2
    dim_x = max_x - min_x
    dim_z = max_z - min_z
    high = center_z > obj_min_z + height * 0.42
    left_outside = center_x < obj_min_x + width * 0.32
    not_main_body = len(comp) < 80000 and max(dim_x, dim_z) < height * 0.65
    if high and left_outside and not_main_body:
        remove.update(comp)

if remove:
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    doomed = [vertex for vertex in bm.verts if vertex.index in remove]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

print(f"removed floating crane vertices: {len(remove)}")
