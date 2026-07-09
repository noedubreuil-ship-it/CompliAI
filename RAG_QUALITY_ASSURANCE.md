# RAG Quality Assurance — CompliAI Phase 5

> **Version** : 1.0.0  
> **Date** : Juin 2026  
> **Auteur** : Pipeline automatisé Phase 5  
> **Statut** : Baseline active

---

## Présentation

La **suite de vérification de qualité RAG** est un module d'observation en lecture seule qui surveille l'état du vecteur store production (`legal_chunks`) via 4 mécanismes complémentaires :

| Mécanisme | Fréquence | Description |
|-----------|-----------|-------------|
| **1. Divergence golden set** | Hebdomadaire | 16 questions de référence comparées aux résultats RAG |
| **2. Comparaison historique** | Mensuelle | Détection de dérives lentes entre exécutions successives |
| **3. Couverture des articles** | Mensuelle | Retrouvabilité de tous les articles indexés en top-3 |
| **4. Chunks morts** | Mensuelle | Chunks récents jamais retrouvés lors de leurs propres requêtes |

**Principe fondamental** : le module ne modifie aucune table de production. Il lit `legal_chunks`, écrit dans `rag_quality_history`, et génère des rapports Markdown.

---

## Architecture des fichiers

```
lib/rag-quality/
├── types.ts              Types partagés (GoldenQuestion, CoverageEntry, etc.)
├── golden-set.ts         16 questions de référence avec articles requis/blacklistés
├── coverage-articles.ts  Liste complète articles par règlement + CJUE + EDPB
├── runner.ts             Exécute le golden set via searchLegalChunks()
├── history.ts            Persistance dans rag_quality_history + détection drift
├── coverage-checker.ts   Vérifie la retrouvabilité des articles en top-3
├── dead-chunks.ts        Identifie les chunks récents non retrouvés
├── reporter.ts           Génère les rapports Markdown mensuels
├── pipeline.ts           Orchestrateur CLI (4 modes)
└── pipeline.test.ts      19 tests (5 cas obligatoires)

supabase/migrations/
└── 038_rag_quality_history.sql  Table de stockage des résultats

scripts/
└── generate-rag-baseline.ts     Script de génération initiale de la baseline

Rapports générés à la racine :
├── RAG_QUALITY_BASELINE_REPORT.md      Rapport initial (état à date baseline)
└── RAG_QUALITY_MONTHLY_REPORT_YYYY-MM.md  Rapport mensuel automatique
```

---

## Périmètre de surveillance

### Golden Set — 16 questions

| ID | Thème | Articles requis | Sévérité |
|----|-------|-----------------|----------|
| Q01 | AI Act haut risque Annexe III (scoring crédit) | AI Act Art. 6, 9 | critical/important |
| Q02 | Pratique interdite Art. 5 (émotions travail) | AI Act Art. 5 | critical |
| Q03 | GPAI seuil systémique 10²⁵ FLOPS | AI Act Art. 51, 55 | critical |
| Q04 | Obligations GPAI base Art. 53 | AI Act Art. 53 | critical |
| Q05 | Exemption open source GPAI Art. 53 §2 | AI Act Art. 51, 53 | critical |
| Q06 | SCHUFA + Art. 22 RGPD (C-634/21) | RGPD Art. 22, ECLI:EU:C:2023:634 | critical |
| Q07 | Conditions application Art. 22 + garanties §3 | RGPD Art. 22 | critical |
| Q08 | Transferts DPF vers US Art. 45 | RGPD Art. 45 + Schrems I/II | critical |
| Q09 | Transferts Inde sans adéquation Art. 46 | RGPD Art. 44, 46 | critical/important |
| Q10 | DPO obligatoire organisme public Art. 37 | RGPD Art. 37 | critical |
| Q11 | AIPD Art. 35 déclencheurs | RGPD Art. 35 §1, §3 | critical |
| Q12 | Exceptions droit effacement Art. 17 §3 | RGPD Art. 17 §1, §3 | critical |
| Q13 | Consentement explicite Art. 9 (données santé) | RGPD Art. 9, 7 | critical |
| Q14 | Sanctions corrélées RGPD×AI Act | RGPD Art. 83, AI Act Art. 99 | critical |
| Q15 | Transparence chatbot Art. 50 | AI Act Art. 50, 26 | critical/important |
| Q16 | Sous-traitance Art. 28 §3 clauses (a)(e)(g)(h) | RGPD Art. 28 | critical |

