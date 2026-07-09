import Link from "next/link";
import { Plus, Users, ShieldAlert, Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PremiumCard } from "@/components/ui/premium-card";

export const metadata = {
  title: "კლანები",
  description: "გეიმინგ კლანები — შეუერთდი გუნდს ან შექმენი შენი PLAYGAME.GE-ზე.",
  alternates: { canonical: "/clans" },
  openGraph: {
    title: "კლანები · PLAYGAME.GE",
    description: "გეიმინგ კლანები PLAYGAME.GE-ზე.",
    url: "/clans",
    type: "website",
  },
};

type ClanListItem = {
  id: string;
  name: string;
  slug: string;
  tag: string;
  description: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  status: string;
  clan_members: { count: number }[];
};

export default async function ClansPage() {
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSession().catch(() => null);

  const { data: clans } = await supabase
    .from("clans")
    .select(`
      id,
      name,
      slug,
      tag,
      description,
      avatar_url,
      xp,
      level,
      status,
      clan_members(count)
    `)
    .order("xp", { ascending: false });

  // Check if current user is in a clan
  let userClan: { slug: string } | null = null;
  if (sessionUser) {
    const { data: member } = await supabase
      .from("clan_members")
      .select("clans(slug)")
      .eq("user_id", sessionUser.id)
      .maybeSingle();
    userClan = (member?.clans as unknown as { slug: string } | null) ?? null;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 max-w-5xl">
        <PageHeader
          color="indigo"
          eyebrow="გუნდები & კლანები"
          title="გაერთიანდი და ითამაშე"
          description="მოძებნე შენთვის შესაფერისი კლანი ან შექმენი ახალი, გაზარდეთ XP ერთად და მიიღეთ მონაწილეობა კლანურ ტურნირებში."
          actions={
            userClan ? (
              <Button asChild className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <Link href={`/clans/${userClan.slug}`}>ჩემი კლანი</Link>
              </Button>
            ) : (
              <Button asChild className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <Link href="/clans/new"><Plus className="mr-2 h-4 w-4" /> კლანის შექმნა</Link>
              </Button>
            )
          }
        />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((clans || []) as unknown as ClanListItem[]).map((clan) => (
            <Link key={clan.id} href={`/clans/${clan.slug}`} className="block h-full">
              <PremiumCard>
                <div className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                      <AvatarImage src={clan.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-indigo-500/10 text-indigo-400 font-bold">
                        {clan.tag}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate flex items-center gap-2 text-white drop-shadow-md">
                        {clan.name}
                        <span className="text-[10px] font-mono text-indigo-300/80 px-1.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10">
                          [{clan.tag}]
                        </span>
                      </h3>
                      <p className="text-xs text-white/50 capitalize">{clan.status}</p>
                    </div>
                  </div>

                  <p className="text-sm text-white/60 line-clamp-2 h-10 font-medium">
                    {clan.description || "აღწერის გარეშე"}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-auto border-t border-white/5 text-sm">
                    <div className="flex items-center gap-1.5 text-white/50 font-medium">
                      <Users className="h-4 w-4" />
                      <span>{clan.clan_members[0]?.count ?? 1}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                      <Trophy className="h-4 w-4" />
                      <span>LVL {clan.level}</span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </Link>
          ))}

          {(!clans || clans.length === 0) && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <ShieldAlert className="h-12 w-12 text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white/50">ჯერ არცერთი კლანი არ შექმნილა</h3>
              <p className="text-sm text-white/30 mt-1">იყავი პირველი ვინც შექმნის გუნდს!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
