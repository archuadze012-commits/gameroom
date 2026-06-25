import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

// Dev-only: overwrites a building sprite with an edited (erased/restored) version
// produced by the in-browser canvas editor. Disabled in production.

const BUILDINGS_DIR = path.join(
  process.cwd(),
  "public",
  "playmanager",
  "city",
  "buildings",
);

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  let body: { src?: string; dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const src = (body.src ?? "").split("?")[0];
  const dataUrl = body.dataUrl ?? "";

  // Only allow writing inside the buildings directory.
  const prefix = "/playmanager/city/buildings/";
  const fileName = src.startsWith(prefix) ? src.slice(prefix.length) : "";
  if (!fileName || fileName.includes("/") || fileName.includes("..")) {
    return NextResponse.json({ error: "bad_path" }, { status: 400 });
  }

  const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: "bad_data" }, { status: 400 });
  }

  const target = path.join(BUILDINGS_DIR, fileName);
  if (!target.startsWith(BUILDINGS_DIR)) {
    return NextResponse.json({ error: "bad_path" }, { status: 400 });
  }

  try {
    await fs.writeFile(target, Buffer.from(match[2], "base64"));
  } catch {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
