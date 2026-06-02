import { cn } from "@/lib/utils";
import { DisplayHeading } from "@/components/ui/display-heading";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between border-b border-white/10",
        className
      )}
    >
      <div className="min-w-0 relative z-10">
        {eyebrow && (
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]">
            {eyebrow}
          </p>
        )}
        <DisplayHeading as="h1" size="lg" className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          {title}
        </DisplayHeading>
        {description && (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
            {description}
          </p>
        )}
      </div>
      
      {/* Background ambient glow */}
      <div className="absolute left-0 bottom-0 h-[100px] w-full bg-gradient-to-t from-pink-500/5 to-transparent pointer-events-none" />
      <div className="absolute left-0 bottom-[-1px] h-px w-full bg-gradient-to-r from-pink-500/50 via-violet-500/20 to-transparent pointer-events-none shadow-[0_0_15px_rgba(236,72,153,0.5)]" />

      {actions && <div className="flex flex-wrap items-center gap-2 relative z-10">{actions}</div>}
    </div>
  );
}
