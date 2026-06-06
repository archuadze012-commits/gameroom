import assert from "node:assert/strict";
import test from "node:test";
import { getPushSupportServerSnapshot, getPushSupportSnapshot } from "./push-bell";

test("PushBell uses an unsupported server snapshot for stable hydration", () => {
  assert.equal(getPushSupportServerSnapshot(), false);
});

test("PushBell browser snapshot stays false outside a push-capable browser", () => {
  assert.equal(getPushSupportSnapshot(), false);
});
