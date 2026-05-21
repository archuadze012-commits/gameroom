import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type LinkedAccount = {
  provider: "steam" | "riot";
  external_id: string;
  data: {
    personaName?: string;
    profileUrl?: string;
    gameCount?: number;
    riotId?: string;
    tierName?: string;
    tierEmoji?: string;
  } | null;
  verified: boolean;
};

export function ProfileLinkedAccounts({ accounts }: { accounts: LinkedAccount[] }) {
  if (accounts.length === 0) return null;

  const steam = accounts.find((a) => a.provider === "steam");
  const riot = accounts.find((a) => a.provider === "riot");

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-card/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        დაკავშირებული ანგარიშები
      </p>
      <div className="flex flex-wrap gap-2">
        {steam && (
          <a
            href={steam.data?.profileUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/20"
          >
            <span className="text-blue-400">🎮</span>
            <span className="font-medium">{steam.data?.personaName ?? "Steam"}</span>
            {steam.data?.gameCount && (
              <Badge variant="outline" className="border-blue-500/30 text-[10px] text-blue-300">
                {steam.data.gameCount} თამაში
              </Badge>
            )}
            {steam.verified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
          </a>
        )}
        {riot && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            <span>🎯</span>
            <span className="font-medium">{riot.data?.riotId ?? "Riot ID"}</span>
            {riot.data?.tierName && (
              <Badge variant="outline" className="border-red-500/30 text-[10px] text-red-300">
                {riot.data.tierEmoji} {riot.data.tierName}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
