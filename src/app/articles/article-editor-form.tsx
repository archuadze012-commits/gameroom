"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { GamerCard } from "@/components/ui/gamer-card";
import { Button } from "@/components/ui/button";
import { createArticle } from "@/app/articles/new/actions";

type Game = { slug: string; name_ka: string };

type InitialArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  game_slug: string | null;
  published: boolean;
};

type Props = {
  games: Game[];
  initialArticle?: InitialArticle;
};

export function ArticleEditorForm({ games, initialArticle }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publishRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initialArticle;

  const field = "block w-full rounded-md border border-[var(--gr-border)] bg-[var(--gr-bg-2)] px-3 py-2 text-[14px] text-[var(--gr-text)] placeholder:text-[var(--gr-text-dim)] focus:outline-none focus:ring-1 focus:ring-[rgba(196,30,58,0.6)]";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (!isEdit) {
        await createArticle(new FormData(event.currentTarget));
        return;
      }

      const formData = new FormData(event.currentTarget);
      const payload = {
        title: String(formData.get("title") ?? ""),
        excerpt: String(formData.get("excerpt") ?? ""),
        content: String(formData.get("content") ?? ""),
        cover_url: String(formData.get("cover_url") ?? ""),
        game_slug: String(formData.get("game_slug") ?? ""),
        publish: String(formData.get("publish") ?? "false") === "true",
      };

      const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();

      router.replace(payload.publish ? `/articles/${encodeURIComponent(initialArticle.slug)}` : "/articles");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "შეცდომა");
      setPending(false);
    }
  }

  return (
    <GamerCard color="rgba(196,30,58,0.78)" clipSize={18}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <input
          ref={publishRef}
          type="hidden"
          name="publish"
          defaultValue={initialArticle?.published ? "true" : "false"}
        />

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">სათაური *</label>
          <input name="title" required className={field} placeholder="სტატიის სათაური" defaultValue={initialArticle?.title ?? ""} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">მოკლე აღწერა</label>
          <input name="excerpt" className={field} placeholder="1-2 წინადადება..." defaultValue={initialArticle?.excerpt ?? ""} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">თამაში</label>
          <select name="game_slug" className={field} defaultValue={initialArticle?.game_slug ?? ""}>
            <option value="">— არ არის მიბმული —</option>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.name_ka}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">Cover URL</label>
          <input name="cover_url" className={field} placeholder="https://..." defaultValue={initialArticle?.cover_url ?? ""} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">კონტენტი *</label>
          <textarea name="content" required defaultValue={initialArticle?.content ?? ""} className={`${field} min-h-[280px] resize-y`} placeholder="სტატიის ტექსტი..." />
        </div>

        {error && <p className="text-[13px] text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit" variant="ghost" size="sm"
            className="flex-1" disabled={pending}
            onClick={() => { if (publishRef.current) publishRef.current.value = "false"; }}
          >
            {isEdit ? "დრაფტად შენახვა" : "დრაფტად შენახვა"}
          </Button>
          <Button
            type="submit" size="sm" disabled={pending}
            className="flex-1 bg-[rgba(196,30,58,0.9)] hover:bg-[rgba(196,30,58,1)] text-white"
            onClick={() => { if (publishRef.current) publishRef.current.value = "true"; }}
          >
            <Save className="h-4 w-4" />
            {pending ? "იგზავნება..." : isEdit ? "განახლება" : "გამოქვეყნება"}
          </Button>
        </div>
      </form>
    </GamerCard>
  );
}
