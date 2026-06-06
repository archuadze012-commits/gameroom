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
