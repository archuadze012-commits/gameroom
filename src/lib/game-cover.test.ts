import assert from "node:assert/strict";
import test from "node:test";
import { getGameCoverCandidates } from "./game-cover";

test("getGameCoverCandidates prefers the provided cover before the local slug fallback", () => {
  assert.deepEqual(getGameCoverCandidates("valorant", "https://example.com/cover.jpg"), [
    "https://example.com/cover.jpg",
    "/games/covers/valorant.png",
  ]);
});

test("getGameCoverCandidates omits empty and duplicate cover URLs", () => {
  assert.deepEqual(getGameCoverCandidates("warzone", "/games/covers/warzone.png"), [
    "/games/covers/warzone.png",
  ]);
  assert.deepEqual(getGameCoverCandidates("warzone", ""), ["/games/covers/warzone.png"]);
});

test("getGameCoverCandidates returns no image candidates when no local fallback exists", () => {
  assert.deepEqual(getGameCoverCandidates("clash-royale", null), []);
});
