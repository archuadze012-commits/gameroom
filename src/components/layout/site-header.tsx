import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { navLinks, adminLinks } from "./nav-links";
import { getIsAdmin } from "@/lib/auth";

export async function SiteHeader() {
  const isAdmin = await getIsAdmin();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="Gameroom" width={36} height={36} className="rounded-lg" />
          <span className="text-lg tracking-tight">
            Game<span className="text-primary">room</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
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

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
          <MobileNav isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
