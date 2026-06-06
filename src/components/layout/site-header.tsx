"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteBrand } from "./site-brand";
import { useNavProfile } from "./use-nav-data";
import { MessagesLink } from "./messages-link";
import { NotificationBell } from "./notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/logout-button";
import { Home, Users, Trophy, FileText, Star, ShoppingBag, Search, LogIn, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "მთავარი", icon: Home },
  { href: "/search", label: "ძებნა", icon: Search },
  { href: "/games", label: "თამაშები", icon: Gamepad2 },
  { href: "/lfg", label: "ლოკალი", icon: Users },
  { href: "/tournaments", label: "ტურნირები", icon: Trophy },
  { href: "/articles", label: "სტატიები", icon: FileText },
  { href: "/leaderboard", label: "Leaderboard", icon: Star },
  { href: "/shop", label: "შოპი", icon: ShoppingBag },
];

const itemActiveClassName =
  "relative rounded-xl border border-white/20 bg-white/10 backdrop-blur-md text-white shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] scale-110 premium-nav-item-glow premium-nav-item-glow-active overflow-visible transition-all duration-300";

const itemIdleClassName =
  "relative rounded-xl border border-transparent bg-transparent text-white/70 hover:border-white/15 hover:bg-white/5 hover:backdrop-blur-md hover:text-white hover:shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:scale-110 premium-nav-item-glow overflow-visible transition-all duration-300";

export function SiteHeader() {
  const pathname = usePathname();
  const profile = useNavProfile();
  
  if (pathname?.endsWith("/lobby")) return null;

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="gr-site-header-root hidden sm:block sticky top-0 z-40 bg-[rgba(8,6,15,0.6)] backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="neon-rail gr-site-header-shell container mx-auto my-2 flex h-14 items-center justify-between rounded-2xl bg-[rgba(8,6,15,0.5)] px-4 relative">
        {/* Left: Brand Logo */}
        <div className="flex items-center justify-start flex-shrink-0">
          <Link href="/">
            <SiteBrand iconSize={36} wordmarkClassName="hidden min-[450px]:block text-[20px] lg:text-[24px]" />
          </Link>
        </div>

        {/* Center: Main Navigation (scrollable on mobile) */}
        <nav className="flex items-center gap-2 xl:gap-3 h-full py-3 px-4 -mx-4 overflow-x-auto flex-nowrap scrollbar-none max-w-[40vw] xs:max-w-[45vw] sm:max-w-none">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <div key={item.href} className="group relative flex flex-col items-center flex-shrink-0">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={`flex h-10 w-10 items-center justify-center transition-all duration-300 ${
                    active ? itemActiveClassName : itemIdleClassName
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-white [filter:drop-shadow(0_0_8px_rgba(236,72,153,0.7))_drop-shadow(0_0_12px_rgba(139,92,246,0.5))]" : "text-white/70 group-hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"}`} strokeWidth={active ? 2.5 : 2.0} />
                  {active && (
                    <span className="absolute -bottom-[13px] h-[3px] w-6 rounded-t-md bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
                  )}
                </Link>
                {/* Custom Tooltip */}
                <div className="pointer-events-none absolute top-full mt-3 flex opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 z-50">
                  <div className="relative rounded-md bg-[rgba(15,12,30,0.95)] border border-white/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xl backdrop-blur-md whitespace-nowrap">
                    {item.label}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Desktop Actions */}
          <div className="flex items-center gap-3">
            {profile && (
              <>
                <MessagesLink />
                <NotificationBell />
              </>
            )}
            
            {profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-105">
                  <Avatar className="h-9 w-9 border border-white/10 hover:border-pink-500/50 shadow-md">
                    <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                    <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                      {profile.displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" style={{ background: "rgba(8,6,15,0.95)", border: "1px solid rgba(236,72,153,0.35)", boxShadow: "0 0 24px rgba(236,72,153,0.2), 0 8px 32px rgba(0,0,0,0.6)" }}>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-white drop-shadow-[0_0_8px_rgba(236,72,153,0.9)]">{profile.displayName}</span>
                        <span className="text-xs text-white/60">@{profile.username}</span>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator style={{ background: "rgba(236,72,153,0.25)" }} />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="p-0">
                      <Link href={`/profile/${profile.username}`} className="flex w-full px-3 py-2 text-white hover:text-pink-400">
                        ჩემი პროფილი
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="p-0">
                      <Link href="/settings" className="flex w-full px-3 py-2 text-white hover:text-pink-400">
                        პარამეტრები
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="p-0">
                      <Link href="/lfg/new" className="flex w-full px-3 py-2 text-white hover:text-pink-400">
                        ლოკალის დაპოსტვა
                      </Link>
                    </DropdownMenuItem>
                    {["admin", "moderator", "journalist"].includes(profile.role ?? "") && (
                      <DropdownMenuItem className="p-0">
                        <Link href="/admin/free-pc-games" className="flex w-full px-3 py-2 text-white hover:text-pink-400 font-bold text-pink-400">
                          ადმინ პანელი
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator style={{ background: "rgba(236,72,153,0.25)" }} />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="p-0">
                      <div className="w-full px-3 py-2 text-white hover:text-pink-400">
                        <LogoutButton />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" className="border border-white/10 hover:border-pink-500/50 bg-white/5 hover:bg-pink-500/10 text-white font-bold uppercase tracking-wider text-[11px]">
                <Link href="/auth/login">
                  <LogIn className="mr-1 h-3.5 w-3.5" /> შესვლა
                </Link>
              </Button>
            )}
          </div>
          

        </div>
      </div>
    </header>
  );
}
