import Link from "next/link";
import { Plus, MapPin, Mic, Users as UsersIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { LfgFilters } from "./lfg-filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export const metadata = { title: "LFG — გუნდის ძებნა" };
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

export default async function LfgPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; region?: string; voice?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();

  const session = await getSession().catch(() => null);
  let favoriteSlugs: string[] = [];
  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_game_slugs")
      .eq("id", session.id)
      .maybeSingle();
    favoriteSlugs = (profile?.favorite_game_slugs as string[] | null) ?? [];
  }

  let query = supabase
    .from("lfg_posts")
    .select(
      "id, game_slug, title, description, rank, region, slots_total, voice_required, created_at, profiles!lfg_posts_author_id_fkey(username, display_name, avatar_url)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.game) query = query.eq("game_slug", params.game);
  if (params.region) query = query.eq("region", params.region);
  if (params.voice === "1") query = query.eq("voice_required", true);

  const { data } = await query;
  const posts = (data ?? []) as unknown as LfgRow[];

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
          <LfgFilters favoriteSlugs={favoriteSlugs} />
        </aside>

        <div className="space-y-3">
          {posts.length === 0 ? (
            <EmptyState />
          ) : (
            posts.map((post) => {
              const author = post.profiles;
              const authorUsername = author?.username ?? null;
              const displayName = author?.display_name ?? authorUsername ?? "გამოუცნობი";
              const createdAgo = (() => {
                try {
                  return formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka });
                } catch {
                  return "";
                }
              })();
              return (
                <Card key={post.id} className="border-border/60 transition-all hover:border-primary/40 hover:bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      {/* Author — large avatar + name on the left */}
                      <div className="flex shrink-0 flex-col items-center gap-2 w-24">
                        {authorUsername ? (
                          <Link
                            href={`/profile/${authorUsername}`}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <Avatar className="h-16 w-16 border-2 border-border/60 transition-colors group-hover:border-primary/60">
                              <AvatarImage src={author?.avatar_url ?? undefined} alt={displayName} />
                              <AvatarFallback className="bg-primary/15 text-lg text-primary">
                                {displayName.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-center text-sm font-semibold leading-tight group-hover:text-primary line-clamp-2 break-words">
                              {displayName}
                            </span>
                          </Link>
                        ) : (
                          <>
                            <Avatar className="h-16 w-16 border-2 border-border/60">
                              <AvatarFallback className="bg-primary/15 text-lg text-primary">?</AvatarFallback>
                            </Avatar>
                            <span className="text-center text-sm font-semibold text-muted-foreground line-clamp-2 break-words">
                              {displayName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Right — title, description, badges */}
                      <div className="min-w-0 flex-1">
                        <Link href={`/lfg/${post.id}`} className="block">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold hover:text-primary line-clamp-2">
                              {post.title}
                            </h3>
                            <Badge className="shrink-0 text-sm">
                              <UsersIcon className="mr-1 h-3.5 w-3.5" />
                              0/{post.slots_total}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{createdAgo}</p>
                          {post.description && (
                            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                              {post.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            {post.rank && <Badge variant="outline">🏅 {post.rank}</Badge>}
                            {post.region && (
                              <Badge variant="outline">
                                <MapPin className="mr-1 h-3 w-3" />
                                {post.region}
                              </Badge>
                            )}
                            {post.voice_required && (
                              <Badge variant="outline">
                                <Mic className="mr-1 h-3 w-3" />
                                voice
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
        <h3 className="font-semibold">ჯერ არცერთი LFG არ არის</h3>
        <p className="text-sm text-muted-foreground">
          გახდი პირველი ვინც დაპოსტავს გუნდის ძებნას.
        </p>
        <Button asChild className="mt-2">
          <Link href="/lfg/new">LFG დაპოსტვა</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
