"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Pill } from "@/components/ui/pill";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.55))";

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, ref };
}

interface GameCardProps {
  slug: string;
  nameKa: string;
  players: number;
  online: number;
  coverUrl?: string;
  accent: string;
}

export function GameCard({ slug, nameKa, players, online, coverUrl, accent }: GameCardProps) {
  const { count: onlineCount, ref: counterRef } = useCountUp(online);

  return (
    <Link href={`/games/${slug}`} className="block">
      <div
        className="relative isolate"
        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
      >
        <div
          className="relative h-56 overflow-hidden bg-[var(--gr-bg-1)]"
          style={{ clipPath: cutSm }}
        >
          <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={nameKa}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)]/85 via-[var(--gr-bg-0)]/25 to-transparent" />

          <div ref={counterRef} className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[var(--gr-text)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                  {nameKa}
                </h3>
                <p className="text-xs text-[var(--gr-text)]/65">{players.toLocaleString("en-US")} მოთამაშე</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Pill tone="violet" className="tabular-nums">{players.toLocaleString("en-US")}</Pill>
                <Pill tone="online" pulse className="tabular-nums">{onlineCount.toLocaleString("en-US")}</Pill>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
