"use client";

import { useState } from "react";
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

type GameOption = { slug: string; nameKa: string; emoji: string };

const GAME_MODES: Record<string, string[]> = {
  "pubg-mobile": ["Classic", "1 vs 1", "ULTIMATE ROYALE"],
};

export function NewLfgForm({ games }: { games: GameOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!game) {
      toast.error("აარჩიე თამაში");
      return;
    }
    if (!GAME_MODES[game] && !title.trim()) {
      toast.error("სათაური შეიყვანე");
      return;
    }
    if (GAME_MODES[game] && !selectedModes.includes("1 vs 1") && !ranked) {
      toast.error("აირჩიე: Ranked თუ არა?");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/lfg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug: game,
          title,
          description,
          rank: rank || undefined,
          slotsTotal: parseInt(slots) || 4,
          voiceRequired: voice,
          modes: selectedModes.length > 0 ? selectedModes : undefined,
          ranked: ranked || undefined,
          weapons: weapons.length > 0 ? weapons : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "unknown");
      }
      toast.success("ლოკალი გამოქვეყნდა!");
      const modeSlug = selectedModes.includes("1 vs 1")
        ? "1v1"
        : selectedModes.includes("Classic")
        ? "classic"
        : null;
      router.push(modeSlug ? `/lfg?mode=${modeSlug}` : "/lfg");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "content_blocked") {
        toast.error("კონტენტი დაიბლოკა — შეუსაბამო ტექსტი");
      } else {
        toast.error(`ლოკალი ვერ გამოქვეყნდა${msg ? ` — ${msg}` : ""}`);
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
            disabled={generating}
            className="shrink-0"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "შევსება"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">AI შეავსებს სათაურს და აღწერას — შემდეგ შეგიძლია დაარედაქტირო.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="game">თამაში *</Label>
        <Select name="game" required value={game} onValueChange={(v) => { setGame(v ?? ""); setSelectedModes([]); setRanked(""); setWeapons([]); }}>
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
          />
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
        />
      </div>

      {!selectedModes.includes("1 vs 1") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rank">რანკი</Label>
            <Input id="rank" placeholder="მაგ. Crown II+" value={rank} onChange={(e) => setRank(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slots">ადგილების რაოდენობა</Label>
            <Input
              id="slots"
              type="number"
              min={1}
              max={10}
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="voice"
          checked={voice}
          onChange={(e) => setVoice(e.target.checked)}
          className="h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <Label htmlFor="voice" className="font-normal">
          🎙 Voice chat აუცილებელია
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          გაუქმება
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          დაპოსტვა
        </Button>
      </div>
    </form>
  );
}
