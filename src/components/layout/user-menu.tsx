import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { AvatarSync } from "@/components/avatar-sync";
import { LogoutButton } from "@/components/logout-button";

export async function UserMenu() {
  const user = await getSession().catch(() => null);

  if (!user) {
    return (
      <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
        <Link href="/auth/login">
          <LogIn className="mr-1 h-4 w-4" /> შესვლა
        </Link>
      </Button>
    );
  }

  const displayName =
    (user.user_metadata?.username as string | undefined) ??
    user.email?.split("@")[0] ??
    "მოთამაშე";
  const initial = displayName.slice(0, 1).toUpperCase();
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? "/default-avatar.svg";

  return (
    <>
    <AvatarSync username={displayName} avatarUrl={avatarUrl} />
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-56" style={{ background: "rgba(8,6,15,0.95)", border: "1px solid rgba(236,72,153,0.35)", boxShadow: "0 0 24px rgba(236,72,153,0.2), 0 8px 32px rgba(0,0,0,0.6)" }}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold" style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.5)" }}>{displayName}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)", textShadow: "0 0 6px rgba(236,72,153,0.6)" }}>{user.email}</span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator style={{ background: "rgba(236,72,153,0.25)" }} />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={`/profile/${displayName}`} style={{ color: "#ffffff", textShadow: "0 0 7px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45)" }}>ჩემი პროფილი</Link>} />
            <DropdownMenuItem render={<Link href="/settings" style={{ color: "#ffffff", textShadow: "0 0 7px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45)" }}>პარამეტრები</Link>} />
            <DropdownMenuItem render={<Link href="/lfg/new" style={{ color: "#ffffff", textShadow: "0 0 7px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45)" }}>ლოკალის დაპოსტვა</Link>} />
          </DropdownMenuGroup>
          <DropdownMenuSeparator style={{ background: "rgba(236,72,153,0.25)" }} />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<LogoutButton />} />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    </>
  );
}
