"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

type Result = { success: boolean; message?: string };

// Toggle the caller's "looking for a clan" flag (self-update; profiles column is
// granted UPDATE to authenticated). Only meaningful for users not in a clan.
export async function setLookingForClanAction(value: boolean): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ looking_for_clan: value }).eq("id", user.id);
  if (error) return { success: false, message: "ვერ მოხერხდა" };
  revalidatePath("/clans/finder");
  return { success: true, message: value ? "ახლა ჩანხარ კლანების ძიებაში 🔎" : "ამოღებულია ძიებიდან" };
}
