"use client";

type EmbedKind = "youtube" | "tiktok" | "twitch" | "twitter";

type Embed = { kind: EmbedKind; url: string; id: string };

function detectEmbed(url: string): Embed | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { kind: "youtube", url, id };
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { kind: "youtube", url, id };
      const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/);
      if (shorts) return { kind: "youtube", url, id: shorts[1] };
    }

    // TikTok
    if (host.endsWith("tiktok.com")) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return { kind: "tiktok", url, id: m[1] };
      // short links: /t/...
      return { kind: "tiktok", url, id: u.pathname };
    }

    // Twitch clip / video
    if (host.endsWith("twitch.tv")) {
      return { kind: "twitch", url, id: u.pathname };
    }

    // Twitter / X
    if (host === "twitter.com" || host === "x.com") {
      const m = u.pathname.match(/status\/(\d+)/);
      if (m) return { kind: "twitter", url, id: m[1] };
    }
  } catch {}
  return null;
}

function linkifyAndExtractEmbeds(text: string): { parts: (string | { url: string })[]; embeds: Embed[] } {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: (string | { url: string })[] = [];
  const embeds: Embed[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(before);
    parts.push({ url: match[0] });
    const e = detectEmbed(match[0]);
    if (e) embeds.push(e);
    lastIndex = match.index + match[0].length;
  }
  const tail = text.slice(lastIndex);
  if (tail) parts.push(tail);
  return { parts, embeds };
}

function EmbedFrame({ embed }: { embed: Embed }) {
  if (embed.kind === "youtube") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border border-border/60">
        <iframe
          src={`https://www.youtube.com/embed/${embed.id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  if (embed.kind === "tiktok") {
    return (
      <div className="overflow-hidden rounded-md border border-border/60">
        <iframe
          src={`https://www.tiktok.com/embed/v2/${embed.id}`}
          allowFullScreen
          className="h-[600px] w-full"
        />
      </div>
    );
  }
  if (embed.kind === "twitch") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border border-border/60">
        <iframe
          src={`https://player.twitch.tv${embed.id}?parent=${typeof window !== "undefined" ? window.location.hostname : "gameroom.com.ge"}`}
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  return null;
}

type Props = {
  content: string;
  mediaUrls?: string[] | null;
  authorRole?: string | null;
  authorVerified?: boolean;
};

export function PostContent({ content, mediaUrls, authorRole, authorVerified }: Props) {
  const canEmbed = authorRole === "streamer" || !!authorVerified;
  const { parts, embeds } = linkifyAndExtractEmbeds(content);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((p, i) =>
          typeof p === "string" ? (
            <span key={i}>{p}</span>
          ) : (
            <a
              key={i}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {p.url}
            </a>
          )
        )}
      </p>

      {/* Inline image attachments */}
      {mediaUrls && mediaUrls.length > 0 && (
        <div className={`grid gap-2 ${mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {mediaUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-border/60"
            >
              <img src={url} alt="" className="h-auto w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* Embeds — only for streamers / verified */}
      {canEmbed && embeds.length > 0 && (
        <div className="space-y-2">
          {embeds.map((e, i) => (
            <EmbedFrame key={i} embed={e} />
          ))}
        </div>
      )}
    </div>
  );
}
