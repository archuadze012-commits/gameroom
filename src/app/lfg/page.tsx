import Link from "next/link";
import { Plus, MapPin, Mic, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mockGames, mockLfgPosts } from "@/lib/mock-data";
import { LfgFilters } from "./lfg-filters";

export const metadata = { title: "LFG — გუნდის ძებნა" };

export default async function LfgPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; region?: string; voice?: string }>;
}) {
  const params = await searchParams;
  const filtered = mockLfgPosts.filter((p) => {
    if (params.game && p.gameSlug !== params.game) return false;
    if (params.region && !p.region.includes(params.region)) return false;
    if (params.voice === "1" && !p.voiceRequired) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="გუნდის ძებნა (LFG)"
        description="იპოვე მოთამაშეები შენი თამაშისთვის, რანკისთვის და რეგიონისთვის."
        actions={
          <Button asChild>
            <Link href="/lfg/new">
              <Plus className="mr-1 h-4 w-4" /> LFG დაპოსტვა
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <LfgFilters />
        </aside>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            filtered.map((post) => {
              const game = mockGames.find((g) => g.slug === post.gameSlug);
              return (
                <Link key={post.id} href={`/lfg/${post.id}`}>
                  <Card className="border-border/60 transition-all hover:border-primary/40 hover:bg-card/80">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <span>{game?.emoji}</span>
                              <span>{game?.nameKa}</span>
                            </span>
                            <span>·</span>
                            <span>{post.createdAgo}</span>
                            <span>·</span>
                            <span>@{post.authorName}</span>
                          </div>
                          <h3 className="mt-1 text-lg font-semibold">{post.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {post.description}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline">🏅 {post.rank}</Badge>
                            <Badge variant="outline">
                              <MapPin className="mr-1 h-3 w-3" />
                              {post.region}
                            </Badge>
                            {post.voiceRequired && (
                              <Badge variant="outline">
                                <Mic className="mr-1 h-3 w-3" />
                                voice
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                          <Badge className="text-sm">
                            <UsersIcon className="mr-1 h-3.5 w-3.5" />
                            {post.slots.filled}/{post.slots.total}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {post.responseCount} პასუხი
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed border-border/60">
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <UsersIcon className="h-10 w-10 text-muted-foreground" />
        <h3 className="font-semibold">ფილტრის შესაბამისი LFG ვერ მოიძებნა</h3>
        <p className="text-sm text-muted-foreground">
          სცადე ფილტრების შეცვლა ან თვითონ დაპოსტე ერთი.
        </p>
        <Button asChild className="mt-2">
          <Link href="/lfg/new">LFG დაპოსტვა</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
