import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "მესიჯები" };

type ConvoListItem = {
  id: string;
  otherId: string;
  other: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
  lastMessage: { body: string; created_at: string; sender_id: string } | null;
  unread: number;
  last_message_at: string;
};

export default async function MessagesPage() {
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, last_message_at")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false })
    .limit(100);

  // build list
  const items: ConvoListItem[] = await Promise.all(
    (convos ?? []).map(async (c) => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const [{ data: profile }, { data: lastMsg }, { count }] = await Promise.all([
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
        otherId,
        other: profile,
        lastMessage: lastMsg,
        unread: count ?? 0,
        last_message_at: c.last_message_at,
      };
    })
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Inbox className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">მესიჯები</h1>
          <p className="text-xs text-muted-foreground">პირადი მიმოწერა</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p>ჯერ არ გაქვს მესიჯები. დაიწყე საუბარი იუზერის პროფილიდან.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {items.map((c) => (
            <Link key={c.id} href={`/messages/${c.id}`}>
              <Card className="border-border/60 transition-colors hover:border-primary/40 hover:bg-secondary/30">
                <CardContent className="flex items-center gap-3 p-3">
                  <UserAvatar
                    username={c.other?.username ?? "user"}
                    displayName={c.other?.display_name ?? undefined}
                    avatarUrl={c.other?.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {c.other?.display_name ?? c.other?.username ?? "user"}
                      </span>
                      {c.lastMessage && (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {new Date(c.lastMessage.created_at).toLocaleString("ka-GE", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {c.lastMessage?.sender_id === user.id ? "შენ: " : ""}
                        {c.lastMessage?.body ?? "ცარიელი მიმოწერა"}
                      </p>
                      {c.unread > 0 && (
                        <Badge className="ml-auto h-5 min-w-5 px-1.5 text-[10px]">
                          {c.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
