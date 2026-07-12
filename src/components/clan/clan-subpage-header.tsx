import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";

// Consistent header for the game-scoped clan sub-pages (tournaments / scrims /
// chat / rosters). Server component — safe to pass a lucide icon component in.
export function ClanSubPageHeader({
  clanSlug,
  clanName,
  clanTag,
  clanAvatar,
  gameName,
  title,
  icon: Icon,
  tone = "text-indigo-300",
}: {
  clanSlug: string;
  clanName: string;
  clanTag: string;
  clanAvatar: string | null;
  gameName: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="mb-6">
      <Link
        href={`/clans/${clanSlug}`}
        className="mb-5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {clanName}
      </Link>

      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0 rounded-2xl border border-indigo-500/30">
          <AvatarImage src={clanAvatar ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-indigo-500/15 text-lg font-black text-indigo-300">{clanTag}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Pill tone="amber">[{clanTag}]</Pill>
            <Pill tone="cyan">{gameName}</Pill>
          </div>
          <DisplayHeading as="h1" size="md" className="flex items-center gap-2.5 text-white">
            <Icon className={`h-6 w-6 ${tone}`} /> {title}
          </DisplayHeading>
        </div>
      </div>
    </div>
  );
}
