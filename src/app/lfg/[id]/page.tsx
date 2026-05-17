import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Mic, Users as UsersIcon, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { mockGames, mockLfgPosts } from "@/lib/mock-data";
import { JoinRequestForm } from "./join-request-form";

export default async function LfgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = mockLfgPosts.find((p) => p.id === id);
  if (!post) notFound();
  const game = mockGames.find((g) => g.slug === post.gameSlug);

  const mockResponses = [
    { name: "Beka", ago: "5 წთ წინ", message: "მოვალ! Crown I-ვარ" },
    { name: "Nika", ago: "8 წთ წინ", message: "Voice-ით კი, +1" },
    { name: "Saba", ago: "20 წთ წინ", message: "მე და მეგობარი მოვალთ" },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/lfg"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ყველა LFG
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{game?.emoji}</span>
                <Link href={`/games/${game?.slug}`} className="hover:text-foreground">
                  {game?.nameKa}
                </Link>
                <span>·</span>
                <Clock className="h-3.5 w-3.5" />
                <span>{post.createdAgo}</span>
              </div>

              <h1 className="text-2xl font-bold">{post.title}</h1>

              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {post.authorName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/profile/${post.authorName}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    @{post.authorName}
                  </Link>
                  <div className="text-xs text-muted-foreground">პოსტის ავტორი</div>
                </div>
              </div>

              <Separator />

              <p className="text-sm leading-relaxed text-muted-foreground">
                {post.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="text-xs">🏅 {post.rank}</Badge>
                <Badge variant="outline" className="text-xs">
                  <MapPin className="mr-1 h-3 w-3" /> {post.region}
                </Badge>
                {post.voiceRequired && (
                  <Badge variant="outline" className="text-xs">
                    <Mic className="mr-1 h-3 w-3" /> voice
                  </Badge>
                )}
                <Badge className="text-xs">
                  <UsersIcon className="mr-1 h-3 w-3" />
                  {post.slots.filled}/{post.slots.total} ადგილი
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              პასუხები ({mockResponses.length})
            </h2>
            <div className="space-y-2">
              {mockResponses.map((r, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-secondary text-foreground/80">
                        {r.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">@{r.name}</span>
                        <span className="text-muted-foreground">{r.ago}</span>
                      </div>
                      <p className="mt-1 text-sm">{r.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="font-semibold">გუნდს უერთდები?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  მოკლე შეტყობინება დაუტოვე ავტორს — რანკი, ხელმისაწვდომი დრო.
                </p>
              </div>
              <JoinRequestForm postId={post.id} />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="space-y-2 p-5 text-xs text-muted-foreground">
              <h4 className="text-sm font-semibold text-foreground">სტატისტიკა</h4>
              <div className="flex justify-between">
                <span>დარჩენილი ადგილი</span>
                <span className="font-medium text-foreground">
                  {post.slots.total - post.slots.filled}
                </span>
              </div>
              <div className="flex justify-between">
                <span>პასუხების რაოდენობა</span>
                <span className="font-medium text-foreground">{post.responseCount}</span>
              </div>
              <div className="flex justify-between">
                <span>სტატუსი</span>
                <span className="font-medium text-emerald-400">ღია</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return mockLfgPosts.map((p) => ({ id: p.id }));
}
