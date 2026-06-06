export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12 text-zinc-300">
      <div className="backdrop-blur-xl bg-black/40 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 font-firago">წესები და პირობები (Terms of Service)</h1>
        <p className="mb-6 leading-relaxed">
          კეთილი იყოს თქვენი მობრძანება Gameroom-ზე. ჩვენს პლატფორმაზე რეგისტრაციით ან მისი გამოყენებით, თქვენ ეთანხმებით მოცემულ წესებსა და პირობებს.
        </p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3 font-firago">1. ანგარიშის უსაფრთხოება</h2>
            <p className="leading-relaxed">
              თქვენ ხართ პასუხისმგებელი თქვენი ანგარიშის მონაცემების და პაროლის კონფიდენციალურობის დაცვაზე. ნებისმიერი აქტივობა, რომელიც ხორციელდება თქვენი ანგარიშის სახელით, მიჩნეულია თქვენს მიერ განხორციელებულად.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3 font-firago">2. ქცევის წესები (Code of Conduct)</h2>
            <p className="leading-relaxed">
              აკრძალულია პლატფორმის გამოყენება შეურაცხმყოფელი, მადისკრედიტირებელი ან სხვაგვარი არაკანონიერი მასალის გასავრცელებლად. ჩვენ ვიტოვებთ უფლებას დავაბლოკოთ ნებისმიერი მომხმარებელი, რომელიც არღვევს საზოგადოებრივ ქცევის ნორმებს.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3 font-firago">3. პასუხისმგებლობის შეზღუდვა</h2>
            <p className="leading-relaxed">
              პლატფორმა მოწოდებულია "როგორც არის" (as is) პრინციპით. ჩვენ არ ვიღებთ პასუხისმგებლობას მესამე მხარის მიერ გამოქვეყნებულ მასალებზე ან დროებით შეფერხებებზე.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
