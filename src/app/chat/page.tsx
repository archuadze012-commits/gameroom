import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatClient } from "./chat-client";

export const metadata = { title: "ჩათი" };

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">ცოცხალი ჩათი</h1>
          <p className="text-sm text-muted-foreground">
            თამაშების კანალები, LFG-ის ჩათები, ერთიანი ქართული გეიმერული თემი
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/40 text-amber-400">
          🚧 Demo — real-time მოგვიანებით
        </Badge>
      </div>

      <Card className="overflow-hidden border-border/60">
        <ChatClient />
      </Card>
    </div>
  );
}
