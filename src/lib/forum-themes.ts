import { MessageSquare, Trophy, Cpu, Lightbulb, type LucideIcon } from "lucide-react";

export type ForumAccent = "violet" | "amber" | "magenta" | "cyan";

export type ForumTheme = {
  icon: LucideIcon;
  accent: ForumAccent;
  /** Percentage shown in the top-right amber badge ("% ღია"). */
  openPct: number;
};

export const forumThemes: Record<string, ForumTheme> = {
  general:     { icon: MessageSquare, accent: "cyan",    openPct: 64 },
  tournaments: { icon: Trophy,        accent: "amber",   openPct: 41 },
  hardware:    { icon: Cpu,           accent: "violet",  openPct: 53 },
  feedback:    { icon: Lightbulb,     accent: "magenta", openPct: 78 },
};

export function getForumTheme(slug: string): ForumTheme {
  return forumThemes[slug] ?? { icon: MessageSquare, accent: "violet", openPct: 50 };
}
