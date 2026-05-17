import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/profile/${displayName}`}>ჩემი პროფილი</Link>} />
        <DropdownMenuItem render={<Link href="/settings">პარამეტრები</Link>} />
        <DropdownMenuItem render={<Link href="/lfg/new">LFG დაპოსტვა</Link>} />
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/auth/logout">გასვლა</Link>} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