> **Modifications validées (2026-06-25)** :
> - Q11 : Art. 35 §10 → mention souhaitée, non critique
> - Q14 : non bis in idem reformulé en articulation entre régimes
> - Q16 : clauses critiques = (a)(e)(g)(h) uniquement ; (b)(c)(d)(f) souhaitables
> - Mécanisme 3 : couverture étendue à tous les articles principaux des 12 règlements

### Couverture — Périmètre total

| Règlement | Articles surveillés | Indexé dans RAG |
|-----------|---------------------|-----------------|
| AI Act (UE 2024/1689) | 113 | ✅ |
| RGPD (UE 2016/679) | 99 | ✅ |
| DSA | 25 principaux | ❌ (à indexer) |
| DMA | 18 principaux | ❌ (à indexer) |
| Data Act | 14 principaux | ❌ (à indexer) |
| Data Governance Act | 11 principaux | ❌ (à indexer) |
| NIS2 | 14 principaux | ❌ (à indexer) |
| Directive DSM | 12 principaux | ❌ (à indexer) |
| ePrivacy | 12 principaux | ❌ (à indexer) |
| Cyber Resilience Act | 16 principaux | ❌ (à indexer) |
| Règlement Machines | 12 principaux | ❌ (à indexer) |
| eIDAS 2 | 18 principaux | ❌ (à indexer) |
| CJUE (25 arrêts) | 25 ECLI | ✅ |
| EDPB (lignes directrices) | 15 principales | ✅ |

---

## Configuration et déploiement

### Variables d'environnement requises

```bash
NEXT_PUBLIC_SUPABASE_URL=...    # URL Supabase production
SUPABASE_SERVICE_ROLE_KEY=...   # Clé service role (bypass RLS)
OPENAI_API_KEY=...              # Embeddings text-embedding-3-small
```

### Commandes CLI

```bash
# Génération baseline initiale (première fois uniquement)
npx tsx --env-file=.env.local scripts/generate-rag-baseline.ts

# Vérification hebdomadaire (golden set + dérive)
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly

# Rapport mensuel complet (tous les mécanismes)
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=monthly

# Couverture uniquement (articles critiques, plus rapide)
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=coverage --critical-only

# Chunks morts uniquement
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=dead

# Test à sec sans écriture en base
npx tsx --env-file=.env.local lib/rag-quality/pipeline.ts --mode=weekly --dry-run
```

### Codes de sortie

| Code | Signification |
|------|---------------|
| `0` | Statut OK ou WARNING — exécution normale |
| `1` | Statut CRITICAL — dégradation détectée |
| `2` | Erreur fatale (API, DB) |

---

## Baseline initiale (état au 25 juin 2026)

La baseline a été générée le **25 juin 2026** sur le RAG production.

### Résultats golden set

```
✅ OK       : 3 / 16 questions
⚠️ Warning  : 1 / 16 questions (Q15 — Art. 26 manquant)
🔴 Critical : 12 / 16 questions
```

Les 12 anomalies critiques de la baseline sont documentées dans `RAG_QUALITY_BASELINE_REPORT.md`. Elles ne constituent pas des régressions — elles reflètent l'état actuel du RAG et servent de référence pour les comparaisons futures.

#### Questions OK en baseline

- **Q01** (haut risque scoring crédit) : Art. 6 + Art. 9 retrouvés ✅
- **Q02** (pratique interdite émotions) : Art. 5 §1 retrouvé ✅
- **Q03** (GPAI seuil systémique) : Art. 51 + Art. 55 retrouvés ✅

#### Anomalies majeures identifiées en baseline

1. **Q06/Q08 (transferts, RGPD Art. 22 et 45)** : Les questions sur les transferts et les décisions automatisées retournent principalement des lignes directrices EDPB au lieu des articles RGPD correspondants. Cause probable : les articles RGPD sont moins "denses" sémantiquement que les guidelines EDPB qui les commentent.

2. **Q12 (droit effacement)** : Le RAG retourne des chunks du Data Act au lieu de RGPD Art. 17. Cause probable : chevauchement sémantique entre "effacement" et "accès aux données" dans le Data Act.

