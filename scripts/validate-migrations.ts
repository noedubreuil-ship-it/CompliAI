/**
 * Vérifie la cohérence des fichiers supabase/migrations (numérotation, doublons).
 * Usage: npm run validate:migrations
 */

import * as fs from "fs";
import * as path from "path";

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error("Dossier migrations introuvable:", MIGRATIONS_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("Aucune migration .sql trouvée.");
    process.exit(1);
  }

  const prefixes = new Set<string>();
  const numbers: number[] = [];
  let lastNum = 0;

  for (const file of files) {
    const m = file.match(/^(\d{3})_/);
    if (!m) {
      console.error(`Nom invalide (préfixe NNN_ attendu): ${file}`);
      process.exit(1);
    }
    const num = parseInt(m[1], 10);
    if (prefixes.has(m[1])) {
      console.error(`Préfixe dupliqué: ${m[1]} (${file})`);
      process.exit(1);
    }
    prefixes.add(m[1]);
    numbers.push(num);
    if (num < lastNum) {
      console.error(`Ordre lexicographique incohérent après ${lastNum}: ${file}`);
      process.exit(1);
    }
    lastNum = num;
  }

  console.log(`OK — ${files.length} migrations (${files[0]} … ${files[files.length - 1]})`);
}

main();
