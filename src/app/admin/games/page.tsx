"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { mockGames } from "@/lib/mock-data";

type DbGame = {
  slug: string;
  name_ka: string;
  name_en: string;
  description: string;
  accent: string;
  emoji: string;
  icon_url: string | null;
  cover_url: string | null;
};

type FormState = {
  slug: string;
  nameKa: string;
  nameEn: string;
  description: string;
  accent: string;
  emoji: string;
  iconUrl: string;
  coverUrl: string;
};

const ACCENT_OPTIONS = [
  { label: "ოქროსფერი", value: "from-amber-500/30 to-amber-500/5" },
  { label: "ლურჯი", value: "from-blue-600/25 to-blue-600/5" },
  { label: "მწვანე", value: "from-emerald-500/25 to-emerald-500/5" },
  { label: "წითელი", value: "from-red-500/25 to-red-500/5" },
  { label: "იასამნისფერი", value: "from-violet-600/25 to-violet-600/5" },
  { label: "ვარდისფერი", value: "from-fuchsia-600/25 to-fuchsia-600/5" },
  { label: "ნაცრისფერი", value: "from-slate-500/25 to-slate-500/5" },
  { label: "ინდიგო", value: "from-indigo-500/30 to-indigo-500/5" },
];

const BLANK: FormState = {
  slug: "", nameKa: "", nameEn: "", description: "",
  accent: ACCENT_OPTIONS[7].value, emoji: "🎮", iconUrl: "", coverUrl: "",
};

export default function AdminGamesPage() {
  const [dbGames, setDbGames] = useState<DbGame[]>([]);
  const [form, setForm] = useState<FormState>(BLANK);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/games")
      .then((r) => r.json())
      .then((rows) => { if (Array.isArray(rows)) setDbGames(rows); })
      .catch(() => {});
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(g: DbGame) {
    setForm({
      slug: g.slug,
      nameKa: g.name_ka,
      nameEn: g.name_en,
      description: g.description,
      accent: g.accent,
      emoji: g.emoji,
      iconUrl: g.icon_url ?? "",
      coverUrl: g.cover_url ?? "",
    });
    setEditingSlug(g.slug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(BLANK);
    setEditingSlug(null);
  }

  async function handleSubmit() {
    if (!form.nameKa.trim()) { toast.error("სახელი შეიყვანე"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: (editingSlug ?? form.slug) || undefined,
          nameKa: form.nameKa,
          nameEn: form.nameEn || form.nameKa,
          description: form.description,
          accent: form.accent,
          emoji: form.emoji,
          iconUrl: form.iconUrl || undefined,
          coverUrl: form.coverUrl || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "შეცდომა"); }
      const row: DbGame = await res.json();
      setDbGames((prev) => {
        const filtered = prev.filter((g) => g.slug !== row.slug);
        return [row, ...filtered];
      });
      toast.success(editingSlug ? "განახლდა" : "დაემატა");
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "შეცდომა");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slug: string) {
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/admin/games/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "შეცდომა"); }
      setDbGames((prev) => prev.filter((g) => g.slug !== slug));
      toast.success("წაშლილია");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "შეცდომა");
    } finally {
      setDeletingSlug(null);
    }
  }

  const allGames = [
    ...dbGames,
    ...mockGames.filter((m) => !dbGames.find((d) => d.slug === m.slug)).map((m) => ({
      slug: m.slug, name_ka: m.nameKa, name_en: m.nameEn,
      description: m.description, accent: m.accent, emoji: m.emoji,
      icon_url: m.iconUrl ?? null, cover_url: m.coverUrl ?? null,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card className={editingSlug ? "border-amber-500/40" : "border-primary/30"}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              {editingSlug
                ? <><Pencil className="h-4 w-4 text-amber-400" /> თამაშის რედაქტირება</>
                : <><Plus className="h-4 w-4 text-primary" /> ახალი თამაში</>}
            </h2>
            {editingSlug && (
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">სახელი *</label>
            <Input placeholder="eFootball" value={form.nameKa} onChange={(e) => set("nameKa", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Slug (URL)</label>
              <Input placeholder="efootball" value={form.slug} onChange={(e) => set("slug", e.target.value)} disabled={!!editingSlug} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Emoji</label>
              <Input placeholder="⚽" value={form.emoji} onChange={(e) => set("emoji", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">აღწერა</label>
            <Textarea placeholder="თამაშის მოკლე აღწერა..." className="min-h-[70px] resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Icon URL</label>
              <Input placeholder="/games/efootball.png" value={form.iconUrl} onChange={(e) => set("iconUrl", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Cover URL</label>
              <Input placeholder="https://cdn..." value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ფერი</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("accent", opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs border transition-all bg-gradient-to-r ${opt.value} ${form.accent === opt.value ? "border-primary ring-1 ring-primary" : "border-border/60"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {editingSlug && <Button variant="outline" onClick={cancelEdit}>გაუქმება</Button>}
            <Button onClick={handleSubmit} disabled={!form.nameKa.trim() || submitting}
              className={editingSlug ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}>
              {submitting
                ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {editingSlug ? "ინახება..." : "იქმნება..."}</>
                : editingSlug
                  ? <><Check className="mr-1.5 h-4 w-4" /> შენახვა</>
                  : <><Plus className="mr-1.5 h-4 w-4" /> დამატება</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Games list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          თამაშები ({allGames.length})
        </h2>
        {allGames.map((g) => {
          const isDb = dbGames.some((d) => d.slug === g.slug);
          return (
            <Card key={g.slug} className="border-border/60">
              <CardContent className="flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{g.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{g.name_ka}</p>
                    <p className="text-xs text-muted-foreground">{g.slug}</p>
                  </div>
                  {!isDb && (
                    <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px] shrink-0">mock</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    className={`h-8 w-8 ${editingSlug === g.slug ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"}`}
                    onClick={() => editingSlug === g.slug ? cancelEdit() : startEdit(g)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isDb && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={deletingSlug === g.slug}
                      onClick={() => handleDelete(g.slug)}
                    >
                      {deletingSlug === g.slug
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
