"use client";

import { useState, useEffect } from "react";
import { Ban, ShieldCheck, Shield, MonitorPlay, Trophy, Gamepad2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";

type Role = "user" | "moderator" | "organizer" | "streamer" | "esports" | "admin";

type MockUserRow = {
  username: string;
  email: string;
  role: Role;
  joined: string;
  banned: boolean;
};

const INITIAL_USERS: MockUserRow[] = [
  { username: "leonsio12", email: "archuadze012@gmail.com", role: "admin", joined: "2026-01-01", banned: false },
  { username: "GeoSniper", email: "geosniper@example.com", role: "streamer", joined: "2026-04-12", banned: false },
  { username: "Lasha10", email: "lasha10@example.com", role: "organizer", joined: "2026-04-19", banned: false },
  { username: "Sage_Tbilisi", email: "sage@example.com", role: "moderator", joined: "2026-03-30", banned: false },
  { username: "ToxicPlayer42", email: "tox@example.com", role: "user", joined: "2026-05-01", banned: true },
  { username: "El_Pippo", email: "elpippo@example.com", role: "user", joined: "2026-05-10", banned: false },
];

const ROLE_CONFIG: Record<Role, { label: string; className: string; icon: React.ReactNode }> = {
  admin: {
    label: "ადმინი",
    className: "border-rose-500/40 text-rose-400",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  moderator: {
    label: "მოდერატორი",
    className: "border-amber-500/40 text-amber-400",
    icon: <Shield className="h-3 w-3" />,
  },
  organizer: {
    label: "ორგანიზატორი",
    className: "border-yellow-500/40 text-yellow-400",
    icon: <Trophy className="h-3 w-3" />,
  },
  esports: {
    label: "კიბერსპორტსმენი",
    className: "border-cyan-500/40 text-cyan-400",
    icon: <Gamepad2 className="h-3 w-3" />,
  },
  streamer: {
    label: "სტრიმერი",
    className: "border-violet-500/40 text-violet-400",
    icon: <MonitorPlay className="h-3 w-3" />,
  },
  user: {
    label: "მომხმარებელი",
    className: "border-slate-500/40 text-slate-400",
    icon: <User className="h-3 w-3" />,
  },
};

const ALL_ROLES: Role[] = ["user", "moderator", "organizer", "streamer", "esports", "admin"];

const ROLES_KEY = "gameroom_user_roles";
const BANNED_KEY = "gameroom_user_banned";

function loadOverrides<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function saveOverrides<T>(key: string, data: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(data));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<MockUserRow[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const roles = loadOverrides<Role>(ROLES_KEY);
    const banned = loadOverrides<boolean>(BANNED_KEY);
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        role: roles[u.username] ?? u.role,
        banned: banned[u.username] ?? u.banned,
      }))
    );
  }, []);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function setRole(username: string, role: Role) {
    setUsers((prev) => {
      const next = prev.map((u) => (u.username === username ? { ...u, role } : u));
      const overrides = loadOverrides<Role>(ROLES_KEY);
      overrides[username] = role;
      saveOverrides(ROLES_KEY, overrides);
      window.dispatchEvent(new StorageEvent("storage", { key: ROLES_KEY }));
      return next;
    });
    setChangingRole(null);
  }

  function toggleBan(username: string) {
    setUsers((prev) => {
      const next = prev.map((u) => (u.username === username ? { ...u, banned: !u.banned } : u));
      const target = next.find((u) => u.username === username);
      const overrides = loadOverrides<boolean>(BANNED_KEY);
      if (target) overrides[username] = target.banned;
      saveOverrides(BANNED_KEY, overrides);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">მომხმარებლები</h2>
        <Input
          placeholder="ძებნა username-ით ან ფოსტით..."
          className="sm:max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">მომხმარებელი</th>
                <th className="px-4 py-3 text-left">როლი</th>
                <th className="px-4 py-3 text-left">დარეგისტრირდა</th>
                <th className="px-4 py-3 text-left">სტატუსი</th>
                <th className="px-4 py-3 text-right">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rc = ROLE_CONFIG[u.role];
                return (
                  <tr key={u.username} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar username={u.username} size="sm" />
                        <div>
                          <div className="font-medium">@{u.username}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {changingRole === u.username ? (
                        <div className="flex flex-wrap gap-1">
                          {ALL_ROLES.map((r) => {
                            const rc = ROLE_CONFIG[r];
                            return (
                              <button
                                key={r}
                                onClick={() => setRole(u.username, r)}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors hover:bg-accent ${rc.className} ${u.role === r ? "opacity-100 font-semibold" : "opacity-60 hover:opacity-100"}`}
                              >
                                {rc.icon} {rc.label}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setChangingRole(null)}
                            className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                          >
                            გაუქმება
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setChangingRole(u.username)} title="როლის შეცვლა">
                          <Badge variant="outline" className={`gap-1 cursor-pointer hover:opacity-80 ${rc.className}`}>
                            {rc.icon} {rc.label}
                          </Badge>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.joined}</td>
                    <td className="px-4 py-3">
                      {u.banned ? (
                        <Badge variant="outline" className="border-red-500/40 text-red-400">
                          banned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                          active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.banned ? (
                        <Button variant="ghost" size="sm" onClick={() => toggleBan(u.username)}>
                          <ShieldCheck className="mr-1 h-4 w-4" /> Unban
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400"
                          onClick={() => toggleBan(u.username)}
                        >
                          <Ban className="mr-1 h-4 w-4" /> Ban
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
