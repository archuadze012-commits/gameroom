import Image from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export const SITE_BRAND_WORDMARK_STYLE: CSSProperties = {
  display: "inline-block",
  backgroundImage:
    "linear-gradient(92deg, rgb(34,211,238) 0%, rgb(196,30,58) 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter:
    "drop-shadow(0 0 5px rgba(196,30,58,0.58)) drop-shadow(0 0 11px rgba(196,30,58,0.36)) drop-shadow(0 0 20px rgba(196,30,58,0.16))",
};

export const SITE_BRAND_GAME_STYLE: CSSProperties = SITE_BRAND_WORDMARK_STYLE;
export const SITE_BRAND_ROOM_STYLE: CSSProperties = SITE_BRAND_WORDMARK_STYLE;
export const SITE_BRAND_ICON_STYLE: CSSProperties = {
  filter:
    "drop-shadow(0 0 8px rgba(196,30,58,0.9)) drop-shadow(0 0 18px rgba(196,30,58,0.55))",
};

type SiteBrandProps = {
  className?: string;
  wordmarkClassName?: string;
  imageClassName?: string;
  iconSize?: number;
  showIcon?: boolean;
};

export function SiteBrand({
  className,
  wordmarkClassName,
  imageClassName,
  iconSize = 48,
  showIcon = true,
}: SiteBrandProps) {
  return (
    <span className={cn("flex items-center gap-3.5 group cursor-pointer", className)}>
      {showIcon ? (
        <div className="relative">
          <div className="absolute -inset-1 rounded-xl bg-[linear-gradient(90deg,#22d3ee,#f43f5e)] opacity-30 blur-md transition-all duration-500 group-hover:opacity-70 group-hover:blur-lg" />
          <Image
            src="/logo.png"
            alt="Gameroom"
            width={iconSize}
            height={iconSize}
            className={cn("relative z-10 transition-transform duration-500 group-hover:scale-[1.04]", imageClassName)}
          />
        </div>
      ) : null}
      
      <span
        className={cn(
          "font-display text-[28px] font-black tracking-[0.12em] flex items-center transition-transform duration-500 group-hover:scale-[1.03]",
          wordmarkClassName,
        )}
      >
        <span className="relative inline-block">
          {/* Cybernetic Glow Layer */}
          <span aria-hidden className="absolute inset-0 blur-[8px] opacity-80 bg-gradient-to-br from-[#22d3ee] to-[#0ea5e9] bg-clip-text text-transparent select-none mix-blend-screen">
            GAME
          </span>
          {/* Metallic Top Layer */}
          <span className="relative bg-gradient-to-b from-white via-[#67e8f9] to-[#0891b2] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            GAME
          </span>
        </span>
        
        <span className="relative inline-block ml-1">
          {/* Cybernetic Glow Layer */}
          <span aria-hidden className="absolute inset-0 blur-[8px] opacity-80 bg-gradient-to-br from-[#f43f5e] to-[#be123c] bg-clip-text text-transparent select-none mix-blend-screen">
            ROOM
          </span>
          {/* Metallic Top Layer */}
          <span className="relative bg-gradient-to-b from-white via-[#fda4af] to-[#c41e3a] bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            ROOM
          </span>
        </span>
      </span>
    </span>
  );
}
