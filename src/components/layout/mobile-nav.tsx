"use client";

import Link from "next/link";
import { Menu, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { navLinks, adminLinks } from "./nav-links";

export function MobileNav({ isAdmin, profileHref }: { isAdmin: boolean; profileHref?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="hidden" aria-label="მენიუ">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Gameroom</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1 px-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          {profileHref && (
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              პროფილი
            </Link>
          )}
          {isAdmin && (
            <>
              <Separator className="my-2" />
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              ))}
            </>
          )}
          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="mt-4 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
          >
            შესვლა
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
