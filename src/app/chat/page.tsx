import { Card } from "@/components/ui/card";
import { ChatClient } from "./chat-client";

export const metadata = { title: "ჩათი" };

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ცოცხალი ჩათი</h1>
        <p className="text-sm text-muted-foreground">
          თამაშების კანალები, LFG-ის ჩათები, ერთიანი ქართული გეიმერული თემი
        </p>
      </div>

      <Card className="overflow-hidden border-border/60">
        <ChatClient />
      </Card>
    </div>
  );
}
