"use client";

import Link from "next/link";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.34v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.12z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function GoogleSignInButton({
  className,
  nextPath,
}: {
  className?: string;
  nextPath?: string;
}) {
  const cutClipSm = "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)";
  const href = `/auth/google${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  return (
    <div
      className="group relative isolate w-full transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
      style={{ background: 'var(--card-border-hover, transparent)', padding: 1, clipPath: cutClipSm }}
    >
      <Link
        href={href}
        className={`relative isolate flex w-full items-center justify-center overflow-hidden px-8 py-4 text-center transition-all duration-300 active:scale-95 ${className ?? ""}`}
        style={{ clipPath: cutClipSm }}
      >
        {/* ── BACKGROUND & EFFECTS ────────────────────── */}
        <div className="absolute inset-0 bg-gr-magenta opacity-[0.04] transition-opacity group-hover:opacity-[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Top Laser Line */}
      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700" />

      {/* ── CONTENT ────────────────────────────────── */}
      <div className="relative flex items-center justify-center gap-3">
        <div className="relative">
          {/* Icon Glow */}
          <div className="absolute inset-0 blur-md bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <GoogleIcon className="relative h-5 w-5" />
        </div>
        
        <span className="font-display text-[15px] font-bold uppercase tracking-[0.12em] text-white group-hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          Google-ით შესვლა
        </span>
      </div>

      {/* Decorative Corner Tab */}
      <div 
        className="absolute bottom-0 right-0 h-2 w-2 bg-white/30" 
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
    </Link>
    </div>
  );
}
