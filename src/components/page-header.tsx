import { cn } from "@/lib/utils";
import { DisplayHeading } from "@/components/ui/display-heading";

type ColorKey = "violet" | "cyan" | "red" | "pink" | "indigo";

const themeClasses = {
  violet: {
    eyebrow: "border-violet-500/40 bg-violet-500/10 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]",
    heading: "from-white via-violet-200 to-violet-500 drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]",
    glowBase: "from-violet-500/10",
    glowLine: "from-violet-600/60 via-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.6)]",
  },
  cyan: {
    eyebrow: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]",
    heading: "from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]",
    glowBase: "from-cyan-500/10",
    glowLine: "from-cyan-600/60 via-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.6)]",
  },
  red: {
    eyebrow: "border-red-500/40 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]",
    heading: "from-white via-red-200 to-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]",
    glowBase: "from-red-500/10",
    glowLine: "from-red-600/60 via-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.6)]",
  },
  pink: {
    eyebrow: "border-pink-500/40 bg-pink-500/10 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)]",
    heading: "from-white via-pink-200 to-pink-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.5)]",
    glowBase: "from-pink-500/10",
    glowLine: "from-pink-600/60 via-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.6)]",
  },
  indigo: {
    eyebrow: "border-indigo-500/40 bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]",
    heading: "from-white via-indigo-200 to-indigo-500 drop-shadow-[0_0_25px_rgba(99,102,241,0.5)]",
    glowBase: "from-indigo-500/10",
    glowLine: "from-indigo-600/60 via-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.6)]",
  },
};

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
  color = "violet",
}: {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
  color?: ColorKey;
}) {
  const t = themeClasses[color];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between border-b border-white/5",
        className
      )}
    >
      <div className="min-w-0 relative z-10">
        {eyebrow && (
          <div className="mb-4">
            <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] backdrop-blur-md", t.eyebrow)}>
              {eyebrow}
            </span>
          </div>
        )}
        <DisplayHeading as="h1" size="lg" className={cn("bg-clip-text text-transparent bg-gradient-to-br", t.heading)}>
          {title}
        </DisplayHeading>
        {description && (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75 font-medium">
            {description}
          </p>
        )}
      </div>
      
      {/* Background ambient glow */}
      <div className={cn("absolute left-0 bottom-0 h-[100px] w-full bg-gradient-to-t to-transparent pointer-events-none", t.glowBase)} />
      <div className={cn("absolute left-0 bottom-[-1px] h-px w-full bg-gradient-to-r to-transparent pointer-events-none", t.glowLine)} />

      {actions && <div className="flex flex-wrap items-center gap-3 relative z-10">{actions}</div>}
    </div>
  );
}
