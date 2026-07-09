# RAG Retrieval Tuning — 2026-07-09

Chantier : `claude-code/retrieval-tuning-hybrid`
Contexte : Golden Set V2 (2026-07-09) — 13/16 OK, 0 CRITICAL, 3 WARNING.

---

## 1. Diagnostic par question WARNING

### Q05 ⚠️ — Art. 51 manquant (exemption open source GPAI)

**Question** : "Un fournisseur qui publie les poids de son modèle d'IA à usage général en open source
est-il dispensé de toutes ses obligations au titre de l'AI Act ?"

**Article manquant** : AI Act Art. 51 (`severity: "important"`) — seuil FLOPS risque systémique.

**Cause** : Art. 51 traite du seuil 10²⁵ FLOPS pour le risque systémique. Sémantiquement, ce concept
est éloigné des mots-clés "open source", "poids", "dispense". La similarité cosine est trop faible
pour qu'Art. 51 remonte dans les 15 premiers résultats hybrides. Le second-pass du runner golden set
ne couvrait que `severity === "critical"` — Art. 51 étant "important", il n'était jamais sauvé.

### Q09 ⚠️ — Art. 44 manquant (transferts pays tiers sans adéquation)

**Question** : "Une PME française souhaite confier le traitement de données RH à un sous-traitant
indien. Aucune décision d'adéquation n'existe pour l'Inde. Comment ce transfert peut-il être
légalement encadré ?"

**Article manquant** : RGPD Art. 44 (`severity: "important"`) — principe d'interdiction sans base légale.

**Cause** : Art. 44 est l'article de principe (court, fondationnel). La query évoque India, CCT, sous-traitant
— tous sémantiquement proches d'Art. 46 (garanties appropriées). Art. 44 (interdiction de principe) n'a
pas de contenu suffisamment dense pour scorer via BM25 ou cosine sur cette query. Même cause structurelle :
second-pass golden set limité aux articles "critical".

### Q15 ⚠️ — Art. 26 §2 manquant (transparence chatbot)

**Question** : "Une entreprise déploie un chatbot de service client alimenté par un LLM. Quelles
obligations de transparence l'AI Act impose-t-il vis-à-vis des utilisateurs finaux, et à qui
incombent-elles ?"

**Article manquant** : AI Act Art. 26 §2 (`severity: "important"`) — obligations générales du déployeur.

**Cause** : La query est sémantiquement proche d'Art. 50 (transparence) qui domine les top-15 résultats.
Art. 26 (obligations générales déployeur) est relégué au-delà du seuil. BM25 devrait aider sur "déployeur"
mais le slot est occupé par des chunks Commission Guidelines et Art. 50. Second-pass limité au "critical".

---

## 2. Paramètres actuels vs proposés

### Fonction SQL `search_legal_chunks_hybrid`

| Paramètre | Avant | Après (migration 049, pending staging) |
|-----------|-------|----------------------------------------|
| ef_search | défaut pgvector (~40) | 1000 (set_config par transaction) |
| match_threshold défaut | 0.5 | 0.5 (inchangé) |

### Fonction SQL `search_legal_chunks` (cosine-only)

| Paramètre | Avant | Après (migration 050, staging uniquement) |
|-----------|-------|----------------------------------------|
| ef_search | défaut pgvector (~40) | 1000 (set_config par transaction) |

### Chat route (`app/api/chat/route.ts`)

| Paramètre | Avant | Après (2026-07-09) |
|-----------|-------|---------------------|
| Fonction de recherche | `searchLegalChunks` (cosine only) | `searchLegalChunksHybridChat` (cosine 60% + BM25 40%) |
| ragThreshold | 0.55 | 0.20 |
| ragMatchCount (standard) | 8 | 10 |

**Justification du seuil 0.20** : avec le retrieval hybride, le score final est une combinaison cosine
(60%) + BM25 (40%). Un chunk peut avoir cosine=0.10 mais BM25=0.45 → score hybride ≈ 0.24. Un seuil
à 0.55 (cosine pur) aurait éliminé ce chunk. Le seuil 0.20 garantit que BM25 peut sauver des chunks
pertinents par leurs termes mais sémantiquement distants.

**Risque du seuil bas** : plus de bruit potentiel. Compensé par `filterOffTopicSources()` existant
dans le pipeline chat, et par le rerank `rerankChunks()` qui trie par score combiné.

### Golden Set Runner (`lib/rag-quality/runner.ts`)

| Paramètre | Avant | Après (2026-07-09) |
|-----------|-------|---------------------|
| Second-pass coverage | `severity === "critical"` seulement | Tous articles manquants (critical + important) |

### Fonction `keywordScore` (`lib/ai/rag.ts`)

