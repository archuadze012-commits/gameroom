// NOTE: TikTok's /v2/user/info endpoint only returns data for the account that
// owns the access token — it cannot look up an arbitrary `username`. So this
// returns the *connected* account's follower count regardless of `username`.
// Showing it on other users' profiles would be misleading; only render it for
// the profile that actually connected this TikTok token. (Real per-user lookup
// needs a different data source / TikTok's public scraping is not permitted.)
export async function getTikTokFollowerCount(_username: string): Promise<string | null> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=follower_count`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const count = json.data?.user?.follower_count;
    if (count == null) return null;

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
