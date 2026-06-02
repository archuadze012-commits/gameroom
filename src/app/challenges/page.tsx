import { Trophy, Flame, Target } from "lucide-react";
import { getSession } from "@/lib/auth";
import { ChallengesList } from "@/components/challenges-list";
import { DisplayHeading } from "@/components/ui/display-heading";

export const metadata = { title: "Daily Challenges | GameRoom" };

export default async function ChallengesPage() {
  const session = await getSession().catch(() => null);
  const today = new Date().toLocaleDateString("ka-GE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#05050f]">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_70%)]" />

      <div className="container relative mx-auto max-w-4xl px-4 py-10 lg:py-14">
        
        {/* Premium Header */}
        <header className="mb-10 group relative rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] shadow-[0_0_40px_rgba(236,72,153,0.15)] transition-shadow duration-500 hover:shadow-[0_0_50px_rgba(236,72,153,0.25)]">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714] p-6 sm:p-8 shadow-[inset_0_0_30px_rgba(236,72,153,0.05)]">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.1),transparent_50%)]" />
            
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              <Trophy className="h-10 w-10 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
            </div>
            <div className="relative">
              <p className="text-[12px] font-black uppercase tracking-[0.24em] text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                Daily Missions
              </p>
              <DisplayHeading as="h1" size="lg" className="mt-1 text-white drop-shadow-md">
                Challenges
              </DisplayHeading>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-violet-400">
                  <Target className="h-3.5 w-3.5" /> {today}
                </span>
                {!session && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-400">
                    <Flame className="h-3.5 w-3.5 animate-pulse" /> ავტორიზაცია სავალდებულოა
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <ChallengesList hasSession={!!session} />
      </div>
    </div>
  );
}
