import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { orderUsers } from "@/lib/dm";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, last_message_at, created_at")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each, get the OTHER participant's profile + last message + unread count
  const result = await Promise.all(
    (convos ?? []).map(async (c) => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const [{ data: profile }, { data: lastMsg }, { count: unread }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, display_name, avatar_url, is_verified")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("conversation_messages")
          .select("body, created_at, sender_id")
          .eq("conversation_id", c.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("conversation_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", user.id)
          .is("read_at", null),
      ]);

      return {
        id: c.id,
        other: profile,
        otherId,
        lastMessage: lastMsg,
        unread: unread ?? 0,
        last_message_at: c.last_message_at,
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`conversation-new:${user.id}`, 20, 60_000))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const otherUserId = typeof body.userId === "string" ? body.userId : null;
  if (!otherUserId || otherUserId === user.id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ordered = orderUsers(user.id, otherUserId);
  const supabase = await createSupabaseServerClient();

  // Try to find existing
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", ordered.user_a)
    .eq("user_b", ordered.user_b)
    .maybeSingle();

  if (existing) return NextResponse.json({ id: existing.id });

  const { data, error } = await supabase
    .from("conversations")
    .insert(ordered)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
