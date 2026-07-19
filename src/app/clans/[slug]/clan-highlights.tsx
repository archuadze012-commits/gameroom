"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Plus, Trash2, Loader2, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { youtubeThumb, PLATFORM_LABEL, PLATFORM_TONE } from "@/lib/clan/highlights";
import { addClanHighlightAction, deleteClanHighlightAction } from "./clan-highlight-actions";

export type ClanHighlight = {
  id: string;
  url: string;
  title: string | null;
  platform: string | null;
  authorId: string | null;
  authorName: string | null;
};

export function ClanHighlights({
  clanSlug,
  isMember,
  canManage,
  viewerId,
  highlights,
}: {
  clanSlug: string;
  isMember: boolean;
  canManage: boolean;
  viewerId: string | null;
  highlights: ClanHighlight[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  if (!isMember && highlights.length === 0) return null;

  const add = () => {
    if (!url.trim()) return;
    start(async () => {
      const res = await addClanHighlightAction(clanSlug, url, title);
      if (res.success) {
        toast.success(res.message ?? "დაემატა");
        setUrl("");
        setTitle("");
        setShowForm(false);
        router.refresh();
      } else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  const remove = (id: string) => {
    start(async () => {
      const res = await deleteClanHighlightAction(clanSlug, id);
      if (res.success) router.refresh();
      else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  return (
    <div className="pubg-loadout-link block" data-variant="royale">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-magenta)]/70" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
              <Clapperboard className="h-4 w-4 text-[var(--gr-magenta)]" /> ჰაილაითები
            </div>
            {isMember && !showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white/70 transition-colors hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> დამატება
              </button>
            )}
          </div>

          {isMember && showForm && (
            <div className="mb-4 space-y-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ბმული (YouTube, TikTok, Twitch, Medal...)"
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[var(--gr-magenta)]/50 disabled:opacity-50"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="სათაური (არასავალდებულო)"
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[var(--gr-magenta)]/50 disabled:opacity-50"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={isPending}
                  className="rounded-xl border border-white/10 px-4 py-2 text-[12px] font-black uppercase tracking-wider text-white/50 transition-colors hover:text-white/80"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={add}
                  disabled={isPending || !url.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--gr-magenta)]/90 px-4 py-2 text-[12px] font-black uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  დამატება
                </button>
              </div>
            </div>
          )}

          {highlights.length === 0 ? (
            <p className="py-3 text-center text-[12.5px] text-white/40">ჯერ ჰაილაითი არ არის — გააზიარე საუკეთესო მომენტი.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {highlights.map((h) => {
                const thumb = youtubeThumb(h.url);
                const canDelete = canManage || (viewerId && h.authorId === viewerId);
                return (
                  <div key={h.id} className="group/hl relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <a href={h.url} target="_blank" rel="noopener noreferrer nofollow" className="block">
                      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover transition-transform group-hover/hl:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Play className={`h-7 w-7 ${PLATFORM_TONE[h.platform ?? "link"]}`} />
                          </div>
                        )}
                        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-white/80">
                          {PLATFORM_LABEL[h.platform ?? "link"]}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <div className="flex items-center gap-1 truncate text-[11.5px] font-bold text-white/85">
                          {h.title || "ჰაილაითი"} <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                        </div>
                        {h.authorName && <div className="mt-0.5 truncate text-[10px] text-white/35">{h.authorName}</div>}
                      </div>
                    </a>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(h.id)}
                        disabled={isPending}
                        aria-label="წაშლა"
                        className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded bg-black/60 text-white/60 opacity-0 transition-opacity hover:text-red-400 group-hover/hl:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
