"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EmailBlastPage() {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [segment, setSegment] = useState<"all" | "verified" | "active">("all");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) return;
    if (!confirm("ნამდვილად გავუგზავნოთ მეილი ყველა მონიშნულ მომხმარებელს?")) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/email-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html, segment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      if (data.stubbed) {
        toast.warning(
          `RESEND_API_KEY არ არის set. ${data.recipients} მიმღები ჩაიწერა audit-ში მაგრამ მეილი არ გაიგზავნა.`
        );
      } else {
        toast.success(`გაიგზავნა ${data.sent}/${data.recipients} მიმღებზე`);
      }
      setSubject("");
      setHtml("");
    } catch {
      toast.error("შეცდომა");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <Mail className="h-5 w-5 text-primary" /> Email Blast
      </h2>

      <Card>
        <CardContent className="space-y-4 p-4">
          <p className="text-xs text-muted-foreground">
            გაუგზავნე მეილი ყველა მომხმარებელს ან filtered subset-ს. RESEND_API_KEY env var-ი
            უნდა იყოს set რომ რეალურად გაიგზავნოს.
          </p>

          <div className="space-y-1.5">
            <Label>Segment</Label>
            <div className="flex gap-1">
              {(["all", "verified", "active"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegment(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    segment === s
                      ? "bg-primary/15 text-primary"
                      : "border border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "ყველა" : s === "verified" ? "Verified-მა" : "ბოლო 7d-ში აქტიური"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="html">HTML body</Label>
            <Textarea
              id="html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="<p>გამარჯობა!</p>"
            />
          </div>

          <Button onClick={handleSend} disabled={sending || !subject.trim() || !html.trim()}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            გაგზავნა
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
