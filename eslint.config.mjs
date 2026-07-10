import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vercel/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".planning/**",
    "graphify-out/**",
    "scratch/**",
    "node_modules/**",
    "artifacts/**",
    "out/**",
    "build/**",
    // Vendored/generated static assets and one-off authoring/seed/test scripts
    // are not application source — keep them out of the lint scope.
    "public/**",
    "scripts/**",
    "ComfyUI/**",
    "*.mjs",
    "find_actions*.js",
    "fix_page.js",
    "find_missing_exports.js",
    "*.log",
    "devserver*.log",
    "dev*.log",
    "tunnel*.log",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
