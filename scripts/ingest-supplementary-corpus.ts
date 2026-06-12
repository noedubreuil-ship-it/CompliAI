/**
 * Indexe ICO, normes internationales et renforts AEPD dans national_legal_texts.
 *
 * Usage: npm run ingest:supplementary-corpus
 */

import { ingestSupplementaryCorpusSeeds } from "@/lib/ingest/supplementary-corpus-ingest";

async function main() {
  const report = await ingestSupplementaryCorpusSeeds();
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
