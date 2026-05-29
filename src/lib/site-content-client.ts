"use client";

export type SaveContentResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

export async function saveSiteContent(
  key: string,
  value: Record<string, unknown>,
): Promise<SaveContentResult> {
  try {
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: String(body?.error ?? `http_${res.status}`) };
    }
    const data = (await res.json()) as { key: string; value: Record<string, unknown> };
    return { ok: true, value: data.value ?? {} };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

export async function uploadSiteImage(file: File, folder?: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: String(body?.error ?? `http_${res.status}`) };
    }
    const data = (await res.json()) as { url: string };
    if (!data?.url) return { ok: false, error: "no_url" };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}
