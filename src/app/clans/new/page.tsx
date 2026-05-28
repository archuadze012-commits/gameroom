import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { NewClanForm } from "./new-clan-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewClanPage() {
  const sessionUser = await getSession();
  if (!sessionUser) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link
        href="/clans"
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> უკან დაბრუნება
      </Link>

      <PageHeader
        eyebrow="ახალი კლანი"
        title="შექმენი შენი გუნდი"
        description="მართე წევრები, მიიღე მონაწილეობა კლანურ ომებში და მოიპოვეთ რეპუტაცია სერვერზე."
      />

      <NewClanForm />
    </div>
  );
}
