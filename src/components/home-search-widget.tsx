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
          placeholder="username, რეგიონი..."
          className="pl-9 h-9 text-sm"
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

      <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
        <Link href={`/search${q ? `?q=${encodeURIComponent(query)}` : ""}`}>
          სრული ძებნა <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
