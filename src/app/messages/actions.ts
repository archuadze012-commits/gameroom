"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1, "მესიჯი ცარიელია").max(2000, "მესიჯი ზედმეტად გრძელია"),
});

export type SendMessageState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  newMsg?: any;
};

export async function sendMessageAction(
  prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "ავტორიზაცია აუცილებელია" };
  }

  const rawData = {
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  };

  const validated = sendMessageSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
      message: "არასწორი მონაცემები",
    };
  }

  const { conversationId, body } = validated.data;
  const supabase = await createSupabaseServerClient();

  // Verify participant + get other user id (for push notification)
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return { success: false, message: "წვდომა შეზღუდულია" };
  }

  const recipientId = conv.user_a === user.id ? conv.user_b : conv.user_a;

  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
    })
    .select("id, sender_id, body, created_at, read_at")
    .single();

  if (error) {
    console.error("[sendMessageAction] insert failed:", error);
    return { success: false, message: "გაგზავნა ვერ მოხერხდა" };
  }

  // bump conversation
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Fire push (best-effort, don't block response)
  try {
    const { sendPushToUser } = await import("@/lib/push");
    const { data: sender } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle();
    const name = sender?.display_name ?? sender?.username ?? "ვინმე";
    await sendPushToUser(recipientId, {
      title: `${name}-მ მოგწერა`,
      body: body.slice(0, 100),
      url: `/messages/${conversationId}`,
      tag: `dm-${conversationId}`,
    });
  } catch {}

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");

  return {
    success: true,
    newMsg: data,
  };
}

export async function deleteConversationAction(
  conversationId: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();
  
  // Note: Our conversations_delete_participant RLS policy ensures only participants can delete
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    console.error("[deleteConversationAction]", error);
    return { success: false, message: "წაშლა ვერ მოხერხდა" };
  }

  revalidatePath("/messages");
  return { success: true };
}
