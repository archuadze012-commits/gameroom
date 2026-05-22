import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
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
  /** Optional uppercase eyebrow label above the title. */
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between",
        // soft violet underline so headers feel anchored
        "after:absolute after:bottom-0 after:left-0 after:h-px after:w-full",
        "after:bg-gradient-to-r after:from-[var(--gr-violet)]/40 after:via-[var(--gr-violet)]/10 after:to-transparent",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <Eyebrow tone="amber" className="mb-3">{eyebrow}</Eyebrow>}
        <DisplayHeading as="h1" size="lg">
          {title}
        </DisplayHeading>
        {description && (
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
