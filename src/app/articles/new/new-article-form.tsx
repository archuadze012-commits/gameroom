"use client";

import { ArticleEditorForm } from "@/app/articles/article-editor-form";

type Game = { slug: string; name_ka: string };

export function NewArticleForm({ games }: { games: Game[]; authorId: string }) {
  return <ArticleEditorForm games={games} />;
}
