/**
 * diag-retrieval.ts — Diagnostic technique du retrieval RAG Phase 5.
 * Exécution : npx tsx --env-file=.env.local scripts/diag-retrieval.ts
 */

import { createClient } from "@supabase/supabase-js";
import { embedText } from "../lib/ai/embeddings";
import { searchLegalChunks } from "../lib/ai/rag";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sep(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log("  " + title);
  console.log("═".repeat(70));
}

function sub(title: string) {
  console.log("\n  ── " + title);
}

// ─── Section A : Inventaire des chunks ───────────────────────────────────────

async function diagInventory() {
  sep("A. INVENTAIRE DES CHUNKS DANS legal_chunks");

  // Count par règlement
  const { data: all } = await (sb as any)
    .from("legal_chunks")
    .select("regulation, content, article_number");

  const counts: Record<string, { n: number; totalLen: number; avgLen?: number }> = {};
  for (const row of (all ?? []) as any[]) {
    const reg = row.regulation ?? "(null)";
    if (!counts[reg]) counts[reg] = { n: 0, totalLen: 0 };
    counts[reg].n++;
    counts[reg].totalLen += (row.content ?? "").length;
  }
  for (const k of Object.keys(counts)) {
    counts[k].avgLen = Math.round(counts[k].totalLen / counts[k].n);
  }

  console.log("\n  Chunks par règlement (trié par count décroissant) :");
  console.log("  " + "-".repeat(65));
  console.log(
    "  " + "Règlement".padEnd(52) + "Chunks".padStart(6) + "  Longueur moy."
  );
  console.log("  " + "-".repeat(65));

  const sorted = Object.entries(counts).sort((a, b) => b[1].n - a[1].n);
  for (const [reg, stats] of sorted) {
    const regTrunc = reg.length > 50 ? reg.slice(0, 48) + "…" : reg;
    console.log(
      "  " +
        regTrunc.padEnd(52) +
        String(stats.n).padStart(6) +
        "  " +
        String(stats.avgLen) +
        " chars"
    );
  }

  // Total
  const total = Object.values(counts).reduce((s, c) => s + c.n, 0);
  console.log("  " + "-".repeat(65));
  console.log("  TOTAL".padEnd(54) + String(total).padStart(6));

  // Distribution longueurs RGPD vs EDPB
  sub("Distribution longueurs : RGPD articles vs EDPB guidelines");
  const rgpdChunks = (all ?? []).filter((r: any) =>
    (r.regulation ?? "").startsWith("RGPD")
  ) as any[];
  const edpbChunks = (all ?? []).filter((r: any) =>
    (r.regulation ?? "").startsWith("EDPB")
  ) as any[];

  function stats(chunks: any[]) {
    const lens = chunks.map((c) => (c.content ?? "").length);
    if (!lens.length) return { min: 0, max: 0, avg: 0, p50: 0, p90: 0 };
    lens.sort((a, b) => a - b);
    return {
      min: lens[0],
      max: lens[lens.length - 1],
      avg: Math.round(lens.reduce((s, l) => s + l, 0) / lens.length),
      p50: lens[Math.floor(lens.length * 0.5)],
      p90: lens[Math.floor(lens.length * 0.9)],
    };
  }

  const rgpdStats = stats(rgpdChunks);
  const edpbStats = stats(edpbChunks);
  console.log(`\n  RGPD articles  (${rgpdChunks.length} chunks) : min=${rgpdStats.min}  avg=${rgpdStats.avg}  p50=${rgpdStats.p50}  p90=${rgpdStats.p90}  max=${rgpdStats.max}`);
  console.log(`  EDPB guidelines (${edpbChunks.length} chunks) : min=${edpbStats.min}  avg=${edpbStats.avg}  p50=${edpbStats.p50}  p90=${edpbStats.p90}  max=${edpbStats.max}`);

  // Exemple de chunks RGPD Art. 22
  sub("Exemples chunks RGPD Art. 22 (décision automatisée)");
  const art22chunks = (all ?? []).filter(
    (r: any) =>
      (r.regulation ?? "").startsWith("RGPD") &&
      (r.article_number ?? "").startsWith("22")
  ) as any[];
  console.log(`  Nombre de chunks RGPD Art. 22 : ${art22chunks.length}`);
  for (const c of art22chunks) {
    console.log(
      `  [${c.article_number}] len=${(c.content ?? "").length} chars — "${(c.content ?? "").slice(0, 120)}…"`
    );
  }

  // Exemple de chunks RGPD Art. 83 §4/§5
  sub("Exemples chunks RGPD Art. 83 (sanctions)");
  const art83chunks = (all ?? []).filter(
    (r: any) =>
      (r.regulation ?? "").startsWith("RGPD") &&
      (r.article_number ?? "").startsWith("83")
  ) as any[];
  console.log(`  Nombre de chunks RGPD Art. 83 : ${art83chunks.length}`);
  for (const c of art83chunks) {
    console.log(
      `  [${c.article_number}] len=${(c.content ?? "").length} chars — "${(c.content ?? "").slice(0, 120)}…"`
    );
  }

  // Exemple de chunks AI Act Art. 99
  sub("Exemples chunks AI Act Art. 99 (sanctions)");
  const art99chunks = (all ?? []).filter(
    (r: any) =>
      (r.regulation ?? "").includes("AI Act") &&
      (r.article_number ?? "").startsWith("99")
  ) as any[];
  console.log(`  Nombre de chunks AI Act Art. 99 : ${art99chunks.length}`);
  for (const c of art99chunks) {
    console.log(
      `  [${c.article_number}] len=${(c.content ?? "").length} chars — "${(c.content ?? "").slice(0, 120)}…"`
    );
  }

  return { rgpdChunks, edpbChunks };
}

