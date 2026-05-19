"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { MentionText } from "@/components/mention-text";

type Post = {
  id: string;
  author: string;
  ago: string;
  body: string;
  likes: number;
};

const initialPosts: Post[] = [
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

export function ThreadClient() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim()) return;
    const newPost: Post = {
      id: String(Date.now()),
      author: "leonsio12",
      ago: "ახლა",
      body: text.trim(),
      likes: 0,
    };
    setPosts((prev) => [...prev, newPost]);
    setText("");
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((p, i) => (
          <Card key={p.id} className="border-border/60">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <UserAvatar username={p.author} size="sm" />
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setPosts((prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, likes: x.likes + 1 } : x
                      )
                    )
                  }
                >
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
          <Textarea
            placeholder="დაწერე შენი პასუხი..."
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!text.trim()}>
              გამოქვეყნება
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
