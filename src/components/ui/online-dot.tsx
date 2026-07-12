import { cn } from "@/lib/utils";
import { isOnline } from "@/lib/presence";

// Small presence indicator. By default renders nothing when the user is offline
// (so it can sit on any avatar corner); pass showOffline to render a muted dot.
// Position it with the wrapping element (usually `absolute -bottom-0.5 -right-0.5`).
export function OnlineDot({
  lastSeenAt,
  showOffline = false,
  size = 10,
  className,
}: {
  lastSeenAt: string | null | undefined;
  showOffline?: boolean;
  size?: number;
  className?: string;
}) {
  const online = isOnline(lastSeenAt);
  if (!online && !showOffline) return null;

  return (
    <span
      title={online ? "ონლაინ" : "ოფლაინ"}
      className={cn("relative inline-grid place-items-center rounded-full ring-2 ring-[var(--gr-bg-1)]", className)}
      style={{ width: size, height: size }}
    >
      {online && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[var(--gr-lime)] opacity-60 motion-safe:animate-ping"
        />
      )}
      <span
        className={cn(
          "relative rounded-full",
          online ? "bg-[var(--gr-lime)] shadow-[0_0_8px_var(--gr-lime)]" : "bg-white/25"
        )}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
