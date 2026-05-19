import Link from "next/link";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mockGames } from "@/lib/mock-data";

export const metadata = { title: "თამაშები" };

const sortedGames = [...mockGames].sort((a, b) => b.favoritedBy - a.favoritedBy);

export default function GamesCatalogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="თამაშების კატალოგი"
        description="ყველა თამაში, რომელიც ჩვენს პლატფორმაზე გვაქვს მხარდაჭერილი."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedGames.map((g, i) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="group">
            <Card className="relative h-56 overflow-hidden border-border/60 transition-all hover:border-primary/40">
              {g.coverUrl ? (
                <img
                  src={g.coverUrl}
                  alt={g.nameKa}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Rank badge */}
              <div className="absolute left-3 top-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  i === 0 ? "bg-amber-400 text-black" :
                  i === 1 ? "bg-slate-300 text-black" :
                  i === 2 ? "bg-amber-700 text-white" :
                  "bg-black/50 text-white/80"
                }`}>
                  {i + 1}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white transition-colors group-hover:text-primary">
                      {g.nameKa}
                    </h3>
                    <p className="text-xs text-white/60">{g.players.toLocaleString()} მოთამაშე</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="gap-1 bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
                      <Heart className="h-3 w-3 fill-current" /> {g.favoritedBy}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/40">
                      🟢 {g.online}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
