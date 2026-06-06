import assert from "node:assert/strict";
import test from "node:test";

import { normalizeLobbyLoadout } from "./loadout";

test("normalizeLobbyLoadout preserves valid fields when some slots are empty strings", () => {
  const loadout = normalizeLobbyLoadout(
    {
      combo: "combo_royal",
      character: "character_monk",
      vehicle: "",
      lobby: "lobby_castle",
      effect: "",
      nameCard: "nc_elite",
      weapons: ["weapon_m4"],
    },
    {
      comboIds: ["combo_royal"],
      characterIds: ["character_monk"],
      lobbyIds: ["lobby_castle"],
      nameCardIds: ["nc_elite"],
      weaponIds: ["weapon_m4"],
    },
  );

  assert.equal(loadout.combo, "combo_royal");
  assert.equal(loadout.character, "character_monk");
  assert.equal(loadout.vehicle, "vehicle_none");
  assert.equal(loadout.lobby, "lobby_castle");
  assert.equal(loadout.effect, "fx_none");
  assert.equal(loadout.nameCard, "nc_elite");
  assert.deepEqual(loadout.weapons, ["weapon_m4"]);
});

test("normalizeLobbyLoadout supports the legacy single-weapon payload", () => {
  const loadout = normalizeLobbyLoadout(
    { weapon: "weapon_legacy_m4" },
    { weaponIds: ["weapon_legacy_m4"] },
  );

  assert.deepEqual(loadout.weapons, ["weapon_legacy_m4"]);
});

test("normalizeLobbyLoadout filters disallowed weapons and caps the loadout at four slots", () => {
  const loadout = normalizeLobbyLoadout(
    {
      weapons: ["weapon_1", "weapon_2", "weapon_bad", "weapon_3", "weapon_4", "weapon_5"],
    },
    {
      weaponIds: ["weapon_1", "weapon_2", "weapon_3", "weapon_4", "weapon_5"],
    },
  );

  assert.deepEqual(loadout.weapons, ["weapon_1", "weapon_2", "weapon_3", "weapon_4"]);
});
