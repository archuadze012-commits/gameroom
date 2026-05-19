"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STORAGE_KEY_PREFIX = "gameroom_profile";

type Profile = {
  username: string;
  displayName: string;
  bio: string;
  voice: boolean;
  youtubeHandle: string;
  tiktokHandle: string;
  tiktokFollowers: string;
  instagramHandle: string;
  favoriteGameSlugs: string[];
};

const defaults: Profile = {
  username: "",
  displayName: "",
  bio: "",
  voice: true,
  youtubeHandle: "",
  tiktokHandle: "",
  tiktokFollowers: "",
  instagramHandle: "",
  favoriteGameSlugs: [],
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

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-pink-500" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

export function SettingsForm() {
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
      setProfile({
        ...defaults,
        ...stored,
        username: (user?.user_metadata?.username as string | undefined) || stored.username || "",
        displayName: (user?.user_metadata?.display_name as string | undefined) || stored.displayName || "",
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

      <div className="space-y-1.5">
        <Label htmlFor="instagramHandle" className="flex items-center gap-1.5">
          <InstagramIcon /> Instagram
        </Label>
        <div className="flex items-center">
          <span className="flex h-10 items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">@</span>
          <Input
            id="instagramHandle"
            className="rounded-l-none"
            placeholder="შენი_სახელი"
            value={profile.instagramHandle}
            onChange={set("instagramHandle")}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">ფავორიტი თამაშები</p>
          <span className="text-xs text-muted-foreground">
            {profile.favoriteGameSlugs.length}/3 არჩეული
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {mockGames.map((g) => {
            const selected = profile.favoriteGameSlugs.includes(g.slug);
            const maxReached = profile.favoriteGameSlugs.length >= 3;
            const disabled = !selected && maxReached;
            return (
              <button
                key={g.slug}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    favoriteGameSlugs: selected
                      ? p.favoriteGameSlugs.filter((s) => s !== g.slug)
                      : [...p.favoriteGameSlugs, g.slug],
                  }))
                }
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-all ${
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : disabled
                    ? "cursor-not-allowed border-border/40 opacity-40"
                    : "border-border/60 hover:border-primary/40 hover:bg-secondary/40"
                }`}
              >
                <GameIcon game={g} size="md" />
                <span className="truncate w-full text-center leading-tight">{g.nameEn}</span>
              </button>
            );
          })}
        </div>
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          შენახვა
        </Button>
      </div>
    </form>
  );
}
