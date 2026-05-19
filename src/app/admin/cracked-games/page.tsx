"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Plus, Trash2, CheckCircle2, Link2, Check, Pencil, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { crackedGames, type CrackedGame } from "@/lib/mock-data";

const MOCK_IS_ADMIN = true;

const ACCENT_OPTIONS = [
  { label: "ოქროსფერი", value: "from-amber-500/30 to-amber-500/5" },
  { label: "ლურჯი", value: "from-blue-600/25 to-blue-600/5" },
  { label: "მწვანე", value: "from-emerald-500/25 to-emerald-500/5" },
  { label: "წითელი", value: "from-red-500/25 to-red-500/5" },
  { label: "იასამნისფერი", value: "from-violet-600/25 to-violet-600/5" },
  { label: "ვარდისფერი", value: "from-fuchsia-600/25 to-fuchsia-600/5" },
  { label: "ნაცრისფერი", value: "from-slate-500/25 to-slate-500/5" },
  { label: "ნარინჯისფერი", value: "from-orange-500/25 to-pink-500/10" },
  { label: "ღია მწვანე", value: "from-lime-500/25 to-lime-500/5" },
];

const BLANK_REQS = { os: "", cpu: "", ram: "", gpu: "", storage: "" };

type FormState = {
  title: string;
  emoji: string;
  coverUrl: string;
  releaseYear: string;
  rating: string;
  description: string;
  downloadUrl: string;
  accent: string;
  genreInput: string;
  genres: string[];
  platformInput: string;
  platforms: string[];
  trending: boolean;
  minOs: string; minCpu: string; minRam: string; minGpu: string; minStorage: string;
  recOs: string; recCpu: string; recRam: string; recGpu: string; recStorage: string;
};

const BLANK: FormState = {
  title: "", emoji: "🎮", coverUrl: "", releaseYear: "", rating: "", description: "", downloadUrl: "",
  accent: ACCENT_OPTIONS[0].value, genreInput: "", genres: [], platformInput: "", platforms: [],
  trending: false,
  minOs: "", minCpu: "", minRam: "", minGpu: "", minStorage: "",
  recOs: "", recCpu: "", recRam: "", recGpu: "", recStorage: "",
};

