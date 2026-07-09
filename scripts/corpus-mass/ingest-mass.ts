#!/usr/bin/env tsx
/**
 * ingest-mass.ts — Ingestion massive corpus RAG CompliAI
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/corpus-mass/ingest-mass.ts --wave=edpb           # dry-run EDPB
 *   npx tsx --env-file=.env.local scripts/corpus-mass/ingest-mass.ts --wave=cjue --execute # insérer CJUE
 *   npx tsx --env-file=.env.local scripts/corpus-mass/ingest-mass.ts --wave=regulations    # dry-run réglements
 *   npx tsx --env-file=.env.local scripts/corpus-mass/ingest-mass.ts --wave=all --execute  # toutes vagues
 *   npx tsx --env-file=.env.local scripts/corpus-mass/ingest-mass.ts --wave=edpb --id=edpb-04-2022-fines --execute
 *
 * Règles :
 *   - Dry-run par défaut — aucune écriture sans --execute
 *   - Ne modifie JAMAIS legal_chunks directement
 *   - Passe par pending_documents → cron-ingestion → staging_chunks → validation admin → production indexer
 *   - Staging avant production TOUJOURS
 */

import * as fs from "fs";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { MassDocument, DocumentWave } from "./types";
import { EDPB_MASS_MANIFEST } from "./manifest-edpb";
import { CJUE_MASS_MANIFEST } from "./manifest-cjue";
import { REGULATIONS_MASS_MANIFEST } from "./manifest-regulations";

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");
const targetId = args.find((a) => a.startsWith("--id="))?.split("=")[1];
const waveArg = (args.find((a) => a.startsWith("--wave="))?.split("=")[1] ?? "all") as DocumentWave | "all";

const RAG_INGESTION_MODEL = "claude-sonnet-4-6";

// ─── Supabase ────────────────────────────────────────────────────────────────

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");
  return createClient(url, key);
}

// ─── URL probe ───────────────────────────────────────────────────────────────

async function probeUrl(url: string): Promise<{ ok: boolean; status: number; bytes: number }> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      headers: { "User-Agent": "CompliAI-RAG-bot/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const cl = parseInt(res.headers.get("content-length") ?? "0", 10);
    return { ok: res.status < 400, status: res.status, bytes: cl };
  } catch {
    return { ok: false, status: 0, bytes: 0 };
  }
}

// ─── Insert pending_document ──────────────────────────────────────────────────

