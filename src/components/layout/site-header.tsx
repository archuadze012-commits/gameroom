"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  "relative rounded-xl border border-transparent bg-transparent text-white/70 hover:border-white/15 hover:bg-white/5 hover:backdrop-blur-md hover:text-white hover:shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] premium-nav-item-glow overflow-visible transition-all duration-300";

export function SiteHeader() {
  const pathname = usePathname();
  const profile = useNavProfile();
  const [visible, setVisible] = useState(true);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    // Read scroll position off a ref and only setState when the visibility
    // actually flips — so the header re-renders on direction changes, not on
    // every scroll frame. rAF-throttle keeps the handler off the critical path,
    // and the empty dep array means the listener is attached once (not torn
    // down and re-added on each scroll, which the old [lastY] dep forced).
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setVisible((prev) => {
          const next = y < lastYRef.current || y < 10;
          return prev === next ? prev : next;
        });
        lastYRef.current = y;
        tickingRef.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname?.startsWith("/playmanager")) return null;
  if (pathname?.endsWith("/lobby")) return null;
  if (/^\/messages\/[^/]+$/.test(pathname ?? "")) return null;

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className={`gr-site-header-root block fixed top-0 left-0 right-0 z-40 bg-[rgba(8,6,15,0.6)] backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 sm:translate-y-0 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="neon-rail gr-site-header-shell gr-site-header-inner mx-0 sm:mx-4 lg:mx-6 my-2 flex h-14 items-center justify-between rounded-none sm:rounded-2xl bg-[rgba(8,6,15,0.5)] px-4 relative">
        {/* Left: Brand Logo */}
        <div className="gr-site-header-brand flex items-center flex-shrink-0 relative z-10 w-fit">
          <Link href="/">
            <SiteBrand iconSize={36} wordmarkClassName="text-[20px] lg:text-[24px]" priority />
          </Link>
        </div>

        {/* Center: Main Navigation */}
        <nav className="hidden sm:flex flex-1 justify-center items-center h-full py-3 flex-nowrap">
          <div className="flex items-center gap-1.5 h-full pointer-events-auto">
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
          </div>
        </nav>

        {/* Right: Actions */}
        <div className="gr-site-header-actions hidden sm:flex items-center gap-2 flex-shrink-0 relative z-10">
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
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="pubg-loadout-card w-[300px] overflow-hidden !rounded-xl !p-2 border border-white/5 bg-[rgba(8,6,15,0.97)] text-white shadow-2xl backdrop-blur-xl"
                >
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                  <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />

                  <div className="relative z-10 flex flex-col">
                    <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_14px_rgba(236,72,153,0.8)]" />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="rounded-lg bg-violet-400/[0.08] px-3 py-3 font-normal">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-pink-400/35 shadow-[0_0_16px_rgba(236,72,153,0.25)]">
                            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                            <AvatarFallback className="bg-pink-500/15 text-pink-200 font-semibold">
                              {profile.displayName.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">{profile.displayName}</span>
                            <span className="mt-0.5 block truncate text-xs text-white/55">@{profile.username}</span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-2 bg-white/10" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="p-0 text-white/80">
                        <Link href={`/profile/${profile.username}`} className="flex w-full rounded-md px-3 py-2.5 text-white/80 hover:bg-pink-400/10 hover:text-pink-200">
                          ჩემი პროფილი
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="p-0 text-white/80">
                        <Link href="/settings" className="flex w-full rounded-md px-3 py-2.5 text-white/80 hover:bg-violet-400/10 hover:text-violet-200">
                          პარამეტრები
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="p-0 text-white/80">
                        <Link href="/lfg/new" className="flex w-full rounded-md px-3 py-2.5 text-white/80 hover:bg-cyan-300/10 hover:text-cyan-100">
                          ლოკალის დაპოსტვა
                        </Link>
                      </DropdownMenuItem>
                      {["admin", "moderator", "journalist"].includes(profile.role ?? "") && (
                        <DropdownMenuItem className="p-0 text-white/80">
                          <Link href="/admin/free-pc-games" className="flex w-full rounded-md px-3 py-2.5 font-bold text-pink-300 hover:bg-pink-400/10 hover:text-pink-100">
                            ადმინ პანელი
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-2 bg-white/10" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="p-0">
                        <div className="w-full rounded-md px-3 py-2 text-white/75 hover:bg-pink-400/10 hover:text-pink-200">
                          <LogoutButton />
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </div>
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
