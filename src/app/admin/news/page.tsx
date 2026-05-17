import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockNews } from "@/lib/mock-data";

export const metadata = { title: "Admin · სიახლეები" };

export default function AdminNewsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">სიახლეები</h2>
        <Button asChild>
          <Link href="/admin/news/new">
            <Plus className="mr-1 h-4 w-4" /> ახალი სტატია
          </Link>
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">სათაური</th>
                <th className="px-4 py-3 text-left">სტატუსი</th>
                <th className="px-4 py-3 text-left">ავტორი</th>
                <th className="px-4 py-3 text-left">თარიღი</th>
                <th className="px-4 py-3 text-right">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {mockNews.map((n) => (
                <tr key={n.slug} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/news/${n.slug}`} className="hover:text-primary">
                      {n.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                      published
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">@{n.author}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.publishedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
