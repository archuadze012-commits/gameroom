import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Shield,
  Newspaper,
  Gamepad2,
  Trophy,
  Users as UsersIcon,
  LayoutDashboard,
  ShieldAlert,
  FileText,
  Flag,
  ScrollText,
  Megaphone,
  Pin,
  BarChart3,
  Mail,
  MessageSquareWarning,
  Package,
  VolumeX,
} from "lucide-react";
import { getCurrentRole } from "@/lib/admin";

const allLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "moderator", "organizer"] },
  { href: "/admin/analytics", label: "ანალიტიკა", icon: BarChart3, roles: ["admin"] },
  { href: "/admin/users", label: "მომხმარებლები", icon: UsersIcon, roles: ["admin"] },
  { href: "/admin/reports", label: "Reports", icon: Flag, roles: ["admin", "moderator"] },
  { href: "/admin/mutes", label: "Muted Users", icon: VolumeX, roles: ["admin", "moderator"] },
  { href: "/admin/moderation-queue", label: "Moderation Queue", icon: MessageSquareWarning, roles: ["admin", "moderator"] },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, roles: ["admin"] },
  { href: "/admin/pins", label: "Pins & Featured", icon: Pin, roles: ["admin"] },
  { href: "/admin/email", label: "Email Blast", icon: Mail, roles: ["admin"] },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
  { href: "/admin/content", label: "Site Content", icon: FileText, roles: ["admin"] },
  { href: "/admin/news", label: "სიახლეები", icon: Newspaper, roles: ["admin"] },
  { href: "/admin/games", label: "თამაშები", icon: Gamepad2, roles: ["admin"] },
  { href: "/admin/shop", label: "Shop Products", icon: Package, roles: ["admin", "moderator"] },
  { href: "/admin/tournaments", label: "ჩემპიონატები", icon: Trophy, roles: ["admin", "organizer"] },
  { href: "/admin/moderation", label: "Blocked Words", icon: ShieldAlert, roles: ["admin", "moderator"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getCurrentRole();
  if (!["admin", "moderator", "organizer"].includes(role)) redirect("/");

  const links = allLinks.filter((l) => l.roles.includes(role));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">
            ({role}) — მართე საიტი
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav className="space-y-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
