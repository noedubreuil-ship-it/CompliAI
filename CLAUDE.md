# CLAUDE.md

Contexte projet pour Claude Code sur le repo CompliAI. Ce fichier sert de point d'entree pour les chantiers d'infrastructure, de diagnostic et de maintenance. Il doit rester factuel, sans secret, et a jour avec les runbooks operationnels.

## 1. Vue D'ensemble Du Projet

- Nom : CompliAI
- URL : https://www.compliai.eu
- Objectif : SaaS B2B de conformite au droit europeen de l'IA et du numerique.
- Cible : entreprises internationales, toutes nationalites, souhaitant deployer des produits IA ou numeriques en Union europeenne.
- Tarif : 49 EUR/mois.
- Stade : produit en production avec 500+ utilisateurs actifs.
- Positionnement : outil operationnel de diagnostic, generation documentaire, RAG juridique, suivi de conformite et veille officielle sur les textes europeens et sources nationales.

## 2. Pile Technique Exacte

- Framework : Next.js `14.2.18`.
- Runtime UI : React `18.3.1`, React DOM `18.3.1`.
- Langage : TypeScript `^5`, avec exigence de typage strict et absence de `any` non justifie.
- Styling/UI : Tailwind CSS `^3.4.1`, Radix UI, Lucide React, Framer Motion, `class-variance-authority`, `tailwind-merge`.
- Backend applicatif : Next.js App Router, API routes dans `app/api/**`.
- Base de donnees : Supabase Postgres via `@supabase/supabase-js` `^2.45.4` et `@supabase/ssr` `^0.5.1`.
- ORM : Drizzle ORM n'est pas present dans le `package.json` actuel. Les acces DB passent par le client Supabase et les migrations SQL dans `supabase/migrations/`.
- Auth : Supabase Auth, profils applicatifs via table `profiles`.
- Paiements : Stripe `^17.3.1`.
- Email : Resend `^4.0.1`.
- IA Anthropic : `@anthropic-ai/sdk` `^0.90.0`.
- IA OpenAI : `openai` `^4.68.0`.
- Parsing RAG juridique : Claude Sonnet 4.6 (`claude-sonnet-4-6`), temperature `0`, max tokens `8192`.
- Chat juridique : pipeline Claude cote serveur ; verifier `lib/ai/config.ts` avant tout changement de modele.
- Embeddings : OpenAI `text-embedding-3-small`, dimension `1536`, modele impose.
- Vector store : Supabase `pgvector`.
- Index vectoriel : HNSW avec `m = 16`, `ef_construction = 64`.
- Recherche hybride : `pgvector` + `tsvector`/GIN, fonction `search_legal_chunks_hybrid`.
- Cache semantique : Upstash Redis via REST, utilise pour le cache semantique et l'invalidation RAG. Si Upstash n'est pas configure, le cache se desactive proprement.
- Monitoring applicatif : Sentry `^10.51.0`.
- Hebergement : Vercel.
- Crons RAG cibles : GitHub Actions scheduled workflows.
- Tests : Vitest `^3.0.5`.
- Parsing XML/HTML monitoring : `fast-xml-parser` `^5.9.3`, `node-html-parser` `^8.0.3`.

## 3. Architecture Du Code

- `app/` : routes Next.js App Router, pages publiques, dashboard authentifie et routes API.
- `app/api/**` : endpoints serveur. Les routes admin sont sous `app/api/admin/**` et doivent etre protegees par logique admin centralisee ou verifiee localement tant que la dette existe.
- `app/(app)/dashboard/**` : interface authentifiee principale.
- `app/(app)/dashboard/admin/rag-validation/**` : interface admin de validation des chunks RAG en staging.
- `app/(public)/**` : routes publiques, pages partageables et pages marketing.
- `components/` : composants React reutilisables.
- `components/ui/` : primitives UI et composants de design system applicatif.
- `lib/` : modules metier, clients externes, logique IA, RAG, credits, email, rate limit et utilitaires.
- `lib/ai/**` : clients IA, configuration modele, prompts, schemas, RAG chat, cache semantique.
- `lib/rag-monitoring/**` : connecteurs sources officielles, worker de monitoring et types associes.
- `lib/rag-ingestion/**` : pipeline d'ingestion, parsers Claude, validateurs et prompts de parsing.
- `lib/rag-production-indexer/**` : promotion des chunks valides vers `legal_chunks`, archivage et invalidation cache.
- `lib/rag-quality/**` : golden set, couverture, derive historique, dead chunks.
- `lib/types/**` : types applicatifs partages.
- `scripts/` : scripts d'ingestion, diagnostics, cron, backfills, validation migrations et maintenance.
- `supabase/migrations/` : migrations SQL versionnees sequentiellement.
- `tests/fixtures/**` : fixtures locales reelles telechargees depuis les sources officielles.
- `docs/` : documentation technique hors RAG.
- `design-system/` : documentation de design system et pages de reference.

