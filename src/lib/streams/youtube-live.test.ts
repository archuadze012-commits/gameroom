import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../../next.config";

async function getGlobalDirective(name: string) {
  assert.equal(typeof nextConfig.headers, "function");

  const routes = await nextConfig.headers();
  const globalRoute = routes.find((route) => route.source === "/(.*)");
  const csp = globalRoute?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
  return csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(name));
}

async function getGlobalImgSrcDirective() {
  return getGlobalDirective("img-src");
}

async function getGlobalFrameSrcDirective() {
  return getGlobalDirective("frame-src");
}

test("global CSP allows YouTube thumbnail images for live stream slides", async () => {
  const imgSrc = await getGlobalImgSrcDirective();

  assert.match(imgSrc ?? "", /(?:^|\s)(?:https:|i\.ytimg\.com)(?:\s|$)/);
});

test("global CSP allows external HTTPS game cover images", async () => {
  const imgSrc = await getGlobalImgSrcDirective();

  assert.match(imgSrc ?? "", /(?:^|\s)https:(?:\s|$)/);
});

test("global CSP allows the iframe providers used by embeds and turnstile", async () => {
  const frameSrc = await getGlobalFrameSrcDirective();

  assert.match(frameSrc ?? "", /https:\/\/www\.youtube\.com/);
  assert.match(frameSrc ?? "", /https:\/\/www\.youtube-nocookie\.com/);
  assert.match(frameSrc ?? "", /https:\/\/www\.tiktok\.com/);
  assert.match(frameSrc ?? "", /https:\/\/player\.twitch\.tv/);
  assert.match(frameSrc ?? "", /https:\/\/challenges\.cloudflare\.com/);
});
