import Link from "next/link";
import { SiteBrand } from "./site-brand";

export function SiteHeader() {
  return (
    <header className="gr-site-header-root sticky top-0 z-40 border-b border-white/5 bg-[rgba(8,6,15,0.6)] backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.6),rgba(236,72,153,0.7),rgba(34,211,238,0.5),transparent)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-3 h-3 bg-gradient-to-b from-[rgba(236,72,153,0.15)] to-transparent blur-sm"
      />
      <div className="gr-site-header-shell container mx-auto flex h-16 items-center justify-center px-4">
        <Link href="/" className="inline-flex -translate-x-[34px]">
          <SiteBrand iconSize={56} wordmarkClassName="text-[28px]" />
        </Link>
      </div>
    </header>
  );
}
