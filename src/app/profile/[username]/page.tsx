import Link from "next/link";
import { MapPin, Mic, Trophy, Users as UsersIcon, Gamepad2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockGames, mockLfgPosts } from "@/lib/mock-data";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const userPosts = mockLfgPosts.filter((p) => p.authorName === username).slice(0, 5);
  const gameProfiles = mockGames.slice(0, 3).map((g, i) => ({
    ...g,
    inGameId: ["GeoSniper99", "GS_main", "Sniper_GE"][i],
    rank: ["Crown II", "Diamond IV", "Ace"][i],
    role: ["Sniper", "IGL", "Entry"][i],
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden border-border/60">
        <div className="h-32 bg-gradient-to-br from-primary/30 via-accent/20 to-transparent" />
        <CardContent className="-mt-12 space-y-4 p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarFallback className="bg-primary/15 text-2xl font-bold text-primary">
                  {username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">@{username}</h1>
                <p className="text-sm text-muted-foreground">
                  PUBG-ის გულშემატკივარი, Crown ranked მოთამაშე. ხელმისაწვდომი საღამოს 21:00-დან.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    <MapPin className="mr-1 h-3 w-3" /> GE / EU
                  </Badge>
                  <Badge variant="outline">
                    <Mic className="mr-1 h-3 w-3" /> voice OK
                  </Badge>
                  <Badge variant="outline">⭐ Trust 4.8</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button>გუნდში მოწვევა</Button>
              <Button variant="outline">შეტყობინება</Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat icon={<Gamepad2 className="h-4 w-4" />} value="3" label="თამაში" />
            <Stat icon={<Trophy className="h-4 w-4" />} value="12" label="ჩემპიონატი" />
            <Stat icon={<UsersIcon className="h-4 w-4" />} value="47" label="LFG დაპოსტილი" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="games" className="mt-8">
        <TabsList>
          <TabsTrigger value="games">თამაშები</TabsTrigger>
          <TabsTrigger value="lfg">LFG ისტორია</TabsTrigger>
          <TabsTrigger value="tournaments">ჩემპიონატები</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {gameProfiles.map((g) => (
              <Card key={g.slug} className="border-border/60">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{g.emoji}</span>
                      <h3 className="font-semibold">{g.nameKa}</h3>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-xs">
                    <Row label="In-game ID" value={g.inGameId} />
                    <Row label="რანკი" value={g.rank} />
                    <Row label="როლი" value={g.role} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lfg" className="mt-6">
          {userPosts.length > 0 ? (
            <div className="space-y-2">
              {userPosts.map((p) => (
                <Link key={p.id} href={`/lfg/${p.id}`}>
                  <Card className="border-border/60 transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center justify-between p-4">
                      <span className="text-sm">{p.title}</span>
                      <span className="text-xs text-muted-foreground">{p.createdAgo}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState label="LFG პოსტი არ არის." />
          )}
        </TabsContent>

        <TabsContent value="tournaments" className="mt-6">
          <EmptyState label="ჩემპიონატის ისტორია მალე გამოჩნდება." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <div className="flex items-center justify-center gap-1 text-primary">{icon}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-border/60">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        {label}
      </CardContent>
    </Card>
  );
}
