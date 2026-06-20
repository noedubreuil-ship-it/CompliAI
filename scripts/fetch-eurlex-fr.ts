/**
 * Télécharge les textes officiels français depuis EUR-Lex et les sauvegarde
 * dans scripts/data/ prêts à être ingérés par ingest-legal-docs.ts.
 *
 * Usage:
 *   npx tsx scripts/fetch-eurlex-fr.ts              → télécharge tous
 *   npx tsx scripts/fetch-eurlex-fr.ts AI_ACT_FR    → télécharge un seul
 *
 * Textes téléchargés :
 *   AI_ACT_FR.txt  — Règlement (UE) 2024/1689 (AI Act) version française
 *   GDPR_FR.txt    — Règlement (UE) 2016/679 (RGPD) version française consolidée
 */

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "data");

// ─── Catalogue des textes à télécharger ────────────────────────────────────

const TEXTS: Record<string, { name: string; celex: string; url: string; eurlex_url: string }> = {
  AI_ACT_FR: {
    name: "AI Act (UE 2024/1689)",
    celex: "32024R1689",
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1689",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
  },
  GDPR_FR: {
    name: "RGPD (UE 2016/679)",
    celex: "32016R0679",
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32016R0679",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679",
  },
  NIS2_FR: {
    name: "Directive NIS 2 (UE 2022/2555)",
    celex: "32022L2555",
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32022L2555",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2555",
  },
  DSM_FR: {
    name: "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
    celex: "32019L0790",
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019L0790",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32019L0790",
  },
};

// ─── Strip HTML → texte brut ──────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th|blockquote|section|article|span)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#[0-9]+;/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Téléchargement ────────────────────────────────────────────────────────

async function fetchText(key: string): Promise<void> {
  const meta = TEXTS[key];
  if (!meta) {
    console.error(`❌ Clé inconnue: ${key}. Disponibles: ${Object.keys(TEXTS).join(", ")}`);
    return;
  }

  const outPath = path.join(DATA_DIR, `${key}.txt`);
  console.log(`\n📥 Téléchargement: ${meta.name}`);
  console.log(`   URL: ${meta.url}`);

  let html: string;
  try {
    const res = await fetch(meta.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CompliAI-corpus-fetcher/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    }
    html = await res.text();
  } catch (err) {
    console.error(`   ❌ Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`   → Téléchargez manuellement depuis ${meta.url} et sauvegardez en ${outPath}`);
    return;
  }

  const plain = stripHtml(html);
  if (plain.length < 10_000) {
    console.warn(`   ⚠️  Texte extrait trop court (${plain.length} chars) — vérifiez le contenu`);
  }

  // Front-matter YAML pour le pipeline ingest
  const frontMatter = `---
name: ${meta.name}
version_date: ${new Date().toISOString().slice(0, 10)}
eurlex_url: ${meta.eurlex_url}
language: fr
---
`;

  fs.writeFileSync(outPath, frontMatter + plain, "utf8");
  console.log(`   ✅ Sauvegardé: ${outPath} (${plain.length.toLocaleString()} chars)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🇫🇷 CompliAI — Téléchargement corpus EUR-Lex (version française)");
  console.log("================================================================\n");

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const targets = process.argv.slice(2);
  const keys = targets.length > 0 ? targets : Object.keys(TEXTS);

  for (const key of keys) {
    await fetchText(key);
    // Pause entre requêtes pour ne pas surcharger EUR-Lex
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n🎉 Téléchargement terminé. Lance ensuite:");
  console.log("   npm run ingest AI_ACT_FR.txt");
  console.log("   npm run ingest GDPR_FR.txt");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
