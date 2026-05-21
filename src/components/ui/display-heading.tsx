import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3";
  /** "display" = huge hero, "lg" = section H2, "md" = card title. */
  size?: "display" | "lg" | "md";
  uppercase?: boolean;
};

const sizeClasses = {
  display: "text-[44px] sm:text-[56px] lg:text-[72px] leading-[0.95] tracking-[-0.02em]",
  lg:      "text-[26px] sm:text-[34px] lg:text-[44px] leading-[1.02] tracking-[-0.015em]",
  md:      "text-[18px] sm:text-[20px] leading-[1.15] tracking-[-0.01em]",
} as const;

export function DisplayHeading({
  as = "h2",
  size = "lg",
  uppercase = true,
  className,
  children,
  ...rest
}: Props) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      className={cn(
        "font-display font-extrabold text-[var(--gr-text)]",
        sizeClasses[size],
        uppercase && "uppercase",
        className
      )}
    >
      {children}
    </Tag>
  );
}
