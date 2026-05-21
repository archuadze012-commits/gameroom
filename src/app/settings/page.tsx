import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { LinkedAccountsSection } from "@/components/linked-accounts-section";
import { SkillAssessment } from "@/components/skill-assessment";
import { PushBell } from "@/components/push-bell";
import { getSession } from "@/lib/auth";

export const metadata = { title: "პარამეტრები" };

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login?next=/settings");
  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        title="პარამეტრები"
        description="შენი პროფილი, ხელმისაწვდომობა, თამაშების ცნობარი."
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>პროფილი</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>

      <SkillAssessment />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Push შეტყობინებები</CardTitle>
          <CardDescription>
            ჩართე ბრაუზერის push შეტყობინებები — მიიღებ სიახლეებს ახალი გამოცხადებების, შეტყობინებებისა და მოწვევების შესახებ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushBell />
        </CardContent>
      </Card>

      <LinkedAccountsSection />
    </div>
  );
}
