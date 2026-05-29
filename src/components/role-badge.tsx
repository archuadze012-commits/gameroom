import { ShieldCheck, Shield, Trophy, MonitorPlay, Gamepad2, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/types";

export type { UserRole };

const ROLE_CONFIG: Record<
  Exclude<UserRole, "user">,
  { label: string; icon: React.ReactNode; className: string }
> = {
  admin: {
    label: "ადმინი",
    icon: <ShieldCheck className="mr-1 h-3.5 w-3.5" />,
    className: "border-rose-500/40 bg-rose-500/10 text-rose-400",
  },
  moderator: {
    label: "მოდერატორი",
    icon: <Shield className="mr-1 h-3.5 w-3.5" />,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  organizer: {
    label: "ორგანიზატორი",
    icon: <Trophy className="mr-1 h-3.5 w-3.5" />,
    className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  },
  streamer: {
    label: "სტრიმერი",
    icon: <MonitorPlay className="mr-1 h-3.5 w-3.5" />,
    className: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  },
  esports: {
    label: "კიბერსპორტსმენი",
    icon: <Gamepad2 className="mr-1 h-3.5 w-3.5" />,
    className: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  },
  journalist: {
    label: "ჟურნალისტი",
    icon: <PenLine className="mr-1 h-3.5 w-3.5" />,
    className: "border-pink-500/40 bg-pink-500/10 text-pink-400",
  },
};

export function RoleBadge({
  defaultRole,
}: {
  username?: string;
  defaultRole?: UserRole;
}) {
  if (!defaultRole || defaultRole === "user") return null;
  const c = ROLE_CONFIG[defaultRole];
  return (
    <Badge variant="outline" className={c.className}>
      {c.icon} {c.label}
    </Badge>
  );
}
