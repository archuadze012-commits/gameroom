"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, Send, Trash2, Loader2, Pin, PinOff, BarChart3, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  postClanAnnouncementAction,
  deleteClanAnnouncementAction,
  togglePinClanAnnouncementAction,
  voteClanPollAction,
} from "./clan-feature-actions";

export type ClanPollOption = { id: string; label: string; votes: number };

export type ClanAnnouncement = {
  id: string;
  body: string;
  created_at: string;
  pinned: boolean;
  authorName: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  pollQuestion: string | null;
  pollOptions: ClanPollOption[];
  myVote: string | null;
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
  isMember,
  announcements,
}: {
  slug: string;
  canPost: boolean;
  isMember: boolean;
  announcements: ClanAnnouncement[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pollOn, setPollOn] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isPending, startTransition] = useTransition();

  const post = () => {
    const text = body.trim();
    if (!text) return;
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    const poll = pollOn && pollQuestion.trim() && opts.length >= 2 ? { question: pollQuestion.trim(), options: opts } : undefined;
    if (pollOn && !poll) {
      toast.error("გამოკითხვას სჭირდება კითხვა და 2+ პასუხი");
      return;
    }
    startTransition(async () => {
      const res = await postClanAnnouncementAction(slug, text, poll);
      if (res.success) {
        toast.success(res.message);
        setBody("");
        setPollOn(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
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

  const togglePin = (id: string, pin: boolean) => {
    startTransition(async () => {
      const res = await togglePinClanAnnouncementAction(id, slug, pin);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.message);
    });
  };

  const vote = (announcementId: string, optionId: string) => {
    startTransition(async () => {
      const res = await voteClanPollAction(slug, announcementId, optionId);
      if (res.success) router.refresh();
      else toast.error(res.message);
    });
  };

  const pinned = announcements.find((a) => a.pinned) ?? null;
  const rest = announcements.filter((a) => !a.pinned);

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

              {pollOn && (
                <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    maxLength={200}
                    placeholder="გამოკითხვის კითხვა"
                    disabled={isPending}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-amber-500/50"
                  />
                  {pollOptions.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={o}
                        onChange={(e) => setPollOptions((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                        maxLength={80}
                        placeholder={`პასუხი ${i + 1}`}
                        disabled={isPending}
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-amber-500/50"
                      />
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => setPollOptions((arr) => arr.filter((_, j) => j !== i))} className="rounded p-1 text-white/30 hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button type="button" onClick={() => setPollOptions((arr) => [...arr, ""])} className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-white/80">
                      <Plus className="h-3.5 w-3.5" /> პასუხის დამატება
                    </button>
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPollOn((v) => !v)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
                    pollOn ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/10 text-white/50 hover:text-white/80"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> გამოკითხვა
                </button>
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

          {pinned && (
            <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border border-amber-500/30">
                  <AvatarImage src={pinned.authorAvatar ?? undefined} />
                  <AvatarFallback>{pinned.authorName.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1 font-black uppercase tracking-wider text-amber-400">
                        <Pin className="h-3 w-3" /> დაპინული
                      </span>
                      <Link href={pinned.authorUsername ? `/profile/${pinned.authorUsername}` : "#"} className="font-black text-white/80 hover:text-amber-300">
                        {pinned.authorName}
                      </Link>
                      <span className="text-white/30">{ago(pinned.created_at)}</span>
                    </div>
                    {canPost && (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => togglePin(pinned.id, false)} disabled={isPending} aria-label="მოხსნა დაპინვიდან" className="rounded p-1 text-amber-400/70 transition-colors hover:text-amber-300">
                          <PinOff className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => remove(pinned.id)} disabled={isPending} aria-label="წაშლა" className="rounded p-1 text-white/30 transition-colors hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/90">{pinned.body}</p>
                  <Poll a={pinned} isMember={isMember} disabled={isPending} onVote={vote} />
                </div>
              </div>
            </div>
          )}

          {announcements.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-white/40">ჯერ განცხადება არ არის.</p>
          ) : rest.length === 0 ? null : (
            <ul className="space-y-3">
              {rest.map((a) => (
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
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => togglePin(a.id, true)} disabled={isPending} aria-label="დაპინვა" className="rounded p-1 text-white/30 transition-colors hover:text-amber-300">
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(a.id)}
                              disabled={isPending}
                              aria-label="წაშლა"
                              className="rounded p-1 text-white/30 transition-colors hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">{a.body}</p>
                      <Poll a={a} isMember={isMember} disabled={isPending} onVote={vote} />
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

function Poll({
  a,
  isMember,
  disabled,
  onVote,
}: {
  a: ClanAnnouncement;
  isMember: boolean;
  disabled: boolean;
  onVote: (announcementId: string, optionId: string) => void;
}) {
  if (!a.pollQuestion || a.pollOptions.length === 0) return null;
  const total = a.pollOptions.reduce((s, o) => s + o.votes, 0);

  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-black text-white">
        <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> {a.pollQuestion}
      </div>
      <div className="space-y-1.5">
        {a.pollOptions.map((o) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const mine = a.myVote === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled || !isMember}
              onClick={() => onVote(a.id, o.id)}
              className={`relative block w-full overflow-hidden rounded-md border px-2.5 py-1.5 text-left transition-colors disabled:cursor-default ${
                mine ? "border-amber-500/50" : "border-white/10 hover:border-white/25"
              }`}
            >
              <span aria-hidden className="absolute inset-y-0 left-0 bg-amber-500/15" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between gap-2 text-[12px]">
                <span className={`flex items-center gap-1 font-bold ${mine ? "text-amber-300" : "text-white/80"}`}>
                  {mine && <Check className="h-3 w-3" />} {o.label}
                </span>
                <span className="tabular-nums text-white/45">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] text-white/30">{total} ხმა{isMember ? "" : " · მხოლოდ წევრები ხმას აძლევენ"}</div>
    </div>
  );
}
