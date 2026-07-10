import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGameInviteNotification,
  buildUserSearchUrl,
  createChatCursor,
  mergeChatMessages,
  normalizeChatBody,
  parseChatCursor,
  selectInviteGames,
} from "./critical-workflows";

test("builds a server notification for a game invite", () => {
  assert.deepEqual(
    buildGameInviteNotification({
      senderDisplayName: "LEO",
      senderUsername: "leonsio12",
      gameName: "PUBG Mobile",
      gameSlug: "pubg-mobile",
    }),
    {
      type: "system",
      title: "LEO-ს შენთან თამაში უნდა",
      body: "@leonsio12 გიწვევს PUBG Mobile-ში სათამაშოდ.",
      link: "/games/pubg-mobile",
    },
  );
});

test("normalizes chat text and rejects invalid message lengths", () => {
  assert.deepEqual(normalizeChatBody("  გამარჯობა   ყველას  "), {
    ok: true,
    body: "გამარჯობა ყველას",
  });
  assert.deepEqual(normalizeChatBody("   "), { ok: false, error: "empty_message" });
  assert.deepEqual(normalizeChatBody("x".repeat(501)), { ok: false, error: "message_too_long" });
});

test("merges chat refreshes without duplicate messages and keeps newest 150", () => {
  const current = [{ id: "a", body: "old" }, { id: "b", body: "same" }];
  const incoming = [{ id: "b", body: "updated" }, ...Array.from({ length: 151 }, (_, index) => ({ id: `n${index}`, body: "new" }))];
  const merged = mergeChatMessages(current, incoming, 150);

  assert.equal(merged.length, 150);
  assert.equal(new Set(merged.map((message) => message.id)).size, 150);
  assert.equal(merged.at(-1)?.id, "n150");
});

test("round-trips a chat cursor so messages sharing a timestamp remain distinct", () => {
  const cursor = createChatCursor({
    createdAt: "2026-07-10T12:34:56.789Z",
    id: "3b241101-e2bb-4255-8caf-4136c566a962",
  });
  assert.deepEqual(parseChatCursor(cursor), {
    createdAt: "2026-07-10T12:34:56.789Z",
    id: "3b241101-e2bb-4255-8caf-4136c566a962",
  });
  assert.equal(parseChatCursor("2026-07-10T12:34:56.789Z|not-a-uuid"), null);
  assert.equal(parseChatCursor("not-a-date|3b241101-e2bb-4255-8caf-4136c566a962"), null);
});

test("builds a debounced server-side user search URL", () => {
  assert.equal(buildUserSearchUrl("  leo  "), "/api/users?q=leo");
  assert.equal(buildUserSearchUrl(""), "/api/users");
  assert.equal(buildUserSearchUrl("a&b"), "/api/users?q=a%26b");
  assert.equal(buildUserSearchUrl("leo", "streamer"), "/api/users?q=leo&role=streamer");
});

test("selects invite games from the live catalog in profile order", () => {
  const catalog = [
    { slug: "valorant", nameKa: "Valorant" },
    { slug: "pubg-mobile", nameKa: "PUBG Mobile" },
  ];
  assert.deepEqual(selectInviteGames(catalog, ["pubg-mobile", "missing", "valorant"]), [
    { slug: "pubg-mobile", nameKa: "PUBG Mobile" },
    { slug: "valorant", nameKa: "Valorant" },
  ]);
});
