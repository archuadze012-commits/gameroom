import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { ArrowUpRight, Clock, Radio } from "lucide-react";
import { Pill } from "@/components/ui/pill";

export type ArticleCardData = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  game_slug: string | null;
  game_name: string | null;
  author_username: string;
  published_at: string;
};

function publishedAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ka });
  } catch {
    return "";
  }
}

export function ArticleCard({ a }: { a: ArticleCardData }) {
  return (
    <Link
      href={`/articles/${encodeURIComponent(a.slug)}`}
      className="group block relative h-full w-full"
    >
      <div className="relative isolate flex h-full flex-col rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_35px_rgba(99,102,241,0.4)] hover:-translate-y-1">
        
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[22.5px] bg-[#0a0714]">
          {/* Thumbnail area */}
          <div className="relative h-60 w-full overflow-hidden shrink-0">
            {a.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.cover_url}
                alt={a.title}
                className="h-full w-full object-cover opacity-90 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.2),transparent_70%)]">
                <span className="font-display text-[64px] font-black uppercase text-white/5 drop-shadow-2xl">
                  {a.title.slice(0, 1)}
                </span>
              </div>
            )}

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0714] via-[rgba(10,7,20,0.4)] to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-violet-500/0 duration-500 group-hover:bg-violet-500/10 mix-blend-overlay" />

          {/* Top badges */}
          <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
            <Pill tone="magenta" icon={<Radio className="h-3 w-3" />} pulse>
              ARTICLE DROP
            </Pill>
            {a.game_name && <Pill tone="cyan">{a.game_name}</Pill>}
          </div>

          <span
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/80 backdrop-blur-md transition-all duration-300 group-hover:bg-violet-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(139,92,246,0.6)]"
          >
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>

        {/* Content area */}
        <div className="relative z-20 flex flex-1 flex-col gap-3 p-6 pt-0">
          <h3
            className="relative line-clamp-2 font-display text-[22px] font-black leading-[1.2] text-white drop-shadow-md transition-colors duration-300 group-hover:text-violet-300"
          >
            {a.title}
          </h3>

          {a.excerpt ? (
            <p className="relative line-clamp-3 text-[14px] leading-relaxed text-white/60">
              {a.excerpt}
            </p>
          ) : (
            <p className="relative text-[14px] leading-relaxed text-white/60">
              გახსენი სტატია და ნახე სრული ანალიზი, სიახლეები და თამაშის დეტალები.
            </p>
          )}

          <div className="relative mt-auto pt-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                ავტორი
              </p>
              <div className="flex items-center justify-between gap-4">
                <p className="truncate font-display text-[15px] font-bold uppercase tracking-wider text-white">
                  @{a.author_username}
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white/50 border border-white/5">
                  <Clock className="h-3 w-3" />
                  {publishedAgo(a.published_at)}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
