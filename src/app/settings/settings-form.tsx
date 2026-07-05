"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Game = { slug: string; nameKa: string; emoji: string };

const STORAGE_KEY_PREFIX = "gameroom_profile";

type Profile = {
  username: string;
  displayName: string;
  bio: string;
  voice: boolean;
  dmPrivacy: "everyone" | "followers" | "nobody";
  youtubeHandle: string;
  tiktokHandle: string;
  tiktokFollowers: string;
  favoriteGameSlugs: string[];
  inGameName: string;
  gameId: string;
  mainGameSlug: string;
};

const defaults: Profile = {
  username: "",
  displayName: "",
  bio: "",
  voice: true,
  dmPrivacy: "everyone",
  youtubeHandle: "",
  tiktokHandle: "",
  tiktokFollowers: "",
  favoriteGameSlugs: [],
  inGameName: "",
  gameId: "",
  mainGameSlug: "",
};

function loadFromStorage(key: string): Partial<Profile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-red-500" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

export function SettingsForm({ games = [] }: { games?: Game[] }) {
  const [profile, setProfile] = useState<Profile>(defaults);
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [storageKey, setStorageKey] = useState<string>(STORAGE_KEY_PREFIX);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const key = user ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;
      setStorageKey(key);
      const stored = loadFromStorage(key);

      // load authoritative fields from Supabase
      let dbProfile: {
        favorite_game_slugs?: string[] | null;
        bio?: string | null;
        voice_chat?: boolean | null;
        dm_privacy?: string | null;
        youtube_handle?: string | null;
        tiktok_handle?: string | null;
        tiktok_followers?: string | null;
        display_name?: string | null;
        in_game_name?: string | null;
        game_id?: string | null;
        main_game_slug?: string | null;
      } | null = null;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("favorite_game_slugs, bio, voice_chat, dm_privacy, youtube_handle, tiktok_handle, tiktok_followers, display_name, in_game_name, game_id, main_game_slug")
          .eq("id", user.id)
          .single();
        dbProfile = data;
      }

      setProfile({
        ...defaults,
        ...stored,
        username: (user?.user_metadata?.username as string | undefined) || stored.username || "",
        displayName: dbProfile?.display_name || (user?.user_metadata?.display_name as string | undefined) || stored.displayName || "",
        bio: dbProfile?.bio ?? stored.bio ?? "",
        voice: dbProfile?.voice_chat ?? stored.voice ?? true,
        dmPrivacy: (dbProfile?.dm_privacy as Profile["dmPrivacy"]) ?? stored.dmPrivacy ?? "everyone",
        youtubeHandle: dbProfile?.youtube_handle ?? stored.youtubeHandle ?? "",
        tiktokHandle: dbProfile?.tiktok_handle ?? stored.tiktokHandle ?? "",
        tiktokFollowers: dbProfile?.tiktok_followers ?? stored.tiktokFollowers ?? "",
        favoriteGameSlugs: dbProfile?.favorite_game_slugs?.length
          ? dbProfile.favorite_game_slugs
          : dbProfile?.main_game_slug
            ? [dbProfile.main_game_slug]
            : (stored.favoriteGameSlugs ?? []),
        inGameName: dbProfile?.in_game_name ?? stored.inGameName ?? "",
        gameId: dbProfile?.game_id ?? stored.gameId ?? "",
        mainGameSlug: dbProfile?.main_game_slug ?? stored.mainGameSlug ?? "",
      });
    }
    init();
  }, []);

  const set = (key: keyof Profile) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setProfile((p) => ({ ...p, [key]: e.target.value }));

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    try {
      const res = await fetch("/api/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: profile.username ? "gamer" : "user",
          games: profile.favoriteGameSlugs,
          voiceChat: profile.voice,
        }),
      });
      const data = await res.json();
      if (data.bio) setProfile((p) => ({ ...p, bio: data.bio }));
      else toast.error("Bio ვერ გენერირდა, სცადე თავიდან.");
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    }
    setGeneratingBio(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem(storageKey, JSON.stringify(profile));
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.updateUser({
        data: { username: profile.username, display_name: profile.displayName },
      });
    } catch {}
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          displayName: profile.displayName,
          bio: profile.bio,
          voiceChat: profile.voice,
          dmPrivacy: profile.dmPrivacy,
          favoriteGameSlugs: profile.favoriteGameSlugs,
          youtubeHandle: profile.youtubeHandle,
          tiktokHandle: profile.tiktokHandle,
          tiktokFollowers: profile.tiktokFollowers,
          inGameName: profile.inGameName,
          gameId: profile.gameId,
          mainGameSlug: profile.mainGameSlug,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error === "username_taken") {
          toast.error("ეს username უკვე დაკავებულია.");
          setLoading(false);
          return;
        }
      }
    } catch {}
    toast.success("პარამეტრები შენახულია.");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">მომხმარებლის სახელი</Label>
          <Input
            id="username"
            value={profile.username}
            onChange={set("username")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">საჩვენებელი სახელი</Label>
          <Input
            id="displayName"
            value={profile.displayName}
            onChange={set("displayName")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">ბიო</Label>
          <button
            type="button"
            onClick={handleGenerateBio}
            disabled={generatingBio}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {generatingBio
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />}
            AI-ით გენერაცია
          </button>
        </div>
        <Textarea
          id="bio"
          rows={3}
          placeholder="რასაც გვინდა შევიტყობდეთ შენზე..."
          value={profile.bio}
          onChange={set("bio")}
        />
      </div>

      <Separator />

      <p className="text-sm font-medium">თამაშის ინფო</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {games.length > 0 && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="mainGameSlug">თამაში</Label>
            <div className="relative max-w-xs">
              <select
                id="mainGameSlug"
                value={profile.mainGameSlug}
                onChange={(e) => setProfile((p) => ({ ...p, mainGameSlug: e.target.value }))}
                className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— აირჩიე თამაში —</option>
                {games.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.emoji} {g.nameKa}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="inGameName">რა გაწერია თამაშში?</Label>
          <Input
            id="inGameName"
            placeholder="შენი nickname თამაშში"
            value={profile.inGameName}
            onChange={set("inGameName")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gameId">ID</Label>
          <Input
            id="gameId"
            placeholder="მაგ. 123456789"
            value={profile.gameId}
            onChange={set("gameId")}
          />
        </div>
      </div>

      <Separator />

      <p className="text-sm font-medium">სოციალური ქსელები</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="youtubeHandle" className="flex items-center gap-1.5">
            <YouTubeIcon /> YouTube
          </Label>
          <div className="flex items-center">
            <span className="flex h-10 items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">@</span>
            <Input
              id="youtubeHandle"
              className="rounded-l-none"
              placeholder="შენი_სახელი"
              value={profile.youtubeHandle}
              onChange={set("youtubeHandle")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tiktokHandle" className="flex items-center gap-1.5">
            <TikTokIcon /> TikTok
          </Label>
          <div className="flex items-center">
            <span className="flex h-10 items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">@</span>
            <Input
              id="tiktokHandle"
              className="rounded-l-none"
              placeholder="შენი_სახელი"
              value={profile.tiktokHandle}
              onChange={set("tiktokHandle")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tiktokFollowers" className="flex items-center gap-1.5">
          <TikTokIcon /> TikTok Followers
        </Label>
        <Input
          id="tiktokFollowers"
          className="max-w-48"
          placeholder="მაგ. 4.8K ან 12500"
          value={profile.tiktokFollowers}
          onChange={set("tiktokFollowers")}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="voice"
          checked={profile.voice}
          onChange={(e) => setProfile((p) => ({ ...p, voice: e.target.checked }))}
          className="h-4 w-4 rounded border-border bg-background accent-primary"
        />
        <Label htmlFor="voice" className="font-normal">
          🎙 voice chat-ით კომფორტულად ვამთამაშებ
        </Label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dm-privacy" className="font-normal">
          💬 ვის შეუძლია მომწეროს
        </Label>
        <select
          id="dm-privacy"
          value={profile.dmPrivacy}
          onChange={(e) => setProfile((p) => ({ ...p, dmPrivacy: e.target.value as Profile["dmPrivacy"] }))}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="everyone">ყველას</option>
          <option value="followers">მხოლოდ ჩემს followers-ს</option>
          <option value="nobody">არავის</option>
        </select>
        <p className="text-xs text-muted-foreground">
          არსებული საუბრები ამით არ იზღუდება — მხოლოდ ახალი მესიჯების დაწყებას ეხება.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          შენახვა
        </Button>
      </div>
    </form>
  );
}
