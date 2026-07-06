import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NewsRowActions } from "./news-row-actions";

export const metadata = { title: "Admin · სიახლეები" };
export const dynamic = "force-dynamic";

const statusStyle: Record<string, string> = {
  published: "border-emerald-500/40 text-emerald-400",
  draft: "border-amber-500/40 text-amber-400",
  archived: "border-border/60 text-muted-foreground",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminNewsPage() {
  const admin = createSupabaseAdminClient();
  const { data: articles } = await admin
    .from("news_articles")
    .select("id, title, slug, status, published_at, created_at, author_id")
    .order("created_at", { ascending: false });

  // Resolve author usernames in one bounded query (avoids relying on a specific
  // embed FK name, which drifts and fails at runtime).
  const authorIds = [...new Set((articles ?? []).map((a) => a.author_id).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await admin.from("profiles").select("id, username").in("id", authorIds)
    : { data: [] as { id: string; username: string | null }[] };
  const authorMap = new Map((authors ?? []).map((p) => [p.id, p.username]));

  const rows = (articles ?? []).map((a) => ({ ...a, authorName: authorMap.get(a.author_id) ?? "—" }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">სიახლეები</h2>
        <Button asChild>
          <Link href="/admin/news/new">
            <Plus className="mr-1 h-4 w-4" /> ახალი სტატია
          </Link>
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              ჯერ სტატია არ არის. დააჭირე „ახალი სტატია“-ს.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">სათაური</th>
                  <th className="px-4 py-3 text-left">სტატუსი</th>
                  <th className="px-4 py-3 text-left">ავტორი</th>
                  <th className="px-4 py-3 text-left">თარიღი</th>
                  <th className="px-4 py-3 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/news/${n.slug}`} className="hover:text-primary">
                        {n.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusStyle[n.status] ?? ""}>
                        {n.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">@{n.authorName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(n.published_at ?? n.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <NewsRowActions id={n.id} title={n.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
