import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    const profiles = await sql`SELECT id, username FROM public.profiles LIMIT 1`;
    const games = await sql`SELECT id, slug FROM public.games`;

    if (profiles.length === 0) {
      console.log("No profiles found to seed news and tournaments");
      return;
    }
    if (games.length === 0) {
      console.log("No games found to seed news and tournaments");
      return;
    }

    const authorId = profiles[0].id;
    const gameId = games[0].id; // standoff
    const clashId = games.find(g => g.slug === 'clash-royale')?.id || games[0].id;

    // Seed News Articles
    const newsData = [
      {
        title: "Standoff 2 — ახალი სეზონის განახლება და ცვლილებები",
        slug: "standoff-2-new-season-update",
        excerpt: "ახალი იარაღები, რუკის ბალანსი და გაუმჯობესებული matchmaking სისტემა უკვე თამაშშია.",
        body: "Standoff 2-ის დეველოპერებმა ოფიციალურად გამოუშვეს ახალი სეზონი, რომელიც მოთამაშეებს სთავაზობს უამრავ სიახლეს. განახლებაში შესულია ახალი იარაღის სკინები, შეცვლილია რამდენიმე პოპულარული რუკის დიზაინი ტაქტიკური მრავალფეროვნებისთვის და რაც მთავარია, გამოსწორდა matchmaking-ის ალგორითმი, რაც მატჩებს უფრო თანაბარს გახდის.",
        cover_url: "from-red-500/40 to-red-500/0",
        status: "published",
        published_at: new Date().toISOString(),
        game_id: gameId
      },
      {
        title: "Clash Royale v4.0 — ახალი ევოლუციები და ბალანსი",
        slug: "clash-royale-v4-update",
        excerpt: "შეიტყვეთ ყველაფერი ახალი ევოლუციების შესახებ, რომლებიც სრულიად ცვლის მეტას.",
        body: "Supercell-მა გამოუშვა Clash Royale-ის ახალი ვერსია, სადაც მთავარი აქცენტი გაკეთებულია ახალ ევოლუციებზე (Card Evolutions). ამჯერად ევოლუცია მიიღო რამდენიმე ძველმა ბარათმა, რაც მათ დამატებით უნარებს ანიჭებს. ასევე შეიცვალა რამდენიმე პოპულარული ბარათის სტატისტიკა მეტას დასაბალანსებლად.",
        cover_url: "from-blue-500/40 to-blue-500/0",
        status: "published",
        published_at: new Date().toISOString(),
        game_id: clashId
      }
    ];

    for (const art of newsData) {
      const existing = await sql`SELECT id FROM public.news_articles WHERE slug = ${art.slug}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO public.news_articles (author_id, game_id, title, slug, cover_url, excerpt, body, status, published_at)
          VALUES (${authorId}, ${art.game_id}, ${art.title}, ${art.slug}, ${art.cover_url}, ${art.excerpt}, ${art.body}, ${art.status}, ${art.published_at})
        `;
        console.log(`Seeded news article: ${art.slug}`);
      } else {
        console.log(`News article already exists: ${art.slug}`);
      }
    }

    // Seed Tournaments
    const tournamentsData = [
      {
        name: "Standoff 2 Spring Masters 2026",
        slug: "standoff-2-spring-masters-2026",
        description: "გაზაფხულის ყველაზე დიდი ჩემპიონატი Standoff 2-ში. დარეგისტრირდი შენს გუნდთან ერთად და იბრძოლე გამარჯვებისთვის.",
        banner_url: "from-red-500/40 via-primary/20 to-transparent",
        format: "single_elim",
        max_participants: 8,
        status: "open",
        game_id: gameId
      },
      {
        name: "Clash Royale Tbilisi Arena #1",
        slug: "clash-royale-tbilisi-arena-1",
        description: "1v1 Clash Royale ტურნირი თბილისში. გამოავლინე საუკეთესო სტრატეგია და მოიგე პრიზები.",
        banner_url: "from-blue-600/40 via-primary/20 to-transparent",
        format: "double_elim",
        max_participants: 16,
        status: "open",
        game_id: clashId
      }
    ];

    for (const t of tournamentsData) {
      const existing = await sql`SELECT id FROM public.tournaments WHERE slug = ${t.slug}`;
      if (existing.length === 0) {
        await sql`
          INSERT INTO public.tournaments (game_id, name, slug, description, banner_url, format, max_participants, status)
          VALUES (${t.game_id}, ${t.name}, ${t.slug}, ${t.description}, ${t.banner_url}, ${t.format}, ${t.max_participants}, ${t.status})
        `;
        console.log(`Seeded tournament: ${t.slug}`);
      } else {
        console.log(`Tournament already exists: ${t.slug}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
