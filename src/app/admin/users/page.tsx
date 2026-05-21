"use client";

import { useState, useEffect, useCallback } from "react";
import { Ban, ShieldCheck, Shield, MonitorPlay, Trophy, Gamepad2, User, Loader2, RefreshCw, BadgeCheck, Download, Clock, History } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import type { AdminUserRow, UserRole } from "@/lib/types";

const ROLE_CONFIG: Record<UserRole, { label: string; className: string; icon: React.ReactNode }> = {
  admin:     { label: "ადმინი",           className: "border-rose-500/40 text-rose-400",    icon: <ShieldCheck className="h-3 w-3" /> },
  moderator: { label: "მოდერატორი",       className: "border-amber-500/40 text-amber-400",  icon: <Shield className="h-3 w-3" /> },
  organizer: { label: "ორგანიზატორი",     className: "border-yellow-500/40 text-yellow-400",icon: <Trophy className="h-3 w-3" /> },
  esports:   { label: "კიბერსპორტსმენი", className: "border-cyan-500/40 text-cyan-400",    icon: <Gamepad2 className="h-3 w-3" /> },
  streamer:  { label: "სტრიმერი",         className: "border-violet-500/40 text-violet-400",icon: <MonitorPlay className="h-3 w-3" /> },
  user:      { label: "მომხმარებელი",     className: "border-slate-500/40 text-slate-400",  icon: <User className="h-3 w-3" /> },
};

const ALL_ROLES: UserRole[] = ["user", "moderator", "organizer", "streamer", "esports", "admin"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("forbidden");
      const data: AdminUserRow[] = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function setRole(userId: string, role: UserRole) {
    setSaving(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    setChangingRole(null);
    setSaving(null);
  }

  async function toggleBan(userId: string, banned: boolean, minutes: number | null = null) {
    setSaving(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, banned: !banned, banMinutes: minutes }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: !banned } : u)));
    setSaving(null);
  }

  async function toggleVerify(userId: string, current: boolean) {
    setSaving(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isVerified: !current }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isVerified: !current } : u)));
    setSaving(null);
  }

  function exportCsv() {
    window.open("/api/admin/users?format=csv", "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">
          მომხმარებლები
          {!loading && <span className="ml-2 text-sm font-normal text-muted-foreground">({users.length})</span>}
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="ძებნა username-ით ან ფოსტით..."
            className="sm:max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება...
            </div>
          ) : (
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      მომხმარებელი ვერ მოიძებნა
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const rc = ROLE_CONFIG[u.role];
                  const isSaving = saving === u.id;
                  return (
                    <tr key={u.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar username={u.username} size="sm" />
                          <div>
                            <div className="font-medium">@{u.username}</div>
                            <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {changingRole === u.id ? (
                          <div className="flex flex-wrap gap-1">
                            {ALL_ROLES.map((r) => {
                              const rc2 = ROLE_CONFIG[r];
                              return (
                                <button
                                  key={r}
                                  disabled={isSaving}
                                  onClick={() => setRole(u.id, r)}
                                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors hover:bg-accent ${rc2.className} ${u.role === r ? "opacity-100 font-semibold" : "opacity-60 hover:opacity-100"}`}
                                >
                                  {rc2.icon} {rc2.label}
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
                          <button onClick={() => setChangingRole(u.id)} title="როლის შეცვლა">
                            <Badge variant="outline" className={`gap-1 cursor-pointer hover:opacity-80 ${rc.className}`}>
                              {rc.icon} {rc.label}
                            </Badge>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("ka-GE")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {u.banned ? (
                            <Badge variant="outline" className="border-red-500/40 text-red-400">banned</Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">active</Badge>
                          )}
                          {u.isVerified && (
                            <Badge className="bg-sky-500/15 text-sky-400">
                              <BadgeCheck className="mr-1 h-3 w-3" /> verified
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            title="View profile"
                          >
                            <Link href={`/profile/${u.username}`} target="_blank">
                              <User className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => toggleVerify(u.id, u.isVerified)}
                            title={u.isVerified ? "Unverify" : "Verify"}
                          >
                            <BadgeCheck className={`h-4 w-4 ${u.isVerified ? "text-sky-400" : ""}`} />
                          </Button>
                          {u.banned ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => toggleBan(u.id, u.banned)}
                            >
                              <ShieldCheck className="mr-1 h-4 w-4" /> Unban
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-400"
                                disabled={isSaving}
                                onClick={() => toggleBan(u.id, u.banned, 60)}
                                title="Ban for 1 hour"
                              >
                                <Clock className="mr-1 h-4 w-4" /> 1h
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400"
                                disabled={isSaving}
                                onClick={() => toggleBan(u.id, u.banned)}
                                title="Permanent ban"
                              >
                                <Ban className="mr-1 h-4 w-4" /> Ban
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
