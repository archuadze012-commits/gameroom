import { Newspaper, Users as UsersIcon, Trophy, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin · Dashboard" };

export default function AdminDashboard() {
  const stats = [
    { label: "მომხმარებლები", value: "1,284", change: "+12 ბოლო 7 დღეში", icon: UsersIcon },
    { label: "სიახლეები", value: "47", change: "3 პუბლიკაცია მზადაა", icon: Newspaper },
    { label: "ჩემპიონატები", value: "8 აქტიური", change: "2 ფინალამდე ერთი ნაბიჯი", icon: Trophy },
    { label: "ფორუმის თემები", value: "112", change: "23 ახალი დღეს", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="space-y-2 p-5">
              <s.icon className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <h2 className="mb-3 text-lg font-semibold">ბოლო აქტივობა</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>· @GeoSniper-მა შექმნა ახალი ლოკალი (5 წთ წინ)</li>
            <li>· @Admin-მა გამოაქვეყნა სიახლე „Georgia Cup 2026“ (1 სთ წინ)</li>
            <li>· @Nika-მ დაარეგისტრირდა Tbilisi PUBG Night-ზე (2 სთ წინ)</li>
            <li>· 12 ახალი მომხმარებელი ბოლო 24 საათში</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
