import { Ban, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Admin · მომხმარებლები" };

const mockUsers = [
  { username: "GeoSniper", email: "geosniper@example.com", role: "user", joined: "2026-04-12", banned: false },
  { username: "Lasha10", email: "lasha10@example.com", role: "user", joined: "2026-04-19", banned: false },
  { username: "Sage_Tbilisi", email: "sage@example.com", role: "moderator", joined: "2026-03-30", banned: false },
  { username: "ToxicPlayer42", email: "tox@example.com", role: "user", joined: "2026-05-01", banned: true },
  { username: "Admin", email: "admin@gamehub.ge", role: "admin", joined: "2026-01-01", banned: false },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">მომხმარებლები</h2>
        <Input placeholder="ძებნა username-ით ან ფოსტით..." className="sm:max-w-sm" />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">მომხმარებელი</th>
                <th className="px-4 py-3 text-left">როლი</th>
                <th className="px-4 py-3 text-left">დარეგისტრირდა</th>
                <th className="px-4 py-3 text-left">სტატუსი</th>
                <th className="px-4 py-3 text-right">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((u) => (
                <tr key={u.username} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-secondary text-xs">
                          {u.username.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">@{u.username}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        u.role === "admin"
                          ? "border-primary/40 text-primary"
                          : u.role === "moderator"
                          ? "border-accent/40 text-accent"
                          : ""
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.joined}</td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <Badge variant="outline" className="border-red-500/40 text-red-400">
                        banned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                        active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.banned ? (
                      <Button variant="ghost" size="sm">
                        <ShieldCheck className="mr-1 h-4 w-4" /> Unban
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-red-400">
                        <Ban className="mr-1 h-4 w-4" /> Ban
                      </Button>
                    )}
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
