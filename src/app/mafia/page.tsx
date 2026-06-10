import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/admin";
import { TbilisiMap } from "@/components/mafia/tbilisi-map";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "თბილისური მაფია (demo)",
  robots: { index: false, follow: false },
};

export default async function MafiaPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/");
  return <TbilisiMap />;
}
