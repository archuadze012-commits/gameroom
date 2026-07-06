"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNewsAction, updateNewsAction } from "./actions";

export type NewsGameOption = { id: string; nameKa: string };

export type NewsInitial = {
  id: string;
  title: string;
  body: string;
  excerpt: string | null;
  coverUrl: string | null;
  gameId: string | null;
  status: string;
};

const STATUSES: { value: string; label: string }[] = [
  { value: "draft", label: "მონახაზი (draft)" },
  { value: "published", label: "გამოქვეყნებული (published)" },
  { value: "archived", label: "დაარქივებული (archived)" },
];

export function NewsForm({ games, initial }: { games: NewsGameOption[]; initial?: NewsInitial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [gameId, setGameId] = useState(initial?.gameId ?? "");
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("სათაური სავალდებულოა.");
    if (!body.trim()) return toast.error("ტექსტი სავალდებულოა.");
    startTransition(async () => {
      const payload = { title, body, excerpt, coverUrl, gameId, status };
      const res = isEdit ? await updateNewsAction(initial!.id, payload) : await createNewsAction(payload);
      if (res.ok) {
        toast.success(isEdit ? "სტატია განახლდა!" : "სტატია შეიქმნა!");
        router.push("/admin/news");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/news")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{isEdit ? "სტატიის რედაქტირება" : "ახალი სტატია"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-border/60 bg-card p-6">
        <div className="space-y-1.5">
          <Label>სათაური</Label>
          <Input placeholder="სტატიის სათაური" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>მოკლე აღწერა (excerpt)</Label>
          <Input placeholder="სიის ხედში ნაჩვენები მოკლე ტექსტი" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>ტექსტი</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="სტატიის სრული ტექსტი…"
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <Label>ქავერის URL (არასავალდებულო)</Label>
          <Input placeholder="https://…" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>თამაში (არასავალდებულო)</Label>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <option value="">— თამაშის გარეშე —</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.nameKa}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>სტატუსი</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/news")} disabled={pending}>
            გაუქმება
          </Button>
          <Button type="submit" disabled={pending}>
            <Check className="mr-1.5 h-4 w-4" /> {pending ? "..." : isEdit ? "შენახვა" : "შექმნა"}
          </Button>
        </div>
      </form>
    </div>
  );
}
