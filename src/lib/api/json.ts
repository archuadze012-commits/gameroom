import { NextResponse } from "next/server";

type JsonResult<T extends object> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function readJsonObject<T extends object = Record<string, unknown>>(
  request: Request,
  maxChars = 64 * 1024,
): Promise<JsonResult<T>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unsupported_media_type" }, { status: 415 }),
    };
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxChars) {
    return {
      ok: false,
      response: NextResponse.json({ error: "payload_too_large" }, { status: 413 }),
    };
  }

  let parsed: unknown;
  try {
    const text = await request.text();
    if (text.length > maxChars) {
      return {
        ok: false,
        response: NextResponse.json({ error: "payload_too_large" }, { status: 413 }),
      };
    }
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "bad_request" }, { status: 400 }),
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "bad_request" }, { status: 400 }),
    };
  }

  return { ok: true, data: parsed as T };
}
