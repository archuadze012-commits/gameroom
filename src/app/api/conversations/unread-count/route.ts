import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lightweight unread-DM count for the global nav badge, which polls every 30s for
// every logged-in user on every page. The old badge fetched GET /api/conversations
// — a 1+3N fan-out (profile + last message + unread count per conversation) — and
// threw away everything but the unread sum. This does the same total in two bounded
// queries regardless of thread count.
export async function GET() {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ count: 0 });

  const supabase = await createSupabaseServerClient();

  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const ids = (convs ?? []).map((c) => c.id);
  if (ids.length === 0) return NextResponse.json({ count: 0 });

  const { count } = await supabase
    .from("conversation_messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return NextResponse.json({ count: count ?? 0 });
}
