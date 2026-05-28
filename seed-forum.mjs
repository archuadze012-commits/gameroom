import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    const profiles = await sql`SELECT id, username FROM public.profiles LIMIT 5`;
    const games = await sql`SELECT id, slug FROM public.games`;

    console.log("Profiles:", profiles);
    console.log("Games:", games);

    if (profiles.length === 0) {
      console.log("No profiles found to seed forum");
      return;
    }

    const authorId = profiles[0].id;

    // Seed categories
    const categoriesData = [
      { name: "ზოგადი დისკუსია", slug: "general", description: "ყველაფერი გეიმინგზე, რაც სხვაგან არ ჯდება.", position: 1 },
      { name: "ჩემპიონატები", slug: "tournaments", description: "Tournament-ების ცხადებები, ანგარიშები და დისკუსიები.", position: 2 },
      { name: "ტექნიკა და სეტაპები", slug: "hardware", description: "PC, ტელეფონები, კონტროლერები, აქსესუარები.", position: 3 },
      { name: "ფიდბექი პლატფორმაზე", slug: "feedback", description: "თქვენი იდეები და ბაგების რეპორტი ჩვენთვის.", position: 4 }
    ];

    for (const cat of categoriesData) {
      const existing = await sql`SELECT id FROM public.forum_categories WHERE slug = ${cat.slug}`;
      if (existing.length === 0) {
        const [newCat] = await sql`
          INSERT INTO public.forum_categories (name, slug, description, position)
          VALUES (${cat.name}, ${cat.slug}, ${cat.description}, ${cat.position})
          RETURNING id
        `;
        console.log(`Seeded category: ${cat.slug}`);

        // Seed a default thread
        const [thread] = await sql`
          INSERT INTO public.forum_threads (category_id, author_id, title, slug, pinned)
          VALUES (${newCat.id}, ${authorId}, ${'Welcome to Gameroom ' + cat.name}, ${'welcome-' + cat.slug}, true)
          RETURNING id
        `;
        console.log(`Seeded thread for ${cat.slug}`);

        // Seed a post
        await sql`
          INSERT INTO public.forum_posts (thread_id, author_id, body)
          VALUES (${thread.id}, ${authorId}, ${'გამარჯობა! ეს არის ' + cat.name + ' კატეგორიის პირველი პოსტი.'})
        `;
      } else {
        console.log(`Category already exists: ${cat.slug}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
