#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { findByHash, findByIdentityRobust } from "@/lib/rag-production-indexer/indexer";
import type { StagingChunkApproved } from "@/lib/rag-production-indexer/types";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DOC_ID = "44aa471d-9974-4a6e-aaa8-5eefbfa9ddd5";

void (async () => {
  // Récupérer tous les approved chunks MACHINE
  const { data: chunks, error } = await sb
    .from("staging_chunks")
    .select("id, chunk_hash, regulation, article_number, paragraph_number, point_letter, language, granularity, content, publication_date, parent_chunk_id")
    .eq("document_id", DOC_ID)
    .eq("validation_status", "approved");

  if (error) throw error;
  console.log(`Total chunks MACHINE approuvés : ${chunks?.length ?? 0}`);

  // Identifier ceux qui ne sont PAS dans legal_chunks (ni par hash, ni par identité)
  const errors: { chunk: typeof chunks[0]; reason: string }[] = [];
  let checked = 0;

  for (const chunk of (chunks ?? [])) {
    // Vérifier si déjà présent par hash
    const byHash = await findByHash(sb, chunk.chunk_hash as string);
    if (byHash) { checked++; continue; } // déjà présent → ignoré (normal)

    // Vérifier identité
    const byId = await findByIdentityRobust(sb, {
      regulation: chunk.regulation as string,
      article_number: chunk.article_number as string | null,
      paragraph_number: chunk.paragraph_number as string | null,
      point_letter: chunk.point_letter as string | null,
      language: chunk.language as string,
    });

    // Tenter un embedding pour vérifier si le contenu pose problème
    const content = (chunk.content as string) ?? "";
    try {
      const resp = await oai.embeddings.create({
        model: "text-embedding-3-small",
        input: content.substring(0, 100),
        dimensions: 1536,
      });
      if (!resp.data[0]?.embedding) throw new Error("no embedding");
    } catch (e) {
      errors.push({ chunk, reason: `embedding failed: ${(e as Error).message}` });
      continue;
    }

    // Tenter insert simulé pour détecter contrainte
    if (!byId) {
      // Nouveau chunk — vérifier si insert échouerait
      const { error: testErr } = await sb.from("legal_chunks").insert({
        regulation: chunk.regulation,
        article_number: chunk.article_number,
        paragraph_number: chunk.paragraph_number,
        point_letter: chunk.point_letter,
        granularity: chunk.granularity,
        language: chunk.language,
        chunk_hash: `TEST_${chunk.chunk_hash}`, // hash différent pour éviter vraie insertion
        content: (chunk.content as string).substring(0, 10),
        version_date: chunk.publication_date,
      });
      if (testErr) {
        errors.push({ chunk, reason: `insert constraint: ${testErr.message} (code: ${testErr.code})` });
        // Rollback le test
        await sb.from("legal_chunks").delete().eq("chunk_hash", `TEST_${chunk.chunk_hash}`);
      }
    }
    checked++;
    if (checked % 50 === 0) process.stdout.write(`${checked}...`);
  }

  console.log(`\n\nChunks avec erreur : ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nDétail des 10 premières erreurs :");
    for (const { chunk, reason } of errors.slice(0, 10)) {
      console.log(`  [${chunk.granularity}] Art.${chunk.article_number} §${chunk.paragraph_number} pt.${chunk.point_letter}`);
      console.log(`  hash: ${chunk.chunk_hash}`);
      console.log(`  raison: ${reason}`);
      console.log();
    }
  }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
