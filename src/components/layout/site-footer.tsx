"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteBrand } from "./site-brand";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <footer className="relative mt-20 bg-[rgba(5,4,11,0.6)] backdrop-blur-3xl border-t border-white/5">
      {/* faint violet glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(139,92,246,0.6)] to-transparent opacity-80 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
      />

      <div className="container relative mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        {/* brand */}
        <div className="md:col-span-2 space-y-4">
          <Link href="/" className="inline-flex transition-transform hover:scale-105">
            <SiteBrand iconSize={36} className="gap-2.5" wordmarkClassName="text-[20px]" />
          </Link>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/60">
            ქართველი გეიმერების სათემო პლატფორმა — გუნდის პოვნა, ფორუმი, ჩემპიონატები, კომუნიტი.
          </p>
        </div>

        {/* navigate */}
        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">გვერდები</p>
          <ul className="space-y-2 text-[13px] font-medium">
            {[
              { href: "/articles", label: "სტატიები" },
              { href: "/games", label: "თამაშები" },
              { href: "/lfg", label: "ლოკალი" },
              { href: "/tournaments", label: "ჩემპიონატები" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-white/70 transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* social */}
        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">საზოგადოება</p>
          <ul className="space-y-2 text-[13px] font-medium">
            {[
              { href: "/announcements", label: "უწყებები" },
              { href: "/leaderboard", label: "Leaderboard" },
              { href: "/rules", label: "წესები" },
              { href: "/settings", label: "პარამეტრები" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-white/70 transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.04]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 md:flex-row">
          <span>© {new Date().getFullYear()} Gameroom</span>
          <span className="flex items-center gap-1">გაკეთებულია <span className="text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">❤️</span>-ით საქართველოში</span>
        </div>
      </div>
    </footer>
  );
}