// ─── Section B : Similarités cosine brutes ───────────────────────────────────

async function diagSimilarities() {
  sep("B. SIMILARITÉS COSINE BRUTES (cosine seul, sans BM25)");

  const queries = [
    {
      label: "Q06 — SCHUFA Art. 22 décision automatisée",
      text: "Une banque refuse un prêt en se fondant sur un score de crédit calculé par SCHUFA. Quels droits au titre du RGPD Art. 22 ?",
    },
    {
      label: "Q07 — Conditions application Art. 22 + garanties §3",
      text: "Dans quels cas précis l'article 22 du RGPD s'applique-t-il à une décision automatisée, et quelles exceptions permettent ce traitement ?",
    },
    {
      label: "Q08 — Transferts DPF Art. 45 adéquation",
      text: "Peut-on transférer des données personnelles vers un prestataire américain certifié sous le Data Privacy Framework DPF ? Article 45 RGPD adéquation.",
    },
    {
      label: "Q13 — Consentement explicite Art. 9 données santé",
      text: "Application mobile santé collecte des pathologies. Base légale RGPD article 9 consentement explicite données de santé.",
    },
    {
      label: "Q14 — Sanctions Art. 83 §4 §5 RGPD montants",
      text: "Montants maximaux sanctions RGPD article 83 paragraphe 4 et paragraphe 5. 10 millions 20 millions 2% 4% chiffre d'affaires.",
    },
  ];

  for (const query of queries) {
    console.log(`\n  Query : "${query.label}"`);
    console.log("  " + "-".repeat(65));

    // Cosine pur avec seuil très bas
    const supabase = sb as any;
    const embedding = await embedText(query.text);
    const { data: results } = await supabase.rpc("search_legal_chunks", {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 12,
    });

    const chunks = (results ?? []) as any[];
    chunks.forEach((c: any, i: number) => {
      const reg = (c.regulation ?? "").slice(0, 45).padEnd(46);
      const art = (c.article_number ?? "N/A").padEnd(12);
      const sim = (c.similarity ?? 0).toFixed(4);
      console.log(`  #${String(i + 1).padStart(2)}  ${sim}  ${reg}  ${art}`);
    });
  }
}

// ─── Section C : Hypothèse — boost BM25 pour les guidelines ──────────────────

