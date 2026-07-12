"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus, Check, HelpCircle, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClanEventAction, rsvpClanEventAction, deleteClanEventAction } from "./clan-feature-actions";

export type ClanEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  going: number;
  maybe: number;
  no: number;
  myStatus: "going" | "maybe" | "no" | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const RSVPS: { key: "going" | "maybe" | "no"; label: string; icon: typeof Check; tone: string }[] = [
  { key: "going", label: "მოვალ", icon: Check, tone: "var(--gr-lime)" },
  { key: "maybe", label: "იქნებ", icon: HelpCircle, tone: "var(--gr-amber)" },
  { key: "no", label: "არა", icon: X, tone: "#f87171" },
];

export function ClanEvents({
  slug,
  canCreate,
  events,
}: {
  slug: string;
  canCreate: boolean;
  events: ClanEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [when, setWhen] = useState("");
  const [isPending, startTransition] = useTransition();

  const create = () => {
    if (!title.trim() || !when) { toast.error("სათაური და თარიღი აუცილებელია"); return; }
    startTransition(async () => {
      const res = await createClanEventAction(slug, title, desc, when);
      if (res.success) {
        toast.success(res.message);
        setTitle(""); setDesc(""); setWhen(""); setOpen(false);
        router.refresh();
      } else toast.error(res.message);
    });
  };

  const rsvp = (eventId: string, status: "going" | "maybe" | "no") => {
    startTransition(async () => {
      const res = await rsvpClanEventAction(eventId, slug, status);
      if (res.success) router.refresh();
      else toast.error(res.message);
    });
  };

  const remove = (eventId: string) => {
    startTransition(async () => {
      const res = await deleteClanEventAction(eventId, slug);
      if (res.success) router.refresh();
      else toast.error(res.message);
    });
  };

  return (
    <div className="pubg-loadout-link block" data-variant="support">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-cyan-500/70" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
              <CalendarClock className="h-4 w-4 text-cyan-300" /> ივენთები & scrim-ები
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/20"
              >
                <Plus className="h-3.5 w-3.5" /> ახალი
              </button>
            )}
          </div>

          {canCreate && open && (
            <div className="mb-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="სათაური (მაგ: Scrim vs [XYZ])"
                disabled={isPending}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-500/50"
              />
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-500/50"
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="დეტალები (არასავალდებულო)"
                disabled={isPending}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-500/50"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={create}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-[12px] font-black uppercase tracking-wider text-[#04212a] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  დამატება
                </button>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-white/40">ჯერ ივენთი არ არის.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-black text-white">{ev.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-cyan-300">
                        <CalendarClock className="h-3.5 w-3.5" /> {fmt(ev.starts_at)}
                      </p>
                      {ev.description && <p className="mt-1.5 whitespace-pre-wrap break-words text-[12.5px] text-white/60">{ev.description}</p>}
                    </div>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => remove(ev.id)}
                        disabled={isPending}
                        aria-label="წაშლა"
                        className="shrink-0 rounded p-1 text-white/30 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {RSVPS.map((r) => {
                      const active = ev.myStatus === r.key;
                      const count = r.key === "going" ? ev.going : r.key === "maybe" ? ev.maybe : ev.no;
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => rsvp(ev.id, r.key)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                          style={{
                            borderColor: active ? r.tone : "rgba(255,255,255,0.1)",
                            background: active ? `color-mix(in oklab, ${r.tone} 15%, transparent)` : "rgba(255,255,255,0.03)",
                            color: active ? r.tone : "rgba(255,255,255,0.55)",
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" /> {r.label} {count > 0 && <span className="tabular-nums">{count}</span>}
                        </button>
                      );
                    })}
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
