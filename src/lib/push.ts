import webpush from "web-push";
import { createSupabaseServerClient } from "./supabase/server";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:admin@gameroom.com.ge";
  if (!pub || !priv) {
    return;
  }
  webpush.setVapidDetails(contact, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  if (!configured) {
    console.warn("[push] VAPID keys not configured, skipping");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const json = JSON.stringify(payload);
  const deadSubs: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription is gone, clean it up
          deadSubs.push(s.id);
        } else {
          console.error("[push] send error", err);
        }
      }
    })
  );

  if (deadSubs.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadSubs);
  }
}
