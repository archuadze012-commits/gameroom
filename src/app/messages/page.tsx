import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";

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
  lastMessage: { body: string; created_at: string | null; sender_id: string } | null;
  unread: number;
  last_message_at: string | null;
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

  const convoRows = convos ?? [];
  const otherIds = convoRows.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
  const convoIds = convoRows.map((c) => c.id);

  // Batch what used to be two queries PER conversation into one query each:
  // all counterpart profiles in a single `.in`, and all unread messages in a
  // single `.in` tallied by conversation in JS. (3N round trips → N + 2.)
  const [{ data: profileRows }, { data: unreadRows }] = await Promise.all([
    otherIds.length
      ? supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified")
          .in("id", otherIds)
      : Promise.resolve({ data: [] as { id: string; username: string; display_name: string | null; avatar_url: string | null; is_verified: boolean }[] }),
    convoIds.length
      ? supabase
          .from("conversation_messages")
          .select("conversation_id")
          .in("conversation_id", convoIds)
          .neq("sender_id", user.id)
          .is("read_at", null)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as { conversation_id: string }[] }),
  ]);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));
  const unreadMap = new Map<string, number>();
  for (const r of unreadRows ?? []) {
    unreadMap.set(r.conversation_id, (unreadMap.get(r.conversation_id) ?? 0) + 1);
  }

  // Last message is the only remaining per-conversation query (newest non-deleted
  // row); PostgREST can't do "latest-per-group" in one shot without an RPC.
  const items: ConvoListItem[] = await Promise.all(
    convoRows.map(async (c) => {
      const otherId = c.user_a === user.id ? c.user_b : c.user_a;
      const { data: lastMsg } = await supabase
        .from("conversation_messages")
        .select("body, created_at, sender_id")
        .eq("conversation_id", c.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const profile = profileMap.get(otherId);
      return {
        id: c.id,
        otherId,
        other: profile
          ? {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              is_verified: profile.is_verified,
            }
          : null,
        lastMessage: lastMsg,
        unread: unreadMap.get(c.id) ?? 0,
        last_message_at: c.last_message_at,
      };
    })
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Dot grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-3xl px-4 py-8 lg:py-10">
        <DisplayHeading as="h1" size="display" className="mb-8 bg-[linear-gradient(180deg,#fff_0%,rgba(255,255,255,0.65)_100%)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
          მესენჯერი
        </DisplayHeading>
        {items.length === 0 ? (
          /* Empty state — loadout card */
          <div className="pubg-loadout-link group relative block transition-all duration-500" data-variant="room">
            <div className="pubg-loadout-card relative overflow-hidden p-12 text-center">
              <span aria-hidden className="pubg-loadout-field absolute inset-0" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
              <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-30" />
              <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />
              
              <div className="relative z-[1] flex flex-col items-center gap-4">
                <MessageSquare className="h-10 w-10 text-[var(--gr-cyan-glow)] drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                <div className="space-y-1">
                  <h3 className="font-display text-[20px] font-black uppercase text-[var(--gr-text)] drop-shadow-md">
                    ჯერ მესიჯები არ გაქვს
                  </h3>
                  <p className="text-[13px] text-[var(--gr-text-mute)]">
                    დაიწყე საუბარი ნებისმიერი იუზერის პროფილიდან.
                  </p>
                </div>
                <ChevronButton href="/search" variant="violet" size="sm" className="mt-2">
                  მოთამაშეების ძებნა
                </ChevronButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pubg-card-stage">
            {items.map((c, index) => {
              const name = c.other?.display_name ?? c.other?.username ?? "user";
              const isUnread = c.unread > 0;

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="pubg-loadout-link group block"
                  data-variant={isUnread ? "royale" : "strike"}
                  style={{ "--pubg-card-index": index } as React.CSSProperties}
                >
                  <article className="pubg-loadout-card relative overflow-hidden">
                    {/* Decorators */}
                    <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                    <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                    <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-20" />
                    <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />

                    <div className="relative z-[1] flex items-center gap-4 p-4">
                      <div className="relative shrink-0">
                        <UserAvatar
                          username={c.other?.username ?? "user"}
                          displayName={c.other?.display_name ?? undefined}
                          avatarUrl={c.other?.avatar_url}
                          size="md"
                        />
                        {isUnread && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--gr-magenta)] ring-2 ring-[var(--gr-bg-0)] shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-2">
                          <span className="truncate font-display text-[16px] font-black uppercase tracking-tight text-[var(--gr-text)] transition-colors group-hover:text-[var(--gr-cyan-glow)]">
                            {name}
                          </span>
                          {c.lastMessage?.created_at && (
                            <span className="pubg-loadout-code shrink-0 font-display text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                              {new Date(c.lastMessage.created_at).toLocaleString("ka-GE", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <p className={`truncate text-[13px] ${isUnread ? "font-semibold text-[var(--gr-text)]" : "text-[var(--gr-text-mute)]"}`}>
                            {c.lastMessage?.sender_id === user.id && (
                              <span className="text-[var(--gr-text-dim)] mr-1">შენ:</span>
                            )}
                            {c.lastMessage?.body ?? "ცარიელი მიმოწერა"}
                          </p>

                          {isUnread && (
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm bg-[var(--gr-magenta)]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-magenta)]">
                              <Sparkles className="h-3 w-3" /> {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
