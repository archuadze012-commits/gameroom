"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
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

  const field = "block w-full border-b-2 border-white/10 bg-black/40 px-4 py-3 text-[14px] font-medium text-white transition-all placeholder:text-white/30 focus:border-[var(--gr-violet-hi)] focus:bg-black/60 focus:outline-none hover:bg-black/50 [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]";
  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gr-violet-hi)] drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]";

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
    <div className="pubg-loadout-link group relative block w-full transition-all duration-500" data-variant="strike">
      <div className="pubg-loadout-card relative overflow-hidden p-6 sm:p-10 shadow-2xl">
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16" />

        <form onSubmit={handleSubmit} className="relative z-10 space-y-7">
          <input
            ref={publishRef}
            type="hidden"
            name="publish"
            defaultValue={initialArticle?.published ? "true" : "false"}
          />

          <div>
            <label className={labelClass}>სათაური <span className="text-red-400">*</span></label>
            <input name="title" required className={field} placeholder="სტატიის სათაური" defaultValue={initialArticle?.title ?? ""} />
          </div>
          <div>
            <label className={labelClass}>მოკლე აღწერა</label>
            <input name="excerpt" className={field} placeholder="1-2 წინადადება..." defaultValue={initialArticle?.excerpt ?? ""} />
          </div>
          <div>
            <label className={labelClass}>თამაში</label>
            <select name="game_slug" className={`${field} appearance-none`} defaultValue={initialArticle?.game_slug ?? ""}>
              <option value="" className="bg-black text-white">— არ არის მიბმული —</option>
              {games.map((g) => <option key={g.slug} value={g.slug} className="bg-black text-white">{g.name_ka}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cover URL</label>
            <input name="cover_url" className={field} placeholder="https://..." defaultValue={initialArticle?.cover_url ?? ""} />
          </div>
          <div>
            <label className={labelClass}>კონტენტი <span className="text-red-400">*</span></label>
            <textarea name="content" required defaultValue={initialArticle?.content ?? ""} className={`${field} min-h-[280px] resize-y`} placeholder="სტატიის ტექსტი..." />
          </div>

          {error && (
            <div className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-white/5">
            <button
              type="submit" disabled={pending}
              className="group relative inline-flex items-center justify-center overflow-hidden bg-white/5 px-6 py-3.5 font-display text-[14px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10 flex-1 sm:flex-none [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => { if (publishRef.current) publishRef.current.value = "false"; }}
            >
              <span className="relative z-10">{isEdit ? "დრაფტად შენახვა" : "დრაფტად შენახვა"}</span>
            </button>
            <button
              type="submit" disabled={pending}
              className="group relative inline-flex items-center justify-center overflow-hidden bg-[var(--gr-violet-hi)] px-8 py-3.5 font-display text-[14px] font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 flex-1 sm:flex-none [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)] shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => { if (publishRef.current) publishRef.current.value = "true"; }}
            >
              <span aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.25)_50%,transparent_100%)] translate-x-[-100%] transition-transform duration-500 group-hover:translate-x-[100%]" />
              <span className="relative z-10 flex items-center gap-2">
                <Save className="h-4 w-4" />
                {pending ? "იგზავნება..." : isEdit ? "განახლება" : "გამოქვეყნება"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
