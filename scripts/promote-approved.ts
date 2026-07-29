/**
 * Promotion des documents validés → legal_chunks (production).
 *
 * C'est le maillon qui rend la validation admin effective : sans lui, un
 * document valide dans l'onglet reste dans `staging_chunks` et n'atteint jamais
 * le corpus que le chat interroge (`legal_chunks`).
 *
 * `runProductionIndexer()` sans argument récupère automatiquement les documents
 * dont TOUS les chunks sont `approved`, génère leurs embeddings OpenAI et les
 * insère dans `legal_chunks` (avec archivage des versions remplacées).
 *
 * Jusqu'ici la promotion ne passait que par des scripts one-shot par corpus
 * (promote-rgpd, promote-eidas2…) : aucune commande générale « promeus tout ce
 * qui est validé ». C'est cette commande.
 *
 * SÉCURITÉ — écrit dans legal_chunks, la table qui sert les clients :
 *   - `--dry-run` (DÉFAUT) : aucune écriture, montre seulement le périmètre.
 *   - `--apply`            : écriture réelle. Requiert le flag explicite.
 * Ne promeut jamais que des chunks déjà approuvés en validation admin — la
 * règle d'or du projet est respectée par construction.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/promote-approved.ts            # dry-run
 *   npx tsx --env-file=.env.local scripts/promote-approved.ts --apply    # réel
 */
import { runProductionIndexer } from "../lib/rag-production-indexer/pipeline";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  console.log(
    dryRun
      ? "MODE DRY-RUN — aucune écriture dans legal_chunks. Ajouter --apply pour promouvoir réellement.\n"
      : "MODE APPLY — écriture réelle dans legal_chunks (production).\n"
  );

  const result = await runProductionIndexer([], { dryRun });

  console.log("\n=== BILAN ===");
  console.log(`  documents traités : ${result.documents.length}`);
  console.log(`  chunks insérés    : ${result.totalInserted}`);
  console.log(`  chunks mis à jour : ${result.totalUpdated}`);
  console.log(`  chunks ignorés    : ${result.totalSkipped}`);
  console.log(`  erreurs           : ${result.totalErrors}`);
  if (!dryRun) {
    console.log(`  cache invalidé    : ${result.cacheInvalidated}`);
  }
  console.log(`  durée             : ${Math.round(result.durationMs / 1000)}s`);

  if (dryRun && result.documents.length > 0) {
    console.log("\nRien n'a été écrit. Relancer avec --apply pour promouvoir.");
  }

  if (result.totalErrors > 0) process.exitCode = 1;
}

void main().catch((e) => {
  console.error("ÉCHEC :", e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
