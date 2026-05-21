import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "violet" | "amber";

const grad: Record<Tone, string> = {
  violet: "bg-[var(--gr-grad-violet)]",
  amber:  "bg-[var(--gr-grad-amber)]",
};

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function GradientText({ tone = "amber", className, children, ...rest }: Props) {
  return (
    <span
      {...rest}
      className={cn("bg-clip-text text-transparent", grad[tone], className)}
    >
      {children}
    </span>
  );
}
