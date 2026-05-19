import { Trophy, Users as UsersIcon, Gamepad2 } from "lucide-react";

export function ProfileStats({
  lfgCount,
  followerCount,
  gameCount,
}: {
  lfgCount: number;
  followerCount: number;
  gameCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
      <Stat icon={<UsersIcon className="h-4 w-4" />} value={String(followerCount)} label="გამომწერი" />
      <Stat icon={<Gamepad2 className="h-4 w-4" />} value={String(gameCount)} label="თამაში" />
      <Stat icon={<Trophy className="h-4 w-4" />} value="0" label="ტიტული" />
      <Stat icon={<UsersIcon className="h-4 w-4" />} value={String(lfgCount)} label="LFG დაპოსტილი" />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <div className="flex items-center justify-center gap-1 text-primary">{icon}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