async function insertDoc(
  sb: ReturnType<typeof getSb>,
  doc: MassDocument,
): Promise<{ inserted: boolean; skipped?: string; error?: string }> {
  const externalId = `corpus-mass-${doc.id}`;

  // Dédup par external_id
  const { data: existing } = await sb
    .from("pending_documents")
    .select("id, status")
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) {
    return { inserted: false, skipped: `déjà présent (status=${existing.status})` };
  }

  // Chercher source monitoring existante
  const searchTerm = doc.kind.includes("edpb") || doc.id.startsWith("edpb") || doc.id.startsWith("wp")
    ? "EDPB"
    : doc.kind === "cjeu_judgment"
    ? "CJUE"
    : doc.kind === "ai_office_guidance"
    ? "Commission"
    : "EUR-Lex";

  const { data: source } = await sb
    .from("monitoring_sources")
    .select("id")
    .ilike("name", `%${searchTerm}%`)
    .limit(1)
    .maybeSingle();

  const row = {
    source_id: source?.id ?? null,
    external_id: externalId,
    celex: doc.celex ?? null,
    ecli: doc.ecli ?? null,
    source_url: doc.officialUrl,
    raw_content_url: doc.rawContentUrl ?? null,
    raw_content_text: null,
    title: doc.title,
    document_type: (
      doc.kind === "other" || doc.kind === "edpb_recommendation" || doc.kind === "edpb_binding_decision"
        ? "other"
        : doc.kind
    ) as string,
    language: doc.language,
    country: "EU",
    publication_date: null as string | null,
    status: "pending" as const,
    retry_count: 0,
    metadata: {
      corpus_mass: true,
      wave: doc.wave,
      priority: doc.priority,
      size_risk: doc.sizeRisk ?? "unknown",
      url_confidence: doc.urlConfidence ?? "medium",
      inserted_at: new Date().toISOString(),
      estimated_chunks: doc.estimatedChunks,
    },
  };

  const { error } = await sb.from("pending_documents").insert(row);
  if (error) return { inserted: false, error: error.message };
  return { inserted: true };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const allDocs: MassDocument[] = [
    ...EDPB_MASS_MANIFEST,
    ...CJUE_MASS_MANIFEST,
    ...REGULATIONS_MASS_MANIFEST,
  ];

  let docs = waveArg === "all" ? allDocs : allDocs.filter((d) => d.wave === waveArg);
  if (targetId) docs = docs.filter((d) => d.id === targetId);

  // En mode execute, exclure les docs avec URL non vérifiée (skipUntilUrlFixed)
  if (!dryRun) {
    const skippedFixed = docs.filter((d) => d.skipUntilUrlFixed);
    if (skippedFixed.length > 0) {
      console.warn(`⚠️  ${skippedFixed.length} doc(s) exclus (skipUntilUrlFixed) :`);
      skippedFixed.forEach((d) => console.warn(`   - ${d.id}`));
      console.log();
    }
    docs = docs.filter((d) => !d.skipUntilUrlFixed);
  }

  if (docs.length === 0) {
    console.error(`Aucun document pour wave=${waveArg} id=${targetId ?? "(tous)"}`);
    process.exit(1);
  }

  console.log("=".repeat(70));
  console.log("  ingest-mass — Ingestion massive corpus RAG CompliAI");
  console.log("=".repeat(70));
  console.log(`Mode      : ${dryRun ? "DRY-RUN (aucune écriture)" : "EXECUTE"}`);
  console.log(`Vague     : ${waveArg}`);
  console.log(`Modèle    : ${RAG_INGESTION_MODEL}`);
  console.log(`Documents : ${docs.length}`);
  if (!dryRun) {
    console.warn("\n⚠️  Mode --execute : insertion dans pending_documents autorisée.");
    console.warn("   Documents 'sizeRisk=high' seront insérés mais resteront en erreur");
    console.warn("   jusqu'au fix max_tokens (lib/rag-ingestion/parsers/types.ts).\n");
  }
  console.log();

  const sb = dryRun ? null : getSb();

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let urlFails = 0;
  const lines: string[] = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const idx = `[${i + 1}/${docs.length}]`;
    console.log(`${idx} ${doc.id}  [${doc.priority}]`);
    console.log(`  ${doc.title}`);

    let urlStatus = "skip";
    if (dryRun) {
      const probe = await probeUrl(doc.rawContentUrl ?? doc.officialUrl);
      if (probe.ok) {
        urlStatus = `HTTP ${probe.status} ✓`;
      } else if (probe.status === 429) {
        // Rate limiting EDPB/Commission CDN — comportement documenté, pas un 404
        urlStatus = `HTTP 429 ⚡ rate-limited (ok)`;
      } else {
        urlStatus = `FAIL ${probe.status || "timeout"} ✗`;
        urlFails++;
      }
    } else {
      urlStatus = "skip probe";
    }

    const riskLabel = doc.sizeRisk === "high" ? " ⚠️  RISK_MAX_TOKENS" : "";
    const confLabel = doc.urlConfidence === "low" ? " ⚠️  URL_UNCERTAIN" : "";
    console.log(`  URL: ${urlStatus}${confLabel}${riskLabel}`);

    let resultStr = "(dry-run)";
    if (!dryRun && sb) {
      const r = await insertDoc(sb, doc);
      if (r.inserted) {
        inserted++;
        resultStr = "✓ Inséré dans pending_documents";
      } else if (r.skipped) {
        skipped++;
        resultStr = `→ Ignoré : ${r.skipped}`;
      } else {
        errors++;
        resultStr = `✗ Erreur : ${r.error}`;
      }
      console.log(`  ${resultStr}`);
    }

    lines.push(`| ${i + 1} | ${doc.id} | ${doc.title.slice(0, 60)} | ${urlStatus} | ${doc.sizeRisk ?? "-"} | ${resultStr} |`);
    console.log();
  }

  // Rapport
  const reportDate = new Date().toISOString().slice(0, 10);
  const reportPath = `RAG_MASS_INGEST_WAVE_${waveArg.toUpperCase()}_${reportDate}.md`;
  const report = [
    `# Rapport ingestion massive — vague ${waveArg}`,
    "",
    `**Date** : ${new Date().toISOString()}`,
    `**Mode** : ${dryRun ? "dry-run" : "execute"}`,
    `**Documents** : ${docs.length}`,
    dryRun ? `**URL fails** : ${urlFails}` : `**Insérés** : ${inserted} | **Ignorés** : ${skipped} | **Erreurs** : ${errors}`,
    "",
    "## Détail",
    "",
    "| # | ID | Titre | URL | Size risk | Résultat |",
    "|---:|---|---|---|---|---|",
    ...lines,
    "",
    "## Prochaines étapes",
    "",
    dryRun
      ? "1. Vérifier les URL FAIL et corriger le manifeste\n2. Relancer avec --execute après feu vert\n3. Puis lancer cron-ingestion.ts pour créer les staging_chunks"
      : "1. Lancer cron-ingestion.ts pour créer les staging_chunks\n2. Valider via /dashboard/admin/rag-validation\n3. Demander feu vert production à l'utilisateur",
  ].join("\n");

  fs.writeFileSync(reportPath, report);
  console.log("=".repeat(70));
  if (dryRun) {
    console.log(`  DRY-RUN terminé : ${docs.length} docs vérifiés, ${urlFails} URL en échec`);
  } else {
    console.log(`  Résultat : ${inserted} insérés, ${skipped} ignorés, ${errors} erreurs`);
  }
  console.log(`  Rapport : ${reportPath}`);
  console.log("=".repeat(70));

  if (errors > 0) process.exit(1);
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e);
  process.exit(1);
});
