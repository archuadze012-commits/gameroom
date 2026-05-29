"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { ChevronButton } from "@/components/ui/chevron-button";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export function NewThreadForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      setError("გთხოვთ შეავსოთ ყველა ველი");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("გთხოვთ გაიაროთ ავტორიზაცია");
      }

      // We need a slug for the thread
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9გ-ჰ]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

      const { data, error: dbError } = await supabase
        .from("forum_threads")
        .insert({
          category_id: categoryId,
          title: title.trim(),
          slug,
          author_id: user.id,
          last_reply_at: new Date().toISOString()
        })
        .select("id, slug")
        .single();
        
      if (dbError) throw dbError;
      
      // Insert the first post
      const { error: postError } = await supabase
        .from("forum_posts")
        .insert({
          thread_id: data.id,
          author_id: user.id,
          content: content.trim()
        });
        
      if (postError) throw postError;

      const catSlug = categories.find(c => c.id === categoryId)?.slug;
      router.push(`/forum/${catSlug}/${data.slug}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "შეცდომა თემის შექმნისას");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-[var(--gr-amber)]/10 p-3 text-sm text-[var(--gr-amber)] border border-[var(--gr-amber)]/20">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="category" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">
          კატეგორია
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full h-11 bg-[var(--gr-bg-2)] border border-[var(--gr-border)] px-3 text-sm text-[var(--gr-text)] transition-colors focus:border-[var(--gr-violet)] focus:outline-none focus:ring-1 focus:ring-[var(--gr-violet)]/50 rounded-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">
          სათაური
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="რა გაინტერესებთ?"
          className="h-11 bg-[var(--gr-bg-2)] border-[var(--gr-border)] focus-visible:ring-[var(--gr-violet)]/50 focus-visible:border-[var(--gr-violet)] rounded-none"
          maxLength={100}
        />
        <div className="text-right text-[10px] text-[var(--gr-text-dim)]">
          {title.length} / 100
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="content" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gr-text-mute)]">
          შინაარსი
        </label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="დაწერეთ დეტალურად..."
          className="min-h-[200px] resize-y bg-[var(--gr-bg-2)] border-[var(--gr-border)] focus-visible:ring-[var(--gr-violet)]/50 focus-visible:border-[var(--gr-violet)] rounded-none"
        />
      </div>

      <div className="flex justify-end pt-4">
        <ChevronButton
          variant="violet"
          size="md"
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          გამოქვეყნება
        </ChevronButton>
      </div>
    </form>
  );
}
