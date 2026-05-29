"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <footer className="relative mt-20 border-t border-[var(--gr-border)] bg-[var(--gr-bg-1)]">
      {/* angled cut top edge bleeding down from the page */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-px left-0 right-0 h-12 bg-[var(--gr-bg-0)]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 100%)" }}
      />
      {/* faint violet glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gr-violet)] to-transparent opacity-60"
      />

      <div className="container relative mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        {/* brand */}
        <div className="md:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Gameroom"
              width={36}
              height={36}
              className="rounded-lg"
              style={{ filter: "drop-shadow(0 0 7px rgba(236,72,153,0.85)) drop-shadow(0 0 16px rgba(236,72,153,0.5))" }}
            />
            <span className="font-display text-[20px] font-extrabold uppercase tracking-tight">
              <span style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.5)" }}>Game</span>
              <span style={{ color: "rgba(236,72,153,1)", textShadow: "0 0 10px rgba(236,72,153,1), 0 0 22px rgba(236,72,153,0.8), 0 0 40px rgba(236,72,153,0.5)" }}>room</span>
            </span>
          </Link>
          <p className="max-w-sm text-[13px] leading-relaxed" style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45), 0 0 28px rgba(236,72,153,0.25)" }}>
            ქართველი გეიმერების სათემო პლატფორმა — გუნდის პოვნა, ფორუმი, ჩემპიონატები, კომუნიტი.
          </p>
        </div>

        {/* navigate */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(236,72,153,1)", textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.7)" }}>გვერდები</p>
          <ul className="space-y-1.5 text-[13px]">
            {[
              { href: "/articles", label: "სტატიები" },
              { href: "/games", label: "თამაშები" },
              { href: "/lfg", label: "ლოკალი" },
              { href: "/tournaments", label: "ჩემპიონატები" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45)" }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* social */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(236,72,153,1)", textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.7)" }}>საზოგადოება</p>
          <ul className="space-y-1.5 text-[13px]">
            {[
              { href: "/announcements", label: "უწყებები" },
              { href: "/leaderboard", label: "Leaderboard" },
              { href: "/rules", label: "წესები" },
              { href: "/settings", label: "პარამეტრები" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45)" }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--gr-border)]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] uppercase tracking-[0.16em] md:flex-row" style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.7), 0 0 14px rgba(236,72,153,0.4)" }}>
          <span>© {new Date().getFullYear()} Gameroom</span>
          <span>გაკეთებულია ❤️-ით საქართველოში</span>
        </div>
      </div>
    </footer>
  );
}
