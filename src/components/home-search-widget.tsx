"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { mockUsers, type MockUser } from "@/lib/mock-data";
import { PlayerCard } from "@/components/player-card";

const ROLES_KEY = "gameroom_user_roles";

export function HomeSearchWidget() {
  const [query, setQuery] = useState("");
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [isFocused, setIsFocused] = useState(false);

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
    if (!q) return withRoles.slice(0, 4);
    return withRoles
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.region.toLowerCase().includes(q),
      )
      .slice(0, 4);
  }, [q, roleOverrides]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative group">
        <div className={`absolute -inset-1 rounded-full blur opacity-30 transition-all duration-500 ${isFocused ? 'bg-pink-500 opacity-60' : 'bg-transparent'}`}></div>
        <div className="relative flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 focus-within:border-pink-500/50 focus-within:bg-[rgba(15,12,30,0.8)] focus-within:shadow-[0_0_20px_rgba(236,72,153,0.2)]">
          <div className="pl-4 pr-2">
            <Search className={`h-4 w-4 transition-colors duration-300 ${isFocused ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-white/40'}`} />
          </div>
          <input
            type="text"
            placeholder="ძებნა (მაგ. username, ქალაქი)..."
            className="h-11 w-full bg-transparent px-2 text-[13px] font-medium text-white outline-none placeholder:text-white/30"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[13px] font-medium text-white/40">მოთამაშე ვერ მოიძებნა</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {results.map((user) => (
            <PlayerCard key={user.username} user={user} />
          ))}
        </div>
      )}

      {/* View All Button */}
      <Link
        href={`/search${q ? `?q=${encodeURIComponent(query)}` : ""}`}
        className="group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/5 text-[11px] font-black uppercase tracking-[0.15em] text-pink-400 transition-all hover:bg-pink-500/10 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]"
      >
        სრული ძებნა 
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
