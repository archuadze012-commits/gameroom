export function sanitizeJson(json: string): string {
  return json.replace(/</g, "\\u003c");
}
