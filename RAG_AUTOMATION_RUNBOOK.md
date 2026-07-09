# RAG Automation Runbook — CompliAI

> **Version** : 1.0.0  
> **Date** : Juin 2026  
> **Public** : développeur ou opérateur reprenant le système après plusieurs mois  
> **Statut** : Phase 6 — documentation opérationnelle finale

Ce document explique **comment opérer au quotidien** le système d'ingestion automatique RAG de CompliAI. Pour l'architecture détaillée des tables, voir [`RAG_PIPELINE_SCHEMA.md`](RAG_PIPELINE_SCHEMA.md). Pour la qualité RAG en production, voir [`RAG_QUALITY_ASSURANCE.md`](RAG_QUALITY_ASSURANCE.md). Pour l'indexation staging → production, voir [`RAG_PRODUCTION_INDEXER.md`](RAG_PRODUCTION_INDEXER.md).

---

## Table des matières

1. [Vue d'ensemble du système](#1-vue-densemble-du-système)
2. [Ajouter une nouvelle source de monitoring](#2-ajouter-une-nouvelle-source-de-monitoring)
3. [Traiter une alerte du système de qualité](#3-traiter-une-alerte-du-système-de-qualité)
4. [Cycle opérationnel quotidien](#4-cycle-opérationnel-quotidien)
5. [Validation admin et promotion en production](#5-validation-admin-et-promotion-en-production)
6. [Commandes CLI et planification cron](#6-commandes-cli-et-planification-cron)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [Procédure de mise en production effective](#8-procédure-de-mise-en-production-effective)
9. [Récapitulatif des choix techniques structurants](#9-récapitulatif-des-choix-techniques-structurants)
10. [Références](#10-références)
11. [Activation des crons d'automatisation](#11-activation-des-crons-dautomatisation)
12. [Politique d'erreur des pipelines automatiques](#12-politique-derreur-des-pipelines-automatiques)

---

## 1. Vue d'ensemble du système

### Principe directeur

**Aucun chunk n'entre dans `legal_chunks` (production) sans passer par le pipeline de staging et une validation humaine.** Les versions remplacées sont archivées dans `historical_chunks` avec leur embedding original.

### Schéma du pipeline complet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOURCES OFFICIELLES                                  │
│  EUR-Lex · CJUE · EDPB · AI Office · CNIL · BfDI · AEPD · DPC · Garante…   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ fetch RSS / scraping HTML
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1 — MONITORING                    lib/rag-monitoring/                │
│  ┌──────────────────┐    ┌─────────────────┐                                │
│  │ monitoring_sources│───▶│ monitoring_log  │  (journal d'exécution)        │
│  └────────┬─────────┘    └─────────────────┘                                │
│           │ nouveaux documents détectés                                     │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ pending_documents │  status: pending → parsing → staged → approved       │
│  └────────┬─────────┘                                                       │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2 — INGESTION (parsing Claude)    lib/rag-ingestion/                 │
│  pending_documents ──▶ parseDocumentWithClaude (claude-sonnet-4-6, T=0)     │
│                     ──▶ validateur automatique                              │
│                     ──▶ staging_chunks (+ embeddings staging HNSW)          │
└───────────┬─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3 — VALIDATION ADMIN (manuelle)   /dashboard/admin/rag-validation    │
│  staging_chunks ──▶ approve / reject / correct ──▶ validation_log           │
└───────────┬─────────────────────────────────────────────────────────────────┘
            │ validation_status = 'approved' (tous les chunks du document)
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4 — INDEXATION PRODUCTION         lib/rag-production-indexer/        │
│  staging_chunks approved ──▶ embed OpenAI (text-embedding-3-small)          │
│                           ──▶ upsert legal_chunks (insert/update/skip)      │
│                           ──▶ archivage historical_chunks si mise à jour    │
│                           ──▶ invalidation cache sémantique Upstash         │
└───────────┬─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRODUCTION RAG                          lib/ai/rag.ts                      │
│  legal_chunks ──▶ search_legal_chunks_hybrid (BM25 + cosine + re-ranking)   │
│                ──▶ consultant IA, chat, générateurs                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5 — QUALITÉ (lecture seule)       lib/rag-quality/                   │
│  legal_chunks ──▶ golden set / couverture / chunks morts / dérive             │
│                ──▶ rag_quality_history + rapports Markdown                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Composants automatiques vs manuels

| Composant | Mode | Module | Fréquence recommandée |
|-----------|------|--------|----------------------|
| Détection de nouveaux documents | **Automatique** (cron) | `lib/rag-monitoring/worker.ts` | Quotidien (Phase 1A) / hebdomadaire (Phase 1B) |
| Parsing Claude → staging | **Automatique** (cron) | `lib/rag-ingestion/pipeline.ts` | Toutes les heures ou après chaque cycle monitoring |
| Validation des chunks | **Manuel** | `/dashboard/admin/rag-validation` | Dès qu'un document est en `staged` |
| Indexation staging → production | **Semi-auto** (CLI `--prod`) | `lib/rag-production-indexer/pipeline.ts` | Après validation admin, ou cron avec garde-fous |
| Surveillance qualité RAG | **Automatique** (cron) | `lib/rag-quality/pipeline.ts` | Hebdo (golden set) + mensuel (couverture, chunks morts) |
| Supervision qualité juridique | **Manuel** | Admin + lecture des rapports | Hebdomadaire (alertes critical) |

> **Important** : le worker de monitoring est **inactif par défaut** (pas de cron configuré dans le repo). Toute activation en production requiert un cron explicite et un dry-run préalable (voir §6).

### États d'un document (`pending_documents.status`)

| Statut | Signification |
|--------|---------------|
| `pending` | Détecté par le monitoring, en attente de parsing |
| `parsing` | Parsing Claude en cours |
| `staged` | Chunks en staging, en attente de validation admin |
| `approved` | Tous les chunks validés, prêt pour l'indexation production |
| `rejected` | Document rejeté par l'admin |
| `error` | Échec de parsing ou de validation automatique |
| `indexed` | Promu en production par le Production Indexer |

### Baseline qualité actuelle (post Phase 5 P2.5)

| Métrique | Valeur |
|----------|--------|
| Golden set | **12 / 16 OK** |
| Couverture articles critiques | **54,8 %** |
| Chunks RGPD | 901 (455 § + 347 pt + 99 parent `granularity=article`) |

4 questions AI Act restent en critical (Q02, Q04, Q05, Q15) — chantier retrieval séparé, documenté dans `RAG_FUTURE_IMPROVEMENTS.md`.

---

## 2. Ajouter une nouvelle source de monitoring

Cette section décrit la procédure complète pour brancher une nouvelle autorité de contrôle. L'exemple concret utilise une **DPA polonaise fictive (UODO — Urząd Ochrony Danych Osobowych)** avec un flux RSS.

### Vue d'ensemble des étapes

```
1. Créer le connecteur     lib/rag-monitoring/sources/uodo-rss.ts
2. Ajouter les tests       lib/rag-monitoring/sources/uodo-rss.test.ts
3. Ajouter la fixture      tests/fixtures/rag_monitoring/uodo-rss.xml
4. Enregistrer dans worker lib/rag-monitoring/worker.ts (PHASE_1B_SOURCES + routeur)
5. Insérer en base         monitoring_sources (SQL ou Supabase dashboard)
6. Dry-run                 runMonitoringCycle({ dryRun: true, sourceIds: [...] })
7. Activer en production   runMonitoringCycle({ dryRun: false, supabase })
```

### Étape 1 — Créer le connecteur

Modèle : copier `lib/rag-monitoring/sources/aepd-rss.ts` (RSS national, même structure).

```typescript
// lib/rag-monitoring/sources/uodo-rss.ts
import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

/** URL fictive — remplacer par l'URL RSS réelle une fois identifiée sur uodo.gov.pl */
export const UODO_RSS_URL = "https://uodo.gov.pl/pl/rss/decisions.xml";

/** Mots-clés polonais pertinents pour décisions et lignes directrices RGPD */
export const UODO_KEYWORDS = [
  "RODO",           // RGPD en polonais
  "ochrona danych",
  "decyzja",
  "kara",
  "grzywna",
  "postępowanie",
  "wytyczne",
  "zalecenia",
  "sztuczna inteligencja",
  "AI",
];

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export function isUodoRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return UODO_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function urlToExternalId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export function inferUodoDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (
    t.includes("decyzja") ||
    t.includes("kara") ||
    t.includes("grzywna") ||
    t.includes("postępowanie")
  ) {
    return "national_decision";
  }
  if (t.includes("wytyczne") || t.includes("zalecenia") || t.includes("poradnik")) {
    return "national_guideline";
  }
  return "national_decision";
}

export interface UodoRssOptions {
  url?: string;
  noFilter?: boolean;
  fetcher?: FetchFn;
}

/**
 * Connecteur UODO RSS (Pologne).
 * Déduplication : externalId = SHA-256(sourceUrl)[0:16]
 * Rate limit recommandé : 1 200 ms (autorité nationale)
 */
export async function fetchUodoDocuments(
  options: UodoRssOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = UODO_RSS_URL,
    noFilter = false,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`UODO RSS a retourné HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = XML_PARSER.parse(xml);
  const items: unknown[] = parsed?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) return [];

  const documents: DetectedDocument[] = [];

  for (const rawItem of items) {
    const item = rawItem as Record<string, unknown>;
    const title = String(item["title"] ?? "").trim();
    const link = String(item["link"] ?? "").trim();
    const description = String(item["description"] ?? "");
    const pubDate = String(item["pubDate"] ?? "");

    if (!link) continue;
    if (!noFilter && !isUodoRelevant(title, description)) continue;

    documents.push({
      externalId: urlToExternalId(link),
      sourceUrl: link,
      title,
      documentType: inferUodoDocumentType(title),
      language: "pl",
      country: "PL",
      publicationDate: pubDate ? new Date(pubDate) : undefined,
    });
  }

  return documents;
}
```

**Points de conception obligatoires :**

- `externalId` : hash SHA-256 tronqué de l'URL (déduplication cross-run)
- `documentType` : doit correspondre à un type supporté par le pipeline d'ingestion (`national_decision` ou `national_guideline` → prompt `parse_national_decision.md`)
- `language` / `country` : renseignés explicitement (`pl` / `PL`)
- `FetchFn` injectable : permet les tests offline avec fixtures

### Étape 2 — Fixture de test

Créer `tests/fixtures/rag_monitoring/uodo-rss.xml` avec 3–5 items : au moins un pertinent (decyzja RODO), un non pertinent (événement institutionnel), un wytyczne.

### Étape 3 — Tests unitaires

Modèle : `lib/rag-monitoring/sources/aepd-rss.test.ts`.

Couvrir obligatoirement :

- `isUodoRelevant` : true/false sur titres polonais
- `inferUodoDocumentType` : decision vs guideline
- `fetchUodoDocuments` : parsing fixture, filtrage actif, mode `noFilter`, erreur HTTP

```bash
npx vitest run lib/rag-monitoring/sources/uodo-rss.test.ts
```

### Étape 4 — Enregistrer dans le worker

**4a. Ajouter la source dans `PHASE_1B_SOURCES`** (`lib/rag-monitoring/worker.ts`) :

```typescript
{
  name: "UODO RSS (Pologne)",
  sourceType: "national_authority_rss",
  url: "https://uodo.gov.pl/pl/rss/decisions.xml",
  authority: "UODO",
  country: "PL",
  language: "pl",
  config: {},
  consecutiveSilenceDays: 0,
  silenceAlertThresholdDays: 45,  // ajuster selon la cadence réelle de publication
},
```

> Le champ `name` doit être **identique** entre `PHASE_1B_SOURCES` et la ligne `monitoring_sources.name` en base — c'est la clé de jointure dans `writeResultToDatabase`.

**4b. Brancher le routeur national** (`runNationalAuthorityConnector`) :

```typescript
import { fetchUodoDocuments } from "./sources/uodo-rss";

// dans runNationalAuthorityConnector :
if (authority.includes("uodo")) {
  return fetchUodoDocuments({ url: source.url });
}
```

**4c. Exporter** depuis `lib/rag-monitoring/index.ts` si nécessaire pour les scripts externes.

### Étape 5 — Enregistrer en base (`monitoring_sources`)

```sql
INSERT INTO monitoring_sources (
  name,
  source_type,
  url,
  authority,
  country,
  language,
  check_frequency,
  expected_min_frequency_days,
  silence_alert_threshold_days,
  active,
  config
) VALUES (
  'UODO RSS (Pologne)',
  'national_authority_rss',
  'https://uodo.gov.pl/pl/rss/decisions.xml',
  'UODO',
  'PL',
  'pl',
  'weekly',
  30,
  45,
  true,
  '{"keywords": ["RODO", "decyzja", "kara", "wytyczne"]}'::jsonb
);
```

| Champ | Rôle |
|-------|------|
| `check_frequency` | `hourly` / `daily` / `weekly` — utilisé par le cron pour filtrer les sources actives |
| `expected_min_frequency_days` | Intervalle normal entre deux publications (ex. 30 j pour une DPA active) |
| `silence_alert_threshold_days` | Alerte si aucun nouveau document depuis N jours |
| `config` | Paramètres libres (mots-clés, overrides URL) — lus par le connecteur si implémenté |
| `active` | `false` pour désactiver sans supprimer |

### Étape 6 — Dry-run obligatoire

```bash
npx tsx --env-file=.env.local -e "
import { runMonitoringCycle } from './lib/rag-monitoring/worker';
runMonitoringCycle({
  dryRun: true,
  sourceIds: ['UODO RSS (Pologne)'],
  dryRunOutputPath: './monitoring-dryrun-uodo.json',
}).then(r => {
  console.log('Documents trouvés :', r[0]?.documentsFound);
  console.log('Status :', r[0]?.status);
});
"
```

Inspecter `monitoring-dryrun-uodo.json` : titres, types, URLs, absence de doublons évidents.

### Étape 7 — Activation production

```bash
npx tsx --env-file=.env.local -e "
import { createClient } from '@supabase/supabase-js';
import { runMonitoringCycle } from './lib/rag-monitoring/worker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

runMonitoringCycle({
  dryRun: false,
  supabase,
  sourceIds: ['UODO RSS (Pologne)'],
}).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Vérifier en base :

```sql
SELECT id, title, document_type, status, created_at
FROM pending_documents
WHERE country = 'PL'
ORDER BY created_at DESC
LIMIT 10;
```

### Cas particuliers

| Type de source | Fichier modèle | Particularités |
|----------------|----------------|----------------|
| RSS EUR-Lex | `eurlex-rss.ts` | Filtrage CELEX + mots-clés domaine |
| Scraping HTML (EDPB, DPC) | `edpb-scraping.ts`, `dpc-scraping.ts` | `page_structure_hash` pour détecter changements de markup |
| SPARQL CELLAR | `eurlex-cellar.ts` | Requête SPARQL, pas de RSS |
| CJUE | `curia-scraping.ts` | **Exclure les renvois préjudiciels** (`cjeu_referral`) — voir commentaire dans `worker.ts` |

### Checklist avant merge

- [ ] Tests unitaires verts (`npx vitest run lib/rag-monitoring/sources/uodo-rss.test.ts`)
- [ ] Dry-run JSON inspecté manuellement
- [ ] Ligne `monitoring_sources` insérée en prod/staging
- [ ] `name` identique entre code et base
- [ ] Rate limit respecté (1 200 ms entre sources nationales en run complet)
- [ ] Politique langue documentée : documents PL restent en `language='pl'` ; décision produit requise si ingestion multilingue souhaitée

---

## 3. Traiter une alerte du système de qualité

Le module Phase 5 (`lib/rag-quality/`) est **en lecture seule** : il ne modifie jamais `legal_chunks`. Il écrit dans `rag_quality_history` et génère des rapports Markdown.

Documentation détaillée : [`RAG_QUALITY_ASSURANCE.md`](RAG_QUALITY_ASSURANCE.md) § « Interprétation des alertes ».

### Synthèse des quatre types d'alertes

| # | Type | Fréquence | Code sortie CLI |
|---|------|-----------|-----------------|
| 1 | Divergence golden set | Hebdomadaire | `1` si ≥1 question `critical` |
| 2 | Dérive historique | Hebdomadaire (mode weekly) | inclus dans weekly |
| 3 | Article hors top-3 | Mensuelle | `1` si couverture < 70 % |
| 4 | Chunk mort | Mensuelle | `1` si ≥ 4 chunks morts |

---

### 3.1 — Divergence golden set

**Signification**

Une ou plusieurs des 16 questions de référence (`lib/rag-quality/golden-set.ts`) ne retournent plus les articles juridiques attendus dans le top-10, ou retournent des articles blacklistés (confusion sémantique).

Codes d'anomalie typiques :

| Code | Signification |
|------|---------------|
| `CRITICAL_MISSING:REG:ART` | Article requis absent du top-10 |
| `IMPORTANT_MISSING:REG:ART` | Article important absent (warning) |
| `BLACKLISTED_PRESENT:REG:ART` | Article parasite présent (ex. Art. 50 dans une question sur le scoring crédit) |

**Diagnostic recommandé**

1. Identifier la question en échec dans le rapport ou en base :
   ```sql
   SELECT question_id, status, missing_required, present_blacklisted, anomalies_detected
   FROM rag_quality_history
   WHERE check_mode = 'weekly_divergence'
   ORDER BY executed_at DESC
   LIMIT 20;
   ```

2. Reproduire manuellement la recherche :
   ```bash
   npx tsx --env-file=.env.local -e "
   import { searchLegalChunks } from './lib/ai/rag';
   searchLegalChunks('VOTRE QUESTION ICI', 10, 0.25)
     .then(r => r.forEach(c =>
       console.log(c.regulation, c.article_number, c.granularity, c.similarity?.toFixed(3))
     ));
   "
   ```

3. Vérifier si le chunk existe en production :
   ```sql
   SELECT id, regulation, article_number, granularity, LEFT(content, 120) AS excerpt
   FROM legal_chunks
   WHERE regulation ILIKE '%RGPD%' AND article_number LIKE '45%';
   ```

4. Corréler avec une indexation récente :
   ```sql
   SELECT id, title, status, updated_at FROM pending_documents
   WHERE status IN ('indexed', 'approved') ORDER BY updated_at DESC LIMIT 10;
   ```

**Actions correctives**

| Cause probable | Action |
|----------------|--------|
| Chunk absent | Ré-ingérer le texte source → validation admin → indexation |
| Chunk présent mais mal classé | Enrichir le contenu via « Valider avec corrections » dans l'admin RAG |
| Confusion sémantique (blacklist) | Ajuster le re-ranking dans `lib/ai/rag.ts` ou affiner le chunking |
| Régression post-indexation | Rollback Production Indexer (voir `RAG_PRODUCTION_INDEXER.md`) |
| Faux positif golden set | Vérifier qu'aucun article n'est à la fois `required` et `blacklisted` (règle P0) |

**Seuil d'escalade** : ≥ 1 question `critical` → investigation dans les 24 h. Une baisse de 12/16 à < 10/16 OK sans indexation récente = régression retrieval prioritaire.

---

### 3.2 — Dérive historique

**Signification**

Comparaison entre la dernière exécution du golden set et les exécutions précédentes (table `rag_quality_history`). Détecte les changements lents qui passent inaperçus question par question.

Codes d'anomalie :

| Code | Signification |
|------|---------------|
| `DRIFT_DISAPPEARED:Q01` | Un article était cité, il ne l'est plus |
| `DRIFT_APPEARED:Q01` | Plus de 2 nouveaux articles jamais vus apparaissent |

**Diagnostic recommandé**

1. Historique d'une question spécifique :
   ```sql
   SELECT executed_at, articles_cited, anomalies_detected, status
   FROM rag_quality_history
   WHERE question_id = 'Q08'
   ORDER BY executed_at DESC
   LIMIT 8;
   ```

2. Croiser avec les dates d'indexation et de re-chunking (ex. P2 RGPD du 26/06/2026).

3. Vérifier si le changement est attendu (ex. ajout de chunks parent `granularity=article` améliorant Q08).

**Actions correctives**

| Scénario | Action |
|----------|--------|
| Dérive après indexation d'un mauvais document | Rollback du document concerné |
| Dérive après re-chunking | Comparer avec baseline post-P2.5 ; documenter si amélioration nette |
| Dérive sans cause identifiable | Lancer `--mode=weekly --dry-run` pour confirmer ; inspecter les embeddings |
| Dérive bénigne (nouveaux articles pertinents) | Mettre à jour la baseline de référence après validation manuelle |

---

### 3.3 — Article hors top-3 (couverture)

**Signification**

Le mécanisme 3 (`lib/rag-quality/coverage-checker.ts`) vérifie que chaque article indexé est retrouvable en **top-3** via une requête dédiée. Un échec signifie que l'article existe en base mais que d'autres chunks (souvent des guidelines ou arrêts) le surpassent systématiquement.

Seuils :

| Couverture | Statut |
|------------|--------|
| ≥ 90 % | OK |
| 70–90 % | Warning |
| < 70 % | Critical |

Baseline actuelle : **54,8 %** — normal pour un RAG hybride ; surveiller les **baisses** plutôt que la valeur absolue.

**Diagnostic recommandé**

1. Lire le rapport mensuel : `RAG_QUALITY_MONTHLY_REPORT_YYYY-MM.md`

2. Pour un article en échec, obtenir le rang exact :
   ```bash
   npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=coverage --critical-only
   ```

3. Tester la requête de couverture manuellement (voir `lib/rag-quality/coverage-articles.ts` pour la requête associée à l'article).

**Actions correctives**

| Cause | Action |
|-------|--------|
| Article trop court / peu discriminant | Enrichir le chunk (contexte réglementaire en en-tête) |
| Concurrence d'une guideline EDPB | Ajuster `regulationBoost` / `topicalBoost` dans `lib/ai/rag.ts` |
| Chunking inadapté (trop fin) | Envisager chunk parent (cf. procédure P2.5 dans `RAG_FUTURE_IMPROVEMENTS.md` §J) |
| Article non indexé (`indexed=false`) | Prioriser l'ingestion du règlement concerné |

---

### 3.4 — Chunk mort

**Signification**

Un chunk inséré dans les **60 derniers jours** n'apparaît pas en top-10 lors d'une recherche sémantique basée sur **son propre contenu** (`lib/rag-quality/dead-chunks.ts`). Proxy d'un embedding dégradé, d'un doublon masqué, ou d'un contenu trop générique.

Seuils :

| Chunks morts | Statut | Action |
|--------------|--------|--------|
| 0 | OK | — |
| 1–3 | Warning | Audit ciblé admin RAG |
| ≥ 4 | Critical | Investigation systémique ingestion/embedding |

**Diagnostic recommandé**

1. Lister les candidats :
   ```bash
   npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=dead
   ```

2. Pour chaque chunk mort, vérifier :
   ```sql
   SELECT id, regulation, article_number, source_method, created_at,
          LEFT(content, 200) AS excerpt
   FROM legal_chunks
   WHERE id = '<chunk_id>';
   ```

3. Rechercher des doublons sémantiques :
   ```sql
   SELECT id, article_number, chunk_hash, LEFT(content, 80)
   FROM legal_chunks
   WHERE regulation = '<regulation>' AND article_number = '<art>';
   ```

**Actions correctives**

| Cause | Action |
|-------|--------|
| Doublon avec hash différent | Fusionner via correction admin ou supprimer le doublon |
| Contenu trop court (< 100 car.) | Enrichir via « Valider avec corrections » avant ré-indexation |
| Embedding corrompu | Regénérer : rollback + ré-indexation, ou update manuel avec nouvel embedding |
| Artefact d'ingestion Claude | Rejeter le document source et relancer le parsing |
| Chunk parent/ enfant en conflit | Vérifier cohérence `granularity` (article vs paragraph) |

---

## 4. Cycle opérationnel quotidien

### Routine recommandée

| Moment | Action | Durée estimée |
|--------|--------|---------------|
| **Quotidien** | Vérifier `/dashboard/admin/rag-validation` — documents en `staged` | 5–15 min |
| **Quotidien** | Consulter `monitoring_log` pour erreurs de sources | 2 min |
| **Hebdomadaire** | Lancer `--mode=weekly` qualité + traiter alertes critical | 15–30 min |
| **Hebdomadaire** | Valider et indexer les documents approuvés (`--prod`) | 10 min |
| **Mensuel** | Lancer `--mode=monthly` + lire le rapport généré | 30–60 min |

### Requêtes SQL de supervision rapide

```sql
-- File d'attente ingestion
SELECT status, COUNT(*) FROM pending_documents GROUP BY status;

-- Dernières exécutions monitoring
SELECT ms.name, ml.executed_at, ml.documents_new, ml.error_message
FROM monitoring_log ml
JOIN monitoring_sources ms ON ms.id = ml.source_id
ORDER BY ml.executed_at DESC LIMIT 20;

-- Chunks en attente de validation
SELECT pd.title, COUNT(sc.id) AS chunks,
       COUNT(sc.id) FILTER (WHERE sc.validation_status = 'pending') AS pending
FROM pending_documents pd
JOIN staging_chunks sc ON sc.document_id = pd.id
WHERE pd.status = 'staged'
GROUP BY pd.id, pd.title;

-- Dernière exécution qualité
SELECT check_mode, overall_status, summary, executed_at
FROM rag_quality_history
ORDER BY executed_at DESC LIMIT 5;
```

### Que faire quand une source est en erreur ?

1. Lire `monitoring_log.error_message` et `metadata.alerts`
2. Si `markup_change` (EDPB, scraping) : comparer la page source, mettre à jour le connecteur, ajouter une fixture
3. Si HTTP 403/429 : augmenter le throttling (`THROTTLE_MS` dans `worker.ts`)
4. Si silence prolongé (`consecutive_silence_days` > seuil) : vérifier manuellement le site de l'autorité — peut être normal (DPC ~ trimestriel)

---

## 5. Validation admin et promotion en production

### Interface

URL : **`/dashboard/admin/rag-validation`** (accès admin uniquement)

Workflow :

1. **Sélectionner un document** en statut `staged`
2. **Examiner les chunks** dans le panneau latéral (contenu, article, hash)
3. **Consulter la source** via le viewer intégré
4. **Décider** :
   - **Approuver** — chunk conforme
   - **Approuver en masse** — document entier si qualité homogène
   - **Corriger** — modifier le contenu avant approbation (trace dans `validation_log`)
   - **Rejeter** — document non pertinent ou qualité insuffisante
5. Quand **tous les chunks sont `approved`** → le document passe en statut `approved`

### Promotion en production

Toujours dry-run d'abord :

```bash
# Simulation
npx tsx --env-file=.env.local lib/rag-production-indexer/pipeline.ts

# Production (après validation du dry-run)
npx tsx --env-file=.env.local lib/rag-production-indexer/pipeline.ts --prod

# Document spécifique
npx tsx --env-file=.env.local lib/rag-production-indexer/pipeline.ts --document-id=<uuid> --prod
```

### Rollback en cas d'erreur post-indexation

```bash
npx tsx --env-file=.env.local lib/rag-production-indexer/rollback.ts --document-id=<uuid> --dry-run
npx tsx --env-file=.env.local lib/rag-production-indexer/rollback.ts --document-id=<uuid>
```

Puis relancer `--mode=weekly` pour confirmer que la régression golden set est corrigée.

---

## 6. Commandes CLI et planification cron

### Monitoring (Phase 1)

```bash
# Dry-run toutes les sources (défaut — aucune écriture DB)
npx tsx --env-file=.env.local -e "
import { runMonitoringCycle } from './lib/rag-monitoring/worker';
runMonitoringCycle({ dryRun: true }).then(r =>
  console.log('Total docs:', r.reduce((s,x) => s + x.documentsFound, 0))
);
"

# Production — cycle complet
npx tsx --env-file=.env.local -e "
import { createClient } from '@supabase/supabase-js';
import { runMonitoringCycle } from './lib/rag-monitoring/worker';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
runMonitoringCycle({ dryRun: false, supabase: sb });
"
```

### Ingestion (Phase 2)

```bash
npx tsx --env-file=.env.local -e "
import { runIngestionPipeline } from './lib/rag-ingestion/pipeline';
runIngestionPipeline({ dryRun: false, batchSize: 5, throttleMs: 1000 })
  .then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Modèle parsing : **`claude-sonnet-4-6`**, température 0 (`lib/rag-ingestion/parsers/types.ts`).

### Indexation production (Phase 4)

Voir §5 et [`RAG_PRODUCTION_INDEXER.md`](RAG_PRODUCTION_INDEXER.md).

### Qualité (Phase 5)

```bash
# Hebdomadaire
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly

# Mensuel complet
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=monthly

# Test à sec
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly --dry-run
```

### Exemple de crontab (serveur ou GitHub Actions)

```cron
# Monitoring — Phase 1A quotidien à 06:00 UTC
0 6 * * *  cd /app && npx tsx --env-file=.env.local scripts/cron-monitoring.ts

# Ingestion — toutes les 6 h
15 */6 * * *  cd /app && npx tsx --env-file=.env.local scripts/cron-ingestion.ts

# Qualité — lundi 07:00 UTC
0 7 * * 1  cd /app && npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly

# Qualité mensuelle — 1er du mois 08:00 UTC
0 8 1 * *  cd /app && npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=monthly
```

> Les scripts `scripts/cron-monitoring.ts` et `scripts/cron-ingestion.ts` existent désormais. **Toujours valider une exécution manuelle** avant la première planification cron en production.

---

## 7. Variables d'environnement

| Variable | Phase | Obligatoire | Rôle |
|----------|-------|-------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Toutes | ✅ | URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Toutes | ✅ | Écritures pipeline (bypass RLS) |
| `ANTHROPIC_API_KEY` | 2 | ✅ | Parsing Claude Sonnet 4.6 |
| `OPENAI_API_KEY` | 4, 5 | ✅ | Embeddings + recherche qualité |
| `UPSTASH_REDIS_REST_URL` | 4 | Optionnel | Invalidation cache sémantique |
| `UPSTASH_REDIS_REST_TOKEN` | 4 | Optionnel | Token Upstash |
| `RESEND_API_KEY` | 4 | Optionnel | Email rapport indexation |
| `RAG_NOTIFY_EMAIL` | 4 | Optionnel | Destinataire alertes indexation |

Fichier local : `.env.local` (jamais commité).

---

## 8. Procédure de mise en production effective

Cette procédure est à dérouler uniquement après feu vert explicite :

> **OK pour mise en production effective**

Avant ce feu vert, le système reste en mode manuel/dry-run : monitoring sans écriture, ingestion déclenchée ponctuellement, indexation production uniquement après validation humaine.

### 8.0 — Environnement staging Supabase

La validation des migrations RAG doit passer par un environnement staging avant production.

Option recommandée : **projet Supabase dédié `compliai-staging`**, dans la même organisation que la production, région `eu-central-1`.

Variables attendues :

```bash
SUPABASE_STAGING_URL=...
SUPABASE_STAGING_ANON_KEY=...
SUPABASE_STAGING_SERVICE_ROLE_KEY=...
```

Important : la clé `SUPABASE_STAGING_SERVICE_ROLE_KEY` est nécessaire pour tester les scripts cron en écriture. Elle ne doit jamais être committée. Si elle n'est pas exposée par MCP, la récupérer manuellement dans Supabase Dashboard > Project Settings > API, puis l'injecter localement ou dans le secret GitHub Actions staging.

Procédure projet dédié :

1. Créer le projet `compliai-staging` dans l'organisation Supabase de production.
2. Appliquer les migrations RAG `032` à `042` sur staging.
3. Vérifier les tables :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'monitoring_sources',
  'monitoring_log',
  'pending_documents',
  'staging_chunks',
  'validation_log',
  'historical_chunks',
  'rag_quality_history'
)
ORDER BY table_name;
```

4. Lancer le préflight monitoring sur staging.
5. Lancer un monitoring limité aux sources sûres : EUR-Lex RSS, CNIL, AEPD.
6. Comparer le schéma staging/production (`supabase db diff` si CLI disponible, sinon comparaison SQL `information_schema`).
7. Appliquer production seulement après run staging vert.

Alternative acceptable si le projet dédié est refusé pour coût : créer un schéma PostgreSQL `staging` dans le projet production et y répliquer les tables RAG. Cette option est moins isolée : elle ne valide pas les secrets, quotas et RLS projet, mais elle permet de tester les DDL sans toucher au schéma `public`.

Choix recommandé : **projet Supabase dédié**. Coût observé via Supabase MCP : **10 USD/mois**.

### 8.1 — Vérifications préalables

#### État qualité et baseline

- [ ] Baseline Phase 5 à jour : **12/16 OK** ou meilleur sur le golden set.
- [ ] Couverture articles critiques stable autour de **54,8 %** ou meilleure.
- [ ] Aucune régression sur les acquis P0/P2.5 : Q07, Q08, Q10, Q11, Q14 toujours OK.
- [ ] Les 4 criticals restants sont bien connus et documentés comme AI Act uniquement : Q02, Q04, Q05, Q15.
- [ ] Exécution dry-run hebdomadaire sans erreur fatale :

```bash
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly --dry-run
```

#### Tests et fixtures

- [ ] Les connecteurs de monitoring ont chacun une fixture stable dans `tests/fixtures/rag_monitoring/`.
- [ ] Les tests unitaires des sources actives passent :

```bash
npx vitest run lib/rag-monitoring
```

- [ ] Les tests ingestion passent, y compris validation de parsing et insertion staging :

```bash
npx vitest run lib/rag-ingestion
```

- [ ] Les tests qualité passent :

```bash
npx vitest run lib/rag-quality
```

#### Crédits et accès externes

- [ ] Crédit Anthropic suffisant pour parsing Claude Sonnet 4.6 (`ANTHROPIC_API_KEY` valide).
- [ ] Clé OpenAI valide pour embeddings `text-embedding-3-small` (`OPENAI_API_KEY`).
- [ ] Accès Supabase production confirmé (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] Accès admin UI confirmé sur `/dashboard/admin/rag-validation`.
- [ ] Si activé : Upstash Redis accessible pour invalidation cache.
- [ ] Si activé : Resend et `RAG_NOTIFY_EMAIL` configurés pour notifications d'indexation.

#### État base de données

```sql
-- Sources actives configurées
SELECT name, source_type, check_frequency, active
FROM monitoring_sources
ORDER BY source_type, name;

-- File d'attente saine avant activation
SELECT status, COUNT(*)
FROM pending_documents
GROUP BY status;

-- Pas de staging oublié
SELECT validation_status, COUNT(*)
FROM staging_chunks
GROUP BY validation_status;

-- Dernière baseline qualité
SELECT check_mode, overall_status, summary, executed_at
FROM rag_quality_history
ORDER BY executed_at DESC
LIMIT 5;
```

### 8.2 — Ordre d'activation des crons

Activer les crons progressivement. Ne pas activer monitoring, ingestion et indexation automatique dans la même fenêtre.

#### Étape 1 — Monitoring seul

Objectif : vérifier que les sources officielles s'écrivent correctement dans `monitoring_log` et `pending_documents`.

1. Lancer un dry-run complet :

```bash
npx tsx --env-file=.env.local -e "
import { runMonitoringCycle } from './lib/rag-monitoring/worker';
runMonitoringCycle({ dryRun: true, dryRunOutputPath: './monitoring-prod-dryrun.json' })
  .then(r => console.log(JSON.stringify(r.map(x => ({
    sourceId: x.sourceId,
    status: x.status,
    documentsFound: x.documentsFound,
    error: x.error,
  })), null, 2)));
"
```

2. Lancer un premier cycle production manuel :

```bash
npx tsx --env-file=.env.local -e "
import { createClient } from '@supabase/supabase-js';
import { runMonitoringCycle } from './lib/rag-monitoring/worker';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
runMonitoringCycle({ dryRun: false, supabase: sb }).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

3. Vérifier `monitoring_log` et `pending_documents`.

4. Activer le cron monitoring quotidien uniquement après ce premier cycle réussi.

#### Étape 2 — Ingestion vers staging

Objectif : transformer les documents `pending` en `staged`, sans toucher `legal_chunks`.

1. Lancer un petit batch manuel :

```bash
npx tsx --env-file=.env.local -e "
import { runIngestionPipeline } from './lib/rag-ingestion/pipeline';
runIngestionPipeline({ dryRun: false, batchSize: 2, throttleMs: 1500 })
  .then(r => console.log(JSON.stringify(r, null, 2)));
"
```

2. Vérifier dans Supabase :

```sql
SELECT id, title, status, updated_at
FROM pending_documents
ORDER BY updated_at DESC
LIMIT 10;

SELECT document_id, validation_status, COUNT(*)
FROM staging_chunks
GROUP BY document_id, validation_status
ORDER BY COUNT(*) DESC;
```

3. Ouvrir `/dashboard/admin/rag-validation` et vérifier la lisibilité des premiers chunks.

4. Activer le cron ingestion uniquement si le parsing Claude est stable et les chunks sont exploitables.

#### Étape 3 — Qualité RAG

Objectif : recevoir une première mesure qualité post-activation avant toute indexation massive.

```bash
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly
```

Vérifier :

- [ ] Le script sort en `0` ou avec un statut attendu.
- [ ] Aucune régression non expliquée sur les questions RGPD préservées.
- [ ] Une ligne récente existe dans `rag_quality_history`.

#### Étape 4 — Indexation production manuelle

Objectif : indexer uniquement les documents validés humainement.

1. Faire le dry-run :

```bash
npx tsx --env-file=.env.local lib/rag-production-indexer/pipeline.ts
```

2. Vérifier le nombre de chunks insérés / mis à jour / ignorés.

3. Lancer la production :

```bash
npx tsx --env-file=.env.local lib/rag-production-indexer/pipeline.ts --prod
```

4. Relancer immédiatement :

```bash
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly
```

5. Ne passer à une indexation cron que si plusieurs cycles manuels successifs sont sains. Par défaut, conserver l'indexation comme étape manuelle contrôlée.

### 8.3 — Vérifications post-activation

#### Premier cycle monitoring

- [ ] `monitoring_log` contient une ligne par source exécutée.
- [ ] Les erreurs HTTP sont nulles ou expliquées.
- [ ] `documents_new` n'explose pas anormalement (risque de mauvais filtre).
- [ ] Les doublons ne recréent pas des lignes dans `pending_documents`.

```sql
SELECT ms.name, ml.executed_at, ml.documents_found, ml.documents_new, ml.error_message
FROM monitoring_log ml
JOIN monitoring_sources ms ON ms.id = ml.source_id
ORDER BY ml.executed_at DESC
LIMIT 30;
```

#### Premier cycle ingestion

- [ ] Les documents passent de `pending` à `staged`.
- [ ] Les erreurs Claude sont nulles ou isolées.
- [ ] `staging_chunks.chunk_hash` est renseigné.
- [ ] Les chunks ont `regulation`, `article_number`, `language`, `country` quand applicable.

#### Première alerte qualité

- [ ] Le statut global est comparé à la baseline post-P2.5, pas à une cible théorique à 100 %.
- [ ] Toute baisse sous 10/16 OK est traitée comme régression prioritaire.
- [ ] Toute alerte `chunk mort` après indexation récente déclenche un audit des documents indexés.

### 8.4 — Rollback rapide pendant les premières 48 h

Pendant les 48 premières heures, privilégier l'arrêt des crons et le rollback ciblé plutôt que des corrections en cascade.

#### Stopper l'automatisation

1. Désactiver le cron monitoring.
2. Désactiver le cron ingestion.
3. Ne pas lancer `rag-production-indexer --prod`.
4. Si besoin, désactiver temporairement les sources en base :

```sql
UPDATE monitoring_sources
SET active = false
WHERE active = true;
```

#### Annuler une indexation problématique

1. Identifier le document :

```sql
SELECT id, title, status, updated_at
FROM pending_documents
WHERE status IN ('indexed', 'approved')
ORDER BY updated_at DESC
LIMIT 20;
```

2. Dry-run rollback :

```bash
npx tsx --env-file=.env.local lib/rag-production-indexer/rollback.ts --document-id=<uuid> --dry-run
```

3. Rollback réel :

```bash
npx tsx --env-file=.env.local lib/rag-production-indexer/rollback.ts --document-id=<uuid>
```

4. Relancer la qualité :

```bash
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly
```

#### Nettoyer une ingestion staging problématique

Si le problème est avant production (`staging_chunks` seulement), ne pas toucher `legal_chunks`.

```sql
UPDATE pending_documents
SET status = 'rejected'
WHERE id = '<document_id>';

UPDATE staging_chunks
SET validation_status = 'rejected'
WHERE document_id = '<document_id>';
```

Tracer la raison dans `validation_log` via l'interface admin quand possible.

#### Restaurer progressivement

1. Réactiver uniquement les sources sûres (`active = true` source par source).
2. Relancer monitoring en dry-run.
3. Relancer ingestion sur `batchSize: 1`.
4. Ré-indexer seulement après validation admin.

---

## 9. Récapitulatif des choix techniques structurants

| Décision | Choix retenu | Justification |
|----------|--------------|---------------|
| Modèle de parsing juridique | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Meilleur compromis qualité juridique / structure JSON ; exigence explicite pour l'ingestion future après l'incident de crédit Anthropic. |
| Température parsing | `0` | Sorties déterministes, auditables, adaptées à un pipeline de staging. |
| Embeddings production | OpenAI `text-embedding-3-small`, dimension 1536 | Compatibilité avec le corpus existant et les index HNSW déjà en production ; migration Voyage hors scope. |
| Table de passage obligatoire | `staging_chunks` | Empêche l'écriture directe dans `legal_chunks` et donne un point de contrôle humain. |
| Validation humaine | `/dashboard/admin/rag-validation` avant production | Le parsing LLM reste probabiliste ; le droit positif nécessite une revue avant indexation. |
| Archivage des versions | `historical_chunks` | Permet rollback et audit des versions remplacées sans perdre les embeddings originaux. |
| Déduplication documents | `external_id` + `source_url` | Les autorités n'exposent pas toutes des identifiants stables ; l'URL hashée est le fallback fiable. |
| Déduplication chunks | `chunk_hash` SHA-256 | Évite les réinsertions identiques et rend l'upsert idempotent. |
| Monitoring sources | Connecteurs dédiés par source | Les flux officiels sont hétérogènes ; un connecteur générique masquerait les règles juridiques propres à chaque source. |
| Tests monitoring | Fixtures locales par source | Les tests ne dépendent pas de sites officiels instables, de rate limits ou de changements réseau. |
| Scraping prudent | `page_structure_hash` pour pages HTML | Détecte les changements de markup avant ingestion silencieusement dégradée. |
| Activation cron | Progressive : monitoring → ingestion → qualité → indexation | Réduit le blast radius ; chaque étape peut être vérifiée avant la suivante. |
| Indexation production | Dry-run par défaut, `--prod` explicite | Prévention des écritures accidentelles dans `legal_chunks`. |
| Qualité continue | 4 mécanismes indépendants | Golden set, dérive, couverture et chunks morts détectent des classes différentes de régression. |
| Baseline Phase 5 | 12/16 OK, 54,8 % couverture | Sert de référence opérationnelle ; les criticals AI Act restants sont connus et ne bloquent pas l'automatisation. |
| Re-chunking RGPD | Parent-child : article + paragraphe + point | Corrige les régressions de retrieval dues aux chunks trop fins tout en conservant la précision paragraphe. |
| Recherche production | Hybride BM25 + cosine + re-ranking | Combine rappel lexical, similarité sémantique et priorisation réglementaire. |
| Cache sémantique | Invalidation Upstash après indexation | Évite de servir des réponses construites sur des chunks obsolètes. |
| RLS / accès DB | Service role uniquement côté pipeline serveur | Les écritures automatisées contournent RLS mais ne doivent jamais être exposées au client. |
| Langue d'ingestion | Français prioritaire ; langues nationales conservées avec `language` explicite | Cohérence avec le corpus FR existant, tout en gardant les métadonnées nécessaires à une future stratégie multilingue. |
| Renvois préjudiciels CJUE | Exclus du pipeline principal | Un renvoi est une question posée, pas une décision rendue ; l'ingérer comme jurisprudence créerait un risque juridique. |

### Points volontairement hors scope

- Migration embeddings vers Voyage ou autre modèle dense.
- Multilingue complet FR/EN/DE/ES/IT/NL/PL avec recherche cross-lingue.
- Indexation automatique sans validation admin.
- Extension parent-child complète à AI Act, DSA, DMA et autres règlements.
- Linter automatique du golden set pour empêcher les blacklists intra-article invalides.

---

## 10. Références

| Document | Contenu |
|----------|---------|
| [`RAG_PIPELINE_SCHEMA.md`](RAG_PIPELINE_SCHEMA.md) | Schéma SQL des 5 tables pipeline |
| [`MONITORING_SOURCES.md`](MONITORING_SOURCES.md) | Cartographie des sources Phase 1A/1B |
| [`RAG_PRODUCTION_INDEXER.md`](RAG_PRODUCTION_INDEXER.md) | Upsert, archivage, rollback |
| [`RAG_QUALITY_ASSURANCE.md`](RAG_QUALITY_ASSURANCE.md) | Golden set, baselines, procédures P0–P2.5 |
| [`RAG_FUTURE_IMPROVEMENTS.md`](RAG_FUTURE_IMPROVEMENTS.md) | Parent-child, multilingue, linter golden set |
| [`RAG_INVENTORY.md`](RAG_INVENTORY.md) | État du corpus production |
| [`RAG_COST_ESTIMATE.md`](RAG_COST_ESTIMATE.md) | Coûts parsing Claude + embeddings |

### Modules source

| Phase | Chemin |
|-------|--------|
| 1 — Monitoring | `lib/rag-monitoring/` |
| 2 — Ingestion | `lib/rag-ingestion/` |
| 3 — Validation UI | `app/(app)/dashboard/admin/rag-validation/` |
| 4 — Indexation | `lib/rag-production-indexer/` |
| 5 — Qualité | `lib/rag-quality/` |
| Retrieval | `lib/ai/rag.ts` |

### Migrations Supabase clés

| Migration | Objet |
|-----------|-------|
| `032` | `monitoring_sources` |
| `033` | `pending_documents` |
| `034` | `staging_chunks` |
| `035` | `validation_log` |
| `036` | `historical_chunks` |
| `038` | `rag_quality_history` |
| `040` | `granularity` sur `legal_chunks` |
| `041` | `search_legal_chunks_hybrid` avec filtre réglementation |

---

## 11. Activation des crons d'automatisation

Deux scripts CLI sont fournis pour l'automatisation effective :

| Script | Rôle | Fréquence recommandée |
|--------|------|----------------------|
| `scripts/cron-monitoring.ts` | Détecter les nouveaux documents officiels et alimenter `pending_documents` | Quotidienne |
| `scripts/cron-ingestion.ts` | Parser les documents `pending` avec Claude Sonnet 4.6 et alimenter `staging_chunks` | Toutes les 6 h |

Les scripts écrivent des logs structurés JSON Lines vers stdout et retournent un code non-zéro en cas d'erreur critique.

### Commandes exactes

```bash
npx tsx --env-file=.env.local scripts/cron-monitoring.ts
npx tsx --env-file=.env.local scripts/cron-ingestion.ts
```

Variables requises :

| Script | Variables |
|--------|-----------|
| `cron-monitoring.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `cron-ingestion.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` |

Variables optionnelles :

| Variable | Effet |
|----------|-------|
| `RAG_MONITORING_SOURCE_NAMES` | Restreint le monitoring à une liste de sources séparées par virgules |
| `RAG_MONITORING_THROTTLE_MS` | Override global du délai inter-source |
| `RAG_INGESTION_BATCH_SIZE` | Taille de batch ingestion, plafonnée à 20 |
| `RAG_INGESTION_THROTTLE_MS` | Délai entre deux appels Claude |

### Infrastructure recommandée : GitHub Actions scheduled workflow

Les scripts sont des commandes Node longues, avec accès service-role Supabase. L'activation la plus directe est donc un workflow GitHub Actions planifié, séparé de la CI existante.

Créer `.github/workflows/rag-automation-crons.yml` :

```yaml
name: RAG Automation Crons

on:
  schedule:
    # Monitoring quotidien à 06:00 UTC
    - cron: "0 6 * * *"
    # Ingestion toutes les 6 heures
    - cron: "15 */6 * * *"
  workflow_dispatch:
    inputs:
      job:
        description: "Job à exécuter"
        required: true
        default: "monitoring"
        type: choice
        options:
          - monitoring
          - ingestion

jobs:
  monitoring:
    if: github.event_name == 'schedule' || inputs.job == 'monitoring'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npx tsx scripts/cron-monitoring.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

  ingestion:
    if: github.event_name == 'schedule' || inputs.job == 'ingestion'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npx tsx scripts/cron-ingestion.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          RAG_INGESTION_BATCH_SIZE: "20"
          RAG_INGESTION_THROTTLE_MS: "1500"
```

Procédure d'activation effective :

1. Ajouter les secrets GitHub dans `Settings → Secrets and variables → Actions`.
2. Créer le workflow ci-dessus sur une branche dédiée.
3. Lancer `workflow_dispatch` avec `job=monitoring`.
4. Vérifier les logs JSON et les lignes récentes dans `monitoring_log`.
5. Lancer `workflow_dispatch` avec `job=ingestion`.
6. Vérifier les logs JSON et les documents passés en `staged`.
7. Merger le workflow uniquement après ces deux exécutions manuelles réussies.

### Alternative Vercel Cron

Le repo utilise déjà `vercel.json` pour plusieurs jobs HTTP. Vercel Cron ne lance pas directement des scripts CLI : il appelle des routes Next.js. Pour utiliser Vercel comme infrastructure cible, créer deux route handlers admin-only :

- `app/api/cron/rag-monitoring/route.ts` → appelle la même logique que `scripts/cron-monitoring.ts`
- `app/api/cron/rag-ingestion/route.ts` → appelle `runIngestionPipeline({ dryRun: false, batchSize: 20 })`

Puis ajouter dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/rag-monitoring",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/rag-ingestion",
      "schedule": "15 */6 * * *"
    }
  ]
}
```

Points de vigilance Vercel :

- Protéger les routes par secret de cron (`CRON_SECRET`) ou mécanisme équivalent déjà utilisé par le projet.
- Vérifier la durée maximale d'exécution serverless : l'ingestion Claude peut dépasser une limite si plusieurs documents sont longs.
- Conserver `batchSize <= 20`, idéalement `batchSize <= 5` au démarrage.

### Désactivation rapide en cas d'incident

GitHub Actions :

1. Désactiver le workflow dans `Actions → RAG Automation Crons → Disable workflow`.
2. Ou modifier temporairement le workflow pour commenter les blocs `schedule`.
3. Relancer uniquement en manuel via `workflow_dispatch` après correction.

Vercel Cron :

1. Retirer les entrées `rag-monitoring` et `rag-ingestion` de `vercel.json`.
2. Redéployer.
3. En urgence, faire retourner `503` aux routes cron ou invalider `CRON_SECRET`.

Base de données :

```sql
-- Stopper la détection sans redéployer
UPDATE monitoring_sources
SET active = false
WHERE active = true;
```

Pour geler l'ingestion, désactiver le cron côté infrastructure. Ne pas modifier en masse les `pending_documents` sauf décision explicite de rejet document par document.

### Vérifier qu'un cron a bien tourné

#### Logs infrastructure

- GitHub Actions : onglet `Actions`, workflow `RAG Automation Crons`, logs JSON de chaque step.
- Vercel : dashboard projet → `Logs` → filtrer par `/api/cron/rag-monitoring` ou `/api/cron/rag-ingestion`.

#### Tables Supabase

Monitoring :

```sql
SELECT ms.name, ml.executed_at, ml.documents_found, ml.documents_new, ml.error_message
FROM monitoring_log ml
JOIN monitoring_sources ms ON ms.id = ml.source_id
ORDER BY ml.executed_at DESC
LIMIT 30;
```

Ingestion :

```sql
SELECT status, COUNT(*)
FROM pending_documents
GROUP BY status
ORDER BY status;

SELECT document_id, validation_status, COUNT(*)
FROM staging_chunks
GROUP BY document_id, validation_status
ORDER BY COUNT(*) DESC
LIMIT 20;
```

Qualité post-cron :

```sql
SELECT check_mode, overall_status, summary, executed_at
FROM rag_quality_history
ORDER BY executed_at DESC
LIMIT 10;
```

Critères de succès des 7 premiers jours :

- [ ] Monitoring : au moins une ligne par source active dans `monitoring_log`.
- [ ] Ingestion : les documents passent de `pending` à `staged`, sans croissance incontrôlée des `error`.
- [ ] Validation admin : l'interface affiche les chunks issus du cron ingestion.
- [ ] Qualité : golden set stable à 12/16 OK ou mieux après indexation manuelle.

---

## 12. Politique d'erreur des pipelines automatiques

Principe : **aucune erreur DB critique ne doit être silencieuse**. Un pipeline peut tolérer une source officielle temporairement indisponible, mais il ne doit jamais continuer comme si de rien n'était lorsque l'état interne Supabase n'est pas traçable.

### 12.1 — Préflight obligatoire

Avant tout appel réseau vers les sources officielles, le monitoring vérifie :

- `monitoring_sources`
- `monitoring_log`
- `pending_documents`

Avant tout parsing Claude, l'ingestion vérifie :

- `pending_documents`
- `staging_chunks`

Si une table requise est absente ou inaccessible :

- log JSON `level=error`
- exception immédiate
- code sortie non-zéro côté script cron
- aucune source officielle ne doit être interrogée
- aucun parsing Claude ne doit être lancé

### 12.2 — Erreurs FATALES

Ces erreurs provoquent un exit code non-zéro, arrêtent le worker courant et déclenchent une alerte immédiate opérateur.

| Pipeline | Erreur | Comportement attendu |
|----------|--------|----------------------|
| Monitoring | Table requise absente (`monitoring_log`, `pending_documents`) | Stop immédiat avant appels réseau |
| Monitoring | Échec insert `monitoring_log` | Source en erreur, exit code non-zéro |
| Monitoring | Échec upsert `pending_documents` | Source en erreur, exit code non-zéro |
| Monitoring | Échec update `monitoring_sources` | Source en erreur, exit code non-zéro |
| Monitoring | Échec connexion Supabase | Stop immédiat, exit code non-zéro |
| Ingestion | Table requise absente (`pending_documents`, `staging_chunks`) | Stop immédiat avant appel Claude |
| Ingestion | Échec update statut document | Erreur critique, exit code non-zéro |
| Ingestion | Échec insert `staging_chunks` | Document en erreur, exit code non-zéro |
| Ingestion | Échec connexion Supabase | Stop immédiat, exit code non-zéro |
| Ingestion | Échec connexion Anthropic | Stop document courant, exit code non-zéro |
| Indexation | Échec connexion OpenAI embeddings | Stop batch ou document courant, exit code non-zéro |

Réaction opérateur : désactiver le cron concerné, ne pas relancer en production, corriger en staging, puis relancer un cycle limité.

### 12.3 — Erreurs TOLÉRABLES

Ces erreurs sont loguées en `warning` ou `error` source/document, comptabilisées dans le rapport d'exécution, mais le worker continue sur les autres sources/documents.

| Pipeline | Erreur | Comportement attendu |
|----------|--------|----------------------|
| Monitoring | Une source retourne HTTP 429/500 | Source en erreur, continuer les autres sources |
| Monitoring | Source officielle inaccessible temporairement (404, 500, timeout) | Source en erreur, continuer les autres sources |
| Monitoring | Changement de markup détecté | `status=markup_change`, continuer les autres sources |
| Monitoring | Format inattendu (sélecteur CSS retourne zéro élément) | `markup_change` ou erreur source, continuer |
| Ingestion | Un document sans texte brut récupérable | Document en `error`, continuer les autres documents du batch |
| Ingestion | Document parsé invalide selon validateur post-parsing | Document en `error`, continuer les autres documents |
| Ingestion | Type documentaire non supporté | Document `skipped`, continuer |

Réaction opérateur : surveiller la récurrence. Si la même source échoue deux cycles consécutifs ou si le volume d'erreurs augmente, désactiver la source et corriger en staging.

### 12.4 — Erreurs INFORMATIVES

Ces événements sont logués en `info`, sans incidence sur l'exécution.

| Pipeline | Événement | Comportement attendu |
|----------|-----------|----------------------|
| Monitoring | Document déjà connu (déduplication) | Compter comme doublon/ignoré |
| Monitoring | Document filtré hors scope par mots-clés | Ignorer |
| Monitoring | Source temporairement désactivée (`active=false`) | Ne pas exécuter |
| Monitoring | Aucun document trouvé | `status=ok`, documents `0` |
| Ingestion | Aucun document `pending` | `status=ok`, batch vide |

Réaction opérateur : aucune action immédiate. Vérifier seulement si le volume devient anormal (ex. source silencieuse au-delà du seuil).

### 12.5 — Logs structurés

Tous les scripts cron doivent produire des JSON Lines vers stdout :

```json
{
  "timestamp": "2026-06-26T13:06:51.119Z",
  "level": "error",
  "component": "rag-cron-monitoring",
  "event": "source_failed",
  "sourceName": "EDPB toutes publications",
  "error": "EDPB page returned HTTP 429"
}
```

Règles :

- `level=error` pour toute erreur DB ou source en échec.
- `event=cycle_completed` doit inclure `criticalErrors`.
- Un `criticalErrors > 0` implique `process.exitCode = 1`.
- Les erreurs DB doivent inclure table/opération/source ou document concerné.

### 12.6 — Désactivation automatique opérationnelle

Si un cycle planifié produit une erreur critique pendant les premières 48h :

1. Désactiver le workflow/cron concerné.
2. Désactiver les sources côté DB si le monitoring est concerné :

```sql
UPDATE monitoring_sources
SET active = false
WHERE active = true;
```

3. Ne pas relancer en production.
4. Corriger en staging.
5. Relancer un cycle limité source par source ou document par document.
6. Réactiver seulement après un run sain documenté dans `RAG_ACTIVATION_REPORT_YYYY-MM-DD.md`.

---

*Runbook généré dans le cadre de la Phase 6 — CompliAI RAG Automation System.*
