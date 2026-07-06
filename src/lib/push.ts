import webpush from "web-push";
import { createSupabaseAdminClient } from "./supabase/admin";
import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

let configured = false;
let missingConfigLogged = false;
const logger = createLogger("push");

function ensureConfigured() {
  if (configured) return;
  const pub = getServerEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const priv = getServerEnv("VAPID_PRIVATE_KEY");
  const contact = getServerEnv("VAPID_CONTACT") ?? "mailto:admin@gameroom.com.ge";
  if (!pub || !priv) {
    if (!missingConfigLogged) {
      missingConfigLogged = true;
      logger.warn("VAPID keys not configured, skipping push sends");
    }
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
    return;
  }

  // Service-role: this reads the RECIPIENT's subscriptions, but sendPushToUser is
  // almost always called from the ACTOR's session (e.g. a replier notifying a
  // thread author). push_subscriptions RLS is owner-only (auth.uid() = user_id),
  // so a caller-scoped client would read 0 rows for anyone but the caller and
  // every cross-user push would silently no-op. The admin client bypasses RLS so
  // pushes actually reach their recipient; this is a trusted server-side send.
  const supabase = createSupabaseAdminClient();
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
          logger.error("push send failed", { userId, subscriptionId: s.id, error: err });
        }
      }
    })
  );

  if (deadSubs.length > 0) {
    const { error } = await supabase.from("push_subscriptions").delete().in("id", deadSubs);
    if (error) logger.warn("failed to delete dead push subscriptions", { deadSubs, error });
  }
}
