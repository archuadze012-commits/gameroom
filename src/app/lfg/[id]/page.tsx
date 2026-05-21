import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Mic, Users as UsersIcon, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { mockGames } from "@/lib/mock-data";
import { JoinRequestForm } from "./join-request-form";
import { TeammateSuggestions } from "./teammate-suggestions";
import { GameIcon } from "@/components/game-icon";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LfgRow = {
  id: string;
  game_slug: string;
  title: string;
  description: string;
  rank: string | null;
  region: string | null;
  slots_total: number;
  voice_required: boolean;
  created_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default async function LfgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("lfg_posts")
    .select(
      "id, game_slug, title, description, rank, region, slots_total, voice_required, created_at, profiles!lfg_posts_author_id_fkey(username, display_name, avatar_url)"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) notFound();
  const post = data as unknown as LfgRow;
  const game = mockGames.find((g) => g.slug === post.game_slug);
  const author = post.profiles;
  const authorName = author?.username ?? "გამოუცნობი";
  const displayName = author?.display_name ?? authorName;
  const createdAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka });
    } catch {
      return "";
    }
  })();

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
                {game && <GameIcon game={game} size="sm" />}
                {game ? (
                  <Link href={`/games/${game.slug}`} className="hover:text-foreground">
                    {game.nameKa}
                  </Link>
                ) : (
                  <span>{post.game_slug}</span>
                )}
                <span>·</span>
                <Clock className="h-3.5 w-3.5" />
                <span>{createdAgo}</span>
              </div>

              <h1 className="text-2xl font-bold">{post.title}</h1>

              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={author?.avatar_url ?? undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/profile/${authorName}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    @{authorName}
                  </Link>
                  <div className="text-xs text-muted-foreground">პოსტის ავტორი</div>
                </div>
              </div>

              {post.description && (
                <>
                  <Separator />
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {post.description}
                  </p>
                </>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {post.rank && <Badge variant="outline" className="text-xs">🏅 {post.rank}</Badge>}
                {post.region && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="mr-1 h-3 w-3" /> {post.region}
                  </Badge>
                )}
                {post.voice_required && (
                  <Badge variant="outline" className="text-xs">
                    <Mic className="mr-1 h-3 w-3" /> voice
                  </Badge>
                )}
                <Badge className="text-xs">
                  <UsersIcon className="mr-1 h-3 w-3" />
                  0/{post.slots_total} ადგილი
                </Badge>
              </div>
            </CardContent>
          </Card>
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

          <TeammateSuggestions
            postId={post.id}
            gameSlug={post.game_slug}
            title={post.title}
            description={post.description}
          />

          <Card className="border-border/60">
            <CardContent className="space-y-2 p-5 text-xs text-muted-foreground">
              <h4 className="text-sm font-semibold text-foreground">სტატისტიკა</h4>
              <div className="flex justify-between">
                <span>ადგილების რაოდენობა</span>
                <span className="font-medium text-foreground">{post.slots_total}</span>
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
