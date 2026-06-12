/**
 * Injection des seeds jurisprudentiels (EU + États membres) dans Supabase pgvector.
 * Usage : npm run ingest:case-law
 */

import { ingestAllCaseLawSeeds } from "@/lib/ingest/case-law-seeds-ingest";

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
    console.error("Variables NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY requises.");
    process.exit(1);
  }

  const { eu, national } = await ingestAllCaseLawSeeds();
  console.log("EU jurisdictions :", eu);
  console.log("National jurisdictions :", national);
  if (eu.errors.length > 0 || national.errors.length > 0) {
    console.error("Des erreurs sont survenues (voir ci-dessus).");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
