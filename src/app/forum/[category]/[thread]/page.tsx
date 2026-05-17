import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ThumbsUp, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { MentionText } from "@/components/mention-text";
import { mockForumCategories, mockForumThreads } from "@/lib/mock-data";

const mockPosts = [
  {
    id: "1",
    author: "Saba",
    ago: "გუშინ",
    body: "გამარჯობა! ვცდილობ ვაირჩიო GPU 2026 წლისთვის — ემულატორებზე ვაპირებ PUBG Mobile-ის ვითამაშოთ მაღალ ხარისხში. რა გირჩევთ?",
    likes: 3,
  },
  {
    id: "2",
    author: "Nika",
    ago: "23 სთ წინ",
    body: "@Saba RTX 4060 საკმარისია მთლიანი მობილური ემულატორებისთვის. PUBG-სთვის 144fps-ზე გაჯდები ულტრაზე.",
    likes: 7,
  },
  {
    id: "3",
    author: "Lika",
    ago: "14 სთ წინ",
    body: "@Nika ვეთანხმები, თუმცა LDPlayer-ზე CPU უფრო მნიშვნელოვანია. Ryzen 5 7600 + 4060 = სრულყოფილი combo.",
    likes: 12,
  },
];

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ category: string; thread: string }>;
}) {
  const { category, thread } = await params;
  const cat = mockForumCategories.find((c) => c.slug === category);
  const t = mockForumThreads[category]?.find((x) => x.slug === thread);
  if (!cat || !t) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/forum/${category}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {cat.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{t.author}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {t.replies} პოსტი
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {mockPosts.map((p, i) => (
          <Card key={p.id} className="border-border/60">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback
                    className={
                      i === 0
                        ? "bg-primary/15 text-primary font-semibold"
                        : "bg-secondary text-foreground/80"
                    }
                  >
                    {p.author.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Link
                    href={`/profile/${p.author}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {p.author}
                  </Link>
                  <div className="text-xs text-muted-foreground">{p.ago}</div>
                </div>
                {i === 0 && (
                  <span className="rounded-md border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                    ავტორი
                  </span>
                )}
              </div>
              <Separator />
              <p className="text-sm leading-relaxed">
                <MentionText>{p.body}</MentionText>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <ThumbsUp className="mr-1 h-3 w-3" /> {p.likes}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  პასუხი
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-border/60">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">პასუხის დაწერა</h3>
          <Textarea placeholder="დაწერე შენი პასუხი... (markdown მხარდაჭერა)" rows={5} />
          <div className="flex justify-end">
            <Button>გამოქვეყნება</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function generateStaticParams() {
  return Object.entries(mockForumThreads).flatMap(([category, threads]) =>
    threads.map((t) => ({ category, thread: t.slug })),
  );
}
