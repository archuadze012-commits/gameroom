import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConversationClient } from "./conversation-client";

export const metadata = { title: "მესიჯი" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, user_a, user_b")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    notFound();
  }

  const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
  const { data: other } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, is_verified")
    .eq("id", otherId)
    .maybeSingle();

  return (
    <div className="relative mx-auto h-dvh w-full max-w-2xl overflow-hidden px-3 py-2 -mt-16 -mb-6 sm:mt-0 sm:mb-0 sm:h-[calc(100vh-6rem)] sm:px-4 sm:py-6">
      {/* Dot grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      
      <ConversationClient
        conversationId={id}
        currentUserId={user.id}
        other={{
          id: otherId,
          username: other?.username ?? "user",
          displayName: other?.display_name ?? null,
          avatarUrl: other?.avatar_url ?? null,
          isVerified: !!other?.is_verified,
        }}
      />
    </div>
  );
}
