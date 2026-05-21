import { NextRequest, NextResponse } from "next/server";
import { moderateText } from "@/lib/moderate";

export async function POST(request: NextRequest) {
  let body: { message?: string; text?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ toxic: false, ok: true }); }

  const content = ((body.message ?? body.text ?? "")).trim();
  if (!content) return NextResponse.json({ toxic: false, ok: true });

  const result = await moderateText(content);
  return NextResponse.json({ toxic: !result.ok, ok: result.ok, reason: result.reason });
}
