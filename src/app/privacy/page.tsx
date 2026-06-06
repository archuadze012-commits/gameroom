export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12 text-zinc-300">
      <div className="backdrop-blur-xl bg-black/40 border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 font-firago">კონფიდენციალურობის პოლიტიკა (Privacy Policy)</h1>
        <p className="mb-6 leading-relaxed">
          Gameroom-ისთვის თქვენი მონაცემების დაცვა პრიორიტეტულია. ეს დოკუმენტი განმარტავს, თუ რა სახის ინფორმაციას ვაგროვებთ და როგორ ვიყენებთ მას.
        </p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3 font-firago">1. ინფორმაცია, რომელსაც ვაგროვებთ</h2>
            <p className="leading-relaxed">
              რეგისტრაციისას ჩვენ ვაგროვებთ თქვენს ელ-ფოსტის მისამართს, მომხმარებლის სახელს და პროფილის სურათს. ასევე, პლატფორმის გამოყენების პროცესში შესაძლოა შეგროვდეს ტექნიკური მონაცემები (მაგ. IP მისამართი, ბრაუზერის ტიპი).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3 font-firago">2. მონაცემთა გამოყენების მიზანი</h2>
            <p className="leading-relaxed">
              თქვენს მონაცემებს ვიყენებთ სერვისების გასაუმჯობესებლად, უსაფრთხოების მონიტორინგისთვის და თქვენთან საკომუნიკაციოდ (მაგ. შეტყობინებების გამოსაგზავნად).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3 font-firago">3. მესამე მხარის სერვისები</h2>
            <p className="leading-relaxed">
              ავტორიზაციის გამარტივებისთვის ჩვენ ვიყენებთ მესამე მხარის ავტორიზაციის პროვაიდერებს (Google, Steam, TikTok). ამ სერვისების გამოყენებისას თქვენ ეთანხმებით მათ შესაბამის პოლიტიკასაც.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
