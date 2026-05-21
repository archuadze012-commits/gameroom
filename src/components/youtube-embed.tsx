function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/);
      if (shorts) return shorts[1];
      const embed = u.pathname.match(/^\/embed\/([\w-]+)/);
      if (embed) return embed[1];
    }
  } catch {}
  return null;
}

export function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border/60 bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title ?? "Gameplay"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
