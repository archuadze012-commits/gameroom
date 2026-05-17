import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mockGames, mockNews } from "@/lib/mock-data";

export const metadata = { title: "სიახლეები" };

export default function NewsPage() {
  const [featured, ...rest] = mockNews;
  const featuredGame = mockGames.find((g) => g.slug === featured?.gameSlug);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="სიახლეები"
        description="გეიმინგ სამყაროს ბოლო ამბები — ადმინისტრაციის შერჩევით."
      />

      {featured && (
        <Link href={`/news/${featured.slug}`} className="mt-8 block">
          <Card className="overflow-hidden border-border/60 transition-colors hover:border-primary/40">
            <div className={`h-48 w-full bg-gradient-to-br ${featured.cover} md:h-64`} />
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {featuredGame && (
                  <Badge variant="outline">{featuredGame.emoji} {featuredGame.nameKa}</Badge>
                )}
                <span>{featured.publishedAt}</span>
                <span>· {featured.readMinutes} წთ კითხვა</span>
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{featured.title}</h2>
              <p className="text-muted-foreground">{featured.excerpt}</p>
              <div className="text-xs text-muted-foreground">@{featured.author}</div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((n) => {
          const game = mockGames.find((g) => g.slug === n.gameSlug);
          return (
            <Link key={n.slug} href={`/news/${n.slug}`}>
              <Card className="h-full overflow-hidden border-border/60 transition-colors hover:border-primary/40">
                <div className={`h-32 w-full bg-gradient-to-br ${n.cover}`} />
                <CardContent className="space-y-2 p-5">
                  {game && (
                    <Badge variant="outline" className="text-[10px]">
                      {game.emoji} {game.nameKa}
                    </Badge>
                  )}
                  <h3 className="line-clamp-2 font-semibold">{n.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{n.excerpt}</p>
                  <div className="text-xs text-muted-foreground">
                    {n.publishedAt} · {n.readMinutes} წთ
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
