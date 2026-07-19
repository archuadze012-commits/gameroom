import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PageHeader } from "@/components/page-header";
import { ClanEditForm } from "./clan-edit-form";

export const metadata = { title: "კლანის რედაქტირება", robots: { index: false } };

export default async function EditClanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSession();
  if (!user) redirect(`/auth/login?next=/clans/${slug}/edit`);

  const supabase = await createSupabaseServerClient();
  const { data: clan } = await supabase
    .from("clans")
    .select("id, name, tag, description, status, avatar_url, banner_url, recruiting, recruit_note, rules, recruiting_roles, discord_url, youtube_url, tiktok_url, instagram_url, twitch_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!clan) notFound();

  // Leader-only.
  const { data: membership } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "leader") redirect(`/clans/${slug}`);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />
      <div className="container relative mx-auto max-w-5xl px-4 py-8 lg:py-10">
        <Link
          href={`/clans/${slug}`}
          className="mb-5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> კლანზე დაბრუნება
        </Link>

        <PageHeader
          color="indigo"
          eyebrow="რედაქტირება"
          title={clan.name}
          description="შეცვალე კლანის აღწერა და გაწევრიანების პოლიტიკა."
        />

        <ClanEditForm
          slug={slug}
          tag={clan.tag}
          description={clan.description ?? ""}
          status={clan.status}
          avatarUrl={clan.avatar_url}
          bannerUrl={clan.banner_url}
          recruiting={clan.recruiting}
          recruitNote={clan.recruit_note ?? ""}
          rules={clan.rules ?? ""}
          recruitingRoles={(clan.recruiting_roles ?? []).join(", ")}
          socials={{
            discord: clan.discord_url ?? "",
            youtube: clan.youtube_url ?? "",
            tiktok: clan.tiktok_url ?? "",
            instagram: clan.instagram_url ?? "",
            twitch: clan.twitch_url ?? "",
          }}
        />
      </div>
    </div>
  );
}
