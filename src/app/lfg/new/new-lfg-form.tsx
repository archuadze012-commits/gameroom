"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createLfgAction, type LfgActionState } from "./actions";

type GameOption = { slug: string; nameKa: string; emoji: string };

const GAME_MODES: Record<string, string[]> = {
  "pubg-mobile": ["Classic", "1 vs 1", "ULTIMATE ROYALE"],
};

const labelClassName =
  "text-[12px] font-bold uppercase tracking-[0.12em] text-white [text-shadow:0_0_4px_rgba(196,30,58,0.3)]";

const fieldClassName =
  "border-[rgba(196,30,58,0.34)] bg-[rgba(6,5,14,0.72)] text-white shadow-[inset_0_0_18px_rgba(196,30,58,0.06)] placeholder:text-white/38 focus-visible:border-[rgba(34,211,238,0.58)] focus-visible:ring-[rgba(196,30,58,0.26)] [text-shadow:0_0_4px_rgba(196,30,58,0.32)]";

const chipBaseClassName =
  "rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50";

const chipActiveClassName =
  "border-[rgba(196,30,58,0.72)] bg-[rgba(196,30,58,0.16)] text-white shadow-[0_0_16px_rgba(196,30,58,0.13)] [text-shadow:0_0_4px_rgba(196,30,58,0.34)]";

const chipIdleClassName =
  "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] text-white/70 hover:border-[rgba(34,211,238,0.42)] hover:text-white hover:[text-shadow:0_0_4px_rgba(34,211,238,0.32)]";

const actionButtonClassName =
  "border border-[rgba(196,30,58,0.42)] bg-[rgba(196,30,58,0.1)] text-white shadow-[0_0_18px_rgba(196,30,58,0.12)] hover:border-[rgba(196,30,58,0.62)] hover:bg-[rgba(196,30,58,0.16)] hover:text-white [text-shadow:0_0_4px_rgba(196,30,58,0.32)]";

const submitButtonClassName =
  "border border-[rgba(196,30,58,0.68)] bg-[rgba(196,30,58,0.22)] text-white shadow-[0_0_22px_rgba(196,30,58,0.18)] hover:bg-[rgba(196,30,58,0.28)] hover:text-white [text-shadow:0_0_5px_rgba(196,30,58,0.46)]";

