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
  "group relative rounded-md px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-violet-hi)]";

const navLinkStyle = {
  color: "#ffffff",
  textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.55), 0 0 32px rgba(236,72,153,0.3)",
};

const adminLinkStyle = {
  color: "rgba(236,72,153,1)",
  textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.8), 0 0 32px rgba(236,72,153,0.5)",
};

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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.55),transparent)" }}
      />
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {session ? (
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Gameroom"
              width={48}
              height={48}
              className="rounded-lg"
              style={{ filter: "drop-shadow(0 0 8px rgba(236,72,153,0.9)) drop-shadow(0 0 18px rgba(236,72,153,0.55))" }}
            />
            <span className="font-display text-[22px] font-extrabold uppercase tracking-tight">
              <span style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.55), 0 0 36px rgba(236,72,153,0.3)" }}>Game</span>
              <span style={{ color: "rgba(236,72,153,1)", textShadow: "0 0 10px rgba(236,72,153,1), 0 0 22px rgba(236,72,153,0.85), 0 0 42px rgba(236,72,153,0.55)" }}>room</span>
            </span>
          </Link>
        ) : (
          <span />
        )}

        <nav className="hidden flex-1 items-center gap-1 xl:flex">
          {session && navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass} style={navLinkStyle}>
              {link.label}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 -bottom-px h-[2px] origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" style={{ background: "rgba(236,72,153,0.9)", boxShadow: "0 0 10px rgba(236,72,153,0.6)" }}
              />
            </Link>
          ))}
          {profileHref && (
            <Link href={profileHref} className={`${navLinkClass} flex items-center gap-1.5`} style={navLinkStyle}>
              <UserIcon className="h-3.5 w-3.5" />
              პროფილი
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 -bottom-px h-[2px] origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" style={{ background: "rgba(236,72,153,0.9)", boxShadow: "0 0 10px rgba(236,72,153,0.6)" }}
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
                  className={`${navLinkClass} flex items-center gap-1.5`}
                  style={adminLinkStyle}
                >
                  <ShieldAlert className="h-3.5 w-3.5" style={{ color: "rgba(236,72,153,1)", filter: "drop-shadow(0 0 5px rgba(236,72,153,0.9))" }} />
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="ml-auto hidden xl:flex items-center gap-2">
          {session && (
            <>
              <div className="hidden xl:flex"><AnnouncementsLink /></div>
              <UserMenu />
            </>
          )}
          <MobileNav isAdmin={isAdmin} profileHref={profileHref} />
        </div>
      </div>
    </header>
  );
}
