import Link from "next/link";
import { MessageSquare, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { mockForumCategories } from "@/lib/mock-data";

export const metadata = { title: "ფორუმი" };

export default function ForumPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="ფორუმი"
        description="დისკუსიები, კითხვები, იდეები. დაიწყე საუბარი ან შემოუერთდი არსებულს."
      />

      <div className="mt-8 space-y-3">
        {mockForumCategories.map((cat) => (
          <Link key={cat.slug} href={`/forum/${cat.slug}`}>
            <Card className="border-border/60 transition-colors hover:border-primary/40">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {cat.threadCount} თემა
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {cat.postCount} პოსტი
                    </span>
                  </div>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <div className="line-clamp-1 max-w-[200px] font-medium text-foreground/80">
                    {cat.lastThread.title}
                  </div>
                  <div className="mt-1">
                    {cat.lastThread.author} · {cat.lastThread.ago}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
