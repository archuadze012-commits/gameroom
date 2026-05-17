import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="container mx-auto grid gap-8 px-4 py-10 md:grid-cols-4">
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

        <div>
          <h4 className="mb-3 text-sm font-semibold">პლატფორმა</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/lfg" className="hover:text-foreground">LFG მატჩმეიკინგი</Link></li>
            <li><Link href="/tournaments" className="hover:text-foreground">ჩემპიონატები</Link></li>
            <li><Link href="/forum" className="hover:text-foreground">ფორუმი</Link></li>
            <li><Link href="/chat" className="hover:text-foreground">ჩათი</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">თამაშები</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/games/efootball-mobile" className="hover:text-foreground">eFootball Mobile</Link></li>
            <li><Link href="/games/fifa-mobile" className="hover:text-foreground">FIFA Mobile</Link></li>
            <li><Link href="/games/pubg-mobile" className="hover:text-foreground">PUBG Mobile</Link></li>
            <li><Link href="/games/warzone" className="hover:text-foreground">Warzone</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">საიტი</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-foreground">პროექტის შესახებ</Link></li>
            <li><Link href="/rules" className="hover:text-foreground">წესები</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">კონტაქტი</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">კონფიდენციალურობა</Link></li>
          </ul>
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