export default function AdminCrackedGamesPage() {
  const [games, setGames] = useState<CrackedGame[]>(crackedGames);
  const [form, setForm] = useState<FormState>(BLANK);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [saved, setSaved] = useState<"added" | "updated" | false>(false);
  const [urlOverrides, setUrlOverrides] = useState<Record<string, string>>({});
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlSavedId, setUrlSavedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gameroom_cracked_urls");
      if (stored) setUrlOverrides(JSON.parse(stored));
    } catch {}
  }, []);

  function startEdit(game: CrackedGame) {
    setForm({
      title: game.title,
      emoji: game.emoji,
      coverUrl: game.coverUrl ?? "",
      releaseYear: String(game.releaseYear),
      rating: String(game.rating),
      description: game.description,
      downloadUrl: urlOverrides[game.id] ?? (game.downloadUrl !== "#" ? game.downloadUrl : ""),
      accent: game.accent,
      genreInput: "",
      genres: game.genre,
      platformInput: "",
      platforms: game.platform,
      trending: game.trending ?? false,
      minOs: game.systemReqs.min.os,
      minCpu: game.systemReqs.min.cpu,
      minRam: game.systemReqs.min.ram,
      minGpu: game.systemReqs.min.gpu,
      minStorage: game.systemReqs.min.storage,
      recOs: game.systemReqs.rec.os,
      recCpu: game.systemReqs.rec.cpu,
      recRam: game.systemReqs.rec.ram,
      recGpu: game.systemReqs.rec.gpu,
      recStorage: game.systemReqs.rec.storage,
    });
    setEditingGameId(game.id);
    setSaved(false as const);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingGameId(null);
    setForm(BLANK);
    setSaved(false as const);
  }

  function openUrlEdit(gameId: string, currentUrl: string) {
    setEditingUrl(gameId);
    setUrlInput(urlOverrides[gameId] ?? (currentUrl !== "#" ? currentUrl : ""));
  }

  function saveUrl(gameId: string) {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const next = { ...urlOverrides, [gameId]: trimmed };
    setUrlOverrides(next);
    localStorage.setItem("gameroom_cracked_urls", JSON.stringify(next));
    setEditingUrl(null);
    setUrlInput("");
    setUrlSavedId(gameId);
    setTimeout(() => setUrlSavedId(null), 2000);
  }

  if (!MOCK_IS_ADMIN) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">წვდომა შეზღუდულია</h1>
        <p className="text-muted-foreground">ეს გვერდი მხოლოდ ადმინისთვისაა ხელმისაწვდომი.</p>
        <Button asChild variant="outline"><Link href="/">მთავარი გვერდი</Link></Button>
      </div>
    );
  }

  function set(key: keyof FormState, value: string | boolean | string[]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function addTag(type: "genre" | "platform") {
    const key = type === "genre" ? "genreInput" : "platformInput";
    const listKey = type === "genre" ? "genres" : "platforms";
    const val = form[key].trim();
    if (!val) return;
    set(listKey, [...form[listKey], val]);
    set(key, "");
  }

  function removeTag(type: "genre" | "platform", idx: number) {
    const listKey = type === "genre" ? "genres" : "platforms";
    set(listKey, form[listKey].filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.description.trim()) return;
    const id = editingGameId ?? form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const dlUrl = form.downloadUrl.trim() || "#";
    const game: CrackedGame = {
      id,
      title: form.title,
      emoji: form.emoji || "🎮",
      coverUrl: form.coverUrl.trim() || undefined,
      releaseYear: parseInt(form.releaseYear) || new Date().getFullYear(),
      rating: parseFloat(form.rating) || 0,
      description: form.description,
      downloadUrl: dlUrl,
      accent: form.accent,
      genre: form.genres,
      platform: form.platforms,
      trending: form.trending,
      systemReqs: {
        min: { os: form.minOs, cpu: form.minCpu, ram: form.minRam, gpu: form.minGpu, storage: form.minStorage },
        rec: { os: form.recOs, cpu: form.recCpu, ram: form.recRam, gpu: form.recGpu, storage: form.recStorage },
      },
    };

    if (editingGameId) {
      setGames((prev) => prev.map((g) => g.id === editingGameId ? game : g));
      // persist download url override if provided
      if (dlUrl !== "#") {
        const next = { ...urlOverrides, [id]: dlUrl };
        setUrlOverrides(next);
        localStorage.setItem("gameroom_cracked_urls", JSON.stringify(next));
      }
      setEditingGameId(null);
      setSaved("updated");
    } else {
      setGames((prev) => [game, ...prev]);
      setSaved("added");
    }
    setForm(BLANK);
    setTimeout(() => setSaved(false), 3000);
  }

  function deleteGame(id: string) {
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cracked-games" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Cracked Games
          </Link>
          <h1 className="text-2xl font-bold">ადმინ პანელი</h1>
          <p className="text-sm text-muted-foreground">თამაშის დამატება და მართვა</p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
          <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Admin
        </Badge>
      </div>

      {/* Add / Edit game form */}
      <Card className={editingGameId ? "border-amber-500/40" : "border-primary/30"}>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              {editingGameId
                ? <><Pencil className="h-4 w-4 text-amber-400" /> თამაშის რედაქტირება</>
                : <><Plus className="h-4 w-4 text-primary" /> ახალი თამაში</>}
            </h2>
            {editingGameId && (
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Basic info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">სათაური *</label>
              <Input placeholder="Elden Ring" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Emoji</label>
              <Input placeholder="⚔️" value={form.emoji} onChange={(e) => set("emoji", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">გამოსვლის წელი</label>
              <Input type="number" placeholder="2024" value={form.releaseYear} onChange={(e) => set("releaseYear", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">რეიტინგი (0–10)</label>
              <Input type="number" step="0.1" min="0" max="10" placeholder="9.5" value={form.rating} onChange={(e) => set("rating", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Cover Image URL</label>
            <Input placeholder="https://cdn.cloudflare.steamstatic.com/..." value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">გადმოწერის ბმული</label>
            <Input placeholder="https://..." value={form.downloadUrl} onChange={(e) => set("downloadUrl", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">აღწერა *</label>
            <Textarea
              placeholder="თამაშის დეტალური აღწერა..."
              className="min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Accent color */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ფერი</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("accent", opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs border transition-all bg-gradient-to-r ${opt.value} ${form.accent === opt.value ? "border-primary ring-1 ring-primary" : "border-border/60"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ჟანრები</label>
            <div className="flex gap-2">
              <Input
                placeholder="RPG"
                value={form.genreInput}
                onChange={(e) => set("genreInput", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("genre"))}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag("genre")}>დამატება</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.genres.map((g, i) => (
                <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag("genre", i)}>
                  {g} ×
                </Badge>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">პლატფორმები</label>
            <div className="flex gap-2">
              <Input
                placeholder="PC, Mobile, Xbox..."
                value={form.platformInput}
                onChange={(e) => set("platformInput", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("platform"))}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag("platform")}>დამატება</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.platforms.map((p, i) => (
                <Badge key={i} variant="outline" className="gap-1 cursor-pointer border-border/60" onClick={() => removeTag("platform", i)}>
                  {p} ×
                </Badge>
              ))}
            </div>
          </div>

          {/* Trending toggle */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={form.trending} onChange={(e) => set("trending", e.target.checked)} className="h-4 w-4 rounded accent-primary" />
            <span className="text-sm">Trending-ში გამოჩენა</span>
          </label>

          <Separator />

          {/* System Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">სისტემური მოთხოვნილებები</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {(["min", "rec"] as const).map((tier) => {
                const label = tier === "min" ? "მინიმალური" : "რეკომენდებული";
                const prefix = tier === "min" ? "min" : "rec";
                return (
                  <div key={tier} className={`rounded-lg border p-4 space-y-3 ${tier === "rec" ? "border-primary/30 bg-primary/5" : "border-border/60"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${tier === "rec" ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
                    {(["Os", "Cpu", "Ram", "Gpu", "Storage"] as const).map((field) => {
                      const key = `${prefix}${field}` as keyof FormState;
                      return (
                        <div key={field} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{field}</label>
                          <Input
                            placeholder={field === "Ram" ? "16 GB" : field === "Storage" ? "60 GB SSD" : ""}
                            value={form[key] as string}
                            onChange={(e) => set(key, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {editingGameId && (
              <Button variant="outline" onClick={cancelEdit}>გაუქმება</Button>
            )}
            <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.description.trim()}
              className={editingGameId ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}>
              {editingGameId
                ? <><Check className="mr-1.5 h-4 w-4" /> შენახვა</>
                : <><Plus className="mr-1.5 h-4 w-4" /> გამოქვეყნება</>}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {saved === "updated" ? "განახლდა" : "დაემატა"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing games list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          არსებული თამაშები ({games.length})
        </h2>
        {games.map((g) => {
          const activeUrl = urlOverrides[g.id] ?? (g.downloadUrl !== "#" ? g.downloadUrl : "");
          const hasUrl = Boolean(activeUrl);
          return (
            <Card key={g.id} className="border-border/60">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{g.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{g.title}</p>
                      <p className="text-xs text-muted-foreground">{g.releaseYear} · {g.genre.join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {urlSavedId === g.id && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> შენახულია
                      </span>
                    )}
                    <button
                      onClick={() => editingUrl === g.id ? setEditingUrl(null) : openUrlEdit(g.id, g.downloadUrl)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                        hasUrl
                          ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      <Link2 className="h-3 w-3" />
                      {hasUrl ? "URL ✓" : "URL დამატება"}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${editingGameId === g.id ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"}`}
                      onClick={() => editingGameId === g.id ? cancelEdit() : startEdit(g)}
                      title="რედაქტირება"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Link href={`/cracked-games/${g.id}`} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                      ნახვა
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGame(g.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Inline URL editor */}
                {editingUrl === g.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      autoFocus
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveUrl(g.id)}
                      className="h-8 text-sm flex-1"
                    />
                    <Button size="sm" className="h-8 shrink-0" onClick={() => saveUrl(g.id)} disabled={!urlInput.trim()}>
                      შენახვა
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => setEditingUrl(null)}>
                      გაუქმება
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
