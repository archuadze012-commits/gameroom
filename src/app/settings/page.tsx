import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "პარამეტრები" };

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="პარამეტრები"
        description="შენი პროფილი, ხელმისაწვდომობა, თამაშების ცნობარი."
      />

      <Card className="mt-8 border-border/60">
        <CardHeader>
          <CardTitle>პროფილი</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
