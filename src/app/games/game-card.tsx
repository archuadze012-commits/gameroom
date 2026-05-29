"use client";

const COL = "rgba(236,72,153,0.55)";
const COL_HOVER = "rgba(236,72,153,0.85)";
const clip = (n: number) => `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, 0 100%)`;
const CUT = clip(28);

export function GameCard({ children }: { children: React.ReactNode }) {
  return (
    <article
      className="group relative isolate"
      style={{ clipPath: CUT, background: COL, padding: 1 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COL_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = COL)}
    >
      {/* top glow line */}
      <span
        aria-hidden
        className="absolute left-0 top-0 z-10 h-[2px] w-full"
        style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)" }}
      />
      {/* inner radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.09) 0%,transparent 65%)" }}
      />
      {/* white laser on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20 h-[2px] w-full translate-x-[-100%] opacity-0
                   group-hover:translate-x-[100%] group-hover:opacity-100
                   group-hover:transition-transform group-hover:duration-700"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)" }}
      />
      {/* magenta overlay on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-fuchsia-600/0 duration-0 group-hover:bg-fuchsia-600/[0.07]"
      />
      <div className="relative bg-[var(--gr-bg-1)]" style={{ clipPath: CUT }}>
        {children}
      </div>
    </article>
  );
}