Conventions d'import :

- Preferer les imports relatifs locaux deja utilises dans le module.
- Ne pas introduire de nouvel alias sans verifier `tsconfig.json`.
- Garder les modules metier confines a leur domaine (`lib/rag-*`, `lib/ai`, `lib/credits`, etc.).

Organisation UI :

- Composants React en PascalCase.
- Fichiers et dossiers en kebab-case.
- Composants generiques dans `components/ui/`.
- Composants metier proches de leur route quand ils sont specifiques a une page.

## 4. Documentation Existante

### Documentation RAG

- `RAG_AUTOMATION_RUNBOOK.md` : runbook operationnel complet du pipeline RAG automatique ; consulter pour activation, rollback, staging, politique d'erreur.
- `RAG_AUTOMATION_FINAL_SUMMARY.md` : recapitulatif consolide des phases 0 a 6 ; consulter pour statut final, scores et couts.
- `RAG_INVENTORY.md` : inventaire du corpus RAG ; consulter pour volumes, regulations et couverture.
- `RAG_PIPELINE_SCHEMA.md` : schema cible du pipeline RAG automatique ; consulter avant migrations ou changements DB.
- `MONITORING_SOURCES.md` : catalogue des sources officielles, throttling, filtres et bruit observe ; consulter avant tout changement de monitoring.
- `RAG_PRODUCTION_INDEXER.md` : documentation de l'indexer production ; consulter avant promotion, rollback ou archivage.
- `RAG_QUALITY_ASSURANCE.md` : mecanismes de qualite RAG ; consulter avant golden set, coverage, drift ou dead chunks.
- `RAG_QUALITY_BASELINE_REPORT.md` : baseline qualite du RAG ; consulter pour comparer regressions et score initial.
- `RAG_FUTURE_IMPROVEMENTS.md` : dette technique et ameliorations ; consulter avant de traiter ou ajouter une dette.
- `RAG_COST_ESTIMATE.md` : estimation de couts ; consulter avant activation ingestion ou changement de volume.
- `RAG_ACTIVATION_REPORT_2026-06-26.md` : journal d'activation ; consulter avant toute reprise du deploiement effectif.
- `RAG_RETRIEVAL_DIAGNOSTIC.md` : diagnostics retrieval ; consulter pour regressions de pertinence.
- `RAG_INGESTION.md` : non present comme fichier autonome ; l'ingestion est documentee dans le runbook, `RAG_PIPELINE_SCHEMA.md` et `lib/rag-ingestion/**`.
- `RAG_VALIDATION_DASHBOARD.md` : non present comme fichier autonome ; le dashboard est documente dans le runbook et implemente sous `app/(app)/dashboard/admin/rag-validation/**`.

### Autres Documents Techniques Racine

- `README.md` : presentation generale du projet ; consulter en premier pour onboarding rapide.
- `AUDIT_PHASE_1_CARTOGRAPHIE.md` : audit cartographie ; consulter pour historique d'analyse fonctionnelle.
- `AUDIT_PHASE_2_FONCTIONNALITES.md` : audit fonctionnalites ; consulter pour etat produit et modules.
- `AUDIT_PHASE_3_QUALITE_JURIDIQUE.md` : audit qualite juridique ; consulter pour risques et ameliorations metier.
- `V2_RESUME_EXECUTIF.md` : synthese executive V2 ; consulter pour contexte produit.
- `V2_HYPOTHESES_AMELIORATION.md` : hypotheses d'amelioration V2 ; consulter avant refonte produit.
- `V2_ROADMAP.md` : roadmap V2 ; consulter pour priorisation.

