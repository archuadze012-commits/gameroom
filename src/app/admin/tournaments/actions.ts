"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-tournament-actions");

const FORMATS = ["single_elim", "double_elim", "round_robin"] as const;
type TournamentFormat = (typeof FORMATS)[number];
const STATUSES = ["draft", "open", "checkin", "live", "completed", "cancelled"] as const;
type TournamentStatus = (typeof STATUSES)[number];

export type AdminTournamentResult = { ok: true; slug?: string } | { ok: false; error: string };

export type CreateTournamentInput = {
  name: string;
  gameId: string;
  format: string;
  maxParticipants: number;
  prizePool?: string;
  startsAt?: string; // datetime-local
};

// Latin slug from the name (Georgian/other non-latin collapses to empty), always
// suffixed with a short random token so the NOT-NULL unique slug can't collide.
function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "tournament"}-${suffix}`;
}

export async function createTournamentAction(input: CreateTournamentInput): Promise<AdminTournamentResult> {
  const auth = await requirePermission("manage_tournaments");
  if (!auth.ok) return { ok: false, error: auth.status === 401 ? "ავტორიზაცია აუცილებელია" : "წვდომა აკრძალულია" };

  const name = (input.name ?? "").trim();
  if (!name || name.length > 120) return { ok: false, error: "სახელი სავალდებულოა (მაქს. 120 სიმბოლო)" };
  if (!input.gameId) return { ok: false, error: "აირჩიე თამაში" };
  const format: TournamentFormat = FORMATS.includes(input.format as TournamentFormat)
    ? (input.format as TournamentFormat)
    : "single_elim";
  const max = Number(input.maxParticipants);
  if (!Number.isInteger(max) || max < 2 || max > 256) return { ok: false, error: "მონაწილეთა რაოდენობა არასწორია" };

  let startsAt: string | null = null;
  if (input.startsAt) {
    const d = new Date(input.startsAt);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "დაწყების დრო არასწორია" };
    startsAt = d.toISOString();
  }

  const admin = createSupabaseAdminClient();

  // Verify the game exists (game_id is a NOT NULL FK).
  const { data: game } = await admin.from("games").select("id").eq("id", input.gameId).maybeSingle();
  if (!game) return { ok: false, error: "თამაში ვერ მოიძებნა" };

  // Insert; retry once with a fresh slug on the rare slug collision (23505).
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const slug = makeSlug(name);
    const { error } = await admin.from("tournaments").insert({
      game_id: input.gameId,
      name,
      slug,
      format,
      max_participants: max,
      prize_pool: input.prizePool?.trim() || null,
      starts_at: startsAt,
      status: "open" satisfies TournamentStatus, // visible + open for registration
      created_by: auth.userId,
    });
    if (!error) {
      revalidatePath("/admin/tournaments");
      revalidatePath("/tournaments");
      return { ok: true, slug };
    }
    if (error.code !== "23505") {
      logger.error("failed to create tournament", { userId: auth.userId, error });
      return { ok: false, error: "შექმნა ვერ მოხერხდა" };
    }
  }
  return { ok: false, error: "შექმნა ვერ მოხერხდა (slug კონფლიქტი)" };
}

export type UpdateTournamentInput = {
  name?: string;
  format?: string;
  maxParticipants?: number;
  prizePool?: string;
  startsAt?: string;
  status?: string;
};

export async function updateTournamentAction(id: string, input: UpdateTournamentInput): Promise<AdminTournamentResult> {
  const auth = await requirePermission("manage_tournaments");
  if (!auth.ok) return { ok: false, error: auth.status === 401 ? "ავტორიზაცია აუცილებელია" : "წვდომა აკრძალულია" };
  if (!id) return { ok: false, error: "id required" };

  const patch: {
    name?: string;
    format?: TournamentFormat;
    max_participants?: number;
    prize_pool?: string | null;
    starts_at?: string | null;
    status?: TournamentStatus;
  } = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n || n.length > 120) return { ok: false, error: "სახელი არასწორია" };
    patch.name = n;
  }
  if (input.format !== undefined && FORMATS.includes(input.format as TournamentFormat)) patch.format = input.format as TournamentFormat;
  if (input.maxParticipants !== undefined) {
    const m = Number(input.maxParticipants);
    if (!Number.isInteger(m) || m < 2 || m > 256) return { ok: false, error: "მონაწილეთა რაოდენობა არასწორია" };
    patch.max_participants = m;
  }
  if (input.prizePool !== undefined) patch.prize_pool = input.prizePool.trim() || null;
  if (input.startsAt !== undefined) {
    if (!input.startsAt) patch.starts_at = null;
    else {
      const d = new Date(input.startsAt);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "დაწყების დრო არასწორია" };
      patch.starts_at = d.toISOString();
    }
  }
  if (input.status !== undefined && STATUSES.includes(input.status as TournamentStatus)) patch.status = input.status as TournamentStatus;
  if (Object.keys(patch).length === 0) return { ok: true };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("tournaments").update(patch).eq("id", id);
  if (error) {
    logger.error("failed to update tournament", { userId: auth.userId, id, error });
    return { ok: false, error: "განახლება ვერ მოხერხდა" };
  }
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  return { ok: true };
}

export async function deleteTournamentAction(id: string): Promise<AdminTournamentResult> {
  const auth = await requirePermission("manage_tournaments");
  if (!auth.ok) return { ok: false, error: auth.status === 401 ? "ავტორიზაცია აუცილებელია" : "წვდომა აკრძალულია" };
  if (!id) return { ok: false, error: "id required" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("tournaments").delete().eq("id", id);
  if (error) {
    logger.error("failed to delete tournament", { userId: auth.userId, id, error });
    return { ok: false, error: "წაშლა ვერ მოხერხდა" };
  }
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  return { ok: true };
}
