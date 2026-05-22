#!/usr/bin/env node
/**
 * screenshots.mjs — capture a deck of full-page PNGs of the running app.
 * Requires: Playwright with Chromium installed.
 *   npx --yes playwright@1.49.0 install chromium
 *
 * Usage:
 *   node .claude/skills/run-gameroom/screenshots.mjs
 *   node .claude/skills/run-gameroom/screenshots.mjs --port 3001 --out ./shots
 *   node .claude/skills/run-gameroom/screenshots.mjs --only /forum,/games
 *
 * Output: PNGs in <out> (default: ./.claude/skills/run-gameroom/shots/),
 *         one file per route, named after the slugified path.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};

const PORT = Number(arg("--port", "3000"));
const OUT = path.resolve(arg("--out", path.join(import.meta.dirname, "shots")));
const ONLY = arg("--only", null);
const WAIT_AFTER = Number(arg("--wait-after", "0"));
const VIEWPORT = { width: 1440, height: 900 };

const ALL_ROUTES = [
  "/",
  "/forum",
  "/forum/general",
  "/games",
  "/games/pubg-mobile",
  "/lfg",
  "/tournaments",
  "/announcements",
  "/leaderboard",
  "/search",
  "/auth/login",
];

const routes = ONLY ? ONLY.split(",").map((s) => s.trim()) : ALL_ROUTES;

// Resolve playwright from either local install or the npx cache.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    const require = createRequire(import.meta.url);
    // Last resort — try to resolve via npx-installed package.
    try {
      ({ chromium } = require("playwright"));
    } catch {
      console.error("Playwright not available. Install with:");
      console.error("  npx --yes playwright@1.49.0 install chromium");
      console.error("  npm install --no-save playwright");
      process.exit(2);
    }
  }
}

function slug(p) {
  if (p === "/") return "home";
  return p.replace(/^\/+/, "").replace(/\//g, "_") || "root";
}

(async function main() {
  if (!existsSync(OUT)) await fs.mkdir(OUT, { recursive: true });

  console.log(`[screenshots] launching headless chromium…`);
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // surface console errors so flaky pages show up loudly
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  let pass = 0, fail = 0;
  for (const route of routes) {
    const url = `http://localhost:${PORT}${route}`;
    const file = path.join(OUT, `${slug(route)}.png`);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      if (WAIT_AFTER > 0) await page.waitForTimeout(WAIT_AFTER);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  ✓  ${route}  →  ${path.relative(process.cwd(), file)}`);
      pass++;
    } catch (e) {
      console.log(`  ✗  ${route}  →  ${e.message.split("\n")[0]}`);
      fail++;
    }
  }

  if (errors.length) {
    console.log(`\n[screenshots] ${errors.length} console errors:`);
    for (const e of errors.slice(0, 10)) console.log(`  ! ${e}`);
  }

  await browser.close();
  console.log(`\n[screenshots] ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
})();
