"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setClanMemberLineupAction, setClanCaptainAction } from "./clan-roster-actions";

export type ManagedMember = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  position: string | null;
  lineupStatus: string;
  jerseyNumber: number | null;
  isCaptain: boolean;
};

const STATUS: { key: string; label: string; on: string }[] = [
  { key: "starter", label: "ST", on: "border-[var(--gr-lime)]/40 bg-[var(--gr-lime)]/20 text-[var(--gr-lime)]" },
  { key: "sub", label: "SUB", on: "border-amber-500/40 bg-amber-500/20 text-amber-300" },
  { key: "bench", label: "BN", on: "border-white/25 bg-white/10 text-white/70" },
];

type Res = { success: boolean; message?: string };

export function ClanLineupManager({ clanSlug, members }: { clanSlug: string; members: ManagedMember[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  const run = (id: string, fn: () => Promise<Res>) => {
    setSavingId(id);
    start(async () => {
      const res = await fn();
      if (res.success) {
        if (res.message) toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message ?? "ვერ მოხერხდა");
      }
      setSavingId(null);
    });
  };

  return (
    <div className="pubg-loadout-link block" data-variant="strike">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-violet-hi)]/70" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
            <SlidersHorizontal className="h-4 w-4 text-[var(--gr-violet-hi)]" /> ლაინაპის მართვა
          </div>
          <p className="mb-4 text-[11.5px] text-white/45">დააყენე თითო წევრის სტატუსი, პოზიცია, ნომერი და კაპიტანი.</p>

          <ul className="space-y-2.5">
            {members.map((m) => {
              const busy = savingId === m.id;
              return (
                <li
                  key={m.id}
                  className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-opacity ${busy ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar className="h-9 w-9 border border-white/10">
                        <AvatarImage src={m.avatar ?? undefined} className="object-cover" />
                        <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-black text-white">{m.name}</div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-white/35">
                          {m.role === "leader" ? "ლიდერი" : m.role === "officer" ? "ოფიცერი" : "წევრი"}
                        </div>
                      </div>
                    </div>

                    {/* Status segmented control */}
                    <div className="flex overflow-hidden rounded-lg border border-white/10">
                      {STATUS.map((s) => {
                        const active = m.lineupStatus === s.key;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            disabled={busy || active}
                            onClick={() => run(m.id, () => setClanMemberLineupAction(clanSlug, m.id, { lineupStatus: s.key }))}
                            className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${active ? s.on : "text-white/40 hover:text-white/70"}`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Captain toggle */}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(m.id, () => setClanCaptainAction(clanSlug, m.id, !m.isCaptain))}
                      aria-label="კაპიტანი"
                      className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
                        m.isCaptain
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                          : "border-white/10 text-white/30 hover:text-amber-300"
                      }`}
                    >
                      <Star className="h-4 w-4" fill={m.isCaptain ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Position + jersey */}
                  <div className="mt-2.5 flex gap-2">
                    <input
                      type="text"
                      defaultValue={m.position ?? ""}
                      maxLength={24}
                      placeholder="პოზიცია (IGL, entry...)"
                      disabled={busy}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if ((m.position ?? "") === v.trim()) return;
                        run(m.id, () => setClanMemberLineupAction(clanSlug, m.id, { position: v }));
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-indigo-400/50 disabled:opacity-50"
                    />
                    <input
                      type="number"
                      min={0}
                      max={999}
                      defaultValue={m.jerseyNumber ?? ""}
                      placeholder="#"
                      disabled={busy}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw === "" ? null : parseInt(raw, 10);
                        if ((m.jerseyNumber ?? null) === (n ?? null)) return;
                        run(m.id, () => setClanMemberLineupAction(clanSlug, m.id, { jerseyNumber: n !== null && Number.isNaN(n) ? null : n }));
                      }}
                      className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-center text-[12px] tabular-nums text-white outline-none focus:border-indigo-400/50 disabled:opacity-50"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
