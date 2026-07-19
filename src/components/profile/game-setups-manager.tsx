"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveGameSetupAction, deleteGameSetupAction, type GameSetupInput } from "@/app/settings/game-setup-actions";

export type GameSetup = {
  game_slug: string;
  device: string | null;
  mouse: string | null;
  keyboard: string | null;
  headset: string | null;
  monitor: string | null;
  sensitivity: string | null;
  notes: string | null;
};

type GameOption = { slug: string; nameKa: string; emoji: string };

const FIELDS: { key: keyof GameSetupInput; label: string; placeholder: string }[] = [
  { key: "device", label: "მოწყობილობა", placeholder: "iPhone 15 Pro / PC (RTX 4070)" },
  { key: "sensitivity", label: "Sensitivity", placeholder: "3-Finger · DPI 800" },
  { key: "mouse", label: "მაუსი", placeholder: "Logitech G Pro X" },
  { key: "keyboard", label: "კლავიატურა", placeholder: "Wooting 60HE" },
  { key: "headset", label: "ყურსასმენი", placeholder: "HyperX Cloud" },
  { key: "monitor", label: "მონიტორი", placeholder: "240Hz" },
];

export function GameSetupsManager({ games, setups }: { games: GameOption[]; setups: GameSetup[] }) {
  const [drafts, setDrafts] = useState<string[]>([]);
  const configured = new Set(setups.map((s) => s.game_slug));
  const active = [...setups.map((s) => s.game_slug), ...drafts];
  const gameBySlug = new Map(games.map((g) => [g.slug, g]));
  const available = games.filter((g) => !active.includes(g.slug));

  return (
    <div className="space-y-3">
      {active.length === 0 && (
        <p className="text-[12.5px] text-white/40">დაამატე შენი სათამაშო მოწყობილობა თითო თამაშისთვის — გამოჩნდება პროფილზე.</p>
      )}

      {active.map((slug) => {
        const g = gameBySlug.get(slug);
        const existing = setups.find((s) => s.game_slug === slug);
        return (
          <SetupCard
            key={slug}
            gameSlug={slug}
            gameName={g ? `${g.emoji} ${g.nameKa}` : slug}
            initial={existing}
            wasSaved={configured.has(slug)}
            onRemoved={() => setDrafts((d) => d.filter((x) => x !== slug))}
          />
        );
      })}

      {available.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Plus className="h-4 w-4 text-white/40" />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setDrafts((d) => [...d, e.target.value]);
            }}
            className="flex h-9 rounded-lg border border-input bg-background px-3 text-[13px] text-white outline-none"
          >
            <option value="">დაამატე თამაში…</option>
            {available.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.emoji} {g.nameKa}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function SetupCard({
  gameSlug,
  gameName,
  initial,
  wasSaved,
  onRemoved,
}: {
  gameSlug: string;
  gameName: string;
  initial?: GameSetup;
  wasSaved: boolean;
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({
    device: initial?.device ?? "",
    mouse: initial?.mouse ?? "",
    keyboard: initial?.keyboard ?? "",
    headset: initial?.headset ?? "",
    monitor: initial?.monitor ?? "",
    sensitivity: initial?.sensitivity ?? "",
    notes: initial?.notes ?? "",
  });

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const save = () => {
    start(async () => {
      const res = await saveGameSetupAction({ gameSlug, ...values } as GameSetupInput);
      if (res.success) {
        toast.success(res.message ?? "შენახულია");
        router.refresh();
      } else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  const remove = () => {
    start(async () => {
      if (wasSaved) {
        const res = await deleteGameSetupAction(gameSlug);
        if (!res.success) {
          toast.error(res.message ?? "ვერ მოხერხდა");
          return;
        }
        router.refresh();
      }
      onRemoved();
    });
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-black text-white">{gameName}</span>
        <button type="button" onClick={remove} disabled={isPending} aria-label="წაშლა" className="rounded p-1 text-white/30 transition-colors hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <input
            key={f.key}
            value={values[f.key as string]}
            onChange={(e) => set(f.key as string, e.target.value)}
            maxLength={120}
            placeholder={f.label + " — " + f.placeholder}
            disabled={isPending}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white outline-none focus:border-[var(--gr-violet-hi)]/50 disabled:opacity-50"
          />
        ))}
      </div>
      <input
        value={values.notes}
        onChange={(e) => set("notes", e.target.value)}
        maxLength={300}
        placeholder="შენიშვნა (არასავალდებულო)"
        disabled={isPending}
        className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white outline-none focus:border-[var(--gr-violet-hi)]/50 disabled:opacity-50"
      />
      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gr-violet-hi)] px-4 py-1.5 text-[12px] font-black uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          შენახვა
        </button>
      </div>
    </div>
  );
}
