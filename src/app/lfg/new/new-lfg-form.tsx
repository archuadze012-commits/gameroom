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
import { mockGames } from "@/lib/mock-data";

export function NewLfgForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [game, setGame] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) {
      toast.error("მოკლე აღწერა შეიყვანე.");
      return;
    }
    setGenerating(true);
    try {
      const gameName = mockGames.find((g) => g.slug === game)?.nameKa ?? game;
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
    setLoading(true);
    // TODO: hook up Supabase server action to insert into lfg_posts
    await new Promise((r) => setTimeout(r, 600));
    toast.success("LFG დაიდო (demo). შემდეგ ეტაპზე ბაზაში ჩაიწერება.");
    setLoading(false);
    router.push("/lfg");
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
        <Select name="game" required value={game} onValueChange={setGame}>
          <SelectTrigger id="game">
            <SelectValue placeholder="აარჩიე თამაში" />
          </SelectTrigger>
          <SelectContent>
            {mockGames.map((g) => (
              <SelectItem key={g.slug} value={g.slug}>
                {g.emoji} {g.nameKa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rank">რანკი</Label>
          <Input id="rank" name="rank" placeholder="მაგ. Crown II+" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">რეგიონი</Label>
          <Select name="region">
            <SelectTrigger id="region">
              <SelectValue placeholder="აარჩიე" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GE">GE</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
              <SelectItem value="RU">RU</SelectItem>
              <SelectItem value="MENA">MENA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slots">ადგილების რაოდენობა</Label>
          <Input
            id="slots"
            name="slots"
            type="number"
            min={1}
            max={10}
            defaultValue={4}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="voice"
          name="voice"
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
