"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { isBlocked } from "@/lib/blocks";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "მესიჯი ცარიელია").max(2000, "მესიჯი ზედმეტად გრძელია"),
});

const logger = createLogger("messages-actions");

export type DirectMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type SendMessageState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  newMsg?: DirectMessage;
};

export async function sendMessageAction(
  prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "ავტორიზაცია აუცილებელია" };
  }

  // Anti-flood: cap DM sends per user per minute.
  if (!(await rateLimitShared(`dm-send:${user.id}`, 30, 60_000))) {
    return { success: false, message: "ნელა, ძალიან ბევრ მესიჯს აგზავნი. სცადე ცოტა ხანში." };
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

  // A block (either direction) stops sends even in an existing thread.
  if (await isBlocked(user.id, recipientId)) {
    return { success: false, message: "ამ მომხმარებელს ვეღარ მისწერ." };
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    })
    .select("id, sender_id, body, created_at, read_at")
    .single();

  if (error) {
    logger.error("failed to insert direct message", { userId: user.id, conversationId, error });
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
    newMsg: data
      ? { ...data, created_at: data.created_at ?? new Date().toISOString() }
      : undefined,
  };
}

export async function deleteConversationAction(
  conversationId: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (convoError) {
    logger.error("failed to lookup conversation before delete", { userId: user.id, conversationId, error: convoError });
    return { success: false, message: "წაშლა ვერ მოხერხდა" };
  }

  if (!conversation || (conversation.user_a !== user.id && conversation.user_b !== user.id)) {
    return { success: false, message: "წვდომა შეზღუდულია" };
  }

  const deletedAt = new Date().toISOString();
  const { error: messageError } = await supabase
    .from("conversation_messages")
    .update({ deleted_at: deletedAt })
    .eq("conversation_id", conversationId);

  if (messageError) {
    logger.error("failed to soft-delete conversation messages", { userId: user.id, conversationId, error: messageError });
    return { success: false, message: "წაშლა ვერ მოხერხდა" };
  }

  const { error: deleteError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (deleteError) {
    logger.error("failed to delete conversation", { userId: user.id, conversationId, error: deleteError });
    return { success: false, message: "წაშლა ვერ მოხერხდა" };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { success: true };
}
