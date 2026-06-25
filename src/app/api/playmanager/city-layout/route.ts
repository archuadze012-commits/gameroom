import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

// Dev-only editor endpoint: persists the iso-city sprite/hotspot layout to a
// static JSON file that the public map reads on load. Disabled in production.

const LAYOUT_PATH = path.join(
  process.cwd(),
  "public",
  "playmanager",
  "city",
  "layout.json",
);

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { sprites?: unknown }).sprites) ||
    !Array.isArray((body as { hotspots?: unknown }).hotspots)
  ) {
    return NextResponse.json({ error: "bad_shape" }, { status: 400 });
  }

  try {
    await fs.writeFile(LAYOUT_PATH, JSON.stringify(body, null, 2), "utf8");
  } catch {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
