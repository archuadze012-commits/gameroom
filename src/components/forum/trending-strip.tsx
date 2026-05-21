import Link from "next/link";
import { Flame, MessageCircle } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";

type TrendingItem = {
  href: string;
  title: string;
  replies: number;
  categorySlug: string;
  categoryName: string;
};

type Props = {
  items: TrendingItem[];
};

export function TrendingStrip({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="trending-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <Eyebrow tone="amber" id="trending-heading">
          ცხელი თემები
        </Eyebrow>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {items.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative shrink-0 basis-[280px] sm:basis-[320px] bg-[var(--gr-bg-1)] p-4 transition-transform hover:-translate-y-0.5 gr-sweep"
            style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)" }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]"
            />
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-amber)]">
              <Flame className="h-3 w-3" />
              {t.categoryName}
            </div>
            <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--gr-text)] transition-colors group-hover:text-[var(--gr-violet-hi)]">
              {t.title}
            </h3>
            <div className="mt-3 flex items-center gap-1.5 text-[11.5px] tabular-nums text-[var(--gr-text-mute)]">
              <MessageCircle className="h-3 w-3" />
              {t.replies} პასუხი
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
