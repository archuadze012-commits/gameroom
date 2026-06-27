import json
import os
import re
import sys
import time
from datetime import datetime

import requests


def get_api_key():
    key = os.environ.get("MESHY_API_KEY")
    if key:
        return key
    for name in (".env.local", ".env"):
        if not os.path.exists(name):
            continue
        for line in open(name, encoding="utf-8"):
            if line.strip().startswith("MESHY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("MESHY_API_KEY is not configured")


API_KEY = get_api_key()
BASE = "https://api.meshy.ai"
SESSION = requests.Session()
SESSION.trust_env = False
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

PROMPT = (
    "Standalone football city environment only, no buildings and no stadium. Premium isometric cyber-neon "
    "diorama: one large octagonal multi-tier charcoal platform with beveled edges and thin emerald-green neon. "
    "A big empty circular central stadium pad, looping asphalt roads, curbs, pedestrian paths, crosswalks, low "
    "railings, trees, benches, street lamps, green edge lights and fourteen separate empty rectangular pads for "
    "future buildings. Symmetrical, game-ready, clean modular topology, graphite metal, asphalt, concrete and "
    "greenery. No text, logos, crests, flags, people, vehicles, billboards or buildings."
)


def request(method, endpoint, **kwargs):
    response = SESSION.request(method, f"{BASE}{endpoint}", headers=HEADERS, timeout=60, **kwargs)
    if not response.ok:
        raise RuntimeError(f"Meshy API {response.status_code}: {response.text}")
    return response.json()


def create_task(endpoint, payload):
    task_id = request("POST", endpoint, json=payload)["result"]
    print(f"TASK_CREATED: {task_id}", flush=True)
    return task_id


def poll(endpoint, task_id):
    delay = 5
    while True:
        task = request("GET", f"{endpoint}/{task_id}")
        status = task["status"]
        progress = task.get("progress", 0)
        print(f"{status}: {progress}%", flush=True)
        if status == "SUCCEEDED":
            return task
        if status in ("FAILED", "CANCELED"):
            raise RuntimeError(task.get("task_error", {}).get("message", status))
        time.sleep(15 if progress >= 95 else delay)
        delay = min(int(delay * 1.5), 30)


def download(url, destination):
    with SESSION.get(url, stream=True, timeout=300) as response:
        response.raise_for_status()
        with open(destination, "wb") as file:
            for chunk in response.iter_content(1024 * 1024):
                if chunk:
                    file.write(chunk)


def main():
    balance = request("GET", "/openapi/v1/balance").get("balance")
    print(f"BALANCE_BEFORE: {balance}", flush=True)
    preview_id = create_task("/openapi/v2/text-to-3d", {
        "mode": "preview",
        "prompt": PROMPT,
        "model_type": "lowpoly",
        "target_formats": ["glb"],
    })
    preview = poll("/openapi/v2/text-to-3d", preview_id)
    slug = re.sub(r"[^a-z0-9]+", "-", "football-city-environment").strip("-")
    project_dir = os.path.join("meshy_output", f"{datetime.now():%Y%m%d_%H%M%S}_{slug}_{preview_id[:8]}")
    os.makedirs(project_dir, exist_ok=True)
    download(preview["model_urls"]["glb"], os.path.join(project_dir, "preview.glb"))
    if preview.get("thumbnail_url"):
        download(preview["thumbnail_url"], os.path.join(project_dir, "preview-thumbnail.png"))

    refine_id = create_task("/openapi/v2/text-to-3d", {
        "mode": "refine",
        "preview_task_id": preview_id,
        "enable_pbr": True,
        "remove_lighting": True,
        "target_formats": ["glb"],
        "texture_prompt": "dark graphite asphalt, charcoal concrete, brushed black metal, vivid emerald neon edge strips, clean roads and landscaped greenery"
    })
    refined = poll("/openapi/v2/text-to-3d", refine_id)
    download(refined["model_urls"]["glb"], os.path.join(project_dir, "environment.glb"))
    if refined.get("thumbnail_url"):
        download(refined["thumbnail_url"], os.path.join(project_dir, "thumbnail.png"))

    metadata = {
        "prompt": PROMPT,
        "preview_task_id": preview_id,
        "refine_task_id": refine_id,
        "files": ["preview.glb", "environment.glb", "thumbnail.png"],
    }
    with open(os.path.join(project_dir, "metadata.json"), "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2)
    print(f"OUTPUT: {os.path.abspath(project_dir)}", flush=True)
    print(f"BALANCE_AFTER: {request('GET', '/openapi/v1/balance').get('balance')}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
