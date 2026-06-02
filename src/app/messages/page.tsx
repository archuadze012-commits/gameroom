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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#05050f]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_70%)]" />

      <div className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14">
        {/* Header - Premium Glass Wrapper */}
        <header className="mb-10 group relative rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]">
          <div className="relative flex items-center gap-4 h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714] p-5 sm:p-6 shadow-[inset_0_0_30px_rgba(139,92,246,0.05)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <Inbox className="h-5 w-5 text-violet-400 drop-shadow-[0_0_5px_rgba(139,92,246,0.8)]" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">GAMEROOM DIRECT</p>
              <DisplayHeading as="h1" size="lg" className="drop-shadow-md text-white">
                მესენჯერი
              </DisplayHeading>
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState
            tone="violet"
            illustration={<MessageSquare className="h-10 w-10 text-violet-400" />}
            title="ჯერ მესიჯები არ გაქვს"
            description="დაიწყე საუბარი ნებისმიერი იუზერის პროფილიდან."
          />
        ) : (
          <div className="space-y-3">
            {items.map((c) => {
              const name = c.other?.display_name ?? c.other?.username ?? "user";
              const isUnread = c.unread > 0;
              
              return (
                <Link key={c.id} href={`/messages/${c.id}`} className="group block">
                  <article
                    className={`relative flex items-center gap-4 overflow-hidden rounded-[20px] p-4 transition-all duration-300 ${
                      isUnread 
                        ? "bg-[linear-gradient(135deg,rgba(139,92,246,0.1),rgba(236,72,153,0.05))] border border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.15)] group-hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] group-hover:border-pink-500/60 group-hover:-translate-y-0.5" 
                        : "bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 group-hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Hover Glow Effect */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

                    <div className="relative shrink-0">
                      <UserAvatar
                        username={c.other?.username ?? "user"}
                        displayName={c.other?.display_name ?? undefined}
                        avatarUrl={c.other?.avatar_url}
                        size="md"
                      />
                      {isUnread && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pink-500 ring-2 ring-[#05050f] shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate font-display text-lg font-black uppercase text-white drop-shadow-sm group-hover:text-pink-400 transition-colors">
                          {name}
                        </span>
                        {c.lastMessage?.created_at && (
                          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-white/40 group-hover:text-white/60 transition-colors">
                            {new Date(c.lastMessage.created_at).toLocaleString("ka-GE", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center gap-3">
                        <p className={`truncate text-[14px] ${isUnread ? "font-medium text-pink-100/90" : "text-white/50"}`}>
                          {c.lastMessage?.sender_id === user.id && (
                            <span className="text-white/30 mr-1">შენ:</span>
                          )}
                          {c.lastMessage?.body ?? "ცარიელი მიმოწერა"}
                        </p>
                        
                        {isUnread && (
                          <Pill tone="accent" className="ml-auto shrink-0 bg-pink-500/20 text-pink-300 border-pink-500/30">
                            {c.unread} ახალი
                          </Pill>
                        )}
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
