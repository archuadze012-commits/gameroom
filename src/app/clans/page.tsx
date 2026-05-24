import { Search, Shield } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { ClansHub } from "@/components/clans/clans-hub";

export const metadata = { title: "კლანები" };

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default function ClansPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto space-y-10 px-4 py-10 lg:py-14">
        <section className="relative isolate overflow-hidden" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
          <div className="relative overflow-hidden bg-[var(--gr-bg-1)] px-6 py-8 sm:px-8 lg:px-10" style={{ clipPath: cutMd }}>
            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/22 via-fuchsia-500/10 to-cyan-500/18" />
            <div aria-hidden className="absolute right-12 top-8 h-48 w-24 rotate-12 bg-[var(--gr-cyan-glow)]/12 blur-3xl [clip-path:polygon(30%_0,100%_0,70%_100%,0_100%)]" />
            <div aria-hidden className="absolute bottom-0 right-0 h-full w-[34%] bg-[linear-gradient(180deg,rgba(34,211,238,0.48),rgba(139,92,246,0.08))] [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]" />

            <div className="relative z-[1] grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <Eyebrow tone="magenta">CLAN HUB</Eyebrow>
                <DisplayHeading as="h1" size="display" className="mt-3">
                  კლანების სივრცე
                </DisplayHeading>
                <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--gr-text-mute)]">
                  შექმენი საკუთარი კლანი, მართე წევრები ერთ პანელში და finder-ში მხოლოდ რეალური, ნამდვილად შექმნილი კლანები აჩვენე.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <ChevronButton href="#my-clan" variant="violet" size="lg">
                    <Shield className="h-4 w-4" /> კლანის შექმნა
                  </ChevronButton>
                  <ChevronButton href="#clan-finder" variant="ghost" size="lg">
                    <Search className="h-4 w-4" /> კლანების ძებნა
                  </ChevronButton>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-[var(--gr-violet)]/20 blur-3xl" />
                <div className="relative bg-[var(--gr-bg-0)]/72 p-5 ring-1 ring-white/10 backdrop-blur-md" style={{ clipPath: cutSm }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">როგორ მუშაობს</p>
                  <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-[var(--gr-text-mute)]">
                    <p>1. შექმენი კლანი `ჩემი კლანი` ბლოკიდან.</p>
                    <p>2. დაარეგულირე TAG, სერვერი, მოტო და რეკრუტინგი.</p>
                    <p>3. მართე წევრები, განაცხადები და მოწვევები ერთ ადგილას.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ClansHub />
      </div>
    </div>
  );
}