export function NewLfgForm({ games }: { games: GameOption[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [game, setGame] = useState("");
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [ranked, setRanked] = useState("");
  const [weapons, setWeapons] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rank, setRank] = useState("");
  const [slots, setSlots] = useState("4");
  const [voice, setVoice] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const initialState: LfgActionState = { success: false };
  const [state, formAction, isPending] = useActionState(createLfgAction, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        const modeSlug = selectedModes.includes("1 vs 1")
          ? "1v1"
          : selectedModes.includes("Classic")
          ? "classic"
          : null;
        router.push(modeSlug ? `/lfg?mode=${modeSlug}` : "/lfg");
        router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router, selectedModes]);

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) {
      toast.error("მოკლე აღწერა შეიყვანე.");
      return;
    }
    setGenerating(true);
    try {
      const gameName = games.find((g) => g.slug === game)?.nameKa ?? game;
      const res = await fetch("/api/lfg-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, game: gameName }),
      });
      const data = await res.json();
      if (data.title && data.description) {
        setTitle(data.title);
        setDescription(data.description);
        toast.success("AI-მა შეავსო!");
      } else {
        toast.error("ვერ გენერირდა, სცადე თავიდან.");
      }
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    }
    setGenerating(false);
  };

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden inputs for controlled fields */}
      <input type="hidden" name="gameSlug" value={game} />
      <input type="hidden" name="ranked" value={ranked} />
      {selectedModes.map((m) => (
        <input key={m} type="hidden" name="modes" value={m} />
      ))}
      {weapons.map((w) => (
        <input key={w} type="hidden" name="weapons" value={w} />
      ))}

      {/* AI Quick Fill */}
      <div className="space-y-3 border border-[rgba(196,30,58,0.24)] bg-[rgba(255,255,255,0.025)] p-4 shadow-[inset_0_0_22px_rgba(196,30,58,0.05)]">
        <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.1em] text-white [text-shadow:0_0_5px_rgba(196,30,58,0.34)]">
          <Sparkles className="h-4 w-4" /> AI-ით შევსება
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="მაგ: CS2-ში ვარ Gold Nova, ვეძებ ქართველ სერიოზულ თიმს"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className={fieldClassName}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAiAssist}
            disabled={generating || isPending}
            className={`shrink-0 ${actionButtonClassName}`}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "შევსება"}
          </Button>
        </div>
        <p className="text-xs text-white/58 [text-shadow:0_0_3px_rgba(196,30,58,0.18)]">
          AI შეავსებს სათაურს და აღწერას — შემდეგ შეგიძლია დაარედაქტირო.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="game" className={labelClassName}>თამაში *</Label>
        <Select
          name="game_select"
          required
          value={game}
          onValueChange={(v) => {
            setGame(v ?? "");
            setSelectedModes([]);
            setRanked("");
            setWeapons([]);
          }}
          disabled={isPending}
        >
          <SelectTrigger id="game" className={fieldClassName}>
            <SelectValue placeholder="აარჩიე თამაში" />
          </SelectTrigger>
          <SelectContent className="border-[rgba(196,30,58,0.34)] bg-[rgba(8,6,15,0.98)] text-white">
            {games.map((g) => (
              <SelectItem key={g.slug} value={g.slug} className="focus:bg-[rgba(196,30,58,0.16)] focus:text-white">
                {g.emoji} {g.nameKa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.gameSlug && (
          <p className="text-xs text-destructive">{state.errors.gameSlug[0]}</p>
        )}
      </div>

      {GAME_MODES[game] && (
        <>
          <div className="space-y-1.5">
            <Label className={labelClassName}>რეჟიმი</Label>
            <div className="flex flex-wrap gap-2">
              {GAME_MODES[game].map((mode) => {
                const active = selectedModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const next = active ? selectedModes.filter((m) => m !== mode) : [...selectedModes, mode];
                      setSelectedModes(next);
                      setRanked("");
                      setWeapons([]);
                    }}
                    className={`${chipBaseClassName} ${active ? chipActiveClassName : chipIdleClassName}`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedModes.includes("1 vs 1") ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                {["M416", "M24"].map((w) => (
                  <button
                    key={w}
                    type="button"
                    disabled={isPending}
                    onClick={() => setWeapons((prev) => prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w])}
                    className={`${chipBaseClassName} ${weapons.includes(w) ? chipActiveClassName : chipIdleClassName}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                {["Ranked", "არ ვარ რანკზე", "არ ვარ რანკზე, მაგრამ დაგეხმარები"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={isPending}
                    onClick={() => setRanked(opt)}
                    className={`${chipBaseClassName} ${ranked === opt ? chipActiveClassName : chipIdleClassName}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!GAME_MODES[game] && (
        <div className="space-y-1.5">
          <Label htmlFor="title" className={labelClassName}>სათაური *</Label>
          <Input
            id="title"
            name="title"
            required
            maxLength={140}
            placeholder="მაგ. Squad 3+1 → Erangel ranked"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            className={fieldClassName}
          />
          {state.errors?.title && (
            <p className="text-xs text-destructive">{state.errors.title[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="description" className={labelClassName}>აღწერა</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="დაწერე რა ტიპის მოთამაშეებს ეძებ, რა საათებში თამაშობ, რა მოლოდინი გაქვს."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          className={fieldClassName}
        />
        {state.errors?.description && (
          <p className="text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      {!selectedModes.includes("1 vs 1") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rank" className={labelClassName}>რანკი</Label>
            <Input
              id="rank"
              name="rank"
              placeholder="მაგ. Crown II+"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={isPending}
              className={fieldClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slotsTotal" className={labelClassName}>ადგილების რაოდენობა</Label>
            <Input
              id="slotsTotal"
              name="slotsTotal"
              type="number"
              min={1}
              max={10}
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              disabled={isPending}
              className={fieldClassName}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.025)] px-3 py-2.5">
        <input
          type="checkbox"
          id="voiceRequired"
          name="voiceRequired"
          checked={voice}
          onChange={(e) => setVoice(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-[rgba(196,30,58,0.44)] bg-[rgba(6,5,14,0.8)] accent-[rgb(196,30,58)]"
        />
        <Label htmlFor="voiceRequired" className="flex items-center gap-1.5 font-normal text-white/82 [text-shadow:0_0_4px_rgba(196,30,58,0.24)]">
          <Mic className="h-4 w-4 text-cyan-300" /> Voice chat აუცილებელია
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending} className="text-white/75 hover:bg-white/[0.04] hover:text-white">
          გაუქმება
        </Button>
        <Button type="submit" disabled={isPending} className={submitButtonClassName}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          დაპოსტვა
        </Button>
      </div>
    </form>
  );
}
