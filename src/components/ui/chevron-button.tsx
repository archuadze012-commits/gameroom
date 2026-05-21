import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "violet" | "amber" | "ghost";

const variantClasses: Record<Variant, string> = {
  violet:
    "text-white bg-[var(--gr-grad-violet)] shadow-[0_8px_24px_-8px_rgba(139,92,246,0.7)] hover:shadow-[var(--gr-glow-violet)]",
  amber:
    "text-[#1a0e00] bg-[var(--gr-grad-amber)] shadow-[0_8px_24px_-8px_rgba(245,165,36,0.6)] hover:shadow-[var(--gr-glow-amber)]",
  ghost:
    "text-[var(--gr-text)] bg-transparent border border-[var(--gr-border-hi)] hover:bg-white/[0.04] hover:border-[var(--gr-violet-hi)]",
};

type CommonProps = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  uppercase?: boolean;
  /** Override notch size in px. */
  notch?: number;
};

const sizeClasses = {
  sm: "h-9 px-4 text-[12px] tracking-[0.12em]",
  md: "h-11 px-5 text-[13px] tracking-[0.14em]",
  lg: "h-12 px-6 text-[14px] tracking-[0.14em]",
} as const;

function inner(content: React.ReactNode, notch: number) {
  return (
    <>
      <span className="relative z-10 inline-flex items-center gap-2">
        {content}
        <ChevronRight className="h-4 w-4" />
      </span>
      {/* hover sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
        style={{ clipPath: `polygon(0 0, calc(100% - ${notch}px) 0, 100% ${notch}px, 100% 100%, 0 100%)` }}
      />
    </>
  );
}

function baseClasses(variant: Variant, size: keyof typeof sizeClasses, uppercase: boolean, className?: string) {
  return cn(
    "group relative inline-flex items-center justify-center font-semibold whitespace-nowrap",
    "transition-all duration-200 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-violet-hi)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gr-bg-0)]",
    uppercase && "uppercase",
    sizeClasses[size],
    variantClasses[variant],
    className
  );
}

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  prefetch?: boolean;
};

export function ChevronButton(props: ButtonProps | LinkProps) {
  const { variant = "violet", size = "md", uppercase = true, notch = 12, className, children } = props as CommonProps;
  const clip = `polygon(0 0, calc(100% - ${notch}px) 0, 100% ${notch}px, 100% 100%, 0 100%)`;

  if ("href" in props && props.href) {
    const { href, target, rel, prefetch } = props as LinkProps;
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        prefetch={prefetch}
        className={baseClasses(variant, size, uppercase, className)}
        style={{ clipPath: clip }}
      >
        {inner(children, notch)}
      </Link>
    );
  }

  const { variant: _v, size: _s, uppercase: _u, notch: _n, className: _c, children: _ch, ...rest } = props as ButtonProps;
  void _v; void _s; void _u; void _n; void _c; void _ch;
  return (
    <button
      type="button"
      {...rest}
      className={baseClasses(variant, size, uppercase, className)}
      style={{ clipPath: clip }}
    >
      {inner(children, notch)}
    </button>
  );
}
