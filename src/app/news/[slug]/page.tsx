import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { mockGames, mockNews } from "@/lib/mock-data";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = mockNews.find((n) => n.slug === slug);
  if (!article) notFound();
  const game = mockGames.find((g) => g.slug === article.gameSlug);

  const mockBody = `მთლიანი სტატია მოგვიანებით აქ ჩაიწერება — ეს არის demo content.

განახლების მთავარი მომენტები:

- ახალი მენიუ, რომელიც გვაძლევს უფრო სწრაფ ნავიგაციას მთავარ რეჟიმებს შორის.
- შემცირებული input lag (≈ 12ms), რაც განსაკუთრებით იგრძნობა ranked მატჩებში.
- ხელახლა აწყობილი matchmaking ალგორითმი — უფრო ბალანსირებული მოწინააღმდეგეები.
- ახალი skin-ების კოლექცია "Spring 2026".

ჩვენი აზრით ეს არის წლის ერთ-ერთი ყველაზე მნიშვნელოვანი განახლება და დიდი წინგადადგმული ნაბიჯი მთლიანი მობილური სიმულატორული ჟანრისთვის.`;

  const mockComments = [
    { name: "Beka", ago: "2 სთ წინ", body: "ძალიან კარგი განახლება! matchmaking-ზე ნამდვილად იგრძნობა." },
    { name: "Lasha10", ago: "5 სთ წინ", body: "input lag ნამდვილად შემცირდა, თვალით ჩანს." },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/20 blur-[120px]" />

      <article className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <Link
          href="/news"
          className="mb-6 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-violet-hi)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> ყველა სიახლე
        </Link>

        {/* hero cover */}
        <div
          className="relative mb-8 overflow-hidden ring-1 ring-[var(--gr-border)]"
          style={{ clipPath: cutMd }}
        >
          <div className={`h-56 w-full bg-gradient-to-br md:h-72 ${article.cover}`} />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-transparent to-transparent" />
          <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
        </div>

        <header className="space-y-4">
          <Eyebrow tone="amber">სტატია</Eyebrow>
          {game && (
            <Pill tone="violet">{game.emoji} {game.nameKa}</Pill>
          )}
          <DisplayHeading as="h1" size="lg" className="!text-[28px] sm:!text-[36px]">
            {article.title}
          </DisplayHeading>
          <div className="flex flex-wrap items-center gap-3 text-[12px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {article.author}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {article.publishedAt}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {article.readMinutes} წთ კითხვა</span>
          </div>
        </header>

        <div className="mt-6 h-px w-full bg-[var(--gr-border)]" />

        <div className="prose prose-invert mt-6 max-w-none whitespace-pre-line text-[15px] leading-[1.75] text-[var(--gr-text)]/90">
          {mockBody}
        </div>

        <section className="mt-16">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[var(--gr-violet-hi)]" />
            <Eyebrow tone="violet">დისკუსია</Eyebrow>
            <span className="text-[12px] text-[var(--gr-text-mute)]">({mockComments.length})</span>
          </div>

          {/* compose */}
          <div
            className="relative mb-4 bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)]"
            style={{ clipPath: cutSm }}
          >
            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
            <Textarea
              placeholder="დაწერე კომენტარი..."
              rows={3}
              className="resize-none border-[var(--gr-border-hi)] bg-[var(--gr-bg-2)] text-[var(--gr-text)] placeholder:text-[var(--gr-text-dim)] focus-visible:ring-[var(--gr-violet-hi)]"
            />
            <div className="mt-3 flex justify-end">
              <ChevronButton variant="violet" size="sm">გამოქვეყნება</ChevronButton>
            </div>
          </div>

          <div className="space-y-3">
            {mockComments.map((c, i) => (
              <div
                key={i}
                className="relative bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)]"
                style={{ clipPath: cutSm }}
              >
                <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)] opacity-70" />
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0 border border-[var(--gr-border-hi)]">
                    <AvatarFallback className="bg-[var(--gr-violet)]/15 text-xs text-[var(--gr-violet-hi)]">
                      {c.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-semibold text-[var(--gr-text)]">@{c.name}</span>
                      <span className="text-[var(--gr-text-dim)]">· {c.ago}</span>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--gr-text)]/90">{c.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

export function generateStaticParams() {
  return mockNews.map((n) => ({ slug: n.slug }));
}
