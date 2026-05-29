"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockUsers, type MockUser } from "@/lib/mock-data";
import { PlayerCard } from "@/components/player-card";

const ROLES_KEY = "gameroom_user_roles";

export function HomeSearchWidget() {
  const [query, setQuery] = useState("");
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(ROLES_KEY);
        setRoleOverrides(raw ? JSON.parse(raw) : {});
      } catch {
        setRoleOverrides({});
      }
    }
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const q = query.toLowerCase().trim();

  const results = useMemo(() => {
    const withRoles = mockUsers.map((u) => ({
      ...u,
      role: (roleOverrides[u.username] ?? u.role) as MockUser["role"],
    }));
    if (!q) return withRoles.slice(0, 6);
    return withRoles
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.region.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [q, roleOverrides]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="username..."
          className="pl-9 h-9 text-sm focus-visible:ring-[rgba(236,72,153,0.8)] focus-visible:ring-offset-0 focus-visible:border-[rgba(236,72,153,0.9)]"
          style={{ transition: "box-shadow 0.2s, border-color 0.2s" }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(236,72,153,0.5), 0 0 14px rgba(236,72,153,0.4)"; e.currentTarget.style.borderColor = "rgba(236,72,153,0.9)"; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">მოთამაშე ვერ მოიძებნა</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {results.map((user) => (
            <PlayerCard key={user.username} user={user} />
          ))}
        </div>
      )}

      <Button asChild variant="ghost" size="sm" className="w-full">
        <Link
          href={`/search${q ? `?q=${encodeURIComponent(query)}` : ""}`}
          style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.55)" }}
        >
          სრული ძებნა <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
