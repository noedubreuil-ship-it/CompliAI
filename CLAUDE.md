# CLAUDE.md

Contexte projet pour Claude Code sur le repo CompliAI. Ce fichier sert de point d'entree pour les chantiers d'infrastructure, de diagnostic et de maintenance. Il ne remplace pas les runbooks RAG : il indique ou regarder et quelles regles respecter.

## 1. Vue D'ensemble Du Projet

- Nom : CompliAI
- URL : https://www.compliai.eu
- Objectif : SaaS B2B de conformite au droit europeen de l'IA et du numerique.
- Cible : entreprises internationales, toutes nationalites, souhaitant deployer des produits IA ou numeriques en Union europeenne.
- Tarif public : 49 EUR/mois.
- Positionnement : outil operationnel de diagnostic, generation documentaire, RAG juridique et suivi de conformite pour les textes europeens et sources officielles.

## 2. Pile Technique Exacte

- Framework : Next.js `14.2.18`.
- UI/runtime : React `18.3.1`, TypeScript `^5`, Tailwind CSS `^3.4.1`, Radix UI, Framer Motion.
- Backend applicatif : Next.js App Router, routes API dans `app/api/**`.
- Base de donnees : Supabase Postgres via `@supabase/supabase-js` `^2.45.4` et `@supabase/ssr` `^0.5.1`.
- Auth : Supabase Auth, profils applicatifs via table `profiles`.
- ORM : Drizzle n'est pas utilise dans l'etat actuel du repo ; les migrations sont SQL Supabase et le code utilise le client Supabase.
- Vector store : Supabase `pgvector`, embeddings dimension `1536`.
- Index vectoriel : HNSW `m = 16`, `ef_construction = 64`.
- Recherche RAG : hybride `pgvector` + `tsvector`/GIN, fonction `search_legal_chunks_hybrid`.
- Modele de parsing ingestion RAG : `claude-sonnet-4-6`, temperature `0`, max tokens `8192`.
- Modele d'embedding impose : OpenAI `text-embedding-3-small`, dimension `1536`.
- Paiements : Stripe `^17.3.1`.
- Email : Resend `^4.0.1`.
- Cache : Upstash Redis via REST, utilise pour cache semantique et invalidation RAG. Si Upstash n'est pas configure, le cache se desactive proprement.
- Monitoring applicatif : Sentry `^10.51.0`.
- Hebergement cible : Vercel.
- Crons cibles : GitHub Actions scheduled workflows. Les scripts cron existent, mais l'activation planifiee doit rester explicite et progressive.
- Tests : Vitest `^3.0.5`.

## 3. Documentation Du RAG

Fichiers presents a la racine du repo :

- `RAG_AUTOMATION_RUNBOOK.md` : runbook operationnel complet du pipeline RAG automatique, activation, rollback, staging, politique d'erreur.
- `RAG_AUTOMATION_FINAL_SUMMARY.md` : recapitulatif consolide des phases 0 a 6, scores, couts et statut final du chantier.
- `RAG_INVENTORY.md` : inventaire du corpus RAG, sources, volumes et etat de couverture.
- `RAG_PIPELINE_SCHEMA.md` : schema cible du pipeline RAG automatique et tables Supabase associees.
- `MONITORING_SOURCES.md` : catalogue des sources officielles surveillees, throttling, filtres et diagnostics de bruit.
- `RAG_PRODUCTION_INDEXER.md` : documentation de l'indexer de production, promotion de chunks et archivage.
- `RAG_QUALITY_ASSURANCE.md` : mecanismes qualite RAG, golden set, derive historique, couverture et chunks morts.
- `RAG_QUALITY_BASELINE_REPORT.md` : rapport de baseline qualite avec etat du golden set.
- `RAG_FUTURE_IMPROVEMENTS.md` : dette technique et ameliorations futures, notamment types Supabase section K.
- `RAG_COST_ESTIMATE.md` : estimation des couts initiaux et recurrents, ajustee apres activation reelle.
- `RAG_ACTIVATION_REPORT_2026-06-26.md` : journal d'activation effective, staging, migration 042 et observations.
- `RAG_RETRIEVAL_DIAGNOSTIC.md` : diagnostics de retrieval et analyses des regressions RAG.

Fichiers demandes dans certains plans mais non presents actuellement a la racine :

- `RAG_INGESTION.md` : le contenu ingestion est aujourd'hui documente dans le runbook, le schema pipeline et les tests/code `lib/rag-ingestion/**`.
- `RAG_VALIDATION_DASHBOARD.md` : le dashboard de validation est documente dans le runbook et implemente dans `app/(app)/dashboard/admin/rag-validation/**`.

## 4. Conventions Du Projet

- Branches : utiliser des branches dediees par chantier. Le format observe pour les branches agent est `cursor/<description-kebab-case>`, par exemple `cursor/add-journal-calendar-sources-dpa-filters`.
- Commits : style Conventional Commits observe (`feat: ...`, `docs: ...`, `fix: ...`). Les messages doivent etre courts, en francais ou anglais selon le contexte du chantier.
- Commits en environnement sale : ne stage que les fichiers lies a la demande. Ne jamais embarquer des changements existants non lies.
- Migrations Supabase : fichiers SQL numerotes dans `supabase/migrations/`. Toujours valider staging avant production. Ne jamais appliquer de DDL production sans sauvegarde et verification.
- Tests : Vitest, tests colocaux avec suffixe `.test.ts`. Les fixtures externes doivent etre stockees dans `tests/fixtures/**`.
- Sources officielles : en developpement, utiliser les fixtures locales. Les appels reseau reels sont reserves aux runs explicitement valides.
- Parsing IA RAG : modele impose `claude-sonnet-4-6` uniquement. Ne jamais remplacer par GPT, Opus, Haiku ou autre sans validation explicite.
- Embeddings : modele impose `text-embedding-3-small`, dimension `1536` uniquement. Toute migration vers un autre modele est un chantier separe.
- Types Supabase : dette connue. Regenerer les types avant les gros chantiers DB et documenter les changements.

