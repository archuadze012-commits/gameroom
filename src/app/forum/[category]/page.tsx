import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin, MessageCircle, Eye, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mockForumCategories, mockForumThreads } from "@/lib/mock-data";

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = mockForumCategories.find((c) => c.slug === category);
  if (!cat) notFound();
  const threads = mockForumThreads[category] ?? [];
  const pinned = threads.filter((t) => t.pinned);
  const regular = threads.filter((t) => !t.pinned);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/forum"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ფორუმი
      </Link>

      <PageHeader
        title={cat.name}
        description={cat.description}
        actions={
          <Button asChild>
            <Link href={`/forum/${cat.slug}/new`}>
              <Plus className="mr-1 h-4 w-4" /> ახალი თემა
            </Link>
          </Button>
        }
      />

      <div className="mt-8 space-y-2">
        {[...pinned, ...regular].map((thread) => (
          <Link key={thread.slug} href={`/forum/${cat.slug}/${thread.slug}`}>
            <Card className="border-border/60 transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {thread.pinned && (
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        <Pin className="mr-1 h-3 w-3" /> pinned
                      </Badge>
                    )}
                    <h3 className="truncate font-medium">{thread.title}</h3>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {thread.author} · {thread.lastReplyAgo}
                  </div>
                </div>
                <div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {thread.replies}
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <Eye className="h-3 w-3" /> {thread.views}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return mockForumCategories.map((c) => ({ category: c.slug }));
}
