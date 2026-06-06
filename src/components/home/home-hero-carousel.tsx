"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Zap, Gift, Star, ArrowRight, Radio, Play, Eye } from "lucide-react";
import { EditableText } from "@/components/admin/editable-text";

type FreeGame = {
  id: string;
  title: string;
  coverUrl?: string | null;
  rating?: number | null;
};

type LiveStream = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  videoId: string;
  title: string;
  thumbnail: string;
  watchUrl: string;
  viewers: number | null;
  gameSlug: string | null;
};

type Props = {
  cta: {
    description: string;
    buttonLabel: string;
    buttonHref: string;
  };
  freeGames: FreeGame[];
  freeGamesTitle: string;
  liveStreams?: LiveStream[];
};

const AUTO_ADVANCE_MS = 6000;

function formatViewers(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function youtubeThumbnail(videoId: string, quality: "hqdefault" | "mqdefault" | "default") {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

function LiveStreamThumbnail({ stream }: { stream: LiveStream }) {
  const [attempt, setAttempt] = useState(0);
  const candidates = [
    stream.thumbnail,
    youtubeThumbnail(stream.videoId, "hqdefault"),
    youtubeThumbnail(stream.videoId, "mqdefault"),
    youtubeThumbnail(stream.videoId, "default"),
  ].filter((src, index, list): src is string => Boolean(src) && list.indexOf(src) === index);
  const src = candidates[attempt];

  if (!src) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[var(--gr-bg-1)]">
        <Radio className="h-10 w-10 text-[var(--gr-magenta)]/80 drop-shadow-[0_0_18px_rgba(236,72,153,0.65)]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={stream.title}
      draggable={false}
      onError={() => setAttempt((current) => current + 1)}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/stream:scale-105"
    />
  );
}

export function HomeHeroCarousel({ cta, freeGames, freeGamesTitle, liveStreams = [] }: Props) {
  // ── Build the slide list dynamically ──────────────────────────
  const slides: { key: string; content: ReactNode }[] = [];

  // Slide 1 — CTA
  slides.push({
    key: "cta",
    content: (
      <div className="w-full shrink-0 px-7 py-10 sm:px-12 sm:py-14">
        <div className="flex flex-col items-center text-center gap-7">
          <h2 className="font-display text-[26px] leading-[1.18] sm:text-[34px] sm:leading-[1.15] font-black uppercase tracking-tight text-[#D0F8FF] drop-shadow-[0_0_10px_rgba(0,230,255,0.6)]">
            {cta.description}
          </h2>

          <div className="pubg-loadout-link group/btn relative block select-none" data-variant="royale">
            <Link
              href={cta.buttonHref || "/lfg"}
              draggable={false}
              className="pubg-loadout-card relative flex items-center justify-center gap-3 px-12 py-4 overflow-visible transition-all duration-300"
            >
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
              <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-8 w-8 opacity-30 z-0" />
              <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/2 z-0" />
              <span aria-hidden className="gr-sweep absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden group-hover/btn:[&::after]:animate-[gr-sweep_1.2s_ease-out]" />

              <Zap className="h-5 w-5 text-[var(--gr-magenta)] drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] relative z-10 transition-transform duration-500 group-hover/btn:scale-110" />
              <span className="font-display font-black uppercase tracking-widest text-[16px] text-[var(--gr-text)] relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-colors duration-300 group-hover/btn:text-white">
                <EditableText
                  siteKey="home.user.cta"
                  field="buttonLabel"
                  value={cta.buttonLabel || "დაწყება"}
                  as="span"
                  label="ბუტონის წარწერა"
                />
              </span>
            </Link>
          </div>
        </div>
      </div>
    ),
  });

  // Slide 2 — Free PC games
  if (freeGames.length > 0) {
    slides.push({
      key: "free-games",
      content: (
        <div className="w-full shrink-0 px-7 py-8 sm:px-10 sm:py-10">
          <div className="flex items-center justify-between mb-5 border-b border-white/[0.07] pb-3">
            <div className="flex items-center gap-2.5">
              <Gift className="h-6 w-6 text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.6)]" />
              <h2 className="font-display text-[20px] sm:text-[22px] font-black uppercase tracking-tight text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.6)]">
                {freeGamesTitle}
              </h2>
            </div>
            <Link
              href="/free-pc-games"
              draggable={false}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#D0F8FF] drop-shadow-[0_0_6px_rgba(0,230,255,0.4)] transition-all hover:text-white hover:drop-shadow-[0_0_10px_rgba(0,230,255,0.8)]"
            >
              ყველა
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 pubg-card-stage">
            {freeGames.slice(0, 3).map((game, i) => (
              <Link
                key={game.id}
                href={`/free-pc-games/${game.id}`}
                draggable={false}
                className="pubg-loadout-link group/card block"
                data-variant="strike"
                style={{ "--pubg-card-index": i } as React.CSSProperties}
              >
                <div className="pubg-loadout-card !p-0 relative aspect-[3/4] overflow-hidden border border-white/[0.07]">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                  <span aria-hidden className="gr-sweep absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden group-hover/card:[&::after]:animate-[gr-sweep_1.2s_ease-out]" />
                  
                  <div className="relative z-[1] h-full w-full">
                    {game.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={game.coverUrl}
                        alt={game.title}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-luminosity transition-all duration-700 group-hover/card:opacity-100 group-hover/card:scale-105 group-hover/card:mix-blend-normal"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--gr-magenta)]/20 to-[var(--gr-violet-hi)]/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-1)]/40 to-transparent" />
                    {typeof game.rating === "number" && game.rating > 0 && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 border border-[var(--gr-amber)]/25 bg-black/55 px-1.5 py-0.5 text-[9px] font-black text-[var(--gr-amber)]">
                        <Star className="h-2.5 w-2.5 fill-[var(--gr-amber)]" />
                        {game.rating}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <h4 className="font-display text-[12px] sm:text-[13px] font-bold uppercase tracking-tight leading-tight text-[var(--gr-text)] drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] line-clamp-2 transition-colors group-hover/card:text-[var(--gr-magenta)]">
                        {game.title}
                      </h4>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ),
    });
  }

  // Slide 3 — LIVE streams (YouTube auto-detected)
  if (liveStreams.length > 0) {
    const featured = liveStreams[0];
    const others = liveStreams.length - 1;
    const featuredViewers = formatViewers(featured.viewers);
    const streamerName = featured.displayName ?? featured.username;
    slides.push({
      key: "live-streams",
      content: (
        <div className="w-full shrink-0 px-7 py-7 sm:px-10 sm:py-8">
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.07] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full bg-[#00E6FF] opacity-70 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 bg-[#00E6FF] shadow-[0_0_8px_rgba(0,230,255,0.8)]" />
              </span>
              <h2 className="font-display text-[20px] sm:text-[22px] font-black uppercase tracking-tight text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.6)]">
                LIVE სტრიმები
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 border border-[rgba(0,230,255,0.25)] bg-[rgba(0,230,255,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#D0F8FF] drop-shadow-[0_0_6px_rgba(0,230,255,0.4)]">
                <Radio className="h-3 w-3" />
                {liveStreams.length} ეთერში
              </span>
              <Link
                href="/streams"
                draggable={false}
                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#D0F8FF] drop-shadow-[0_0_6px_rgba(0,230,255,0.4)] transition-all hover:text-white hover:drop-shadow-[0_0_10px_rgba(0,230,255,0.8)]"
              >
                ყველა
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Featured live stream */}
          <div className="pubg-loadout-link group/stream block" data-variant="room">
            <a
              href={featured.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              className="pubg-loadout-card !p-0 relative aspect-video overflow-hidden border border-white/[0.07] block"
            >
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
              <span aria-hidden className="gr-sweep absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden group-hover/stream:[&::after]:animate-[gr-sweep_1.2s_ease-out]" />
              
              <div className="relative z-[1] h-full w-full">
                <LiveStreamThumbnail stream={featured} />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-transparent to-[var(--gr-bg-1)]/40" />

                {/* LIVE badge */}
                <div className="absolute top-3 left-3 pointer-events-none">
                  <div className="pubg-loadout-card relative flex items-center gap-1.5 px-3 py-1.5 overflow-hidden">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-100" />
                    <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[2px] z-[5]" />
                    
                    <div className="relative z-[1] flex items-center gap-1.5 font-display text-[10px] font-black uppercase tracking-wider text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.45)]">
                      <span className="h-1.5 w-1.5 bg-[#D0F8FF] shadow-[0_0_8px_rgba(0,230,255,0.8)] animate-pulse" />
                      LIVE
                    </div>
                  </div>
                </div>

                {/* Viewers */}
                {featuredViewers && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/65 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm border border-white/10">
                    <Eye className="h-3 w-3" />
                    {featuredViewers}
                  </span>
                )}

                {/* Play overlay */}
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="pubg-loadout-card relative flex h-14 w-14 items-center justify-center overflow-hidden">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-100" />
                    <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                    <Play className="relative z-[10] h-7 w-7 text-[#D0F8FF] fill-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.45)] translate-x-0.5" />
                  </div>
                </span>

                {/* Streamer + title */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end gap-3 z-10 bg-gradient-to-t from-[var(--gr-bg-0)] to-transparent">
                  {featured.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.avatarUrl}
                      alt={streamerName}
                      draggable={false}
                      className="h-9 w-9 shrink-0 border border-[var(--gr-magenta)]/30 object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--gr-violet-hi)]/30 bg-[var(--gr-violet-hi)]/20 text-sm font-black text-[var(--gr-violet-hi)]">
                      {streamerName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[14px] font-bold uppercase tracking-tight leading-tight text-[#D0F8FF] drop-shadow-[0_0_6px_rgba(0,230,255,0.4)] line-clamp-1 transition-all group-hover/stream:text-white group-hover/stream:drop-shadow-[0_0_10px_rgba(0,230,255,0.8)]">
                      {featured.title}
                    </p>
                    <p className="text-[11px] font-bold text-[var(--gr-text-dim)] uppercase tracking-wider line-clamp-1">
                      {streamerName}
                    </p>
                  </div>
                </div>
              </div>
            </a>
          </div>

          {others > 0 && (
            <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--gr-text-mute)]">
              +{others} სხვა არხი ცოცხალ ეთერშია
            </p>
          )}
        </div>
      ),
    });
  }

  const slideCount = slides.length;

  // ── Carousel state ────────────────────────────────────────────
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const activeIndex = slideCount === 0 ? 0 : Math.min(index, slideCount - 1);

  const goTo = useCallback(
    (next: number) => {
      if (slideCount === 0) return;
      setIndex(((next % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  // Auto-advance
  useEffect(() => {
    if (slideCount < 2 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slideCount);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [slideCount, paused]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (slideCount < 2) return;
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    setDragging(true);
    setPaused(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    dragDelta.current = e.clientX - dragStartX.current;
    setDragOffset(dragDelta.current);
  };

  const endDrag = () => {
    if (dragStartX.current === null) return;
    const delta = dragDelta.current;
    const threshold = 60;
    if (delta > threshold) goTo(activeIndex - 1);
    else if (delta < -threshold) goTo(activeIndex + 1);
    dragStartX.current = null;
    dragDelta.current = 0;
    setDragging(false);
    setDragOffset(0);
    window.setTimeout(() => setPaused(false), 400);
  };

  return (
    <div className="pubg-carousel-wrap w-full max-w-2xl mx-auto">
      <div
        className="pubg-loadout-card relative overflow-hidden !p-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        style={{ touchAction: "pan-y" }}
      >
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-40 pointer-events-none" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[20] pointer-events-none" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-24 w-24 opacity-30 z-[20] pointer-events-none" />
        <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3 z-[20] pointer-events-none mix-blend-overlay" />
        
        {/* Track */}
        <div
          className="relative z-[5] flex items-stretch"
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffset}px))`,
            transition: dragging ? "none" : "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {slides.map((s) => (
            <div key={s.key} className="w-full shrink-0 flex flex-col justify-center">
              {s.content}
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        {slideCount > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((s, i) => (
               <button
                key={s.key}
                type="button"
                aria-label={`სლაიდი ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 transition-all duration-300 ${
                  i === activeIndex
                    ? "w-6 bg-[var(--gr-cyan-glow)] shadow-[0_0_8px_var(--gr-cyan-glow)]"
                    : "w-1.5 bg-white/25 hover:bg-[var(--gr-magenta)]/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
