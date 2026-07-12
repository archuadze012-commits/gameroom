import Link from "next/link";
import { UserPlus, Radio, ArrowRight } from "lucide-react";

// A contextual invite nudge shown at moments of social need (a quiet LFG radar,
// a thin social graph) rather than buried on /invite. Catching the user when
// they actually feel the gap converts far better than a standalone page — the
// CTA hands off to /invite, which carries the full share kit + rewards.
type Variant = "few-follows" | "lfg-quiet";

const CONTENT: Record<
  Variant,
  { icon: typeof UserPlus; accent: string; headline: string; sub: string; cta: string }
> = {
  "few-follows": {
    icon: UserPlus,
    accent: "#8b5cf6",
    headline: "PlayGame უკეთესია მეგობრებით",
    sub: "მოიწვიე შენი crew — ააწყე შენი გუნდი და ორივემ მიიღეთ NC.",
    cta: "მოწვევა",
  },
  "lfg-quiet": {
    icon: Radio,
    accent: "#22d3ee",
    headline: "რადარი ჩუმადაა?",
    sub: "მოიწვიე მეგობარი და ითამაშეთ ერთად ახლავე — შენ +1000 NC, ის +500 NC.",
    cta: "მოიწვიე მეგობარი",
  },
};

export function ContextualInvitePrompt({ variant }: { variant: Variant }) {
  const c = CONTENT[variant];
  const Icon = c.icon;

  return (
    <Link
      href="/invite"
      className="group flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all"
      style={{
        borderColor: `${c.accent}4d`,
        background: `linear-gradient(135deg, ${c.accent}1f, ${c.accent}08)`,
      }}
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1"
        style={{ background: `${c.accent}26`, color: c.accent, boxShadow: `0 0 18px ${c.accent}33` }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-black text-white">{c.headline}</p>
        <p className="text-[12.5px] leading-relaxed text-white/55">{c.sub}</p>
      </div>
      <span
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white transition-transform group-hover:translate-x-0.5"
        style={{ background: c.accent }}
      >
        {c.cta} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
