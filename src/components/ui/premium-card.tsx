import { cn } from "@/lib/utils";

export function PremiumCard({
  children,
  className,
  glowVariant = "default",
  noHover = false,
  as: Component = "div",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  glowVariant?: "default" | "tight";
  noHover?: boolean;
  as?: any;
} & React.HTMLAttributes<HTMLDivElement>) {
  
  const glowClass = glowVariant === "tight" ? "premium-card-glow-tight" : "premium-card-glow";
  const hasHeightClass = className ? /\bh-\w+/.test(className) : false;
  const heightClass = hasHeightClass ? "" : "h-full";

  return (
    <Component className={cn("group relative block rounded-[24px]", heightClass, !noHover && "transition-all duration-500")} {...props}>
      <div 
        className={cn(
          "relative z-10 w-full rounded-[24px] bg-[#0a0714]/5 border border-white/5 transition-all duration-500 group-hover:bg-[#0a0714]/10",
          heightClass,
          glowClass,
          className
        )}
      >
        {children}
      </div>
    </Component>
  );
}
