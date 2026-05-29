"use client";

import { useRef, useState } from "react";
import { createArticle } from "./actions";
import { GamerCard } from "@/components/ui/gamer-card";
import { Button } from "@/components/ui/button";

type Game = { slug: string; name_ka: string };

export function NewArticleForm({ games }: { games: Game[]; authorId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publishRef = useRef<HTMLInputElement>(null);

  const field = "block w-full rounded-md border border-[var(--gr-border)] bg-[var(--gr-bg-2)] px-3 py-2 text-[14px] text-[var(--gr-text)] placeholder:text-[var(--gr-text-dim)] focus:outline-none focus:ring-1 focus:ring-[rgba(236,72,153,0.6)]";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createArticle(new FormData(e.currentTarget));
    } catch (err: any) {
      setError(err.message ?? "შეცდომა");
      setPending(false);
    }
  }

  return (
    <GamerCard color="rgba(236,72,153,0.55)" clipSize={18}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <input ref={publishRef} type="hidden" name="publish" defaultValue="false" />

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">სათაური *</label>
          <input name="title" required className={field} placeholder="სტატიის სათაური" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">მოკლე აღწერა</label>
          <input name="excerpt" className={field} placeholder="1-2 წინადადება..." />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">თამაში</label>
          <select name="game_slug" className={field}>
            <option value="">— არ არის მიბმული —</option>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.name_ka}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">Cover URL</label>
          <input name="cover_url" className={field} placeholder="https://..." />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">კონტენტი *</label>
          <textarea name="content" required className={`${field} min-h-[280px] resize-y`} placeholder="სტატიის ტექსტი..." />
        </div>

        {error && <p className="text-[13px] text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit" variant="ghost" size="sm"
            className="flex-1" disabled={pending}
            onClick={() => { if (publishRef.current) publishRef.current.value = "false"; }}
          >
            დრაფტად შენახვა
          </Button>
          <Button
            type="submit" size="sm" disabled={pending}
            className="flex-1 bg-[rgba(236,72,153,0.9)] hover:bg-[rgba(236,72,153,1)] text-white"
            onClick={() => { if (publishRef.current) publishRef.current.value = "true"; }}
          >
            {pending ? "იგზავნება..." : "გამოქვეყნება"}
          </Button>
        </div>
      </form>
    </GamerCard>
  );
}