### Documentation Dans `docs/`

- `docs/ANNEXE_IV_DOCUMENTATION_TECHNIQUE.md` : documentation technique Annexe IV.
- `docs/AI_KILLER_FEATURES.md` : idees de fonctionnalites IA avancees.
- `docs/ROADMAP_INITIATIVES.md` : initiatives roadmap.

### Documentation Design System

- `design-system/compliai/MASTER.md` : reference principale du design system.
- `design-system/compliai/pages/landing.md` : reference page landing.
- `design-system/compliai/pages/dashboard.md` : reference page dashboard.

### Prompts Markdown

- `lib/ai/prompts/data/*.md` : prompts metier versionnes pour les outils IA.
- `lib/rag-ingestion/prompts/*.md` : prompts de parsing Claude pour documents juridiques.

## 5. Conventions Du Projet

- Branches Git : utiliser des branches dediees au chantier. Formats recommandes : `feature/<sujet>`, `fix/<sujet>`, `chore/<sujet>`, `docs/<sujet>`. Les branches creees par Cursor peuvent utiliser `cursor/<description-kebab-case>`.
- Commits : format `type: description` en francais ou anglais. Types usuels : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- Identification agent : commits Cursor avec suffixe `[via cursor]`; commits Claude Code avec suffixe `[via claude-code]`.
- Environnement sale : ne stage que les fichiers lies a la mission. Ne jamais embarquer des changements existants non lies.
- Migrations Supabase : versionnees sequentiellement dans `supabase/migrations/`.
- Rollback migrations : chaque migration nouvelle doit contenir un bloc `-- ==== ROLLBACK ====`, commente en fin de fichier.
- Tests : Vitest.
- Tests unitaires : colocaux avec le code, format `fichier.test.ts` a cote de `fichier.ts` quand possible.
- Fixtures : `tests/fixtures/**`, avec donnees reelles telechargees depuis les sources officielles.
- TypeScript : strict par discipline projet ; pas de `any` sans justification documentee.
- Nommage : camelCase pour variables et fonctions.
- Nommage React/types : PascalCase pour composants React et types/interfaces exportes.
- Nommage fichiers/dossiers : kebab-case.
- Parsing IA RAG : Claude Sonnet 4.6 exclusivement.
- Embeddings RAG : OpenAI `text-embedding-3-small`, dimension `1536`, exclusivement.

## 6. Regles Non Negotiables

- Aucune modification directe de la table `legal_chunks` en production sans passer par le pipeline `staging_chunks` -> validation admin -> indexer.
- Attention au mot « staging », qui recouvre deux choses distinctes dans ce repo : la table `staging_chunks` (etape du pipeline RAG, toujours en vigueur et obligatoire) et l'ancien projet Supabase `compliai-staging` (abandonne le 17 juillet 2026). Abandonner le second ne supprime en rien le premier.
- Aucune ingestion sans validation admin via `/dashboard/admin/rag-validation`.
- Aucun bypass du systeme qualite golden set.
- Appels aux sources officielles depuis le developpement : autorises en lecture seule et ponctuellement, dans le seul but de capturer une fixture ou de verifier un statut juridique (levee decidee par le proprietaire du projet le 17 juillet 2026). Les tests restent hermetiques : ils consomment exclusivement les fixtures de `tests/fixtures/**`. Aucun appel repete ni en boucle depuis le dev.
- Projet Supabase unique : `CompliAI` (ref `hhdmkuwgrtflcqzzteom`). Decision du proprietaire le 17 juillet 2026 : plus de projet staging, `compliai-staging` est abandonne. Toute migration part donc directement sur la base qui sert les clients, sans repetition prealable. En consequence, les trois garde-fous suivants ne sont plus negociables :
  - Bloc `-- ==== ROLLBACK ====` obligatoire et testable dans chaque migration, sans exception.
  - Toute migration touchant `legal_chunks`, supprimant une colonne/contrainte, ou reecrivant des donnees existantes doit etre presentee au proprietaire avec son plan de rollback avant execution. Les migrations additives et inertes (elargir un CHECK, inserer une source `active = false`) peuvent etre appliquees directement.
  - Validation admin avant `legal_chunks` et nouvelles sources creees a `active = false` : inchange.
