import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ThreadClient } from "./thread-client";
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

      <ThreadClient />
    </div>
  );
}

export function generateStaticParams() {
  return Object.entries(mockForumThreads).flatMap(([category, threads]) =>
    threads.map((t) => ({ category, thread: t.slug })),
  );
}