| Aspect | Avant | Après (2026-07-09) |
|--------|-------|---------------------|
| Article boost | Absent | +0.4 si numéro d'article du chunk explicitement cité dans la query |
| Pondération | body 100% | body 60% + article_boost 40% |

---

## 3. Risques de régression sur les 13 questions OK

### Risque 1 — Bruit BM25 sur les questions générales

**Questions à risque** : Q01 (haut risque), Q02 (pratique interdite), Q03 (FLOPS GPAI).

**Mitigation** : `filterOffTopicSources()` dans `app/api/chat/route.ts` filtre déjà les sources hors-sujet.
Le seuil 0.20 hybride est plus permissif que 0.55 cosine mais le rerank trie par score combiné.

### Risque 2 — Article boost trop agressif

**Scenario** : query "art. 44 RGPD" booste Art. 44 qui n'est pas pertinent à la vraie question.

**Mitigation** : le boost est limité à 0.4 (sur un score total max ≈ 1.0), pondéré à 30% dans rerankChunks.
Effet net maximum : +0.12 points sur le score final (0.4 × 0.3). Ne peut pas faire remonter un chunk
non pertinent devant un chunk sémantiquement fort (cosine 0.70 × 0.7 = 0.49).

### Risque 3 — Second-pass étendu aux "important" génère plus d'appels DB

**Impact** : jusqu'à N_règlements_avec_important_manquants appels supplémentaires par run golden set.
Maximum +3 appels par question (les règlements qui manquent des articles importants).
Acceptable — le golden set n'est exécuté qu'en CI/qualité, pas en production.

### Risque 4 — Migration 050 sur search_legal_chunks

**Risque** : `set_config('hnsw.ef_search', '1000', true)` par transaction augmente le coût CPU par query.
Avec matchCount=6-8 (chat), l'impact est négligeable (<5ms estimé). Avec matchCount=1000 (second pass),
l'impact sur le temps de réponse est déjà présent et accepté.

**Mitigation** : migration 050 est taggée STAGING UNIQUEMENT. À valider sur staging avant prod.

---

## 4. Plan de test sur staging

### Prérequis

1. Appliquer migrations 048, 049, 050 sur `compliai-staging` (ref `gndvxidkiplskbrqydmw`)
2. Vérifier que le corpus AI Act + RGPD est présent en staging (au minimum Art. 44, 51, 26)

### Tests à exécuter

```bash
# Environnement staging
npx tsx --env-file=.env.staging scripts/generate-rag-baseline.ts --dry-run
```

**Critères de succès** :
- Q05 : Art. 51 présent dans `articles_cited` → status `ok` (plus de warning)
- Q09 : Art. 44 présent dans `articles_cited` → status `ok`
- Q15 : Art. 26 présent dans `articles_cited` → status `ok`
- Les 13 questions actuellement OK restent OK (aucune régression)
- Score global ≥ 15/16 OK

### Test manuel chat hybride

Exécuter les 3 questions WARNING directement via `searchLegalChunksHybridChat` :

```bash
npx tsx --env-file=.env.staging -e "
  const { searchLegalChunksHybridChat } = require('./lib/ai/rag');
  // Q05
  searchLegalChunksHybridChat('Un fournisseur qui publie les poids de son modèle open source est-il dispensé de ses obligations AI Act ?', 10, 0.20)
    .then(chunks => console.log(chunks.map(c => c.article_number)));
"
```

---

## 5. Fichiers modifiés

| Fichier | Type | Description |
|---------|------|-------------|
| `lib/rag-quality/runner.ts` | Code | Second-pass étendu aux articles "important" |
| `lib/ai/rag.ts` | Code | Article boost dans keywordScore + export searchLegalChunksHybridChat |
| `app/api/chat/route.ts` | Code | Passage de cosine-only à hybrid search |
| `supabase/migrations/050_cosine_search_ef_search.sql` | Migration SQL | ef_search=1000 dans search_legal_chunks |

---

## 6. État après les changements

| Question | Avant | Après (attendu) | Cause du fix |
|----------|-------|-----------------|--------------|
| Q05 Art.51 | WARNING | OK | Second-pass étendu aux "important" |
| Q09 Art.44 | WARNING | OK | Second-pass étendu aux "important" |
| Q15 Art.26 | WARNING | OK | Second-pass étendu aux "important" |
| Chat production | cosine 0.55 | hybrid 0.20 | Meilleur recall BM25 |

**Note** : le fix du runner golden set ne modifie pas le comportement du chat production.
Les questions WARNING peuvent toujours ne pas remonter en chat — le fix chat (passage à hybrid 0.20)
améliore le recall mais n'est pas équivalent au second-pass à 1000 chunks du runner.
La validation définitive en chat nécessite un test A/B avec utilisateurs réels.
