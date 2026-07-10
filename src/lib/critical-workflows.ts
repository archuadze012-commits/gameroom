export type GameInviteNotification = {
  type: "system";
  title: string;
  body: string;
  link: string;
};

export function buildGameInviteNotification(input: {
  senderDisplayName: string;
  senderUsername: string;
  gameName: string;
  gameSlug: string;
}): GameInviteNotification {
  return {
    type: "system",
    title: `${input.senderDisplayName}-ს შენთან თამაში უნდა`,
    body: `@${input.senderUsername} გიწვევს ${input.gameName}-ში სათამაშოდ.`,
    link: `/games/${encodeURIComponent(input.gameSlug)}`,
  };
}

export function normalizeChatBody(value: unknown):
  | { ok: true; body: string }
  | { ok: false; error: "empty_message" | "message_too_long" } {
  const body = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!body) return { ok: false, error: "empty_message" };
  if (body.length > 500) return { ok: false, error: "message_too_long" };
  return { ok: true, body };
}

export function mergeChatMessages<T extends { id: string }>(current: T[], incoming: T[], limit = 150): T[] {
  const byId = new Map<string, T>();
  for (const message of [...current, ...incoming]) {
    byId.delete(message.id);
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).slice(-limit);
}

export type ChatCursor = {
  createdAt: string;
  id: string;
};

const CHAT_MESSAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createChatCursor({ createdAt, id }: ChatCursor): string {
  return `${createdAt}|${id}`;
}

export function parseChatCursor(value: string | null): ChatCursor | null {
  if (!value) return null;
  const [createdAt, id, extra] = value.split("|");
  if (!createdAt || !id || extra || !CHAT_MESSAGE_ID_PATTERN.test(id)) return null;
  if (!Number.isFinite(new Date(createdAt).getTime())) return null;
  return { createdAt, id };
}

export function buildUserSearchUrl(query: string, role = "all"): string {
  const params = new URLSearchParams();
  const normalized = query.trim();
  if (normalized) params.set("q", normalized);
  if (role && role !== "all") params.set("role", role);
  const search = params.toString();
  return search ? `/api/users?${search}` : "/api/users";
}

export function selectInviteGames<T extends { slug: string }>(catalog: T[], slugs: string[]): T[] {
  const bySlug = new Map(catalog.map((game) => [game.slug, game]));
  return slugs.map((slug) => bySlug.get(slug)).filter((game): game is T => Boolean(game));
}
