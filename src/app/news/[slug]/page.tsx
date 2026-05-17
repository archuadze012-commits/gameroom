import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { mockGames, mockNews } from "@/lib/mock-data";

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
    { name: "Lasha10", ago: "5 სთ წინ", body: "input lag ნამდვილად შემცირდა, თვალით ჩანს. 🔥" },
  ];

  return (
    <article className="container mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/news"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ყველა სიახლე
      </Link>

      <div className={`-mx-4 mb-8 h-56 w-[calc(100%+2rem)] bg-gradient-to-br md:h-72 ${article.cover}`} />

      <div className="space-y-4">
        {game && (
          <Badge variant="outline">{game.emoji} {game.nameKa}</Badge>
        )}
        <h1 className="text-3xl font-bold md:text-4xl">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> {article.author}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {article.publishedAt}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {article.readMinutes} წთ კითხვა
          </span>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="prose prose-invert max-w-none whitespace-pre-line text-base leading-relaxed text-foreground/90">
        {mockBody}
      </div>

      <section className="mt-16">
        <h2 className="mb-4 text-lg font-semibold">კომენტარები ({mockComments.length})</h2>

        <Card className="mb-4 border-border/60">
          <CardContent className="space-y-3 p-4">
            <Textarea placeholder="დაწერე კომენტარი..." rows={3} />
            <div className="flex justify-end">
              <Button size="sm">გამოქვეყნება</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {mockComments.map((c, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="flex items-start gap-3 p-4">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-secondary text-foreground/80">
                    {c.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">@{c.name}</span>
                    <span className="text-muted-foreground">{c.ago}</span>
                  </div>
                  <p className="mt-1 text-sm">{c.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </article>
  );
}

export function generateStaticParams() {
  return mockNews.map((n) => ({ slug: n.slug }));
}
