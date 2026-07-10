import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "./client";
import { games } from "./schema";

async function main() {
  console.log("Seeding games...");

  const seedGames = [
    {
      slug: "efootball-mobile",
      nameKa: "eFootball Mobile",
      nameEn: "eFootball Mobile",
      description: "Konami-ის მობილური ფეხბურთის სიმულატორი.",
      accentColor: "#22c55e",
      position: 1,
    },
    {
      slug: "fifa-mobile",
      nameKa: "FIFA Mobile",
      nameEn: "FIFA Mobile",
      description: "EA Sports-ის ფეხბურთის მობილური ვერსია.",
      accentColor: "#3b82f6",
      position: 2,
    },
    {
      slug: "pubg-mobile",
      nameKa: "PUBG Mobile",
      nameEn: "PUBG: Battlegrounds Mobile",
      description: "ბრძოლა გადარჩენისთვის 100 მოთამაშეთან.",
      accentColor: "#f59e0b",
      position: 3,
    },
    {
      slug: "warzone",
      nameKa: "Call of Duty: Warzone",
      nameEn: "Call of Duty: Warzone",
      description: "Battle Royale Activision-ისგან.",
      accentColor: "#ef4444",
      position: 4,
    },
    {
      slug: "valorant",
      nameKa: "Valorant",
      nameEn: "Valorant",
      description: "ტაქტიკური 5v5 შუტერი Riot Games-ისგან.",
      accentColor: "#a855f7",
      position: 5,
    },
  ];

  const insertedGames = await db
    .insert(games)
    .values(seedGames)
    .onConflictDoNothing()
    .returning();
  console.log(`✓ inserted ${insertedGames.length} games`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
