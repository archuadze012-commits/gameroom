import Link from "next/link";
import { ShieldAlert, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { AnnouncementsLink } from "./announcements-link";
import { navLinks, adminLinks } from "./nav-links";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navLinkClass =
  "group relative rounded-md px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)] transition-colors hover:text-[var(--gr-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-violet-hi)]";

export async function SiteHeader() {
  const session = await getSession().catch(() => null);

  let role = "user";
  let profileHref: string | null = null;

  if (session) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("username, role")
      .eq("id", session.id)
      .maybeSingle();

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    role =
      session.email && adminEmails.includes(session.email)
        ? "admin"
        : (data?.role ?? "user");

    const username =
      (data?.username as string | undefined) ??
      (session.user_metadata?.username as string | undefined) ??
      session.email?.split("@")[0];
    if (username) profileHref = `/profile/${username}`;
  }

  const isAdmin = ["admin", "moderator", "organizer"].includes(role);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--gr-border)] bg-[rgba(8,6,15,0.78)] backdrop-blur-xl">
      {/* hairline violet glow under the header */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gr-violet)]/40 to-transparent"
      />
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2.5 mx-auto xl:mx-0">
          <Image src="/logo.png" alt="Gameroom" width={36} height={36} className="rounded-lg" />
          <span className="font-display text-[18px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
            Game<span className="text-[var(--gr-violet)]">room</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 xl:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 -bottom-px h-[2px] origin-left scale-x-0 bg-[var(--gr-violet)] shadow-[0_0_10px_rgba(139,92,246,0.6)] transition-transform duration-200 group-hover:scale-x-100"
              />
            </Link>
          ))}
          {profileHref && (
            <Link href={profileHref} className={`${navLinkClass} flex items-center gap-1.5`}>
              <UserIcon className="h-3.5 w-3.5" />
              პროფილი
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 -bottom-px h-[2px] origin-left scale-x-0 bg-[var(--gr-violet)] shadow-[0_0_10px_rgba(139,92,246,0.6)] transition-transform duration-200 group-hover:scale-x-100"
              />
            </Link>
          )}
          {isAdmin && (
            <>
              <span className="mx-1 h-4 w-px bg-[var(--gr-border-hi)]" />
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${navLinkClass} flex items-center gap-1.5 !text-[var(--gr-amber)]/80 hover:!text-[var(--gr-amber)]`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="ml-auto hidden xl:flex items-center gap-2">
          <div className="hidden xl:flex"><AnnouncementsLink /></div>
          <UserMenu />
          <MobileNav isAdmin={isAdmin} profileHref={profileHref} />
        </div>
      </div>
    </header>
  );
}