async function diagHybridVsCosine() {
  sep("C. HYBRID (BM25+cosine) vs COSINE PUR — même requête");

  const query = "article 22 RGPD décision automatisée scoring crédit garanties exceptions §3";
  const supabase = sb as any;
  const embedding = await embedText(query);

  // Cosine pur
  const { data: cosineResults } = await supabase.rpc("search_legal_chunks", {
    query_embedding: embedding,
    match_threshold: 0.25,
    match_count: 8,
  });

  // Hybrid
  const { data: hybridResults, error: hybridError } = await supabase.rpc(
    "search_legal_chunks_hybrid",
    {
      query_embedding: embedding,
      query_text: query.slice(0, 400),
      match_threshold: 0.25,
      match_count: 8,
    }
  );

  console.log("\n  Requête : article 22 RGPD décision automatisée scoring crédit garanties §3");
  console.log("\n  COSINE PUR :");
  for (const [i, c] of ((cosineResults ?? []) as any[]).entries()) {
    console.log(
      `  #${i + 1}  ${(c.similarity ?? 0).toFixed(4)}  ${(c.regulation ?? "").slice(0, 40).padEnd(42)}  ${c.article_number ?? "N/A"}`
    );
  }

  if (hybridError) {
    console.log(`\n  HYBRID : erreur — ${hybridError.message}`);
  } else {
    console.log("\n  HYBRID (BM25+cosine) :");
    for (const [i, c] of ((hybridResults ?? []) as any[]).entries()) {
      console.log(
        `  #${i + 1}  ${(c.similarity ?? 0).toFixed(4)}  ${(c.regulation ?? "").slice(0, 40).padEnd(42)}  ${c.article_number ?? "N/A"}`
      );
    }
  }
}

// ─── Section D : Comparaison embedding EDPB vs RGPD pour même concept ────────

async function diagEmbeddingComparison() {
  sep("D. ANALYSE EMBEDDINGS — EDPB vs RGPD pour 'décision automatisée'");

  const queryText = "article 22 RGPD décision automatisée";
  const embedding = await embedText(queryText);
  const supabase = sb as any;

  // Récupérer les chunks RGPD Art. 22 directement
  const { data: rgpdArt22 } = await supabase
    .from("legal_chunks")
    .select("id, regulation, article_number, content, embedding")
    .like("regulation", "RGPD%")
    .like("article_number", "22%");

  // Récupérer quelques chunks EDPB guidelines avec "22" ou "automatisée"
  const { data: edpbArt22 } = await supabase
    .from("legal_chunks")
    .select("id, regulation, article_number, content, embedding")
    .like("regulation", "EDPB%")
    .ilike("content", "%automatisée%");

  function cosine(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  console.log("\n  Similarité cosine brute des chunks RGPD Art. 22 avec la requête :");
  console.log("  Requête : \"article 22 RGPD décision automatisée\"");
  console.log("  " + "-".repeat(65));
  for (const c of (rgpdArt22 ?? []) as any[]) {
    const sim = cosine(embedding, c.embedding);
    console.log(
      `  ${sim.toFixed(4)}  ${c.article_number?.padEnd(12)}  "${(c.content ?? "").slice(0, 80)}…"`
    );
  }

  console.log("\n  Similarité cosine brute des chunks EDPB (contenant 'automatisée') :");
  console.log("  " + "-".repeat(65));
  for (const c of ((edpbArt22 ?? []) as any[]).slice(0, 6)) {
    const sim = cosine(embedding, c.embedding);
    const reg = (c.regulation ?? "").slice(0, 40);
    console.log(
      `  ${sim.toFixed(4)}  ${reg.padEnd(42)}  ${c.article_number ?? "N/A"}`
    );
  }
}

// ─── Section E : Chunking granularité RGPD Art. 9, 35, 83 ───────────────────

async function diagChunkingGranularity() {
  sep("E. GRANULARITÉ DE CHUNKING — RGPD Articles 9, 35, 83");

  const supabase = sb as any;
  const articles = ["9", "35", "83", "22", "28", "17", "6", "7"];

  for (const art of articles) {
    const { data } = await supabase
      .from("legal_chunks")
      .select("article_number, content")
      .like("regulation", "RGPD%")
      .like("article_number", `${art}%`);

    const chunks = (data ?? []) as any[];
    if (chunks.length === 0) {
      console.log(`\n  RGPD Art. ${art} : ABSENT de legal_chunks`);
      continue;
    }

    console.log(
      `\n  RGPD Art. ${art} : ${chunks.length} chunk(s)`
    );
    for (const c of chunks) {
      const len = (c.content ?? "").length;
      const preview = (c.content ?? "").slice(0, 100).replace(/\n/g, " ");
      console.log(
        `    [${(c.article_number ?? "").padEnd(12)}] len=${String(len).padStart(5)} — "${preview}…"`
      );
    }
  }

  // AI Act Art. 5 et 6 pour comparaison
  sep("E2. GRANULARITÉ AI Act Articles 5, 6, 9 (comparaison)");
  for (const art of ["5", "6", "9", "99"]) {
    const { data } = await supabase
      .from("legal_chunks")
      .select("article_number, content")
      .like("regulation", "AI Act%")
      .like("article_number", `${art}%`);

    const chunks = (data ?? []) as any[];
    if (chunks.length === 0) {
      console.log(`\n  AI Act Art. ${art} : ABSENT`);
      continue;
    }
    console.log(`\n  AI Act Art. ${art} : ${chunks.length} chunk(s)`);
    for (const c of chunks) {
      const len = (c.content ?? "").length;
      console.log(
        `    [${(c.article_number ?? "").padEnd(12)}] len=${String(len).padStart(5)} chars`
      );
    }
  }
}

// ─── Section F : Test requêtes directes avec text_type ───────────────────────

async function diagTextType() {
  sep("F. STRUCTURE CHUNKS — text_type et métadonnées pipeline");

  const supabase = sb as any;

  // Distribution text_type
  const { data: all } = await supabase
    .from("legal_chunks")
    .select("text_type, regulation")
    .limit(5000);

  const typeCounts: Record<string, number> = {};
  for (const r of (all ?? []) as any[]) {
    const t = r.text_type ?? "(null)";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  console.log("\n  Distribution text_type :");
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`    ${String(n).padStart(5)}  ${t}`));

  // Vérifier si text_type utilisé dans la recherche hybride
  sub("Signature de la fonction RPC search_legal_chunks_hybrid");
  const { data: fnDef } = await supabase.rpc("search_legal_chunks_hybrid", {
    query_embedding: new Array(1536).fill(0),
    query_text: "test",
    match_threshold: 0.99,
    match_count: 1,
  });
  console.log(
    `  Appel test réussi (résultats avec seuil 0.99) : ${(fnDef ?? []).length} chunks`
  );

  // Requête ciblée BM25 seul : forcer un terme très spécifique
  sub("Test BM25 keyword forcing : 'paragraphe 4 article 83 dix millions euros'");
  const embedding = await embedText("paragraphe 4 article 83 dix millions euros sanctions RGPD");
  const { data: bm25test } = await supabase.rpc("search_legal_chunks_hybrid", {
    query_embedding: embedding,
    query_text: "paragraphe 4 article 83 dix millions euros",
    match_threshold: 0.25,
    match_count: 6,
  });
  for (const [i, c] of ((bm25test ?? []) as any[]).entries()) {
    console.log(
      `  #${i + 1}  ${(c.similarity ?? 0).toFixed(4)}  ${(c.regulation ?? "").slice(0, 40).padEnd(42)}  ${c.article_number ?? "N/A"}`
    );
  }
}

