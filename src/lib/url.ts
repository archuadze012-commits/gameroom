function normalizeOrigin(origin: string, fallbackOrigin?: string | null) {
  try {
    const url = new URL(origin);

    if (url.hostname === "0.0.0.0") {
      url.hostname = "localhost";
    }

    return url.origin;
  } catch {
    return fallbackOrigin ?? origin;
  }
}

function isUsableHost(host?: string | null) {
  if (!host) return false;
  const normalized = host.trim().toLowerCase();
  return normalized !== "" && normalized !== "0.0.0.0" && !normalized.startsWith("0.0.0.0:");
}

export function getCanonicalOrigin(origin: string) {
  return normalizeOrigin(origin);
}

export function getSiteOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return siteUrl ? normalizeOrigin(siteUrl) : null;
}

// Canonical public origin for absolute URLs in metadata / sitemap / robots.
// NEXT_PUBLIC_SITE_URL is set per-environment (localhost in dev,
// https://playgame.ge in prod); falls back to the prod domain if unset.
export function getSiteUrl() {
  return getSiteOrigin() ?? "https://playgame.ge";
}

export function getTrustedOrigin(fallbackOrigin: string) {
  return getSiteOrigin() ?? normalizeOrigin(fallbackOrigin);
}

export function getRequestOrigin(origin: string) {
  return normalizeOrigin(origin);
}

export function getRequestOriginFromHeaders(headers: Headers, fallbackOrigin: string) {
  const siteOrigin = getSiteOrigin();
  if (siteOrigin) return siteOrigin;

  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const directHost = headers.get("host")?.split(",")[0]?.trim();
  const host = isUsableHost(forwardedHost) ? forwardedHost : directHost;

  if (!host) return getRequestOrigin(fallbackOrigin);

  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const fallbackProtocol = (() => {
    try {
      return new URL(fallbackOrigin).protocol.replace(":", "");
    } catch {
      return "http";
    }
  })();

  return normalizeOrigin(`${forwardedProto || fallbackProtocol}://${host}`, getRequestOrigin(fallbackOrigin));
}

export function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return normalizeOrigin(window.location.origin, getSiteOrigin());
}
