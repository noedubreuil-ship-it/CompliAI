/**
 * audit-corpus-coverage.ts — Couverture du corpus par règlement (Axe 3).
 *
 * Les outils annoncent couvrir AI Act, RGPD, NIS2, DSA, DMA, Data Act, DORA, CRA,
 * PLD révisée… Cet audit mesure, dans legal_chunks, combien de chunks existent
 * RÉELLEMENT par règlement, et signale les textes annoncés mais absents/faibles —
 * là où les outils répondraient « à vérifier » faute de source.
 *
 * Lecture seule. Usage :
 *   npx tsx --env-file=.env.local scripts/audit-corpus-coverage.ts
 *   npx tsx --env-file=.env.local scripts/audit-corpus-coverage.ts --json
 *
 * Code de sortie : 1 si un texte CRITIQUE est sous le seuil minimal.
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const JSON_OUT = process.argv.includes("--json");

interface ClaimedText {
  label: string;
  // Motifs reconnaissant ce texte dans le champ `regulation` (numéro ou nom court).
  patterns: RegExp[];
  critical: boolean;
  minChunks: number;
}

const CLAIMED: ClaimedText[] = [
  { label: "AI Act (2024/1689)", patterns: [/2024\/1689/, /\bai\s*act\b/i], critical: true, minChunks: 50 },
  { label: "RGPD (2016/679)", patterns: [/2016\/679/, /\brgpd\b/i, /\bgdpr\b/i], critical: true, minChunks: 50 },
  { label: "NIS2 (2022/2555)", patterns: [/2022\/2555/, /\bnis\s*2\b/i], critical: true, minChunks: 15 },
  { label: "DSA (2022/2065)", patterns: [/2022\/2065/, /\bdsa\b/i], critical: true, minChunks: 15 },
  { label: "DMA (2022/1925)", patterns: [/2022\/1925/, /\bdma\b/i], critical: true, minChunks: 15 },
  { label: "Data Act (2023/2854)", patterns: [/2023\/2854/, /data\s*act/i], critical: false, minChunks: 10 },
  { label: "DORA (2022/2554)", patterns: [/2022\/2554/, /\bdora\b/i], critical: false, minChunks: 10 },
  { label: "CRA (2024/2847)", patterns: [/2024\/2847/, /\bcra\b/i], critical: false, minChunks: 10 },
  { label: "PLD révisée (2024/2853)", patterns: [/2024\/2853/], critical: false, minChunks: 5 },
];

async function fetchAllRegulations(): Promise<{ regulation: string | null }[]> {
  // PostgREST plafonne à 1000 lignes par requête : paginer impérativement,
  // sinon on ne voit que le premier millier (biais vers le plus gros règlement).
  const PAGE = 1000;
  const all: { regulation: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("legal_chunks")
      .select("regulation")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as { regulation: string | null }[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

async function main() {
  const rows = await fetchAllRegulations();
  const total = rows.length;

  // Décompte par valeur brute de `regulation`.
  const byReg: Record<string, number> = {};
  for (const r of rows) {
    const key = (r.regulation ?? "(null)").trim();
    byReg[key] = (byReg[key] ?? 0) + 1;
  }

  const coverage = CLAIMED.map((c) => {
    let count = 0;
    for (const [reg, n] of Object.entries(byReg)) {
      if (c.patterns.some((p) => p.test(reg))) count += n;
    }
    return { label: c.label, count, critical: c.critical, minChunks: c.minChunks, ok: count >= c.minChunks };
  });

  const criticalGaps = coverage.filter((c) => c.critical && !c.ok);

  if (JSON_OUT) {
    console.log(JSON.stringify({ total, coverage, distinctRegulations: Object.keys(byReg).length }, null, 2));
  } else {
    console.log("═".repeat(64));
    console.log("COUVERTURE DU CORPUS — legal_chunks");
    console.log("═".repeat(64));
    console.log(`Total chunks : ${total} · valeurs distinctes de regulation : ${Object.keys(byReg).length}\n`);
    for (const c of coverage) {
      const flag = c.ok ? "ok" : c.critical ? "❌ CRITIQUE sous le seuil" : "⚠ faible";
      console.log(`${c.count.toString().padStart(5)}  ${c.label.padEnd(26)} (min ${c.minChunks})  ${flag}`);
    }
    if (criticalGaps.length) {
      console.log(`\n❌ Textes critiques insuffisamment couverts : ${criticalGaps.map((c) => c.label).join(", ")}`);
    } else {
      console.log("\n✅ Tous les textes critiques sont au-dessus du seuil.");
    }
  }

  if (criticalGaps.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERR", e);
  process.exitCode = 1;
});
