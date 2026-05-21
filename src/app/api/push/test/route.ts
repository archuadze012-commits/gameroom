import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await sendPushToUser(user.id, {
    title: "Gameroom test 🎮",
    body: "Push notification მუშაობს!",
    url: "/",
    tag: "test",
  });

  return NextResponse.json({ ok: true });
}
