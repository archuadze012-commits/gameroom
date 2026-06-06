import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";
import { createSupabaseAdminClient } from "./supabase/admin";
import { getSession } from "./auth";
import { createLogger } from "./logger";

const logger = createLogger("admin");

const ADMIN_EMAILS = [
  "archuadze012@gmail.com",
  ...(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),
];

export type Permission =
  | "manage_users"
  | "manage_chat"
  | "manage_content"
  | "manage_tournaments"
  | "view_analytics"
  | "view_audit"
  | "moderate_queue"
  | "manage_announcements"
  | "manage_pins"
  | "manage_shop"
  | "broadcast_email"
  | "impersonate";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    "manage_users",
    "manage_chat",
    "manage_content",
    "manage_tournaments",
    "view_analytics",
    "view_audit",
    "moderate_queue",
    "manage_announcements",
    "manage_pins",
    "manage_shop",
    "broadcast_email",
    "impersonate",
  ],
  moderator: ["manage_chat", "moderate_queue", "manage_shop"],
  organizer: ["manage_tournaments"],
  streamer: [],
  esports: [],
  user: [],
};

export const getCurrentRole = cache(async (): Promise<string> => {
  const user = await getSession();
  if (!user) return "user";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .maybeSingle();
  if (data?.banned) return "user";
  if (data?.role) return data.role;
  if (user.email && ADMIN_EMAILS.includes(user.email)) return "admin";
  return "user";
});

export async function hasPermission(perm: Permission): Promise<boolean> {
  const role = await getCurrentRole();
  return (ROLE_PERMISSIONS[role] ?? []).includes(perm);
}

export async function requirePermission(perm: Permission): Promise<{ ok: true; userId: string } | { ok: false; status: 401 | 403 }> {
  const user = await getSession();
  if (!user) return { ok: false, status: 401 };
  const allowed = await hasPermission(perm);
  if (!allowed) return { ok: false, status: 403 };
  return { ok: true, userId: user.id };
}

export async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("admin_actions").insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: (params.metadata ?? null) as never,
    });
    if (error) {
      logger.critical("admin action audit insert failed", {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        error,
      });
    }
  } catch (error) {
    logger.critical("admin action audit insert threw", {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      error,
    });
    // never throw from audit log
  }
}
