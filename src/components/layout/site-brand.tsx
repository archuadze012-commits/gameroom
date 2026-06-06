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
          <div className="absolute -inset-2 rounded-xl bg-neon-animated opacity-30 blur-[10px] transition-all duration-500 group-hover:opacity-80 group-hover:blur-[14px]" />
          <Image
            src="/logo.png"
            alt="Gameroom"
            width={iconSize}
            height={iconSize}
            className={cn("relative z-10 transition-transform duration-500 group-hover:scale-[1.08] drop-shadow-[0_0_12px_rgba(0,68,255,0.4)]", imageClassName)}
          />
        </div>
      ) : null}
      
      <span
        className={cn(
          "font-display text-[28px] font-black tracking-[0.12em] flex items-center transition-transform duration-500 group-hover:scale-[1.03]",
          wordmarkClassName,
        )}
      >
        <span className="text-neon-animated drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-1">
          GAMEROOM
        </span>
      </span>
    </span>
  );
}
