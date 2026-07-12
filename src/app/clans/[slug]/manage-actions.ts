"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-manage-actions");

export async function processClanRequestAction(
  requestId: string,
  action: "accept" | "reject",
  clanSlug: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  // 1. Verify user is leader/officer of the clan
  const { data: request } = await supabase
    .from("clan_requests")
    .select("clan_id, user_id, status")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") {
    return { success: false, message: "მოთხოვნა არ არსებობს ან უკვე დამუშავებულია" };
  }

  const { data: membership } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", request.clan_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["leader", "officer"].includes(membership.role)) {
    return { success: false, message: "არ გაქვს მოთხოვნის მართვის უფლება" };
  }

  // 2. Process request
  if (action === "reject") {
    await supabase
      .from("clan_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);
      
    revalidatePath(`/clans/${clanSlug}`);
    return { success: true, message: "მოთხოვნა უარყოფილია" };
  }

  if (action === "accept") {
    // Check if the user is already in another clan
    const { data: existingClan } = await supabase
      .from("clan_members")
      .select("id")
      .eq("user_id", request.user_id)
      .maybeSingle();

    if (existingClan) {
      await supabase.from("clan_requests").update({ status: "rejected" }).eq("id", requestId);
      return { success: false, message: "მომხმარებელი უკვე სხვა კლანშია" };
    }

    // Add to members
    const { error: insertErr } = await supabase.from("clan_members").insert({
      clan_id: request.clan_id,
      user_id: request.user_id,
      role: "member",
    });

    if (insertErr) {
      // The clan_members_user_id_uniq index is the atomic backstop for the racy
      // check above: a concurrent accept that already placed this user in a clan
      // makes this insert violate the unique (23505) rather than double-joining.
      if (insertErr.code === "23505") {
        await supabase.from("clan_requests").update({ status: "rejected" }).eq("id", requestId);
        return { success: false, message: "მომხმარებელი უკვე სხვა კლანშია" };
      }
      logger.error("failed to add clan member from request", { requestId, clanSlug, error: insertErr });
      return { success: false, message: "გაწევრიანება ვერ მოხერხდა" };
    }

    // Update request status
    await supabase
      .from("clan_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    revalidatePath(`/clans/${clanSlug}`);
    return { success: true, message: "მოთხოვნა დადასტურებულია!" };
  }

  return { success: false, message: "უცნობი მოქმედება" };
}

export async function kickClanMemberAction(
  memberId: string,
  clanSlug: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  // 1. Get the member to kick and verify caller permissions
  const { data: targetMember } = await supabase
    .from("clan_members")
    .select("clan_id, user_id, role")
    .eq("id", memberId)
    .single();

  if (!targetMember) return { success: false, message: "წევრი ვერ მოიძებნა" };

  // Cannot kick yourself this way (use leave action instead)
  if (targetMember.user_id === user.id) {
    return { success: false, message: "საკუთარი თავის გაგდება არ შეგიძლია" };
  }

  const { data: callerMember } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", targetMember.clan_id)
    .eq("user_id", user.id)
    .single();

  if (!callerMember) return { success: false, message: "უფლებები არ გაქვთ" };

  // Logic: Leader can kick anyone. Officer can kick only members.
  if (callerMember.role === "member") {
    return { success: false, message: "მხოლოდ ლიდერებს და ოფიცრებს შეუძლიათ წევრის გაგდება" };
  }
  if (callerMember.role === "officer" && targetMember.role !== "member") {
    return { success: false, message: "ოფიცერს არ შეუძლია სხვა ოფიცრის ან ლიდერის გაგდება" };
  }

  const { error } = await supabase
    .from("clan_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    logger.error("failed to kick clan member", { memberId, clanSlug, error });
    return { success: false, message: "წევრის გაგდება ვერ მოხერხდა" };
  }

  revalidatePath(`/clans/${clanSlug}`);
  return { success: true, message: "წევრი გაძევებულია კლანიდან" };
}

// A member voluntarily leaves. A leader may only leave once they are the sole
// member (that disbands the clan) — otherwise they must transfer leadership or
// disband explicitly, so a clan is never left leaderless.
export async function leaveClanAction(
  clanSlug: string
): Promise<{ success: boolean; message?: string; disbanded?: boolean }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  const { data: clan } = await supabase.from("clans").select("id").eq("slug", clanSlug).maybeSingle();
  if (!clan) return { success: false, message: "კლანი ვერ მოიძებნა" };

  const { data: membership } = await supabase
    .from("clan_members")
    .select("id, role")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { success: false, message: "ამ კლანის წევრი არ ხარ" };

  if (membership.role === "leader") {
    const { count } = await supabase
      .from("clan_members")
      .select("id", { count: "exact", head: true })
      .eq("clan_id", clan.id);
    if ((count ?? 0) > 1) {
      return { success: false, message: "ჯერ გადაეცი ლიდერობა ან დაშალე კლანი" };
    }
    // Sole member leader → disband (cascade removes membership).
    const { error } = await supabase.from("clans").delete().eq("id", clan.id);
    if (error) {
      logger.error("failed to disband clan on leader leave", { clanSlug, error });
      return { success: false, message: "ვერ მოხერხდა" };
    }
    revalidatePath("/clans");
    return { success: true, message: "კლანი დაიშალა", disbanded: true };
  }

  const { error } = await supabase.from("clan_members").delete().eq("id", membership.id);
  if (error) {
    logger.error("failed to leave clan", { clanSlug, userId: user.id, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath(`/clans/${clanSlug}`);
  revalidatePath("/clans");
  return { success: true, message: "დატოვე კლანი" };
}

// Leader-only: promote a member to officer or demote an officer to member.
export async function changeMemberRoleAction(
  memberId: string,
  newRole: "officer" | "member",
  clanSlug: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  const { data: target } = await supabase
    .from("clan_members")
    .select("clan_id, user_id, role")
    .eq("id", memberId)
    .single();
  if (!target) return { success: false, message: "წევრი ვერ მოიძებნა" };
  if (target.role === "leader") return { success: false, message: "ლიდერის როლი ვერ იცვლება" };

  const { data: caller } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", target.clan_id)
    .eq("user_id", user.id)
    .single();
  if (!caller || caller.role !== "leader") {
    return { success: false, message: "მხოლოდ ლიდერს შეუძლია როლების მართვა" };
  }
  if (target.user_id === user.id) return { success: false, message: "საკუთარ როლს ვერ შეცვლი" };

  const { error } = await supabase.from("clan_members").update({ role: newRole }).eq("id", memberId);
  if (error) {
    logger.error("failed to change clan member role", { memberId, clanSlug, newRole, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath(`/clans/${clanSlug}`);
  return { success: true, message: newRole === "officer" ? "დაწინაურდა ოფიცრად" : "ჩამოქვეითდა წევრად" };
}

// Leader-only: hand the crown to another member. Caller becomes an officer.
export async function transferLeadershipAction(
  memberId: string,
  clanSlug: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  const { data: target } = await supabase
    .from("clan_members")
    .select("id, clan_id, user_id")
    .eq("id", memberId)
    .single();
  if (!target) return { success: false, message: "წევრი ვერ მოიძებნა" };

  const { data: caller } = await supabase
    .from("clan_members")
    .select("id, role")
    .eq("clan_id", target.clan_id)
    .eq("user_id", user.id)
    .single();
  if (!caller || caller.role !== "leader") {
    return { success: false, message: "მხოლოდ ლიდერს შეუძლია ლიდერობის გადაცემა" };
  }
  if (target.user_id === user.id) return { success: false, message: "შენ უკვე ლიდერი ხარ" };

  // Promote target to leader, demote former leader to officer.
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("clan_members").update({ role: "leader" }).eq("id", target.id),
    supabase.from("clan_members").update({ role: "officer" }).eq("id", caller.id),
  ]);
  if (e1 || e2) {
    logger.error("failed to transfer clan leadership", { memberId, clanSlug, e1, e2 });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath(`/clans/${clanSlug}`);
  return { success: true, message: "ლიდერობა გადაცემულია" };
}

// Leader-only: permanently delete the clan (cascade removes members/requests).
export async function disbandClanAction(
  clanSlug: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  const { data: clan } = await supabase.from("clans").select("id").eq("slug", clanSlug).maybeSingle();
  if (!clan) return { success: false, message: "კლანი ვერ მოიძებნა" };

  const { data: caller } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .single();
  if (!caller || caller.role !== "leader") {
    return { success: false, message: "მხოლოდ ლიდერს შეუძლია კლანის დაშლა" };
  }

  const { error } = await supabase.from("clans").delete().eq("id", clan.id);
  if (error) {
    logger.error("failed to disband clan", { clanSlug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath("/clans");
  return { success: true, message: "კლანი დაიშალა" };
}
