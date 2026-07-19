// Highlight embed helpers — detect the platform from a pasted clip URL and, for
// YouTube, derive a thumbnail. Pure (used by both the server action and the
// client display).

export type HighlightPlatform = "youtube" | "tiktok" | "twitch" | "medal" | "streamable" | "link";

export function detectPlatform(url: string): HighlightPlatform {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("twitch.tv")) return "twitch";
  if (u.includes("medal.tv")) return "medal";
  if (u.includes("streamable.com")) return "streamable";
  return "link";
}

export function youtubeThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

export const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  twitch: "Twitch",
  medal: "Medal",
  streamable: "Streamable",
  link: "ლინკი",
};

export const PLATFORM_TONE: Record<string, string> = {
  youtube: "text-red-400",
  tiktok: "text-cyan-300",
  twitch: "text-[var(--gr-violet-hi)]",
  medal: "text-amber-400",
  streamable: "text-blue-400",
  link: "text-white/60",
};
