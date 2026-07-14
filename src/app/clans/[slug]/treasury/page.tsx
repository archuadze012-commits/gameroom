import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Coins, Lock } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClanTreasury, type CatalogItem, type LedgerItem } from "../clan-treasury";

export const dynamic = "force-dynamic";
export const metadata = { title: "ხაზინა | კლანი", robots: { index: false } };

type LedgerRow = { id: string; delta: number; kind: string; memo: string | null; created_at: string; user_id: string | null };

export default async function ClanTreasuryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: clan }, session] = await Promise.all([
    supabase.from("clans").select("id, name, slug, tag, avatar_url, treasury, accent_color, emblem").eq("slug", slug).maybeSingle(),
    getSession().catch(() => null),
  ]);
  if (!clan) notFound();

  let role: string | null = null;
  if (session) {
    const { data: m } = await supabase.from("clan_members").select("role").eq("clan_id", clan.id).eq("user_id", session.id).maybeSingle();
    role = m?.role ?? null;
  }
  const isMember = !!role;
  const canManage = role === "leader" || role === "officer";

  const header = (
    <>
      <Link
        href={`/clans/${slug}`}
        className="mb-5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {clan.name}
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <Avatar className="h-11 w-11 rounded-xl border border-amber-500/30">
          <AvatarImage src={clan.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-xl">{clan.tag}</AvatarFallback>
        </Avatar>
        <h1 className="flex items-center gap-2 font-display text-[22px] font-black uppercase text-white">
          <Coins className="h-5 w-5 text-amber-400" /> ხაზინა
        </h1>
      </div>
    </>
  );

  if (!isMember) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
        <CinematicBackground color="pink" />
        <div className="container relative mx-auto max-w-2xl px-4 py-8 lg:py-10">
          {header}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
            <Lock className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[13px] text-white/45">ხაზინა მხოლოდ კლანის წევრებისთვისაა.</p>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: catalogRows }, { data: ownedRows }, { data: ledgerRows }, walletRes] = await Promise.all([
    supabase.from("clan_cosmetic_catalog").select("key, name, type, cost, value, sort").order("sort", { ascending: true }),
    supabase.from("clan_cosmetics").select("cosmetic_key").eq("clan_id", clan.id),
    supabase.from("clan_treasury_ledger").select("id, delta, kind, memo, created_at, user_id").eq("clan_id", clan.id).order("created_at", { ascending: false }).limit(15),
    session ? supabase.from("wallets").select("nc_balance").eq("user_id", session.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const catalog = ((catalogRows ?? []) as { key: string; name: string; type: string; cost: number; value: string }[]).map((c) => ({
    key: c.key,
    name: c.name,
    type: c.type as "accent" | "emblem",
    cost: c.cost,
    value: c.value,
  })) as CatalogItem[];
  const owned = ((ownedRows ?? []) as { cosmetic_key: string }[]).map((o) => o.cosmetic_key);

  // Donor names for the ledger.
  const rows = (ledgerRows ?? []) as LedgerRow[];
  const donorIds = [...new Set(rows.filter((r) => r.kind === "donation" && r.user_id).map((r) => r.user_id as string))];
  const nameById = new Map<string, string>();
  if (donorIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, username, display_name").in("id", donorIds);
    (profs ?? []).forEach((p) => nameById.set(p.id, p.display_name || p.username));
  }
  const ledger: LedgerItem[] = rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    kind: r.kind,
    memo: r.memo,
    created_at: r.created_at,
    who: r.user_id ? nameById.get(r.user_id) ?? null : null,
  }));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="pink" />
      <div className="container relative mx-auto max-w-2xl px-4 py-8 lg:py-10">
        {header}
        <ClanTreasury
          clanSlug={slug}
          canManage={canManage}
          treasury={clan.treasury}
          walletNc={walletRes.data?.nc_balance ?? null}
          catalog={catalog}
          owned={owned}
          equipped={{ accent: clan.accent_color, emblem: clan.emblem }}
          ledger={ledger}
        />
      </div>
    </div>
  );
}
