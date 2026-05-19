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
} from "lucide-react";
import { getIsAdmin } from "@/lib/auth";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/news", label: "სიახლეები", icon: Newspaper },
  { href: "/admin/games", label: "თამაშები", icon: Gamepad2 },
  { href: "/admin/tournaments", label: "ჩემპიონატები", icon: Trophy },
  { href: "/admin/users", label: "მომხმარებლები", icon: UsersIcon },
  { href: "/admin/moderation", label: "მოდერაცია", icon: ShieldAlert },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) redirect("/");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">
            მართე სიახლეები, ჩემპიონატები, მომხმარებლები
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <aside>
          <nav className="space-y-0.5">
            {adminLinks.map((link) => (
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
