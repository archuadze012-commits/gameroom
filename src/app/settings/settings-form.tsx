"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PROFILE_BIO_MAX_LENGTH } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const field =
  "block h-11 w-full border-b-2 border-white/10 bg-black/40 px-4 text-[14px] font-medium text-white transition-all placeholder:text-white/30 focus:border-[var(--gr-violet-hi)] focus:bg-black/60 focus:outline-none hover:bg-black/50 [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]";
const fieldPlain =
  "block h-10 w-full border-b-2 border-white/10 bg-black/40 px-3 text-[14px] font-medium text-white transition-all placeholder:text-white/30 focus:border-[var(--gr-violet-hi)] focus:bg-black/60 focus:outline-none hover:bg-black/50";
const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gr-violet-hi)]";
const divider = "h-px w-full bg-gradient-to-r from-transparent via-[var(--gr-border-hi)] to-transparent";

// Display name may only change once per cooldown window — mirrors the server
// check in /api/profile. Username is not editable here at all: it's the
// permanent profile URL slug, fixed at signup.
const DISPLAY_NAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export function SettingsForm({ games = [] }: { games?: Game[] }) {
  const [profile, setProfile] = useState<Profile>(defaults);
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [storageKey, setStorageKey] = useState<string>(STORAGE_KEY_PREFIX);
  const [displayNameChangedAt, setDisplayNameChangedAt] = useState<string | null>(null);
  const [savedDisplayName, setSavedDisplayName] = useState("");
  // Snapshot of the last-persisted profile — lets us detect unsaved edits and
  // warn before the tab is closed/reloaded/navigated away from.
  const [savedSnapshot, setSavedSnapshot] = useState<Profile>(defaults);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const key = user ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;
      setStorageKey(key);
      const stored = loadFromStorage(key);

      // load authoritative fields from Supabase
      let dbProfile: {
        username?: string | null;
        favorite_game_slugs?: string[] | null;
        bio?: string | null;
        voice_chat?: boolean | null;
        dm_privacy?: string | null;
        youtube_handle?: string | null;
        tiktok_handle?: string | null;
        tiktok_followers?: string | null;
        display_name?: string | null;
        display_name_changed_at?: string | null;
        in_game_name?: string | null;
        game_id?: string | null;
        main_game_slug?: string | null;
      } | null = null;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, favorite_game_slugs, bio, voice_chat, dm_privacy, youtube_handle, tiktok_handle, tiktok_followers, display_name, display_name_changed_at, in_game_name, game_id, main_game_slug")
          .eq("id", user.id)
          .single();
        dbProfile = data;
      }
      setDisplayNameChangedAt(dbProfile?.display_name_changed_at ?? null);
      const initialDisplayName = dbProfile?.display_name || (user?.user_metadata?.display_name as string | undefined) || stored.displayName || "";
      setSavedDisplayName(initialDisplayName);

      const loaded: Profile = {
        ...defaults,
        ...stored,
        // profiles.username is the authoritative value /api/profile writes to;
        // user_metadata.username is only a best-effort mirror (see handleSubmit)
        // and can drift if that mirror write fails, so it's the last resort.
        username: dbProfile?.username || (user?.user_metadata?.username as string | undefined) || stored.username || "",
        displayName: initialDisplayName,
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
      };
      setProfile(loaded);
      setSavedSnapshot(loaded);
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

  // Warn before losing unsaved edits. beforeunload covers tab close / reload /
  // hard navigation; App Router soft-nav (clicking an in-app Link) doesn't fire
  // it, but this catches the destructive cases users actually lose work to.
  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedSnapshot);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setTimeout(() => setNow(Date.now()), 0);
  }, []);

  const nextDisplayNameChangeAt = displayNameChangedAt
    ? new Date(new Date(displayNameChangedAt).getTime() + DISPLAY_NAME_COOLDOWN_MS)
    : null;
  const displayNameLocked = !!nextDisplayNameChangeAt && now > 0 && nextDisplayNameChangeAt.getTime() > now;
  const displayNameDaysLeft = nextDisplayNameChangeAt && now > 0
    ? Math.max(1, Math.ceil((nextDisplayNameChangeAt.getTime() - now) / (24 * 60 * 60 * 1000)))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayNameLocked && profile.displayName !== savedDisplayName) {
      toast.error(`საჩვენებელი სახელის შეცვლა შესაძლებელია ორ კვირაში ერთხელ — კიდევ ${displayNameDaysLeft} დღეში.`);
      return;
    }
    setLoading(true);
    try {
      // auth metadata is a best-effort mirror; a failure here shouldn't block
      // the authoritative /api/profile write below.
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.updateUser({
          data: { display_name: profile.displayName },
        });
      } catch {}

      let res: Response;
      try {
        res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
      } catch {
        toast.error("ქსელის შეცდომა — სცადე თავიდან.");
        return;
      }

      // Any non-2xx means the server did NOT save. Previously the code fell
      // through to a success toast for every error except username_taken, so
      // moderation blocks / rate limits / DB errors silently reported "saved".
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; reason?: string; nextChangeAt?: string };
        const msg =
          err.error === "display_name_cooldown"
            ? `საჩვენებელი სახელის შეცვლა შესაძლებელია ორ კვირაში ერთხელ${err.nextChangeAt ? ` — შემდეგი ცვლილება: ${new Date(err.nextChangeAt).toLocaleDateString("ka-GE")}` : ""}.`
          : err.error === "content_blocked" ? `ტექსტი დაბლოკა მოდერაციამ${err.reason ? ` (${err.reason})` : ""}.`
          : err.error === "rate_limited" ? "ძალიან ხშირად ცდილობ — მოიცადე წამით."
          : "შენახვა ვერ მოხერხდა — სცადე თავიდან.";
        toast.error(msg);
        return;
      }

      // Persist locally only after a confirmed server save, so devices don't
      // diverge on a write that never landed.
      localStorage.setItem(storageKey, JSON.stringify(profile));
      setSavedSnapshot(profile);
      if (profile.displayName !== savedDisplayName) {
        setDisplayNameChangedAt(new Date().toISOString());
        setSavedDisplayName(profile.displayName);
      }
      toast.success("პარამეტრები შენახულია.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="displayName" className={labelClass}>საჩვენებელი სახელი</label>
        <Input
          id="displayName"
          className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg"
          value={profile.displayName}
          onChange={set("displayName")}
          disabled={displayNameLocked}
          maxLength={32}
        />
        <p className="mt-1.5 text-[12px] text-[var(--gr-text-mute)]">
          {displayNameLocked
            ? `შეცვლა შესაძლებელია ორ კვირაში ერთხელ — კიდევ ${displayNameDaysLeft} დღეში.`
            : "შეცვლა შესაძლებელია ორ კვირაში ერთხელ."}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="bio" className={labelClass + " mb-0"}>ბიო</label>
          <button
            type="button"
            onClick={handleGenerateBio}
            disabled={generatingBio}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] transition-colors hover:bg-white/5 disabled:opacity-50"
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
          maxLength={PROFILE_BIO_MAX_LENGTH}
          placeholder="რასაც გვინდა შევიტყობდეთ შენზე..."
          value={profile.bio}
          onChange={set("bio")}
          className="min-h-[88px] bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg py-3 px-4 leading-relaxed resize-none"
        />
        {/* Counter mirrors the server's PROFILE_BIO_MAX_LENGTH cap so a bio can't
            be silently truncated on save. AI-generated bios can exceed the cap
            (programmatic set bypasses maxLength) — flag that in red. */}
        <p className={`mt-1 text-right text-[11px] tabular-nums ${profile.bio.length > PROFILE_BIO_MAX_LENGTH ? "text-red-400" : "text-[var(--gr-text-mute)]"}`}>
          {profile.bio.length}/{PROFILE_BIO_MAX_LENGTH}
        </p>
      </div>

      <div className={divider} />

      <Eyebrow tone="magenta">თამაშის ინფო</Eyebrow>
      <div className="grid gap-4 sm:grid-cols-2">
        {games.length > 0 && (
          <div className="sm:col-span-2">
            <label htmlFor="mainGameSlug" className={labelClass}>თამაში</label>
            <div className="relative max-w-xs">
              <Select
                value={profile.mainGameSlug || ""}
                onValueChange={(val) => setProfile((p) => ({ ...p, mainGameSlug: val ?? "" }))}
              >
                <SelectTrigger id="mainGameSlug" className="!h-10 !w-full bg-black/40 border-white/10 rounded-lg text-white">
                  <SelectValue placeholder="— აირჩიე თამაში —" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0111] border border-white/5 text-white">
                  <SelectItem value="">— აირჩიე თამაში —</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g.slug} value={g.slug}>
                      {g.emoji} {g.nameKa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div>
          <label htmlFor="inGameName" className={labelClass}>რა გაწერია თამაშში?</label>
          <Input
            id="inGameName"
            placeholder="შენი nickname თამაშში"
            value={profile.inGameName}
            onChange={set("inGameName")}
            className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="gameId" className={labelClass}>ID</label>
          <Input
            id="gameId"
            placeholder="მაგ. 123456789"
            value={profile.gameId}
            onChange={set("gameId")}
            className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg"
          />
        </div>
      </div>

      <div className={divider} />

      <Eyebrow tone="cyan">სოციალური ქსელები</Eyebrow>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="youtubeHandle" className={labelClass + " flex items-center gap-1.5"}>
            <YouTubeIcon /> YouTube
          </label>
          <div className="flex items-center">
            <span className="flex h-10 items-center border border-white/10 border-r-0 bg-black/50 px-3 text-sm text-white/40 rounded-l-lg">@</span>
            <Input
              id="youtubeHandle"
              className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-r-lg rounded-l-none"
              placeholder="შენი_სახელი"
              value={profile.youtubeHandle}
              onChange={set("youtubeHandle")}
            />
          </div>
        </div>
        <div>
          <label htmlFor="tiktokHandle" className={labelClass + " flex items-center gap-1.5"}>
            <TikTokIcon /> TikTok
          </label>
          <div className="flex items-center">
            <span className="flex h-10 items-center border border-white/10 border-r-0 bg-black/50 px-3 text-sm text-white/40 rounded-l-lg">@</span>
            <Input
              id="tiktokHandle"
              className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-r-lg rounded-l-none"
              placeholder="შენი_სახელი"
              value={profile.tiktokHandle}
              onChange={set("tiktokHandle")}
            />
          </div>
        </div>
      </div>

      <div className="max-w-48">
        <label htmlFor="tiktokFollowers" className={labelClass + " flex items-center gap-1.5"}>
          <TikTokIcon /> TikTok Followers
        </label>
        <Input
          id="tiktokFollowers"
          placeholder="მაგ. 4.8K ან 12500"
          value={profile.tiktokFollowers}
          onChange={set("tiktokFollowers")}
          className="h-10 bg-black/40 border-white/10 focus-visible:border-violet-500 focus-visible:ring-violet-500/20 text-white rounded-lg"
        />
      </div>

      <div className={divider} />

      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="voice"
          checked={profile.voice}
          onChange={(e) => setProfile((p) => ({ ...p, voice: e.target.checked }))}
          className="h-4 w-4 border-white/20 bg-black/40 accent-[var(--gr-violet-hi)]"
        />
        <label htmlFor="voice" className="text-[13px] font-medium text-[var(--gr-text)]">
          🎙 voice chat-ით კომფორტულად ვამთამაშებ
        </label>
      </div>

      <div>
        <label htmlFor="dm-privacy" className="mb-1.5 block text-[13px] font-medium text-[var(--gr-text)]">
          💬 ვის შეუძლია მომწეროს
        </label>
        <div className="relative max-w-xs">
          <Select
            value={profile.dmPrivacy}
            onValueChange={(val) => setProfile((p) => ({ ...p, dmPrivacy: (val ?? "everyone") as Profile["dmPrivacy"] }))}
          >
            <SelectTrigger id="dm-privacy" className="!h-10 !w-full bg-black/40 border-white/10 rounded-lg text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0b0111] border border-white/5 text-white">
              <SelectItem value="everyone">ყველას</SelectItem>
              <SelectItem value="followers">მხოლოდ ჩემს followers-ს</SelectItem>
              <SelectItem value="nobody">არავის</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1.5 text-[12px] text-[var(--gr-text-mute)]">
          არსებული საუბრები ამით არ იზღუდება — მხოლოდ ახალი მესიჯების დაწყებას ეხება.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-[12px] font-medium text-amber-400" aria-live="polite">
          {isDirty ? "შეუნახავი ცვლილებები გაქვს" : ""}
        </p>
        <button
          type="submit"
          disabled={loading}
          className="group relative inline-flex items-center justify-center overflow-hidden bg-[var(--gr-violet-hi)] px-8 py-3 font-display text-[13px] font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)] shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <span className="relative z-10 flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            შენახვა
          </span>
        </button>
      </div>
    </form>
  );
}
