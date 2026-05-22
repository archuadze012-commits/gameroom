"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Eyebrow } from "@/components/ui/eyebrow";

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
            />
            <span className="font-display text-[20px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
              Game<span className="text-[var(--gr-violet)]">room</span>
            </span>
          </Link>
          <p className="max-w-sm text-[13px] leading-relaxed text-[var(--gr-text-mute)]">
            ქართველი გეიმერების სათემო პლატფორმა — გუნდის პოვნა, ფორუმი, ჩემპიონატები, კომუნიტი.
          </p>
        </div>

        {/* navigate */}
        <div className="space-y-3">
          <Eyebrow tone="violet">გვერდები</Eyebrow>
          <ul className="space-y-1.5 text-[13px] text-[var(--gr-text-mute)]">
            <li><Link href="/forum" className="hover:text-[var(--gr-violet-hi)]">ფორუმი</Link></li>
            <li><Link href="/games" className="hover:text-[var(--gr-violet-hi)]">თამაშები</Link></li>
            <li><Link href="/lfg" className="hover:text-[var(--gr-violet-hi)]">LFG</Link></li>
            <li><Link href="/tournaments" className="hover:text-[var(--gr-violet-hi)]">ჩემპიონატები</Link></li>
          </ul>
        </div>

        {/* social */}
        <div className="space-y-3">
          <Eyebrow tone="amber">საზოგადოება</Eyebrow>
          <ul className="space-y-1.5 text-[13px] text-[var(--gr-text-mute)]">
            <li><Link href="/announcements" className="hover:text-[var(--gr-violet-hi)]">უწყებები</Link></li>
            <li><Link href="/leaderboard" className="hover:text-[var(--gr-violet-hi)]">Leaderboard</Link></li>
            <li><Link href="/rules" className="hover:text-[var(--gr-violet-hi)]">წესები</Link></li>
            <li><Link href="/settings" className="hover:text-[var(--gr-violet-hi)]">პარამეტრები</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--gr-border)]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] uppercase tracking-[0.16em] text-[var(--gr-text-dim)] md:flex-row">
          <span>© {new Date().getFullYear()} Gameroom</span>
          <span>გაკეთებულია ❤️-ით საქართველოში</span>
        </div>
      </div>
    </footer>
  );
}
