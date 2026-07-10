"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteBrand } from "./site-brand";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <footer className="relative mt-20 bg-[#05040b] backdrop-blur-3xl border-t border-white/5 py-8">
      {/* faint violet glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(139,92,246,0.4)] to-transparent opacity-80 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
      />

      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* left: Brand & Description */}
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <Link href="/" className="inline-flex transition-transform hover:scale-105">
            <SiteBrand iconSize={28} className="gap-2" wordmarkClassName="text-[16px]" />
          </Link>
          <span className="hidden md:inline text-white/20">|</span>
          <p className="text-[12px] text-white/50">
            ქართველი გეიმერების სათემო პლატფორმა
          </p>
        </div>

        {/* right: Minimal Navigation Links & Copyright */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] font-medium text-white/60">
            {[
              { href: "/articles", label: "სტატიები" },
              { href: "/games", label: "თამაშები" },
              { href: "/lfg", label: "ლოკალი" },
              { href: "/tournaments", label: "ჩემპიონატები" },
              { href: "/rules", label: "წესები" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-white hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
            <span>© {new Date().getFullYear()} PLAYGAME.GE</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">გაკეთებულია <span className="text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">❤️</span>-ით საქართველოში</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
