"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { postClanAnnouncementAction, deleteClanAnnouncementAction } from "./clan-feature-actions";

export type ClanAnnouncement = {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatar: string | null;
};

function ago(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} წთ`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} სთ`;
  return `${Math.floor(h / 24)} დღე`;
}

export function ClanAnnouncements({
  slug,
  canPost,
  announcements,
}: {
  slug: string;
  canPost: boolean;
  announcements: ClanAnnouncement[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const post = () => {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await postClanAnnouncementAction(slug, text);
      if (res.success) {
        toast.success(res.message);
        setBody("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteClanAnnouncementAction(id, slug);
      if (res.success) router.refresh();
      else toast.error(res.message);
    });
  };

  return (
    <div className="pubg-loadout-link block" data-variant="royale">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-amber-500/80" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
            <Megaphone className="h-4 w-4 text-amber-400" /> განცხადებები
          </div>

          {canPost && (
            <div className="mb-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="დაწერე განცხადება კლანისთვის..."
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/50 disabled:opacity-50"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={post}
                  disabled={isPending || !body.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/90 px-4 py-2 text-[12px] font-black uppercase tracking-wider text-[#2a1600] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  გამოქვეყნება
                </button>
              </div>
            </div>
          )}

          {announcements.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-white/40">ჯერ განცხადება არ არის.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 border border-white/10">
                      <AvatarImage src={a.authorAvatar ?? undefined} />
                      <AvatarFallback>{a.authorName.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px]">
                          <Link href={a.authorUsername ? `/profile/${a.authorUsername}` : "#"} className="font-black text-white/80 hover:text-amber-300">
                            {a.authorName}
                          </Link>
                          <span className="text-white/30">{ago(a.created_at)}</span>
                        </div>
                        {canPost && (
                          <button
                            type="button"
                            onClick={() => remove(a.id)}
                            disabled={isPending}
                            aria-label="წაშლა"
                            className="rounded p-1 text-white/30 transition-colors hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">{a.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
