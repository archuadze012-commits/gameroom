export async function getYouTubeSubscriberCount(handle: string): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  // strip leading @ if present
  const cleanHandle = handle.replace(/^@/, "");

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${cleanHandle}&key=${key}`,
      { next: { revalidate: 3600 } } // cache 1 hour
    );
    if (!res.ok) return null;

    const json = await res.json();
    const count = json.items?.[0]?.statistics?.subscriberCount;
    if (!count) return null;

    return formatCount(Number(count));
  } catch {
    return null;
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
