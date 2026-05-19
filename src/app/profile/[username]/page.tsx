import Link from "next/link";
import { Trophy, Users as UsersIcon, Gamepad2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { mockGames, mockLfgPosts, mockFeedPosts, mockUsers } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { FollowButton } from "@/components/follow-button";
import { RoleBadge, type UserRole } from "@/components/role-badge";
import { ProfileDisplayName } from "@/components/profile-display-name";
import { ProfileSocialLinks } from "@/components/profile-social-links";
import { BannerUpload } from "@/components/banner-upload";
import { ProfileFavoriteGames } from "@/components/profile-favorite-games";
import { ProfileFeed } from "@/components/profile-feed";
import { AvatarUpload } from "@/components/avatar-upload";
import { InviteButton } from "@/components/invite-button";
import { getSession } from "@/lib/auth";

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await getSession().catch(() => null);
  const sessionUsername =
    (session?.user_metadata?.username as string | undefined) ??
    session?.email?.split("@")[0] ??
    null;
  const isOwner = sessionUsername === username;
  const avatarUrl = (session?.user_metadata?.avatar_url as string | undefined) ?? null;

  const userId = session?.id ?? null;
  const mockUser = mockUsers.find((u) => u.username === username);
  const displayName = mockUser?.displayName ?? username;

  const userPosts = mockLfgPosts.filter((p) => p.authorName === username).slice(0, 5);
  const feedPosts = mockFeedPosts.filter((p) => p.authorName === username);

  const fallbackFavoriteGameSlugs: string[] = [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden border-border/60">

        {/* Banner */}
        <BannerUpload isOwner={isOwner} />

        <CardContent className="space-y-4 px-6 pb-6 pt-0">

          {/* Avatar + name + trust + follow (center) with favorites (left) and buttons (right) */}
          <div className="flex flex-col items-center gap-3 -mt-12 md:grid md:grid-cols-3 md:items-start md:gap-4">

            {/* Left — favorite games (order 2 on mobile, 1 on desktop) */}
            <div className="order-2 w-full md:order-1 md:pt-14">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ფავორიტი ვიდეოთამაშები
              </p>
              <ProfileFavoriteGames
                fallbackSlugs={fallbackFavoriteGameSlugs}
                isOwner={isOwner}
                userId={userId ?? undefined}
              />
            </div>

            {/* Center — avatar + name + trust + follow (order 1 on mobile, 2 on desktop) */}
            <div className="order-1 flex flex-col items-center gap-2 md:order-2">
              <AvatarUpload
                username={username}
                displayName={displayName}
                avatarUrl={isOwner ? avatarUrl : null}
                isOwner={isOwner}
              />
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                {isOwner ? <ProfileDisplayName fallback={displayName} userId={userId ?? undefined} /> : displayName}
              </h1>
              <RoleBadge username={username} defaultRole={mockUser?.role as UserRole | undefined} />
              <FollowButton username={username} />
            </div>

            {/* Right — action buttons (order 3 on both) */}
            <div className="order-3 flex flex-wrap justify-center gap-2 md:justify-end md:pt-14">
              {!isOwner && (
                <InviteButton
                  username={username}
                  displayName={displayName}
                  gameSlugs={mockUser?.games.map((g) => g.slug) ?? fallbackFavoriteGameSlugs}
                />
              )}
              <Button size="sm" variant="outline">შეტყობინება</Button>
            </div>

          </div>

          {/* Social channels — separator + heading rendered inside the component when links exist */}
          <ProfileSocialLinks
            defaultYtHandle=""
            defaultTtHandle=""
            ytSubscribers="—"
            ttFollowers="—"
            isOwner={isOwner}
            userId={userId ?? undefined}
          />

          <Separator />


          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <Stat icon={<UsersIcon className="h-4 w-4" />} value="284" label="გამომწერი" />
            <Stat icon={<Gamepad2 className="h-4 w-4" />} value="3" label="თამაში" />
            <Stat icon={<Trophy className="h-4 w-4" />} value="12" label="ტიტული" />
            <Stat icon={<UsersIcon className="h-4 w-4" />} value="47" label="LFG დაპოსტილი" />
          </div>

        </CardContent>
      </Card>

      <ProfileFeed
        username={username}
        displayName={displayName}
        initialPosts={feedPosts}
        isOwner={isOwner}
      />
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
