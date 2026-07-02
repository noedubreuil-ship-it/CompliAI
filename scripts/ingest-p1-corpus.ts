#!/usr/bin/env tsx
/**
 * ingest-p1-corpus.ts — Ingestion des textes P1 prioritaires (branche 3).
 *
 * Mode dry-run par défaut : valide le manifeste, vérifie les URLs, estime les coûts.
 * Mode --execute : insère les documents dans pending_documents pour traitement par le pipeline.
 * Aucune écriture directe dans legal_chunks — toujours via staging_chunks → validation admin.
 *
 * Usage :
 *   npx tsx scripts/ingest-p1-corpus.ts                              # dry-run tous les docs
 *   npx tsx scripts/ingest-p1-corpus.ts --document=dora-2022-2554    # dry-run un doc
 *   npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute
 *   npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=dora-2022-2554
 *
 * Après --execute : lancer le pipeline via scripts/cron-ingestion.ts (avec feu vert)
 * pour créer les staging_chunks, puis valider via /dashboard/admin/rag-validation.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { P1_CORPUS_MANIFEST, getP1Document, type P1CorpusDocument } from "./ingest-p1/manifest";
import { RAG_INGESTION_MODEL } from "../lib/rag-ingestion/parsers/types";

const DATA_DIR = path.join(__dirname, "data/p1");
const dryRun = !process.argv.includes("--execute");
const docArg = process.argv.find((a) => a.startsWith("--document="));
const targetId = docArg?.split("=")[1];

const REPORT_FILE = path.join(
  process.cwd(),
  `RAG_P1_INGEST_PREP_REPORT_${new Date().toISOString().slice(0, 10)}.md`
);

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  return createClient(url, key);
}

async function probeUrl(url: string): Promise<{ ok: boolean; status: number; bytes: number }> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "CompliAI-RAG/2.0 (+https://compliai.fr)" },
      signal: AbortSignal.timeout(15_000),
    });
    const len = Number(resp.headers.get("content-length") ?? "0");
    return { ok: resp.ok, status: resp.status, bytes: Number.isFinite(len) ? len : 0 };
  } catch {
    return { ok: false, status: 0, bytes: 0 };
  }
}

function localPathFor(doc: P1CorpusDocument): string {
  return doc.localTxtPath
    ? path.join(__dirname, doc.localTxtPath)
    : path.join(DATA_DIR, `${doc.id}.txt`);
}

function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

async function insertPendingDocument(
  sb: ReturnType<typeof getSb>,
  doc: P1CorpusDocument,
  rawContentText: string | null
): Promise<{ inserted: boolean; existingId?: string; reason?: string }> {
  // Vérifier doublon par external_id ou celex
  const externalId = doc.celex ?? doc.ecli ?? doc.id;

  const { data: existing } = await sb
    .from("pending_documents")
    .select("id, status")
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) {
    return { inserted: false, existingId: existing.id, reason: `déjà présent (status=${existing.status})` };
  }

  // Chercher la source_id P1 ou en créer une logique
  // On utilise une source_id fictive stable basée sur le kind du document
  // En production, ces documents auraient une source_id de leur émetteur
  const kindSourceMap: Record<string, string> = {
    edpb_guideline: "edpb-guidelines-p1",
    edpb_opinion: "edpb-opinions-p1",
    cjeu_judgment: "cjeu-judgments-p1",
    ai_office_guidance: "ai-office-p1",
    eu_regulation: "eur-lex-p1",
  };

  // Trouver une source existante ou utiliser un UUID stable
  const { data: source } = await sb
    .from("monitoring_sources")
    .select("id")
    .ilike("name", `%${doc.kind === "eu_regulation" ? "EUR-Lex" : doc.kind.includes("edpb") ? "EDPB" : doc.kind.includes("cjeu") ? "CJUE" : "Commission"}%`)
    .limit(1)
    .maybeSingle();

  // Fallback: source_id dérivé du kind (UUID v5 stable)
  const fallbackSourceId = crypto
    .createHash("sha256")
    .update(`p1-source-${kindSourceMap[doc.kind] ?? "p1"}`)
    .digest("hex")
    .slice(0, 8)
    .padEnd(8, "0");

  const sourceId = source?.id ?? `00000000-0000-0000-0000-${fallbackSourceId.slice(0, 12)}`;

  const row = {
    source_id: sourceId,
    external_id: externalId,
    celex: doc.celex ?? null,
    ecli: doc.ecli ?? null,
    source_url: doc.officialUrl,
    raw_content_url: doc.rawContentUrl ?? null,
    raw_content_text: rawContentText,
    title: doc.title,
    document_type: doc.kind,
    language: doc.language,
    country: "EU",
    publication_date: null,
    status: "pending" as const,
    retry_count: 0,
    metadata: {
      p1_priority: true,
      ingestion_source: "ingest-p1-corpus.ts",
      inserted_at: new Date().toISOString(),
      estimated_chunks: doc.estimatedChunks,
    },
  };

  const { error } = await sb.from("pending_documents").insert(row);
  if (error) throw new Error(`Insert pending_document '${doc.id}' : ${error.message}`);

  return { inserted: true };
}

async function main(): Promise<void> {
  console.log("=".repeat(70));
  console.log("  ingest-p1-corpus — Branche 3 : textes P1 prioritaires");
  console.log("=".repeat(70));
  console.log(`Mode      : ${dryRun ? "DRY-RUN (aucune écriture)" : "EXECUTE (insertion pending_documents)"}`);
  console.log(`Modèle    : ${RAG_INGESTION_MODEL}`);
  console.log(`Documents : ${targetId ? 1 : P1_CORPUS_MANIFEST.length}`);
  console.log();

  if (!dryRun) {
    console.warn("⚠️  Mode --execute : insertion dans pending_documents autorisée.");
    console.warn("   Après exécution, lancer cron-ingestion.ts pour créer les staging_chunks.");
    console.warn("   Puis valider via /dashboard/admin/rag-validation.\n");
  }

  const docs = targetId
    ? [getP1Document(targetId)].filter((d): d is NonNullable<typeof d> => Boolean(d))
    : P1_CORPUS_MANIFEST;

  if (docs.length === 0) {
    throw new Error(`Document P1 inconnu : ${targetId}`);
  }

  const sb = dryRun ? null : getSb();

  const report: string[] = [
    "# Rapport préparation ingest P1",
    "",
    `**Date** : ${new Date().toISOString()}`,
    `**Mode** : ${dryRun ? "dry-run" : "execute"}`,
    `**Modèle** : ${RAG_INGESTION_MODEL}`,
    "",
    "## Documents",
    "",
    "| # | ID | Titre | URL OK | Taille | Chunks est. | Fichier local | Statut |",
    "|---:|---|---|---|---:|---|---|---|",
  ];

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  let idx = 0;
  for (const doc of docs) {
    idx++;
    const localPath = localPathFor(doc);
    const hasLocal = fs.existsSync(localPath);

    let urlStatus = "—";
    let urlBytes = 0;
    const probeTarget = doc.rawContentUrl ?? doc.officialUrl;

    if (!hasLocal && dryRun) {
      const probe = await probeUrl(probeTarget);
      urlStatus = probe.ok ? `HTTP ${probe.status}` : `FAIL ${probe.status || "timeout"}`;
      urlBytes = probe.bytes;
    } else if (!hasLocal) {
      urlStatus = "skip probe";
    } else {
      urlStatus = "local";
    }

    const chunksEst = `${doc.estimatedChunks[0]}–${doc.estimatedChunks[1]}`;
    const localStatus = hasLocal ? "✓ présent" : "à télécharger";

    console.log(`[${idx}/${docs.length}] ${doc.id}`);
    console.log(`  ${doc.title}`);
    console.log(`  URL: ${urlStatus} | Local: ${localStatus} | Chunks: ${chunksEst}`);

    let rowStatus = "dry-run";

    if (!dryRun && sb) {
      try {
        const rawText = hasLocal ? fs.readFileSync(localPath, "utf8") : null;
        const result = await insertPendingDocument(sb, doc, rawText);
        if (result.inserted) {
          console.log(`  ✓ Inséré dans pending_documents`);
          rowStatus = "inserted";
          inserted++;
        } else {
          console.log(`  ⚠  Ignoré : ${result.reason}`);
          rowStatus = `skipped (${result.reason})`;
          skipped++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ✗ Erreur : ${msg}`);
        rowStatus = `error: ${msg.slice(0, 60)}`;
        errors++;
      }
    }

    report.push(
      `| ${idx} | \`${doc.id}\` | ${doc.title.replace(/\|/g, "/")} | ${urlStatus} | ${urlBytes || "—"} | ${chunksEst} | ${localStatus} | ${rowStatus} |`
    );
  }

  report.push("");
  report.push("## Commandes d'exécution (après feu vert explicite)");
  report.push("");
  report.push("### Insérer tous les documents en pending_documents");
  report.push("```bash");
  report.push("npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute");
  report.push("```");
  report.push("");
  report.push("### Lancer l'ingestion (après insertion)");
  report.push("```bash");
  report.push("npx tsx --env-file=.env.local scripts/cron-ingestion.ts");
  report.push("```");
  report.push("");
  report.push("### Document par document");
  report.push("```bash");
  for (const doc of docs) {
    report.push(`# ${doc.title}`);
    report.push(`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=${doc.id}`);
  }
  report.push("```");

  if (!dryRun) {
    report.push("");
    report.push("## Résultat");
    report.push(`- Insérés : ${inserted}`);
    report.push(`- Ignorés (doublon) : ${skipped}`);
    report.push(`- Erreurs : ${errors}`);
  }

  fs.writeFileSync(REPORT_FILE, report.join("\n"), "utf8");

  console.log(`\nRapport : ${REPORT_FILE}`);

  if (dryRun) {
    console.log("\n[DRY-RUN] Scripts prêts. Aucune ingestion lancée.");
    console.log("Lancez avec --execute après feu vert explicite.");
  } else {
    console.log(`\nRésultat : ${inserted} insérés, ${skipped} ignorés, ${errors} erreurs`);
    if (errors > 0) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