3. **Q13 (consentement explicite Art. 9)** : Art. 9 non retrouvé, le RAG remonte des arrêts CJUE et guidelines EDPB. Les chunks Art. 9 RGPD existent mais leur embedding est moins discriminant que les textes explicatifs.

4. **Q14 (sanctions corrélées)** : RGPD Art. 83 §1 retrouvé (pas §4/§5), AI Act Art. 99 §1/§2 retrouvés (pas §3/§4). Les sous-paragraphes contenant les montants précis sont dans des chunks séparés.

### Résultats couverture (articles critiques)

```
Score global  : 53.4% (articles critiques en top-3)
Indexés vérif : 73 articles (AI Act + RGPD, indexed=true)
Échecs crit   : 34 articles non retrouvés en top-3
```

La couverture de 53.4% en baseline est normale et attendue pour un système RAG hybride (BM25 + cosine) avec des similarités réelles entre 0.33 et 0.42. La surveillance mensuelle permettra de détecter toute chute en dessous de ce plancher.

---

## Interprétation des alertes

### Mécanisme 1 — Divergence golden set (hebdomadaire)

| Code alerte | Signification | Action |
|-------------|---------------|--------|
| `CRITICAL_MISSING:REG:ART` | Article critique absent du top-10 | Vérifier l'indexation du chunk, relancer l'ingestion |
| `IMPORTANT_MISSING:REG:ART` | Article important absent | Vérifier, informer, mais pas d'urgence |
| `BLACKLISTED_PRESENT:REG:ART` | Article blacklisté présent (erreur qualificative) | Investiguer l'embedding, vérifier si un voisin sémantique parasite |

**Seuil d'alerte critique** : ≥ 1 question en statut `critical` déclenche une notification.

### Mécanisme 2 — Dérive historique (mensuelle)

| Code alerte | Signification | Action |
|-------------|---------------|--------|
| `DRIFT_DISAPPEARED:Q01` | Article était présent, maintenant absent | Peut indiquer un ré-embedding ou une suppression de chunk |
| `DRIFT_APPEARED:Q01` | Plus de 2 nouveaux articles jamais vus | Peut indiquer une nouvelle ingestion ou un changement de chunking |

### Mécanisme 3 — Couverture (mensuelle)

| Seuil | Statut | Signification |
|-------|--------|---------------|
| ≥ 90% | ✅ OK | Couverture satisfaisante |
| 70-90% | ⚠️ Warning | Couverture dégradée, à surveiller |
| < 70% | 🔴 Critical | Couverture insuffisante, action requise |

### Mécanisme 4 — Chunks morts (mensuelle)

| Nombre | Statut | Action |
|--------|--------|--------|
| 0 | ✅ OK | Aucun chunk mort |
| 1-3 | ⚠️ Warning | Auditer via `/dashboard/admin/rag-validation` |
| ≥ 4 | 🔴 Critical | Problème d'ingestion ou d'embedding systémique |

---

## Procédures d'investigation

### Procédure 1 — Article requis non retrouvé

1. Vérifier si le chunk existe en base :
   ```sql
   SELECT id, regulation, article_number, content, created_at
   FROM legal_chunks
   WHERE regulation ILIKE '%AI Act%'
   AND article_number LIKE '6%';
   ```

2. Si absent : déclencher une ré-ingestion via le module Phase 2.

3. Si présent mais non retrouvé : l'embedding est peut-être dégradé. Régénérer :
   ```bash
   # Via le dashboard admin
   # /dashboard/admin/rag-validation → sélectionner le document → "Valider avec corrections"
   ```

4. Vérifier la similarité manuellement :
   ```bash
   npx tsx --env-file=.env.local -e "
   import { searchLegalChunks } from './lib/ai/rag';
   searchLegalChunks('article 6 AI Act haut risque qualification', 10, 0.25)
     .then(r => r.forEach(c => console.log(c.regulation, c.article_number, c.similarity?.toFixed(3))));
   "
   ```

### Procédure 2 — Chunk mort détecté

1. Identifier le chunk via le dashboard :
   - `/dashboard/admin/rag-validation`
   - Filtrer par `source_method = 'automated_pipeline'` et date d'insertion récente

2. Vérifier si le chunk est un doublon (même contenu, article différent).

