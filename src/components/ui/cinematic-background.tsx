import { cn } from "@/lib/utils";

export function CinematicBackground({
  color = "violet",
  className,
}: {
  color?: "violet" | "cyan" | "red" | "pink" | "indigo";
  className?: string;
}) {
  const gradients = {
    violet: "bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_70%)]",
    cyan: "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.15),transparent_70%)]",
    red: "bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.08),transparent_50%)]",
    pink: "bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_70%)]",
    indigo: "bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]",
  };

  return (
    <div 
      aria-hidden 
      className={cn(
        "pointer-events-none absolute inset-0", 
        gradients[color],
        className
      )} 
    />
  );
}
