import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mockGames } from "@/lib/mock-data";

export const metadata = { title: "თამაშები" };

export default function GamesCatalogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="თამაშების კატალოგი"
        description="ყველა თამაში, რომელიც ჩვენს პლატფორმაზე გვაქვს მხარდაჭერილი."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockGames.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="group">
            <Card className="relative h-full overflow-hidden border-border/60 transition-all hover:border-primary/40">
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${g.accent} opacity-60`} />
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-start justify-between">
                  <span className="text-5xl">{g.emoji}</span>
                  <Badge variant="secondary">{g.liveLfg} live LFG</Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold transition-colors group-hover:text-primary">
                    {g.nameKa}
                  </h3>
                  <p className="text-xs text-muted-foreground">{g.nameEn}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
                </div>
                <div className="mt-auto flex justify-between text-xs text-muted-foreground">
                  <span>{g.players.toLocaleString()} მოთამაშე</span>
                  <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    გახსნა →
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
