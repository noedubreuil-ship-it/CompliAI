#!/usr/bin/env node
/**
 * Pousse les variables de .env.local vers Vercel (production).
 * Usage: node scripts/sync-vercel-env.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const raw = readFileSync(envPath, "utf8");

const vars = [];
for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  vars.push({ key, value });
}

const sensitive = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
]);

console.log(`Synchronisation de ${vars.length} variables vers Vercel (production)…`);

for (const { key, value } of vars) {
  try {
    execFileSync(
      "npx",
      ["vercel", "env", "add", key, "production", "--force", "--yes", ...(sensitive.has(key) ? ["--sensitive"] : [])],
      { cwd: root, input: value, stdio: ["pipe", "pipe", "pipe"] }
    );
    console.log(`✓ ${key}`);
  } catch (e) {
    console.error(`✗ ${key}:`, e.stderr?.toString() || e.message);
    process.exitCode = 1;
  }
}

console.log("\nTerminé. Relancez : npx vercel deploy --prod --yes");
