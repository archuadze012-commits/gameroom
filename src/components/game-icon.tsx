import type { MockGame } from "@/lib/mock-data";

type Props = {
  game: Pick<MockGame, "emoji" | "nameKa" | "iconUrl" | "invertIcon">;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeMap = {
  sm: { img: "h-5 w-5", emoji: "text-lg" },
  md: { img: "h-8 w-8", emoji: "text-2xl" },
  lg: { img: "h-12 w-12", emoji: "text-4xl" },
  xl: { img: "h-16 w-16", emoji: "text-6xl" },
};

export function GameIcon({ game, size = "md" }: Props) {
  const s = sizeMap[size];
  if (game.iconUrl) {
    return (
      <span className="relative inline-flex items-center justify-center">
        <img
          src={game.iconUrl}
          alt={game.nameKa}
          className={`${s.img} object-contain${game.invertIcon ? " brightness-0 invert" : ""}`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute("hidden");
          }}
        />
        <span className={s.emoji} hidden>{game.emoji}</span>
      </span>
    );
  }
  return <span className={s.emoji}>{game.emoji}</span>;
}
