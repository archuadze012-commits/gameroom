import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getClanGameContext } from "@/lib/clan/context";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { ClanSubPageHeader } from "@/components/clan/clan-subpage-header";
import { ClanChat } from "@/app/clans/[slug]/clan-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "კლანის ჩატი", robots: { index: false } };

export default async function ClanChatPage({
  params,
}: {
  params: Promise<{ slug: string; clanSlug: string }>;
}) {
  const { slug, clanSlug } = await params;
  const ctx = await getClanGameContext(slug, clanSlug);
  if (!ctx) notFound();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="cyan" />
      <div className="container relative mx-auto max-w-3xl px-4 py-8 lg:py-10">
        <ClanSubPageHeader
          clanSlug={clanSlug}
          clanName={ctx.clan.name}
          clanTag={ctx.clan.tag}
          clanAvatar={ctx.clan.avatar_url}
          gameName={ctx.game.name_ka}
          title="კლანის ჩატი"
          icon={MessageSquare}
          tone="text-cyan-300"
        />

        {ctx.isMember && ctx.session ? (
          <ClanChat clanId={ctx.clan.id} clanSlug={clanSlug} currentUserId={ctx.session.id} />
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-14 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-[13.5px] font-bold text-white/60">ჩატი მხოლოდ კლანის წევრებისთვისაა</p>
            <Link
              href={`/clans/${clanSlug}`}
              className="mt-4 inline-flex rounded-xl bg-[var(--gr-violet-hi)] px-5 py-2.5 text-[12px] font-black uppercase tracking-wider text-white transition-all hover:brightness-110"
            >
              კლანის გვერდზე გადასვლა
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
