import "dotenv/config";
import { db } from "./client";
import { games, forumCategories } from "./schema";

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

  console.log("Seeding forum categories...");
  await db
    .insert(forumCategories)
    .values([
      { name: "ზოგადი დისკუსია", slug: "general", position: 1, description: "ყველაფერი გეიმინგზე." },
      { name: "ჩემპიონატები", slug: "tournaments", position: 2, description: "ჩემპიონატებზე საუბარი." },
      { name: "ტექნიკა და სეტაპები", slug: "hardware", position: 3, description: "PC, ტელეფონები, კონტროლერები." },
      { name: "ფიდბექი პლატფორმაზე", slug: "feedback", position: 99, description: "შენი იდეები ჩვენთვის." },
    ])
    .onConflictDoNothing();
  console.log("✓ forum categories ready");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