// ─── Section G : Requêtes de l'hypothèse "seuil trop bas" ───────────────────

async function diagThreshold() {
  sep("G. IMPACT DU SEUIL DE SIMILARITÉ");

  const testQuery = "article 22 RGPD décision automatisée scoring crédit";
  const embedding = await embedText(testQuery);
  const supabase = sb as any;

  for (const threshold of [0.50, 0.40, 0.35, 0.30, 0.25]) {
    const { data } = await supabase.rpc("search_legal_chunks", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 10,
    });
    const chunks = (data ?? []) as any[];
    const rgpdCount = chunks.filter((c: any) => (c.regulation ?? "").startsWith("RGPD")).length;
    const edpbCount = chunks.filter((c: any) => (c.regulation ?? "").startsWith("EDPB")).length;
    const aiCount = chunks.filter((c: any) => (c.regulation ?? "").startsWith("AI Act")).length;
    const otherCount = chunks.length - rgpdCount - edpbCount - aiCount;
    const hasArt22 = chunks.some(
      (c: any) => (c.regulation ?? "").startsWith("RGPD") && (c.article_number ?? "").startsWith("22")
    );
    console.log(
      `  seuil=${threshold.toFixed(2)}  total=${String(chunks.length).padStart(2)}  RGPD=${rgpdCount}  EDPB=${edpbCount}  AIAct=${aiCount}  other=${otherCount}  art22present=${hasArt22 ? "✓" : "✗"}  topSim=${chunks[0] ? (chunks[0].similarity ?? 0).toFixed(4) : "N/A"}`
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("CompliAI — Diagnostic technique du retrieval RAG");
  console.log("Date : " + new Date().toLocaleString("fr-FR"));

  await diagInventory();
  await diagSimilarities();
  await diagHybridVsCosine();
  await diagEmbeddingComparison();
  await diagChunkingGranularity();
  await diagTextType();
  await diagThreshold();

  console.log("\n\n" + "═".repeat(70));
  console.log("  FIN DU DIAGNOSTIC");
  console.log("═".repeat(70) + "\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
