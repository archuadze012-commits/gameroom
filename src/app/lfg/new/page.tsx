import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewLfgForm } from "./new-lfg-form";

export const metadata = { title: "ახალი LFG" };

export default function NewLfgPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-2xl">ახალი LFG</CardTitle>
          <p className="text-sm text-muted-foreground">
            დაწერე რას ეძებ — რა თამაში, რა რანკი, რა რეგიონი. ხალხი მიგწერს.
          </p>
        </CardHeader>
        <CardContent>
          <NewLfgForm />
        </CardContent>
      </Card>
    </div>
  );
}
