import { Plus, Edit, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";

export const metadata = { title: "Admin · თამაშები" };

export default function AdminGamesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">თამაშების კატალოგი</h2>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> ახალი თამაში
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mockGames.map((g) => (
          <Card key={g.slug} className="border-border/60">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/40">
                  <GameIcon game={g} size="md" />
                </div>
                <div>
                  <div className="font-semibold">{g.nameKa}</div>
                  <div className="text-xs text-muted-foreground">{g.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                  active
                </Badge>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
