"use client";

// Shared browser push-subscription flow. Used by both the settings PushBell and
// the first-run onboarding "enable notifications" step so the service-worker
// registration, permission prompt, VAPID subscribe, and server-persist stay in
// one place.

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushSubscribeResult = "ok" | "denied" | "unsupported" | "no-vapid" | "error";

/** Returns the current push subscription state without prompting. */
export async function getPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ??
      (await navigator.serviceWorker.register("/sw.js"));
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Prompts for permission, subscribes, and persists the subscription server-side. */
export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (!isPushSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";

    const reg =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ??
      (await navigator.serviceWorker.register("/sw.js"));

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return "no-vapid";

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) return "error";
    return "ok";
  } catch {
    return "error";
  }
}

/** Unsubscribes locally and removes the subscription server-side. */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
      });
    }
    return true;
  } catch {
    return false;
  }
}
