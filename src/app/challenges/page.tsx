import { Trophy, Flame, Target } from "lucide-react";
import { getSession } from "@/lib/auth";
import { ChallengesList } from "@/components/challenges-list";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";

export const metadata = { title: "Daily Challenges | GameRoom" };

export default async function ChallengesPage() {
  const session = await getSession().catch(() => null);
  const today = new Date().toLocaleDateString("ka-GE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="pink" />

      <div className="container relative mx-auto max-w-4xl px-4 py-10 lg:py-14">
        
        <PageHeader
          color="pink"
          eyebrow="Daily Missions"
          title={
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-pink-500/30 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                <Trophy className="h-5 w-5 text-pink-400" />
              </span>
              <span>Challenges</span>
            </span>
          }
          actions={
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-violet-400">
                <Target className="h-3.5 w-3.5" /> {today}
              </span>
              {!session && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-400">
                  <Flame className="h-3.5 w-3.5 animate-pulse" /> ავტორიზაცია სავალდებულოა
                </span>
              )}
            </>
          }
        />

        <ChallengesList hasSession={!!session} />
      </div>
    </div>
  );
}
