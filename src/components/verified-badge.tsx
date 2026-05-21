import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      className={`inline h-4 w-4 fill-sky-500 text-background ${className ?? ""}`}
      aria-label="verified"
    />
  );
}
