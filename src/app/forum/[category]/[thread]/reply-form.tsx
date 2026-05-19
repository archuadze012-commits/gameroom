"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReplyForm() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!text.trim()) return;
    setSubmitted(true);
    setText("");
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <Card className="mt-6 border-border/60">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-semibold">პასუხის დაწერა</h3>
        {submitted ? (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            პასუხი გამოქვეყნდა წარმატებით!
          </p>
        ) : (
          <>
            <Textarea
              placeholder="დაწერე შენი პასუხი... (markdown მხარდაჭერა)"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!text.trim()}>
                გამოქვეყნება
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
