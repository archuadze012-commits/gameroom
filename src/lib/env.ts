import "server-only";

import { createLogger } from "@/lib/logger";

const logger = createLogger("env");
const reportedMissing = new Set<string>();

function normalizeEnv(value: string | undefined) {
  const normalized = (value ?? "").replace(/^\uFEFF/, "").trim();
  return normalized || null;
}

function reportMissing(name: string, context: string) {
  const key = `${context}:${name}`;
  if (reportedMissing.has(key)) return;
  reportedMissing.add(key);
  logger.error("required environment variable is missing", { name, context });
}

export function getServerEnv(name: string): string | null {
  return normalizeEnv(process.env[name]);
}

export function getFirstServerEnv(names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = getServerEnv(name);
    if (value) return { name, value };
  }
  return null;
}

export function requireServerEnv(
  name: string,
  context: string,
): { ok: true; value: string } | { ok: false; name: string } {
  const value = getServerEnv(name);
  if (value) return { ok: true, value };
  reportMissing(name, context);
  return { ok: false, name };
}

export function requireAnyServerEnv(
  names: string[],
  context: string,
): { ok: true; name: string; value: string } | { ok: false; names: string[] } {
  const match = getFirstServerEnv(names);
  if (match) return { ok: true, ...match };
  for (const name of names) reportMissing(name, context);
  return { ok: false, names };
}
