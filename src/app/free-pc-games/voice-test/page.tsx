import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DiscordVoiceDashboard } from "@/components/discord-voice-dashboard";
import { PageHeader } from "@/components/page-header";

export default async function VoiceTestPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const session = await getSession().catch(() => null);
  if (!session) redirect("/auth/login");

  const resolvedParams = await searchParams;
  const game = resolvedParams.game;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <PageHeader
        eyebrow="Discord Integration"
        title="ხმოვანი არხების მონიტორინგი"
        description="აქ ხედავთ რეალურ დროში ვინ ზის ვოისებში. დააჭირეთ JOIN-ს არხში გადასასვლელად."
      />
      
      <div className="mt-8">
        <DiscordVoiceDashboard gameSlug={game} />
      </div>
    </div>
  );
}
