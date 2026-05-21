import Link from "next/link";
import { ShieldAlert, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { PushBell } from "@/components/push-bell";
import { MessagesLink } from "./messages-link";
import { navLinks, adminLinks } from "./nav-links";
import { getCurrentRole } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const role = await getCurrentRole();
  const isAdmin = ["admin", "moderator", "organizer"].includes(role);

  // resolve the canonical profile username for the logged-in user
  const session = await getSession().catch(() => null);
  let profileHref: string | null = null;
  if (session) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", session.id)
      .maybeSingle();
    const username =
      (data?.username as string | undefined) ??
      (session.user_metadata?.username as string | undefined) ??
      session.email?.split("@")[0];
    if (username) profileHref = `/profile/${username}`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold mx-auto xl:mx-0">
          <Image src="/logo.png" alt="Gameroom" width={36} height={36} className="rounded-lg" />
          <span className="text-lg tracking-tight">
            Game<span className="text-primary">room</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 xl:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          {profileHref && (
            <Link
              href={profileHref}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <UserIcon className="h-3.5 w-3.5" />
              პროფილი
            </Link>
          )}
          {isAdmin && (
            <>
              <span className="mx-1 h-4 w-px bg-border/60" />
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="ml-auto hidden xl:flex items-center gap-2">
          <div className="hidden xl:flex"><MessagesLink /></div>
          <PushBell className="hidden xl:inline-flex" />
          <div className="hidden xl:flex"><NotificationBell /></div>
          <UserMenu />
          <MobileNav isAdmin={isAdmin} profileHref={profileHref} />
        </div>
      </div>
    </header>
  );
}
