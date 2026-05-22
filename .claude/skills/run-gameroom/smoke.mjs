#!/usr/bin/env node
/**
 * smoke.mjs — start the Gameroom dev server (if not already up) and
 * verify every key route renders cleanly. Cross-platform: Windows host
 * or Linux container.
 *
 * Usage:
 *   node .claude/skills/run-gameroom/smoke.mjs
 *   node .claude/skills/run-gameroom/smoke.mjs --port 3001
 *   node .claude/skills/run-gameroom/smoke.mjs --no-spawn   # use existing server
 *
 * Exit codes:
 *   0  every URL returned 200
 *   1  one or more URLs failed
 *   2  dev server never came up
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const PORT = portArg >= 0 ? Number(args[portArg + 1]) : 3000;
const NO_SPAWN = args.includes("--no-spawn");
const READY_TIMEOUT_MS = 60_000;
const REQ_TIMEOUT_MS = 15_000;

const URLS = [
  "/",
  "/forum",
  "/forum/general",
  "/forum/general/welcome",
  "/games",
  "/games/pubg-mobile",
  "/lfg",
  "/tournaments",
  "/announcements",
  "/messages",
  "/settings",
  "/search",
  "/leaderboard",
  "/feed",
  "/auth/login",
  "/auth/signup",
];

async function fetchStatus(url) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "manual" });
    return res.status;
  } catch (e) {
    return `ERR ${e.message}`;
  } finally {
    clearTimeout(id);
  }
}

async function waitReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const s = await fetchStatus(`http://localhost:${PORT}`);
    if (typeof s === "number" && s < 500) return true;
    await sleep(500);
  }
  return false;
}

async function alreadyServing() {
  const s = await fetchStatus(`http://localhost:${PORT}`);
  return typeof s === "number";
}

function startDev() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev"], {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, PORT: String(PORT) },
    detached: false,
  });
  child.on("exit", (code) => {
    if (code != null && code !== 0) {
      console.error(`[smoke] dev server exited with code ${code}`);
    }
  });
  return child;
}

(async function main() {
  let spawned = null;

  if (NO_SPAWN || (await alreadyServing())) {
    console.log(`[smoke] using existing server on :${PORT}`);
  } else {
    console.log(`[smoke] spawning \`npm run dev\` on :${PORT}…`);
    spawned = startDev();
  }

  const ok = await waitReady();
  if (!ok) {
    console.error(`[smoke] dev server did not become ready within ${READY_TIMEOUT_MS / 1000}s`);
    if (spawned) spawned.kill();
    process.exit(2);
  }

  console.log(`[smoke] server ready, hitting ${URLS.length} routes…\n`);

  let pass = 0, fail = 0;
  const rows = [];
  for (const path of URLS) {
    const url = `http://localhost:${PORT}${path}`;
    const status = await fetchStatus(url);
    const okStatus = typeof status === "number" && status >= 200 && status < 400;
    if (okStatus) pass++; else fail++;
    rows.push({ path, status, ok: okStatus });
    const mark = okStatus ? "✓" : "✗";
    console.log(`  ${mark} ${String(status).padStart(4)}  ${path}`);
  }

  console.log(`\n[smoke] ${pass} pass, ${fail} fail`);

  if (spawned) {
    // give the kill signal a beat to land
    spawned.kill();
    await sleep(300);
  }

  process.exit(fail === 0 ? 0 : 1);
})();
