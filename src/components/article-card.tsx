"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { ArrowUpRight, Clock } from "lucide-react";

const COL = "rgba(236,72,153,0.35)";
const COL_HOVER = "rgba(236,72,153,0.85)";
const TITLE_SHADOW = "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.5), 0 0 35px rgba(236,72,153,0.3)";
const TITLE_SHADOW_HOVER = "0 0 10px rgba(236,72,153,1), 0 0 24px rgba(236,72,153,0.85), 0 0 44px rgba(236,72,153,0.55), 0 0 70px rgba(236,72,153,0.3)";
const clip = "polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%)";

export type ArticleCardData = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  game_slug: string | null;
  game_name: string | null;
  author_username: string;
  published_at: string;
};

export function ArticleCard({ a }: { a: ArticleCardData }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="group relative isolate h-full"
      style={{ clipPath: clip, background: hovered ? COL_HOVER : COL, padding: 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* corner accent — sharp magenta triangle in cut corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-20 h-[26px] w-[26px]"
        style={{
          background: "linear-gradient(225deg, rgba(236,72,153,0.95) 0%, rgba(236,72,153,0.95) 50%, transparent 50%)",
        }}
      />

      <Link
        href={`/articles/${encodeURIComponent(a.slug)}`}
        className="relative flex h-full flex-col bg-[var(--gr-bg-1)]"
        style={{ clipPath: clip }}
      >
        {/* COVER — full image, no top wash, dark gradient only at bottom for readability */}
        <div className="relative h-56 overflow-hidden bg-gradient-to-br from-[var(--gr-bg-2)] to-[var(--gr-bg-0)]">
          {a.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.cover_url}
              alt={a.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <span className="font-display text-[60px] font-black uppercase text-[var(--gr-magenta)]/15 select-none">
                {a.title.slice(0, 1)}
              </span>
            </div>
          )}

          {/* bottom dark band only — much sharper than before */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(8,6,15,0.95) 0%, rgba(8,6,15,0.6) 50%, transparent 100%)",
            }}
          />

          {/* magenta accent strip on hover, scans across cover */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 bottom-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
            style={{
              background:
                "linear-gradient(90deg, rgba(236,72,153,1), rgba(236,72,153,0.4), transparent)",
              boxShadow: "0 0 12px rgba(236,72,153,0.6)",
            }}
          />

          {/* game tag — angular, top-left */}
          {a.game_name && (
            <div className="absolute left-0 top-4 z-10">
              <span
                className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                style={{
                  background: "rgba(236,72,153,0.9)",
                  clipPath: "polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
                  paddingRight: "1rem",
                }}
              >
                {a.game_name}
              </span>
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="relative flex flex-1 flex-col gap-3 p-5">
          {/* tiny magenta divider above title */}
          <span
            aria-hidden
            className="absolute left-5 top-0 h-px w-8 bg-[rgba(236,72,153,0.6)]"
          />

          <h3
            className="line-clamp-2 font-display text-[17px] font-extrabold leading-[1.25] tracking-tight transition-all duration-150"
            style={{
              color: "#ffffff",
              textShadow: hovered ? TITLE_SHADOW_HOVER : TITLE_SHADOW,
            }}
          >
            {a.title}
          </h3>

          {a.excerpt && (
            <p
              className="line-clamp-2 text-[13px] leading-relaxed"
              style={{
                color: "#ffffff",
                textShadow: "0 0 6px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.5), 0 0 28px rgba(236,72,153,0.25)",
              }}
            >
              {a.excerpt}
            </p>
          )}

          {/* footer — author + date + read more arrow */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-[var(--gr-border)]/60">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em]">
              <span className="font-semibold text-[var(--gr-text-mute)]">@{a.author_username}</span>
              <span className="text-[var(--gr-text-dim)]">·</span>
              <span className="flex items-center gap-1 text-[var(--gr-text-dim)]">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(a.published_at), { addSuffix: true, locale: ka })}
              </span>
            </div>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:rotate-45"
              style={{
                background: "rgba(236,72,153,0.12)",
                color: "rgba(236,72,153,1)",
              }}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
