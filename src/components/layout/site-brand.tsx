import Image from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export const SITE_BRAND_WORDMARK_CLASSNAME = "site-title-wordmark";
export const SITE_BRAND_ICON_STYLE: CSSProperties = {};

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
          <Image
            src="/playgame-logo.png"
            alt="PLAYGAME.GE"
            width={iconSize}
            height={iconSize}
            style={SITE_BRAND_ICON_STYLE}
            className={cn("relative z-10 object-contain site-brand-icon", imageClassName)}
          />
        </div>
      ) : null}
      
      <span
        className={cn(
          "text-[28px] font-black tracking-[0.12em] flex items-center transition-transform duration-500 group-hover:scale-[1.03]",
          wordmarkClassName,
        )}
      >
        <span className={cn(SITE_BRAND_WORDMARK_CLASSNAME, "px-1")}>
          PLAYGAME.GE
        </span>
      </span>
    </span>
  );
}
