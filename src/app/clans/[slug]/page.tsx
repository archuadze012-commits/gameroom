import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Trophy, ShieldCheck, Target, MessageSquare } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { ClanJoinButton } from "./clan-join-button";
import { ClanRequestActions } from "./clan-request-actions";
import { ClanKickButton } from "./clan-kick-button";


type ClanMemberProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};
type ClanMember = {
  id: string;
  role: string;
  joined_at: string | null;
  profiles: ClanMemberProfile;
};
type ClanRequestProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string;
};
type ClanRequest = {
  id: string;
  message: string | null;
  created_at: string | null;
  profiles: ClanRequestProfile;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("clans")
    .select("name, tag, description, avatar_url, banner_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!c) return { title: "კლანი ვერ მოიძებნა", robots: { index: false } };
  const title = c.tag ? `${c.name} [${c.tag}]` : c.name;
  const description = c.description || `${c.name} — კლანი PLAYGAME.GE-ზე. შეუერთდი გუნდს.`;
  const image = c.banner_url ?? c.avatar_url ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/clans/${slug}` },
    openGraph: { title, description, url: `/clans/${slug}`, type: "website", images: image ? [{ url: image }] : undefined },
  };
}

export default async function ClanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  // session is independent of the clan row — fetch them together.
  const [sessionUser, { data: clan }] = await Promise.all([
    getSession().catch(() => null),
    supabase
      .from("clans")
      .select(`
        id, name, slug, tag, description, avatar_url, banner_url, xp, level, status,
        clan_members (
          id, role, joined_at,
          profiles ( id, username, display_name, avatar_url, is_verified )
        )
      `)
      .eq("slug", slug)
      .single(),
  ]);

  if (!clan) notFound();

  const members = (clan.clan_members || []) as ClanMember[];
  
  // Check user status relative to this clan
  let userStatus = "none"; // 'none', 'member', 'pending'
  let userRole = "none";
  let canManageRequests = false;
  let canKickMembers = false;

  if (sessionUser) {
    const membership = members.find((m) => m.profiles.id === sessionUser.id);
    if (membership) {
      userStatus = "member";
      userRole = membership.role;
      canManageRequests = ["leader", "officer"].includes(userRole);
      canKickMembers = ["leader", "officer"].includes(userRole);
    } else {
      const { data: req } = await supabase
        .from("clan_requests")
        .select("status")
        .eq("clan_id", clan.id)
        .eq("user_id", sessionUser.id)
        .maybeSingle();
      if (req && req.status === "pending") userStatus = "pending";
    }
  }

  // Fetch pending requests if user has permissions
  let pendingRequests: ClanRequest[] = [];
  if (canManageRequests) {
    const { data: reqs } = await supabase
      .from("clan_requests")
      .select(`
        id, message, created_at,
        profiles ( id, username, display_name, avatar_url )
      `)
      .eq("clan_id", clan.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pendingRequests = (reqs || []) as ClanRequest[];
  }

  const coverBanner = clan.banner_url || "from-amber-500/40 via-primary/20 to-transparent";

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link
        href="/clans"
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> კლანების სია
      </Link>

      <div className={`mb-6 h-40 rounded-xl bg-gradient-to-br ${coverBanner} md:h-56 relative overflow-hidden`}>
        <div className="absolute -bottom-8 left-8">
          <Avatar className="h-24 w-24 border-4 border-background bg-background shadow-xl">
            <AvatarImage src={clan.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl font-bold text-primary bg-primary/10">
              {clan.tag}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mt-12 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              [{clan.tag}]
            </span>
            <span className="text-xs text-muted-foreground uppercase">{clan.status}</span>
          </div>
          <h1 className="text-3xl font-bold font-display uppercase tracking-tight">{clan.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {clan.description || "ამ კლანს აღწერა არ აქვს."}
          </p>
        </div>

        <div className="flex flex-col gap-3 min-w-[200px] shrink-0 bg-secondary/20 p-4 rounded-xl border border-border/40">
           <div className="flex items-center justify-between text-sm">
             <span className="text-muted-foreground flex items-center gap-1.5"><Trophy className="h-4 w-4" /> დონე</span>
             <span className="font-bold text-amber-500">{clan.level}</span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <span className="text-muted-foreground flex items-center gap-1.5"><Target className="h-4 w-4" /> XP</span>
             <span className="font-bold text-primary">{clan.xp}</span>
           </div>
           <div className="flex items-center justify-between text-sm">
             <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-4 w-4" /> წევრები</span>
             <span className="font-bold">{members.length}</span>
           </div>
           
           <div className="pt-3 mt-1 border-t border-border/40">
              <ClanJoinButton 
                clanId={clan.id} 
                status={clan.status} 
                userStatus={userStatus} 
                isAuthenticated={!!sessionUser} 
              />
           </div>
        </div>
      </div>

      {canManageRequests && pendingRequests.length > 0 && (
        <div className="mb-10">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-4 text-amber-500 flex items-center gap-2">
            <Users className="h-5 w-5" /> ახალი მოთხოვნები ({pendingRequests.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingRequests.map((req) => (
              <Card key={req.id} className="border-border/60 bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-amber-500/20">
                      <AvatarImage src={req.profiles.avatar_url ?? undefined} />
                      <AvatarFallback>{(req.profiles.display_name || req.profiles.username).slice(0,1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link href={`/profile/${req.profiles.username}`} className="font-semibold text-sm truncate hover:text-primary transition-colors block">
                        {req.profiles.display_name || req.profiles.username}
                      </Link>
                      {req.message && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5" title={req.message}>
                          <MessageSquare className="h-3 w-3" /> {req.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <ClanRequestActions requestId={req.id} clanSlug={slug} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" /> შემადგენლობა
      </h3>
      
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {members.map((m) => {
          const profile = m.profiles;
          
          // Logic for showing kick button
          let showKick = false;
          if (canKickMembers && sessionUser?.id !== profile.id) {
            if (userRole === "leader") showKick = true;
            if (userRole === "officer" && m.role === "member") showKick = true;
          }

          return (
            <Card key={m.id} className="border-border/60 bg-secondary/5">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3 min-w-0">
                   <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback>{(profile.display_name || profile.username).slice(0,1)}</AvatarFallback>
                   </Avatar>
                   <div className="min-w-0">
                      <Link href={`/profile/${profile.username}`} className="font-semibold text-sm truncate hover:text-primary transition-colors block">
                        {profile.display_name || profile.username}
                      </Link>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {m.role === 'leader' ? <span className="text-amber-500 font-bold">Leader</span> : m.role}
                      </p>
                   </div>
                 </div>
                 {showKick && (
                   <ClanKickButton memberId={m.id} clanSlug={slug} />
                 )}
              </CardContent>
            </Card>
          )
        })}
      </div>

    </div>
  );
}
