"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
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
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" /> AI-ით შევსება
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="მაგ: CS2-ში ვარ Gold Nova, ვეძებ ქართველ სერიოზულ თიმს"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="bg-background/60"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAiAssist}
            disabled={generating || isPending}
            className="shrink-0"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "შევსება"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">AI შეავსებს სათაურს და აღწერას — შემდეგ შეგიძლია დაარედაქტირო.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="game">თამაში *</Label>
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
          <SelectTrigger id="game">
            <SelectValue placeholder="აარჩიე თამაში" />
          </SelectTrigger>
          <SelectContent>
            {games.map((g) => (
              <SelectItem key={g.slug} value={g.slug}>
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
            <Label>რეჟიმი</Label>
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
                    className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
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
                    className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-all ${
                      weapons.includes(w)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
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
                    className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-all ${
                      ranked === opt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
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
          <Label htmlFor="title">სათაური *</Label>
          <Input
            id="title"
            name="title"
            required
            maxLength={140}
            placeholder="მაგ. Squad 3+1 → Erangel ranked"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
          />
          {state.errors?.title && (
            <p className="text-xs text-destructive">{state.errors.title[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="description">აღწერა</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="დაწერე რა ტიპის მოთამაშეებს ეძებ, რა საათებში თამაშობ, რა მოლოდინი გაქვს."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
        />
        {state.errors?.description && (
          <p className="text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      {!selectedModes.includes("1 vs 1") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rank">რანკი</Label>
            <Input
              id="rank"
              name="rank"
              placeholder="მაგ. Crown II+"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slotsTotal">ადგილების რაოდენობა</Label>
            <Input
              id="slotsTotal"
              name="slotsTotal"
              type="number"
              min={1}
              max={10}
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="voiceRequired"
          name="voiceRequired"
          checked={voice}
          onChange={(e) => setVoice(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <Label htmlFor="voiceRequired" className="font-normal">
          🎙 Voice chat აუცილებელია
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          გაუქმება
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          დაპოსტვა
        </Button>
      </div>
    </form>
  );
}