- Modele de parsing du corpus juridique : Claude Sonnet 4.6 exclusivement, jamais GPT-4 ou autre modele OpenAI sans validation explicite.
- Modele d'embeddings : OpenAI `text-embedding-3-small` dimension `1536` exclusivement.
- Migration vers Voyage-3-large possible uniquement comme chantier dedie avec migration vectorielle explicite.
- Toute dette technique doit etre documentee dans `RAG_FUTURE_IMPROVEMENTS.md`.
- Pas de modifications "tant qu'a faire" en parallele d'un chantier cible. Une mission = un perimetre.
- Ne jamais committer de secrets. Les fichiers `.env*` locaux doivent rester ignores.
- Ne jamais activer de cron planifie sans validation explicite.

## 7. Commandes Utiles

### Developpement Local

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Tests

```bash
npm run test
npx vitest
npx vitest run lib/rag-monitoring/**/*.test.ts
npx vitest run lib/rag-ingestion/**/*.test.ts
npx vitest run lib/rag-production-indexer/**/*.test.ts
npx vitest run lib/rag-quality/**/*.test.ts
npm run qa:consultant
```

### Scripts RAG Et Maintenance

```bash
npm run validate:migrations
npm run ingest
npm run fetch:eurlex
npm run ingest:case-law
npm run ingest:supplementary-corpus
npm run backfill:national-corpus-eu27
npm run reingest:national-fallbacks
npm run corpus:refresh-all
npx tsx --env-file=.env.local scripts/cron-monitoring.ts
npx tsx --env-file=.env.local scripts/cron-ingestion.ts
npx tsx --env-file=.env.local scripts/generate-rag-baseline.ts
npx tsx --env-file=.env.local scripts/diag-retrieval.ts
npx tsx --env-file=.env.local scripts/diag-art99.ts
npx tsx --env-file=.env.local scripts/rechunk-rgpd.ts
npx tsx --env-file=.env.local scripts/add-rgpd-parent-chunks.ts
```

### Repetition avant execution

Il n'y a plus de projet staging (voir section 6). Le seul filet disponible est
le mode simulation : lancer systematiquement un `dryRun` avant tout run reel.

```bash
npx tsx --env-file=.env.local scripts/cron-monitoring.ts --dry-run
```

### Migrations Supabase

Supabase CLI n'est pas garantie disponible localement. Si elle est installee et configuree :

```bash
supabase --version
supabase migration list
supabase db push --linked
supabase gen types typescript --project-id <project-ref> > lib/types/supabase.ts
```

Sinon, utiliser Supabase MCP pour `execute_sql`, `apply_migration`, `list_tables`, `get_logs`, `get_advisors`.

### Deploiement

```bash
npm run build
```

Le deploiement applicatif cible est Vercel, depuis la branche `claude-code/fix-ai-act-art50`.

Les crons RAG sont des GitHub Actions scheduled workflows (`.github/workflows/rag-automation-crons.yml`) et ils sont **actifs** : monitoring a 06:00 UTC, ingestion toutes les 6 h. Piege structurel a connaitre : un workflow planifie s'execute depuis la **branche par defaut** du depot, pas depuis la branche deployee sur Vercel. Les deux doivent rester alignees, sinon l'app et les crons executent du code different.

## 8. Etat Actuel Du Projet Au 17 Juillet 2026

