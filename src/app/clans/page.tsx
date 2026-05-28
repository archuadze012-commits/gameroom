import Link from "next/link";
import { Plus, Users, ShieldAlert, Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
  let userClan = null;
  if (sessionUser) {
    const { data: member } = await supabase
      .from("clan_members")
      .select("clans(slug)")
      .eq("user_id", sessionUser.id)
      .maybeSingle();
    userClan = member?.clans;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <PageHeader
        eyebrow="გუნდები & კლანები"
        title="გაერთიანდი და ითამაშე გუნდურად"
        description="მოძებნე შენთვის შესაფერისი კლანი ან შექმენი ახალი, გაზარდეთ XP ერთად და მიიღეთ მონაწილეობა კლანურ ტურნირებში."
        actions={
          userClan ? (
            <Button asChild>
              <Link href={`/clans/${(userClan as any).slug}`}>ჩემი კლანი</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/clans/new"><Plus className="mr-2 h-4 w-4" /> კლანის შექმნა</Link>
            </Button>
          )
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(clans || []).map((clan: any) => (
          <Link key={clan.id} href={`/clans/${clan.slug}`}>
            <Card className="h-full border-border/60 transition-colors hover:border-primary/40 hover:bg-secondary/20">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-primary/20">
                    <AvatarImage src={clan.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {clan.tag}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate flex items-center gap-2">
                      {clan.name}
                      <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary">
                        [{clan.tag}]
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground capitalize">{clan.status}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {clan.description || "აღწერის გარეშე"}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{clan.clan_members[0].count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                    <Trophy className="h-4 w-4" />
                    <span>LVL {clan.level}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {(!clans || clans.length === 0) && (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">ჯერ არცერთი კლანი არ შექმნილა</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">იყავი პირველი ვინც შექმნის გუნდს!</p>
          </div>
        )}
      </div>
    </div>
  );
}
