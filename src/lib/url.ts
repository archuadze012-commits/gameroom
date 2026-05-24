function normalizeOrigin(origin: string, fallbackOrigin?: string | null) {
  try {
    const url = new URL(origin);

    if (url.hostname === "0.0.0.0") {
      if (fallbackOrigin) return normalizeOrigin(fallbackOrigin);
      url.hostname = "localhost";
    }

    return url.origin;
  } catch {
    return fallbackOrigin ?? origin;
  }
}

export function getCanonicalOrigin(origin: string) {
  return normalizeOrigin(origin);
}

export function getSiteOrigin() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return siteUrl ? normalizeOrigin(siteUrl) : null;
}

export function getRequestOrigin(origin: string) {
  return normalizeOrigin(origin, getSiteOrigin());
}

export function getRequestOriginFromHeaders(headers: Headers, fallbackOrigin: string) {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.split(",")[0]?.trim();

  if (!host) return getRequestOrigin(fallbackOrigin);

  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const fallbackProtocol = (() => {
    try {
      return new URL(fallbackOrigin).protocol.replace(":", "");
    } catch {
      return "http";
    }
  })();

  return normalizeOrigin(`${forwardedProto || fallbackProtocol}://${host}`, getSiteOrigin());
}

export function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return normalizeOrigin(window.location.origin, getSiteOrigin());
}
