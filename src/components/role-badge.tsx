"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Shield, Trophy, MonitorPlay, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type UserRole = "admin" | "moderator" | "organizer" | "streamer" | "esports";

const ROLES_KEY = "gameroom_user_roles";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; className: string }> = {
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
};

export function RoleBadge({
  username,
  defaultRole,
}: {
  username: string;
  defaultRole?: UserRole;
}) {
  const [role, setRole] = useState<UserRole | null>(defaultRole ?? null);

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(ROLES_KEY);
        if (!raw) {
          setRole(defaultRole ?? null);
          return;
        }
        const overrides = JSON.parse(raw) as Record<string, string>;
        const r = overrides[username];
        if (r && r in ROLE_CONFIG) {
          setRole(r as UserRole);
        } else {
          setRole(defaultRole ?? null);
        }
      } catch {
        setRole(defaultRole ?? null);
      }
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [username, defaultRole]);

  if (!role || role === ("user" as string)) return null;

  const c = ROLE_CONFIG[role];
  return (
    <Badge variant="outline" className={c.className}>
      {c.icon} {c.label}
    </Badge>
  );
}
