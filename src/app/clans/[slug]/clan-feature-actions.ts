"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderate";
import { rateLimitShared } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-feature-actions");

type Result = { success: boolean; message?: string };

// Clan XP curve: every 1000 XP is a level. Awards clan XP and credits the acting
// member's personal contribution in one shot.
async function awardClanXp(clanId: string, userId: string, amount: number) {
  const admin = createSupabaseAdminClient();
  try {
    await admin.rpc("award_clan_xp", { p_clan: clanId, p_user: userId, p_amount: amount });
  } catch (e) {
    logger.warn("award_clan_xp failed", { clanId, error: e });
  }
}

// Resolve the caller's clan + role from a slug. Uses the admin client so role
// checks are reliable regardless of RLS.
async function resolveRole(slug: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: clan } = await admin.from("clans").select("id").eq("slug", slug).maybeSingle();
  if (!clan) return null;
  const { data: m } = await admin
    .from("clan_members")
    .select("role")
    .eq("clan_id", clan.id)
    .eq("user_id", userId)
    .maybeSingle();
  return { clanId: clan.id as string, role: (m?.role as string | undefined) ?? null };
}

// ── Announcements ────────────────────────────────────────────
export async function postClanAnnouncementAction(slug: string, body: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  if (!(await rateLimitShared(`clan-ann:${user.id}`, 10, 60_000)))
    return { success: false, message: "ძალიან ხშირად — სცადე ცოტა ხანში" };

  const text = body.trim().slice(0, 2000);
  if (!text) return { success: false, message: "ტექსტი აუცილებელია" };

  const info = await resolveRole(slug, user.id);
  if (!info) return { success: false, message: "კლანი ვერ მოიძებნა" };
  if (!["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "მხოლოდ ლიდერს/ოფიცერს შეუძლია განცხადება" };
  }

  const mod = await moderateText(text).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("clan_announcements").insert({ clan_id: info.clanId, author_id: user.id, body: text });
  if (error) {
    logger.error("failed to post clan announcement", { slug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  await awardClanXp(info.clanId, user.id, 50);
  revalidatePath(`/clans/${slug}`);
  return { success: true, message: "განცხადება გამოქვეყნდა" };
}

export async function deleteClanAnnouncementAction(announcementId: string, slug: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveRole(slug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "უფლება არ გაქვს" };
  }
  const admin = createSupabaseAdminClient();
  await admin.from("clan_announcements").delete().eq("id", announcementId).eq("clan_id", info.clanId);
  revalidatePath(`/clans/${slug}`);
  return { success: true };
}

// ── Events ───────────────────────────────────────────────────
export async function createClanEventAction(
  slug: string,
  title: string,
  description: string,
  startsAt: string
): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const t = title.trim().slice(0, 120);
  const d = description.trim().slice(0, 1000);
  const when = new Date(startsAt);
  if (!t) return { success: false, message: "სათაური აუცილებელია" };
  if (Number.isNaN(when.getTime())) return { success: false, message: "თარიღი არასწორია" };

  const info = await resolveRole(slug, user.id);
  if (!info) return { success: false, message: "კლანი ვერ მოიძებნა" };
  if (!["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "მხოლოდ ლიდერს/ოფიცერს შეუძლია ივენთი" };
  }

  const mod = await moderateText(`${t} ${d}`).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };

  const admin = createSupabaseAdminClient();
  const { data: ev, error } = await admin
    .from("clan_events")
    .insert({ clan_id: info.clanId, created_by: user.id, title: t, description: d || null, starts_at: when.toISOString() })
    .select("id")
    .single();
  if (error || !ev) {
    logger.error("failed to create clan event", { slug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  // Creator auto-RSVPs "going".
  await admin.from("clan_event_rsvps").upsert({ event_id: ev.id, user_id: user.id, status: "going" });
  await awardClanXp(info.clanId, user.id, 30);
  revalidatePath(`/clans/${slug}`);
  return { success: true, message: "ივენთი დაემატა" };
}

export async function rsvpClanEventAction(
  eventId: string,
  slug: string,
  status: "going" | "maybe" | "no"
): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const admin = createSupabaseAdminClient();
  const { data: ev } = await admin.from("clan_events").select("clan_id").eq("id", eventId).maybeSingle();
  if (!ev) return { success: false, message: "ივენთი ვერ მოიძებნა" };

  const { data: m } = await admin
    .from("clan_members")
    .select("id")
    .eq("clan_id", ev.clan_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!m) return { success: false, message: "კლანის წევრი არ ხარ" };

  const { error } = await admin.from("clan_event_rsvps").upsert({ event_id: eventId, user_id: user.id, status });
  if (error) return { success: false, message: "ვერ მოხერხდა" };
  revalidatePath(`/clans/${slug}`);
  return { success: true };
}

export async function deleteClanEventAction(eventId: string, slug: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveRole(slug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "უფლება არ გაქვს" };
  }
  const admin = createSupabaseAdminClient();
  await admin.from("clan_events").delete().eq("id", eventId).eq("clan_id", info.clanId);
  revalidatePath(`/clans/${slug}`);
  return { success: true };
}

// ── Recruitment ──────────────────────────────────────────────
export async function setClanRecruitingAction(slug: string, recruiting: boolean, note: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveRole(slug, user.id);
  if (!info || info.role !== "leader") return { success: false, message: "მხოლოდ ლიდერს შეუძლია" };

  const n = note.trim().slice(0, 200);
  if (n) {
    const mod = await moderateText(n).catch(() => ({ ok: true, reason: undefined as string | undefined }));
    if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };
  }
  const admin = createSupabaseAdminClient();
  await admin.from("clans").update({ recruiting, recruit_note: n || null }).eq("id", info.clanId);
  revalidatePath(`/clans/${slug}`);
  return { success: true, message: recruiting ? "რექრუტინგი ჩაირთო" : "რექრუტინგი გაითიშა" };
}

// ── Invites ──────────────────────────────────────────────────
export async function inviteToClanAction(slug: string, username: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  if (!(await rateLimitShared(`clan-invite:${user.id}`, 20, 60_000)))
    return { success: false, message: "ძალიან ხშირად — სცადე ცოტა ხანში" };

  const info = await resolveRole(slug, user.id);
  if (!info) return { success: false, message: "კლანი ვერ მოიძებნა" };
  if (!["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "მხოლოდ ლიდერს/ოფიცერს შეუძლია მოწვევა" };
  }

  const admin = createSupabaseAdminClient();
  const uname = username.trim().toLowerCase();
  const { data: target } = await admin
    .from("profiles")
    .select("id, username, display_name")
    .ilike("username", uname)
    .eq("banned", false)
    .maybeSingle();
  if (!target) return { success: false, message: "მოთამაშე ვერ მოიძებნა" };
  if (target.id === user.id) return { success: false, message: "საკუთარ თავს ვერ მოიწვევ" };

  const { data: already } = await admin.from("clan_members").select("id").eq("user_id", target.id).maybeSingle();
  if (already) return { success: false, message: "მოთამაშე უკვე კლანშია" };

  const { data: clan } = await admin.from("clans").select("name, slug, tag").eq("id", info.clanId).maybeSingle();

  const { error } = await admin.from("clan_invites").insert({
    clan_id: info.clanId,
    invited_user: target.id,
    invited_by: user.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { success: false, message: "მოწვევა უკვე გაგზავნილია" };
    logger.error("failed to invite to clan", { slug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }

  await admin.from("notifications").insert({
    user_id: target.id,
    type: "referral", // reuse the "invite"-flavoured notification type
    title: `მოწვევა კლანში ${clan?.tag ? `[${clan.tag}]` : ""} 🛡️`,
    body: `${clan?.name ?? "კლანი"}-მა მოგიწვია. ნახე და შეუერთდი.`,
    link: `/clans/${clan?.slug ?? slug}`,
  });
  await sendPushToUser(target.id, {
    title: "კლანში მოგიწვიეს 🛡️",
    body: `${clan?.name ?? "კლანი"}-მა მოგიწვია`,
    url: `/clans/${clan?.slug ?? slug}`,
    tag: "clan-invite",
  }).catch(() => {});

  revalidatePath(`/clans/${slug}`);
  return { success: true, message: `${target.display_name || target.username} მოწვეულია` };
}

// ── Tournament / practice registration ──────────────────────
// A clan leader/officer registers the whole clan for a tournament (or practice
// event) of the clan's game. The registering user is stored as the captain
// (user_id) with clan_id marking the clan entry; team_name = clan name.
export async function registerClanForTournamentAction(slug: string, tournamentSlug: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const info = await resolveRole(slug, user.id);
  if (!info) return { success: false, message: "კლანი ვერ მოიძებნა" };
  if (!["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "მხოლოდ ლიდერს/ოფიცერს შეუძლია რეგისტრაცია" };
  }

  const admin = createSupabaseAdminClient();
  const { data: clan } = await admin.from("clans").select("name, game_slug").eq("id", info.clanId).maybeSingle();
  const { data: t } = await admin
    .from("tournaments")
    .select("id, status, max_participants, game_id, games:game_id(slug)")
    .eq("slug", tournamentSlug)
    .maybeSingle();
  if (!t) return { success: false, message: "ტურნირი ვერ მოიძებნა" };
  if (t.status !== "open") return { success: false, message: "რეგისტრაცია დახურულია" };

  const tGameSlug = (t.games as { slug: string } | { slug: string }[] | null);
  const gameSlug = Array.isArray(tGameSlug) ? tGameSlug[0]?.slug : tGameSlug?.slug;
  if (clan?.game_slug && gameSlug && clan.game_slug !== gameSlug) {
    return { success: false, message: "ეს ტურნირი სხვა თამაშისაა" };
  }

  const { count } = await admin
    .from("tournament_participants")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", t.id);
  if ((count ?? 0) >= (t.max_participants || 8)) {
    return { success: false, message: "ტურნირი შევსებულია" };
  }

  const { data: existing } = await admin
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", t.id)
    .eq("clan_id", info.clanId)
    .maybeSingle();
  if (existing) return { success: false, message: "კლანი უკვე დარეგისტრირებულია" };

  const { error } = await admin.from("tournament_participants").insert({
    tournament_id: t.id,
    user_id: user.id,
    clan_id: info.clanId,
    team_name: clan?.name ?? null,
    seed: (count ?? 0) + 1,
    checked_in: false,
  });
  if (error) {
    if (error.code === "23505") return { success: false, message: "კლანი უკვე დარეგისტრირებულია" };
    logger.error("failed to register clan for tournament", { slug, tournamentSlug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  await awardClanXp(info.clanId, user.id, 40);
  revalidatePath(`/clans/${slug}`);
  return { success: true, message: "კლანი დარეგისტრირდა! 🏆" };
}

export async function unregisterClanFromTournamentAction(slug: string, tournamentSlug: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveRole(slug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) {
    return { success: false, message: "უფლება არ გაქვს" };
  }
  const admin = createSupabaseAdminClient();
  const { data: t } = await admin.from("tournaments").select("id, status").eq("slug", tournamentSlug).maybeSingle();
  if (!t) return { success: false, message: "ტურნირი ვერ მოიძებნა" };
  if (t.status !== "open") return { success: false, message: "რეგისტრაცია დახურულია" };
  await admin.from("tournament_participants").delete().eq("tournament_id", t.id).eq("clan_id", info.clanId);
  revalidatePath(`/clans/${slug}`);
  return { success: true, message: "რეგისტრაცია გაუქმდა" };
}

export async function respondClanInviteAction(inviteId: string, accept: boolean): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const admin = createSupabaseAdminClient();
  const { data: invite } = await admin
    .from("clan_invites")
    .select("id, clan_id, invited_user, status")
    .eq("id", inviteId)
    .maybeSingle();
  if (!invite || invite.invited_user !== user.id || invite.status !== "pending") {
    return { success: false, message: "მოწვევა არ არსებობს" };
  }

  const { data: clan } = await admin.from("clans").select("slug").eq("id", invite.clan_id).maybeSingle();

  if (!accept) {
    await admin.from("clan_invites").update({ status: "declined" }).eq("id", inviteId);
    return { success: true, message: "მოწვევა უარყოფილია" };
  }

  const { data: already } = await admin.from("clan_members").select("id").eq("user_id", user.id).maybeSingle();
  if (already) {
    await admin.from("clan_invites").update({ status: "declined" }).eq("id", inviteId);
    return { success: false, message: "ჯერ გადი ამჟამინდელი კლანიდან" };
  }

  const { error } = await admin.from("clan_members").insert({ clan_id: invite.clan_id, user_id: user.id, role: "member" });
  if (error) {
    if (error.code === "23505") return { success: false, message: "უკვე კლანის წევრი ხარ" };
    return { success: false, message: "ვერ მოხერხდა" };
  }
  await admin.from("clan_invites").update({ status: "accepted" }).eq("id", inviteId);
  await awardClanXp(invite.clan_id, user.id, 100);
  if (clan?.slug) revalidatePath(`/clans/${clan.slug}`);
  return { success: true, message: "მოგესალმებით კლანში! 🎉" };
}