- Projet Supabase unique : `CompliAI`, ref `hhdmkuwgrtflcqzzteom`. `compliai-staging` (`gndvxidkiplskbrqydmw`) est abandonne depuis le 17 juillet 2026.
- Migrations appliquees en production jusqu'a `054_monitoring_ep_procedure_api` incluse.
- Sauvegardes production pre-042 : `backup_monitoring_sources_20260626_pre_042` et `backup_legal_chunks_20260626_pre_042`.
- 12 sources enregistrees. Les 5 sources EU (EUR-Lex JO RSS, EUR-Lex CELLAR SPARQL, Curia CJUE, EDPB, AI Office) sont **actives** depuis le 17 juillet 2026. Les 7 sources nationales sont a `active = false`, volontairement : elles produisent des decisions nationales multilingues qui saturent la file de validation.
- `BfDI RSS (Allemagne)` est enregistree mais **inactivable** : aucun connecteur n'existe dans `lib/rag-monitoring/sources/`. L'activer ferait echouer chaque run du worker.
- Source `Parlement europeen — procedures legislatives` (`ep_procedure_api`) enregistree a `active = false` : veille sur le droit en cours de negociation, jamais ingeree dans `legal_chunks`. En attente d'un run `dryRun` avant activation.
- Aucune source n'a tourne entre le 29 juin et le 17 juillet 2026 : elles etaient toutes desactivees. Le premier run rattrapera environ trois semaines d'arriere, avec un volume Claude inhabituel a l'ingestion.
- Cause probable de cette desactivation (non documentee a l'epoque, reconstituee le 17 juillet) : le workflow gardait ses deux jobs par `github.event_name == 'schedule'`, toujours vrai, donc monitoring et ingestion partaient ensemble a chaque declenchement — 5 runs quotidiens de chaque au lieu de 1 et 4. Martelement des sources, d'ou vraisemblablement le HTTP 429 EDPB. Corrige le 17 juillet (`github.event.schedule`).
- Golden set : 16/16 OK apres le tuning retrieval (migrations 048-050).
- EDPB throttle configure a 5000 ms.
- Dette de securite : la `SUPABASE_SERVICE_ROLE_KEY` de `compliai-staging` a ete committee en clair dans l'historique git (`f9232b8`, 2026-07-09). Le fichier est retire du suivi depuis `7c8e25d`, mais l'historique n'est pas expurge. Rotation de la cle a faire cote proprietaire.

## 9. Chantiers Prioritaires A Venir

1. Finalisation de l'activation effective du RAG : validation utilisateur, activation progressive source par source en production, surveillance 24-48 h.
2. Regeneration des types Supabase, dette documentee dans `RAG_FUTURE_IMPROVEMENTS.md` section K.
3. Extension de la strategie parent-child aux autres reglements : AI Act, DSA, DMA, CRA, Data Act.
4. Re-parsing parent-child complet du corpus AI Act pour resoudre Q02, Q04, Q05, Q15.
5. Traduction anglaise de l'interface utilisateur pour la cible internationale.
6. Ajout d'autorites nationales candidates selon usage observe : Pologne, Belgique.
7. Audit de securite : middleware admin centralise manquant, dette documentee dans `RAG_FUTURE_IMPROVEMENTS.md` section A.
8. Migration potentielle vers Voyage-3-large pour les embeddings, a evaluer dans un chantier separe.
9. Stabilisation des filtres de monitoring apres deux semaines de donnees reelles.

## 10. Repartition Cursor / Claude Code

- Les deux outils sont complementaires, pas hierarchiques.
- Cursor est privilegie pour le developpement de fonctionnalites utilisateur visibles, les modifications necessitant un rendu visuel, les sessions interactives et exploratoires, les ajustements UX et la redaction de contenu.
- Claude Code est privilegie pour les chantiers d'infrastructure repetitifs ou suivant une procedure documentee, les diagnostics et investigations, les operations de maintenance, les batchs autonomes, les refactorisations a grande echelle, la generation de tests et l'analyse de logs.
- Pour un meme chantier, les deux outils peuvent intervenir a des phases differentes : conception sur Cursor, industrialisation sur Claude Code, finition sur Cursor.
- Regle d'or absolue : jamais les deux agents en parallele sur les memes fichiers ou la meme fonctionnalite.
- Branches Git distinctes obligatoires si utilisation simultanee sur des chantiers separes.
- Quand un agent reprend un chantier qu'un autre a commence, il doit d'abord consulter le dernier commit, la PR eventuelle et les fichiers modifies pour comprendre l'etat du travail.
- Avant toute operation, verifier `git status` et identifier les changements non lies.
- En fin de chantier, documenter toute anomalie ou dette dans le fichier de suivi approprie.
