"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { awardBonusXp } from "@/lib/gamification";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";
import { type FeedPost } from "./page";

const logger = createLogger("feed-actions");

const createPostSchema = z.object({
  content: z.string().min(1, "ტექსტი აუცილებელია").max(2000, "პოსტი ზედმეტად გრძელია"),
  mediaUrls: z.array(z.string()).max(4).optional(),
});

export type PostActionState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  newPost?: FeedPost;
};

export async function createPostAction(
  prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "ავტორიზაცია აუცილებელია" };
  }

  const rawData = {
    content: formData.get("content"),
    mediaUrls: formData.getAll("mediaUrls") as string[],
  };

  const validated = createPostSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
      message: "გთხოვთ შეავსოთ ყველა ველი სწორად",
    };
  }

  const { data: body } = validated;

  // Blocklist + toxicity gate before the post is stored (fails open if the AI
  // moderator is unavailable, but the blocklist still applies).
  const mod = await moderateText(body.content).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return { success: false, message: mod.reason ? `დაბლოკილია: ${mod.reason}` : "პოსტი დაიბლოკა მოდერაციამ" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      content: body.content.trim(),
      media_urls: body.mediaUrls,
    })
    .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url, is_verified, role)")
    .single();

  if (error) {
    logger.error("failed to create feed post", { userId: user.id, error });
    return { success: false, message: "პოსტის გამოქვეყნება ვერ მოხერხდა" };
  }

  await awardBonusXp(user.id, 10, "feed:create-post");

  revalidatePath("/feed");
  revalidatePath("/");
  const extraRevalidatePath = String(formData.get("revalidatePath") ?? "");
  if (extraRevalidatePath.startsWith("/")) {
    revalidatePath(extraRevalidatePath);
  }

  return {
    success: true,
    message: "პოსტი გამოქვეყნდა!",
    newPost: data as unknown as FeedPost,
  };
}