3. Si le chunk est correct mais jamais retrouvé : le contenu est peut-être trop court ou trop générique. Corriger via "Valider avec corrections" (enrichissement du contexte).

4. Si le chunk est un artefact d'ingestion : rejeter via le dashboard.

### Procédure 3 — Score de couverture en baisse

1. Identifier les articles critiques en échec dans le rapport mensuel.

2. Pour chaque article en échec, vérifier le rang exact :
   ```typescript
   const result = await checkCoverageEntry({
     id: "ai-act-5",
     query: "Article 5 du Règlement IA européen AI Act - Pratiques interdites",
     regulation: "AI Act",
     article: "5",
     priority: "critical",
     indexed: true,
   });
   console.log(`Rang : ${result.best_rank ?? "absent"}`);
   ```

3. Si un article était en rang 2 et est maintenant absent, une ré-ingestion récente a peut-être déplacé les embeddings voisins.

### Procédure 4 — Alerte de dérive historique

1. Comparer les deux exécutions en DB :
   ```sql
   SELECT executed_at, articles_cited, anomalies_detected
   FROM rag_quality_history
   WHERE question_id = 'Q01'
   ORDER BY executed_at DESC
   LIMIT 5;
   ```

2. Identifier si la dérive coïncide avec une indexation récente (vérifier `rag_quality_history` mode `weekly_divergence` vs timestamps d'ingestion dans `pending_documents`).

3. Si la dérive est due à un document mal inséré : utiliser le rollback Production Indexer (voir `RAG_PRODUCTION_INDEXER.md`).

---

## Erreurs de conception à éviter

> **Section ajoutée en P0 (2026-06-26)** — Diagnostic post-baseline Phase 5.

### Règle cardinale : jamais le même article dans required ET blacklisted

**Problème identifié** : lors de la conception initiale du golden set, 10 questions (Q05, Q06, Q07, Q08, Q09, Q10, Q11, Q12, Q14, Q16) avaient un article_number identique dans `required_articles` et dans `blacklisted_articles`. Cette configuration est **logiquement impossible** :

- Si le chunk est présent → `required` est satisfait ✓ MAIS `blacklisted` fire → CRITICAL
- Si le chunk est absent → `required` fire → CRITICAL

La question ne peut jamais être OK. Elle génère un **faux négatif permanent**, masquant l'état réel du retrieval.

### Origine de l'erreur

L'intention initiale était légitime : détecter qu'un article est cité correctement (avec tous ses paragraphes), et non partiellement (ex : §2 sans §3). Mais cette nuance **ne peut pas être vérifiée au niveau du retrieval** avec un chunking article-niveau (un chunk = Art. 22 entier). Elle ne devient testable qu'après un chunking paragraphe (post-P2).

### Corrections effectuées en P0

| Question | Article concerné | Erreur d'origine | Correction |
|----------|-----------------|------------------|------------|
| Q05 | AI Act (null) | Toute requête AI Act interdite | Blacklist supprimée |
| Q06 | RGPD Art. 22 | Art. 22 requis ET blacklisté | Blacklist supprimée |
| Q07 | RGPD Art. 22 | Art. 22 requis ET blacklisté | Blacklist supprimée |
| Q08 | RGPD Art. 45 | Art. 45 requis ET blacklisté | Blacklist supprimée |
| Q09 | RGPD Art. 46 | Art. 46 requis ET blacklisté | Blacklist supprimée |
| Q10 | RGPD Art. 37 | Art. 37 requis ET blacklisté | Blacklist supprimée |
| Q11 | RGPD Art. 35 | Art. 35 requis ET blacklisté (×2) | Blacklist supprimée |
| Q12 | RGPD Art. 17 | Art. 17 requis ET blacklisté (×3 required) | Blacklist supprimée |
| Q14 | RGPD Art. 83 + null | Art. 83 requis ET blacklisté + null RGPD impossible | Les deux blacklists supprimées |
| Q16 | RGPD Art. 28 | Art. 28 requis ET blacklisté | Blacklist supprimée |

### Ce qui reste comme blacklists valides (P0)

Les blacklists **entre articles différents** sont conservées car elles sont logiquement valides :

| Question | Article blacklisté | Déclencheur |
|----------|-------------------|-------------|
| Q01 | AI Act Art. 50 | Chunk transparence chatbot dans résultats scoring crédit |
| Q02 | AI Act Art. 9 | Qualification haut risque au lieu de pratique interdite |
| Q03 | AI Act Art. 53 | Art. 53 seul sans Art. 55 (confond GPAI base vs risque systémique) |
| Q04 | AI Act Art. 55 | Art. 55 seul sans Art. 53 (obligations risque systémique sans base GPAI) |
| Q15 | AI Act Art. 13 + Art. 53 | Confusion transparence haut risque / obligations GPAI fournisseur |

### Blacklists intra-article à réintroduire après P2

Après le re-chunking RGPD au niveau paragraphe (P2), les nuances suivantes pourront être exprimées comme des blacklists valides (chunk_id "22_§2" distinct de "22_§3") :

- **Q07** : `blacklist "22_§2"` si `"22_§3"` absent → "exceptions sans garanties"
- **Q06** : `blacklist` si Art. 22 présent mais ECLI:EU:C:2023:634 absent → C-634/21 ignoré
- **Q10** : `blacklist "37_§1(a)"` seul si `"37_§1(b)"` ou `"37_§1(c)"` absent → critères présentés comme alternatifs uniquement si tous 3 présents
- **Q11** : `blacklist "35_§3"` si `"35_§1"` absent → §3 sans le critère général §1
- **Q12** : `blacklist "17_§1"` si `"17_§3"` absent → droit absolu sans exceptions
- **Q14** : `blacklist "83"` si `"83_§4"` ET `"83_§5"` distincts absent → tranches non distinguées
- **Q16** : `blacklist "28_§3"` si clauses (a)(e)(g)(h) non couverts → clauses critiques manquantes

### Procédure de relecture du golden set

Avant toute modification du golden set (`lib/rag-quality/golden-set.ts`), vérifier systématiquement pour chaque question :

```
Pour chaque q in GOLDEN_SET:
  Pour chaque bl in q.blacklisted_articles:
    Si bl.article_number != null:
      Vérifier qu'aucun ra in q.required_articles n'a le même article_number que bl
    Si bl.article_number == null:
      Vérifier que bl.regulation est DIFFÉRENTE de toutes les regulations dans required_articles
```

Ce contrôle sera automatisé dans un linter dédié lors de la Phase 6 (voir `RAG_FUTURE_IMPROVEMENTS.md`).

---

## Exclusions documentées

Articles exclus du monitoring actif (non critiques ou transitoires) :

| Article | Règlement | Raison |
|---------|-----------|--------|
| Art. 92 | AI Act | Délégation législative pure, pas de contenu actionnable |
| Art. 93 | AI Act | Procédure comité technique |
| Art. 94 | AI Act | Confidentialité interne |
| Art. 95 | AI Act | Sécurité interne |
| Art. 92 | RGPD | Délégation législative pure |
| Art. 93 | RGPD | Procédure comité |
| Art. 94 | RGPD | Abrogation Directive 95/46, transitoire |
| Art. 96 | RGPD | Relation actes antérieurs, transitoire |

---

## Gestion des faux positifs

Certains articles peuvent générer des alertes récurrentes sans problème réel :

1. **Articles de définition** (Art. 3 AI Act, Art. 4 RGPD) : leur contenu est souvent éparpillé dans plusieurs chunks ; la requête directe peut ne pas retrouver le chunk principal mais des variantes valides.

2. **Articles avec sous-paragraphes multiples** (Art. 9 RGPD avec §1 à §4, Art. 83 RGPD avec §4 et §5) : le chunk `9_§1` correspond à l'article "9", mais le matcher peut manquer si la requête génère un embedding orienté vers §2.

3. **Articles CJUE peu cités** : certains arrêts comme *Gut Springenheide* (ECLI:EU:C:1998:369) ont une priorité `low` et leur absence ne génère pas d'alerte.

**Action** : Si un article génère des faux positifs répétés, l'ajouter dans `EXCLUDED_ARTICLES` dans `coverage-articles.ts` avec une justification.

---

## Tests

```bash
# Exécuter les 19 tests de la suite
npx vitest run lib/rag-quality/pipeline.test.ts

# Résultats attendus :
# ✓ Test 1 — Exécution du golden set (6 tests)
# ✓ Test 2 — Régression artificielle (2 tests)
# ✓ Test 3 — Détection chunks morts (3 tests)
# ✓ Test 4 — Comparaison historique (3 tests)
# ✓ Test 5 — Couverture articles (5 tests)
# Total : 19 passed
```

---

## Évolutions futures

1. **Intégration cron Supabase** : Planifier les executions hebdomadaires/mensuelles via Supabase Edge Functions avec Cron (une fois que les règlements supplémentaires sont indexés).

2. **Alertes email** : Connecter le pipeline à `notifier.ts` (Phase 4) pour envoyer un email quand le statut global est `critical`.

3. **Extension couverture** : Activer progressivement `indexed: true` pour DSA, DMA, Data Act, etc. au fur et à mesure de leur indexation dans `legal_chunks`.

4. **Dashboard admin** : Ajouter une page `/dashboard/admin/rag-quality` qui affiche l'historique des exécutions depuis `rag_quality_history` et les dernières anomalies.

5. **Score de confiance** : Calculer un score composite (qualité retrieval × couverture × absence de dérives) pour un KPI unique visible dans le dashboard.

---

---

## Historique des baselines — Évolution Phase 5

| Étape | Date | Golden Set | Coverage | Chunks RGPD | Événement |
|-------|------|-----------|----------|-------------|-----------|
| **Avant P0** | 25/06/2026 | 3/16 OK (2W, 13C) | 53.4% | 118 (taille-fixe) | État initial Phase 5 |
| **Après P0** | 26/06/2026 | 9/16 OK (2W, 5C) | 53.4% | 118 (taille-fixe) | Golden set corrigé (+10 blacklists supprimées) |
| **Après P1** | 26/06/2026 | 9/16 OK (2W, 5C) | 53.4% | 118 (taille-fixe) | Migration 037 appliquée, Q14 corrigé (pas de nouveau contenu) |
| **Après P2** | 26/06/2026 | 7/16 OK (2W, 7C) | 52.1% | **802 (paragraphe-niveau)** | Re-chunking RGPD complet |
| **Après P2.5** | 26/06/2026 | **12/16 OK (0W, 4C)** | **54.8%** | **901** (455§ + 347pt + 99 art) | Parent-child + dual-pass retrieval |

### Analyse post-P2.5

**Corrections** :
- 99 chunks parent `granularity = 'article'` (texte intégral EUR-Lex)
- Migrations 040 (granularity) + 041 (filtre regulation hybrid)
- Retrieval dual-pass + re-ranking dans `lib/ai/rag.ts`
- Q08 ✓ Q14 ✓ Q06 ✓ Q13 ✓ Q16 ✓ (objectif ≥11/16 atteint : **12/16**)

**Criticals restants (4)** : Q02, Q04, Q05, Q15 — qualificatif AI Act (hors scope P2.5 RGPD)

### Analyse post-P2 (contexte)

**Améliorations** :
- RGPD Art.22 (décision automatisée) : maintenant retrouvé pour Q07 ✓
- RGPD Art.37 (désignation DPO) : maintenant retrouvé pour Q10 ✓
- RGPD Art.35 (DPIA) : maintenant retrouvé pour Q11 ✓
- Toute l'architecture légale RGPD est maintenant indexée à granularité paragraphe (802 chunks vs 118)

**Régressions** :
- Q08 (transferts Art.45) : l'ancien chunk couvrait Art.45 §1-§9 (fort signal agrégé) ; les 12 chunks paragraphaires ont individuellement un score cosinus plus faible → Art.45 sort du top-3
- Q14 (sanctions Art.83 RGPD) : même phénomène pour Art.83 §4/§5 (sanctions)

**Cause** : Trade-off inhérent au chunking granulaire documenté dans `RAG_FUTURE_IMPROVEMENTS.md §I` — requêtes larges bénéficiaient des chunks multi-paragraphes, requêtes ciblées bénéficient des chunks paragraphaires. Solution à terme : indexation hiérarchique (parent-child chunking).

**Score coverage 52.1%** : légère diminution de 1.3 points vs avant P2, dans l'incertitude de mesure. La couverture absolue est inchangée (les mêmes articles critiques ne sont pas retrouvés, principalement à cause de l'imbalance de corpus EDPB vs RGPD).

---

*Dernière mise à jour : 26 juin 2026 — P2.5 parent-child RGPD + retrieval dual-pass*