## 5. Regles Non Negotiables

- Aucune modification directe de `legal_chunks` en production sans passer par le pipeline staging -> validation admin -> indexer.
- Aucune ingestion automatique sans validation admin avant promotion en production.
- Aucun bypass du systeme qualite golden set.
- Aucun appel API externe vers les sources officielles depuis l'environnement de developpement sans feu vert explicite ; fixtures locales uniquement.
- Aucune migration appliquee en production sans validation prealable sur staging.
- Toute dette technique identifiee doit etre documentee dans `RAG_FUTURE_IMPROVEMENTS.md`.
- Ne jamais committer de secrets. Les fichiers `.env*` locaux doivent rester ignores.
- Ne jamais activer de cron planifie sans validation explicite du proprietaire du projet.

## 6. Commandes Utiles

Scripts `package.json` :

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run extract:prompts
npm run qa:consultant
npm run ingest
npm run fetch:eurlex
npm run ingest:case-law
npm run ingest:supplementary-corpus
npm run validate:migrations
npm run backfill:national-corpus-eu27
npm run reingest:national-fallbacks
npm run corpus:refresh-all
npm run video:upscale-hero
```

Commandes RAG courantes :

```bash
npx vitest run lib/rag-monitoring/**/*.test.ts
npx vitest run lib/rag-ingestion/**/*.test.ts
npx vitest run lib/rag-production-indexer/**/*.test.ts
npx vitest run lib/rag-quality/**/*.test.ts
npx tsx --env-file=.env.local scripts/generate-rag-baseline.ts
npx tsx --env-file=.env.local scripts/diag-retrieval.ts
npx tsx --env-file=.env.local scripts/diag-art99.ts
npx tsx --env-file=.env.local scripts/cron-monitoring.ts
npx tsx --env-file=.env.local scripts/cron-ingestion.ts
npx tsx --env-file=.env.local scripts/rechunk-rgpd.ts
npx tsx --env-file=.env.local scripts/add-rgpd-parent-chunks.ts
```

Commandes staging RAG :

```bash
npx tsx --env-file=.env.staging scripts/cron-monitoring.ts
```

Ne jamais afficher les variables d'environnement dans les logs.

## 7. Etat Actuel Du Chantier RAG Au 26 Juin 2026

- Phases 0 a 6 du chantier RAG automation terminees et validees.
- Score golden set final connu : 12/16 OK, 0 WARNING, 4 CRITICAL.
- Questions encore CRITICAL : Q02, Q04, Q05, Q15, liees au corpus AI Act non encore re-chunke en parent-child.
- Couverture finale documentee : 54,8 % des articles critiques en top-3.
- Projet Supabase staging cree : `compliai-staging`, ref `gndvxidkiplskbrqydmw`.
- Migrations RAG `032` a `042` appliquees sur staging.
- Migration `042_rag_pipeline_monitoring_log` appliquee en production apres validation staging.
- Production : `monitoring_log` existe, colonne `retry_count` presente, contrainte `monitoring_sources.source_type` alignee avec `curia_scraping`.
- Sauvegardes production pre-042 creees : `backup_monitoring_sources_20260626_pre_042` et `backup_legal_chunks_20260626_pre_042`.
- Trois sources sures enregistrees en staging : EUR-Lex RSS, CNIL, AEPD.
- Run staging `dryRun=false` valide sur ces 3 sources : exit code 0, 8 documents AEPD en `pending_documents`, aucune erreur silencieuse.
- Cron monitoring planifie : non active.
- Cron ingestion planifie : non active.
- Sources production : ne pas reactiver sans validation explicite.
- EDPB throttle configure a 5000 ms, mais non teste dans le run des 3 sources sures.

## 8. Chantiers Prioritaires A Venir

- Finalisation de l'activation effective du RAG : validation utilisateur, activation progressive source par source en production, surveillance 24-48 h.
- Test EDPB avec throttle 5000 ms dans une phase controlee.
- Extension parent-child aux autres reglements : AI Act, DSA, DMA, CRA, Data Act.
- Re-parsing parent-child complet du corpus AI Act pour resoudre Q02, Q04, Q05, Q15.
- Regeneration des types Supabase, dette documentee dans `RAG_FUTURE_IMPROVEMENTS.md` section K.
- Traduction anglaise de l'interface utilisateur pour la cible internationale.
- Ajout d'autorites nationales candidates si l'usage le justifie : Pologne, Belgique.
- Stabilisation des filtres de monitoring apres deux semaines de donnees reelles.

## 9. Repartition Cursor / Claude Code

- Cursor : developpement de fonctionnalites utilisateur, modifications visuelles, sessions interactives et arbitrages produit.
- Claude Code : chantiers d'infrastructure repetitifs, diagnostics, operations de maintenance, batchs autonomes et verifications longues.
- Regle d'or : ne jamais faire travailler Cursor et Claude Code en parallele sur les memes fichiers ou la meme fonctionnalite.
- Branches Git distinctes obligatoires pour chaque agent et chaque chantier.
- Avant tout travail, verifier `git status` et identifier les changements non lies.
- En fin de chantier, documenter toute anomalie ou dette dans le fichier de suivi approprie.
