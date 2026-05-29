"use client";

const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";
const cardBorderHover = "linear-gradient(135deg, rgba(220,38,38,0.8), rgba(220,38,38,0.5))";

export function GameCard({
  children,
  clipPath,
}: {
  children: React.ReactNode;
  clipPath: string;
}) {
  return (
    <article
      className="group relative isolate transition-[transform,background] duration-0 hover:-translate-y-1"
      style={{ background: cardBorder, padding: 1, clipPath }}
      onMouseEnter={(e) => (e.currentTarget.style.background = cardBorderHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = cardBorder)}
    >
      {children}
    </article>
  );
}
