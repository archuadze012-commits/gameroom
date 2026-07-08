import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("streams:youtube-live");

export type LiveStream = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  videoId: string;
  title: string;
  thumbnail: string;
  watchUrl: string;
  viewers: number | null;
  gameSlug: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  youtube_handle: string | null;
  main_game_slug: string | null;
  role: string | null;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

// Official YouTube Data API key. When present, the reliable API path is used;
// otherwise we fall back to scraping the public /live page.
const YT_API_KEY = process.env.YOUTUBE_API_KEY;

// Cache windows (seconds). handle→channelId is stable → cached for a day.
const REVALIDATE_SECONDS = 90; // scrape path
const API_LIVE_REVALIDATE = 180; // live-status via API
const API_CHANNEL_REVALIDATE = 86400; // handle→channelId resolution
// Per-channel probe timeout — one slow channel must not stall the page render.
const PROBE_TIMEOUT_MS = 2500;

type LiveProbe = { videoId: string; title: string; viewers: number | null };

/**
 * fetch() bounded by PROBE_TIMEOUT_MS. The Data-API path previously had NO
 * timeout, so a slow googleapis response could stall the entire (home page)
 * render. Returns null on timeout/network error instead of throwing.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?youtube\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .trim();
}

function decodeText(s: string): string {
  return s
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Resolves a @handle to a channelId via the YouTube Data API. Cached for a day. */
async function resolveChannelId(handle: string): Promise<string | null> {
  if (!YT_API_KEY) return null;
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}` +
    `&key=${YT_API_KEY}`;
  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: API_CHANNEL_REVALIDATE } });
    if (!res || !res.ok) return null;
    const json = (await res.json()) as { items?: Array<{ id?: string }> };
    return json.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Official YouTube Data API live probe. Returns stream info if live, else null. */
async function probeViaApi(handle: string): Promise<LiveProbe | null> {
  const channelId = await resolveChannelId(handle);
  if (!channelId) return null;

  // search.list with eventType=live is the canonical "is this channel live now" check.
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}` +
    `&eventType=live&type=video&maxResults=1&key=${YT_API_KEY}`;
  try {
    const res = await fetchWithTimeout(searchUrl, { next: { revalidate: API_LIVE_REVALIDATE } });
    if (!res || !res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
    };
    const item = json.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) return null;
    const title = item?.snippet?.title ?? "Live stream";

    // Concurrent viewers — separate cheap call (1 unit), best-effort.
    let viewers: number | null = null;
    try {
      const vUrl =
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}` +
        `&key=${YT_API_KEY}`;
      const vRes = await fetchWithTimeout(vUrl, { next: { revalidate: 120 } });
      if (vRes && vRes.ok) {
        const vJson = (await vRes.json()) as {
          items?: Array<{ liveStreamingDetails?: { concurrentViewers?: string } }>;
        };
        const raw = vJson.items?.[0]?.liveStreamingDetails?.concurrentViewers;
        const n = raw ? Number(raw) : NaN;
        viewers = Number.isFinite(n) ? n : null;
      }
    } catch {
      // viewers are optional
    }

    return { videoId, title: decodeText(title), viewers };
  } catch {
    return null;
  }
}

/** Scrapes a YouTube handle's public /live page. Fallback when no API key is set. */
async function probeViaScrape(handle: string): Promise<LiveProbe | null> {
  const url = `https://www.youtube.com/@${encodeURIComponent(handle)}/live`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Live only if the player payload explicitly flags an active broadcast.
    if (!/"isLive":\s*true/.test(html)) return null;

    const videoId = html.match(/"videoId":"([\w-]{11})"/)?.[1];
    if (!videoId) return null;

    const title =
      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] ??
      html.match(/"title":"((?:[^"\\]|\\.)*)","lengthSeconds"/)?.[1] ??
      "Live stream";

    const viewersRaw =
      html.match(/"viewCount":\{"runs":\[\{"text":"([\d,\.]+)"/)?.[1] ??
      html.match(/"originalViewCount":"(\d+)"/)?.[1] ??
      null;
    const viewersNum = viewersRaw ? Number(viewersRaw.replace(/[,\.]/g, "")) : NaN;

    return {
      videoId,
      title: decodeText(title),
      viewers: Number.isFinite(viewersNum) ? viewersNum : null,
    };
  } catch {
    // Timeouts / network / parse errors → treat as "not live", never throw.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Detects live status for a handle: official API when keyed, scrape otherwise. */
async function probeLive(rawHandle: string): Promise<LiveProbe | null> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;
  return YT_API_KEY ? probeViaApi(handle) : probeViaScrape(handle);
}

/**
 * Returns the profiles that are currently live on YouTube, detected automatically
 * from their linked `youtube_handle`. No DB writes, no migration — read-only probe.
 */
export async function getLiveStreams(limit = 6): Promise<LiveStream[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, youtube_handle, main_game_slug, role")
      .not("youtube_handle", "is", null)
      .neq("youtube_handle", "")
      .limit(14);

    if (error) {
      logger.error("failed to load streamer candidates", { error });
      return [];
    }

    const candidates = ((data ?? []) as ProfileRow[])
      // Streamers first, so the most relevant channels get probed within the cap.
      .sort((a, b) => (b.role === "streamer" ? 1 : 0) - (a.role === "streamer" ? 1 : 0))
      .slice(0, 10);

    const results = await Promise.all(
      candidates.map(async (p) => {
        if (!p.youtube_handle) return null;
        const live = await probeLive(p.youtube_handle);
        if (!live) return null;
        return {
          id: p.id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          videoId: live.videoId,
          title: live.title,
          thumbnail: `https://i.ytimg.com/vi/${live.videoId}/hqdefault.jpg`,
          watchUrl: `https://www.youtube.com/watch?v=${live.videoId}`,
          viewers: live.viewers,
          gameSlug: p.main_game_slug,
        } satisfies LiveStream;
      }),
    );

    return results
      .filter((s): s is LiveStream => s !== null)
      .sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0))
      .slice(0, limit);
  } catch (e) {
    logger.error("getLiveStreams failed", { error: String(e) });
    return [];
  }
}
