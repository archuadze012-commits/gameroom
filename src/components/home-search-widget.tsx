"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RoleBadge } from "@/components/role-badge";
import type { UserRole } from "@/lib/types";

const ROLES_KEY = "gameroom_user_roles";

type FriendUser = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  isVerified?: boolean;
  region?: string | null;
  voiceChat?: boolean;
  role?: UserRole | null;
  isOnline?: boolean;
  games?: { slug: string; rank: string }[];
};

type FollowProfileRow = {
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    is_verified: boolean | null;
    region: string | null;
    voice_chat: boolean | null;
    role: UserRole | null;
    last_seen_at: string | null;
  } | null;
};

function CompactPlayerCard({ user }: { user: FriendUser }) {
  const initial = user.displayName.slice(0, 1).toUpperCase();
  
  return (
    <Link href={`/profile/${user.username}`} className="group block">
      <div className="player-card-stable relative w-full rounded-[16px] bg-[rgba(15,12,30,0.6)] backdrop-blur-md premium-card-glow-tight transition-all duration-300 p-[1.5px]">
        <div className="relative z-10 flex items-center gap-3 overflow-hidden rounded-[14px] p-2.5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_4%,rgba(7,6,16,0.06)_40%,rgba(7,6,16,0.86)_100%)] z-0" />
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/10">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-500/20 text-sm font-bold text-violet-400">
                  {initial}
                </div>
              )}
            </div>
            {/* Online Dot */}
            <div
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[rgba(15,12,30,1)] shadow-sm"
              style={{ 
                backgroundColor: user.isOnline ? "#10b981" : "#f59e0b",
                boxShadow: user.isOnline ? "0 0 6px #10b981" : "0 0 6px #f59e0b" 
              }}
            />
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="truncate text-[13px] font-bold text-white group-hover:text-pink-400 transition-colors">
                {user.displayName}
              </p>
              {user.role && user.role !== "user" && (
                <div className="shrink-0">
                  <RoleBadge username={user.username} defaultRole={user.role} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              {user.region && <span>{user.region}</span>}
              {user.voiceChat && (
                <>
                  {user.region && <span>·</span>}
                  <Mic className="h-2.5 w-2.5 text-pink-400" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HomeSearchWidget() {
  const [query, setQuery] = useState("");
  const [roleOverrides, setRoleOverrides] = useState<Record<string, UserRole>>({});
  const [isFocused, setIsFocused] = useState(false);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function loadFriends() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("follows")
        .select("profiles!follows_following_id_profiles_id_fk(username, display_name, avatar_url, banner_url, is_verified, region, voice_chat, role, last_seen_at)")
        .eq("follower_id", session.user.id)
        .limit(100);
        
      if (error || !data) {
        setLoading(false);
        return;
      }

      const now = new Date().getTime();
      const loadedFriends = data
        .map((row: FollowProfileRow) => {
          const p = row.profiles;
          if (!p) return null;
          
          let isOnline = false;
          if (p.last_seen_at) {
            const lastSeen = new Date(p.last_seen_at).getTime();
            if (now - lastSeen < 5 * 60 * 1000) {
              isOnline = true;
            }
          }
          
          return {
            username: p.username,
            displayName: p.display_name || p.username,
            avatarUrl: p.avatar_url,
            bannerUrl: p.banner_url,
            isVerified: p.is_verified,
            region: p.region,
            voiceChat: p.voice_chat,
            role: p.role,
            isOnline
          };
        })
        .filter(Boolean) as FriendUser[];
        
      loadedFriends.sort((a, b) => {
        if (a.isOnline === b.isOnline) return 0;
        return a.isOnline ? -1 : 1;
      });
      
      setFriends(loadedFriends);
      setLoading(false);
    }
    loadFriends();
  }, []);

  const q = query.toLowerCase().trim();

  const results = useMemo(() => {
    const withRoles = friends.map((u) => ({
      ...u,
      role: roleOverrides[u.username] ?? u.role,
    }));
    if (!q) return withRoles.slice(0, 4);
    return withRoles
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          (u.region && u.region.toLowerCase().includes(q)),
      )
      .slice(0, 4);
  }, [q, roleOverrides, friends]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative group">
        <div className={`relative flex items-center overflow-visible rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 premium-nav-item-glow ${isFocused ? 'premium-nav-item-glow-active bg-[rgba(15,12,30,0.8)] shadow-[0_0_20px_rgba(236,72,153,0.2)]' : ''}`}>
          <div className="pl-4 pr-2">
            <Search className={`h-4 w-4 transition-colors duration-300 ${isFocused ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-white/40'}`} />
          </div>
          <input
            type="text"
            placeholder="აქ ჩაწერე, ვისაც ეძებ"
            className="h-11 w-full bg-transparent px-2 text-[13px] font-medium text-white outline-none placeholder:text-white/30"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-8 text-center">
          <p className="text-[13px] font-medium text-white/40">იტვირთება...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[13px] font-medium text-white/40">მეგობრები ვერ მოიძებნა</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {results.map((user) => (
            <CompactPlayerCard key={user.username} user={user} />
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
