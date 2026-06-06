import assert from "node:assert/strict";
import test from "node:test";

import { buildLobbyHudData } from "./hud";

test("buildLobbyHudData maps wallet, bonus state, and XP progress from a real snapshot", () => {
  const hud = buildLobbyHudData({
    gameSlug: "pubg-mobile",
    displayName: "leo",
    avatarUrl: "/avatar.png",
    xp: 950,
    wallet: { pro_balance: 10_000, nc_balance: 225 },
    dailyBonusAvailable: true,
  });

  assert.equal(hud.gameSlug, "pubg-mobile");
  assert.equal(hud.player.displayName, "leo");
  assert.equal(hud.player.avatarUrl, "/avatar.png");
  assert.equal(hud.player.level, 4);
  assert.ok(Math.abs(hud.player.levelProgress - (50 / 700)) < 1e-9);
  assert.equal(hud.player.tier, "bronze");
  assert.equal(hud.player.tierSub, "V");
  assert.deepEqual(hud.currencies, { pro: 10_000, nc: 225 });
  assert.equal(hud.dailyBonusAvailable, true);
  assert.equal(hud.royalePass.rank, 1);
  assert.equal(hud.royalePass.hasUnclaimedRewards, false);
});

test("buildLobbyHudData keeps explicit level/tier and omits currencies for public lobby views", () => {
  const hud = buildLobbyHudData({
    gameSlug: "pubg-mobile",
    displayName: "guest-view",
    avatarUrl: null,
    level: 35,
    xp: 0,
  });

  assert.equal(hud.player.level, 35);
  assert.equal(hud.player.tier, "diamond");
  assert.equal(hud.player.tierSub, "IV");
  assert.equal(hud.currencies, null);
  assert.equal(hud.dailyBonusAvailable, false);
});
