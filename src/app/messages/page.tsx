import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Inbox } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";

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

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <header className="mb-8 flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center"
            style={{
              clipPath: cutSm,
              background: "rgba(236,72,153,0.1)",
              border: "1px solid rgba(236,72,153,0.3)",
              boxShadow: "0 0 14px rgba(236,72,153,0.3)",
            }}
          >
            <Inbox className="h-5 w-5" style={{ color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(236,72,153,1))" }} />
          </div>
          <div>
            <DisplayHeading as="h1" size="lg" style={{ color: "#ffffff", textShadow: "0 0 10px rgba(236,72,153,0.9), 0 0 24px rgba(236,72,153,0.55), 0 0 40px rgba(236,72,153,0.3)" }}>მესენჯერი</DisplayHeading>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState
            tone="violet"
            illustration={<MessageSquare className="h-9 w-9 text-[var(--gr-violet-hi)]" />}
            title="ჯერ მესიჯები არ გაქვს"
            description="დაიწყე საუბარი ნებისმიერი იუზერის პროფილიდან."
          />
        ) : (
          <div className="space-y-2">
            {items.map((c) => {
              const name = c.other?.display_name ?? c.other?.username ?? "user";
              return (
                <Link key={c.id} href={`/messages/${c.id}`} className="group block transition-transform hover:-translate-y-0.5 duration-300">
                  <div
                    className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                    style={{
                      background: c.unread > 0 
                        ? 'var(--card-border-hover, rgba(139,92,246,0.55))' 
                        : 'var(--card-border-hover, rgba(255,255,255,0.15))',
                      padding: 1,
                      clipPath: cutSm
                    }}
                  >
                    <article
                      className="relative flex items-center gap-3 bg-[var(--gr-bg-1)] p-3 overflow-hidden"
                      style={{ clipPath: cutSm }}
                    >
                      {/* Hover Effects */}
                      <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />

                      {c.unread > 0 && (
                        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] z-[6]" style={{ background: "rgba(236,72,153,1)", boxShadow: "0 0 10px rgba(236,72,153,0.8)" }} />
                      )}
                      
                      <div className="relative z-10 flex items-center gap-3 w-full">
                        <UserAvatar
                          username={c.other?.username ?? "user"}
                          displayName={c.other?.display_name ?? undefined}
                          avatarUrl={c.other?.avatar_url}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="truncate font-semibold"
                              style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.5)" }}
                            >
                              {name}
                            </span>
                            {c.lastMessage && (
                              <span
                                className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.1em]"
                                style={{ color: "rgba(255,255,255,0.6)", textShadow: "0 0 6px rgba(236,72,153,0.6)" }}
                              >
                                {new Date(c.lastMessage.created_at).toLocaleString("ka-GE", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <p
                              className="truncate text-[12.5px]"
                              style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.7), 0 0 14px rgba(236,72,153,0.4)" }}
                            >
                              {c.lastMessage?.sender_id === user.id ? "შენ: " : ""}
                              {c.lastMessage?.body ?? "ცარიელი მიმოწერა"}
                            </p>
                            {c.unread > 0 && (
                              <Pill tone="accent" className="ml-auto shrink-0">
                                {c.unread}
                              </Pill>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
