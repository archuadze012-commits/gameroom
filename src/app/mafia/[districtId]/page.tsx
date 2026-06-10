import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/admin";
import { DistrictMap } from "@/components/mafia/district-map";

export const dynamic = "force-dynamic";

const VALID_DISTRICTS = [
  "gldani",
  "saburtalo",
  "chughureti_real",
  "nadzaladevi_big",
  "vake",
  "mtatsminda",
  "isani",
  "krtsanisi",
  "samgori",
  "didube_real",
];

interface PageProps {
  params: Promise<{ districtId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { districtId } = await params;
  const capitalized = districtId.charAt(0).toUpperCase() + districtId.slice(1);
  return {
    title: `თბილისი 1991 - ${capitalized}`,
    robots: { index: false, follow: false },
  };
}

export default async function DistrictPage({ params }: PageProps) {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/");

  const { districtId } = await params;
  if (!VALID_DISTRICTS.includes(districtId)) {
    redirect("/mafia");
  }

  return <DistrictMap districtId={districtId} />;
}
