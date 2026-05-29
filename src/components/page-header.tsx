import { cn } from "@/lib/utils";
import { DisplayHeading } from "@/components/ui/display-heading";

const neonText = { color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.55), 0 0 36px rgba(236,72,153,0.3)" } as const;
const neonMute = { color: "rgba(255,255,255,0.75)", textShadow: "0 0 6px rgba(236,72,153,0.75), 0 0 16px rgba(236,72,153,0.4)" } as const;
const neonEyebrow = { color: "rgba(236,72,153,1)", textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.7)" } as const;

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
        "relative flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between",
        "after:absolute after:bottom-0 after:left-0 after:h-px after:w-full",
        "after:bg-gradient-to-r after:from-[rgba(236,72,153,0.5)] after:via-[rgba(236,72,153,0.15)] after:to-transparent",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={neonEyebrow}>
            {eyebrow}
          </p>
        )}
        <DisplayHeading as="h1" size="lg" style={neonText}>
          {title}
        </DisplayHeading>
        {description && (
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={neonMute}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
