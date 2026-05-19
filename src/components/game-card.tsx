"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { count: onlineCount, ref: counterRef } = useCountUp(online);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const img = imgRef.current;
    if (!card || !img) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    img.style.transform = `scale(1.1) translate(${x * 14}px, ${y * 10}px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = "scale(1) translate(0px, 0px)";
  }, []);

  return (
    <Link href={`/games/${slug}`} className="group">
      <Card
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-56 overflow-hidden border-border/60 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
      >
        {coverUrl ? (
          <img
            ref={imgRef}
            src={coverUrl}
            alt={nameKa}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out"
            style={{ willChange: "transform" }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
        )}

        {/* base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* hover: primary tint from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />

        <div ref={counterRef} className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-lg font-bold text-white transition-colors duration-200 group-hover:text-primary">
                {nameKa}
              </h3>
              <p className="text-xs text-white/60">{players.toLocaleString()} მოთამაშე</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs tabular-nums">
                {players.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/40 tabular-nums">
                🟢 {onlineCount.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
