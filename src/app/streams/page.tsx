import Link from "next/link";
import { Tv, Users, Play, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PremiumCard } from "@/components/ui/premium-card";
import { getLiveStreams } from "@/lib/streams/youtube-live";
import { Pill } from "@/components/ui/pill";

export const metadata = {
  title: "ლაივ სტრიმები",
  description: "ქართველი გეიმერების ლაივ სტრიმები — უყურე პირდაპირ ეთერში PLAYGAME.GE-ზე.",
  alternates: { canonical: "/streams" },
  openGraph: {
    title: "ლაივ სტრიმები · PLAYGAME.GE",
    description: "ქართველი გეიმერების ლაივ სტრიმები PLAYGAME.GE-ზე.",
    url: "/streams",
    type: "website",
  },
};
export const dynamic = "force-dynamic";

export default async function StreamsPage() {
  const streams = await getLiveStreams(30);

  // If there are no real streams, we provide the same mock fallback used on the home page for a consistent experience
  const displayStreams =
    streams.length > 0
      ? streams
      : [
          {
            id: "mock1",
            username: "gameroom_ge",
            displayName: "Gameroom Georgia",
            avatarUrl: null,
            videoId: "jfKfPfyJRdk",
            title: "Lofi Girl - chill beats to game to",
            thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg",
            watchUrl: "https://youtube.com/watch?v=jfKfPfyJRdk",
            viewers: 14500,
            gameSlug: "chill",
          },
        ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      <CinematicBackground />

      <div className="container relative z-10 mx-auto px-4 py-12 md:py-16 space-y-12">
        <PageHeader
          title="მიმდინარე ლაივ სტრიმები"
          description="ქართველი გეიმერების აქტიური სტრიმები YouTube-ზე. უყურე, ისწავლე და გაერთე ერთად."
          eyebrow={
            <span className="flex items-center gap-1.5">
              <Radio className="h-4 w-4" />
              <span>LIVE</span>
            </span>
          }
          color="red"
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayStreams.map((stream) => (
            <Link
              key={stream.id}
              href={stream.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full"
            >
              <PremiumCard
                className="flex flex-col overflow-hidden !p-0 h-full"
              >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden">
                <span aria-hidden className="absolute inset-0 bg-black/20 mix-blend-overlay z-10 transition-opacity duration-500 group-hover:opacity-0" />
                
                {/* Status Pill */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  <Pill tone="live" pulse={true} className="shadow-[0_0_12px_rgba(239,68,68,0.6)] text-red-400 bg-red-500/20 border-red-500/30">
                    <Radio className="mr-1.5 h-3 w-3" />
                    LIVE
                  </Pill>
                  {stream.viewers !== null && (
                    <Pill tone="neutral" className="bg-black/60 backdrop-blur-md text-white border-white/10">
                      <Users className="mr-1.5 h-3 w-3 text-red-400" />
                      {stream.viewers.toLocaleString()}
                    </Pill>
                  )}
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105">
                  <div className="h-14 w-14 rounded-full bg-red-600/90 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-400/30">
                    <Play className="h-6 w-6 text-white ml-1 fill-white" />
                  </div>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stream.thumbnail}
                  alt={stream.title}
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0714] via-[#0a0714]/40 to-transparent z-[1]" />
              </div>

              {/* Info Container */}
              <div className="relative z-10 flex flex-col gap-3 p-5 flex-1">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    {stream.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stream.avatarUrl} alt={stream.displayName || stream.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-red-500/20 to-red-900/20 flex items-center justify-center">
                        <Tv className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Title & Channel */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[15px] font-bold leading-tight text-white group-hover:text-red-400 transition-colors line-clamp-2">
                      {stream.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[var(--gr-text-dim)] truncate">
                      {stream.displayName || stream.username}
                    </p>
                  </div>
                </div>

                {/* Game Tag */}
                {stream.gameSlug && (
                  <div className="mt-auto pt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-[var(--gr-text-dim)]">
                      {stream.gameSlug.replace(/-/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            </PremiumCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
