"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="container mx-auto flex items-center justify-between gap-8 px-4 py-10">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Gamepad2 className="h-5 w-5" />
            </span>
            Game<span className="text-primary">room</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            ქართველი გეიმერების სათემო პლატფორმა — გუნდის პოვნა, ფორუმი, ჩემპიონატები.
          </p>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Gameroom — ყველა უფლება დაცულია.</span>
          <span>გაკეთებულია ❤️-ით საქართველოში</span>
        </div>
      </div>
    </footer>
  );
}
