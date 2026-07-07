# RAG — Fix Orphelins parent_chunk_id
Date : 2026-07-07

## Constat initial (Chantier 8 — audit 2026-07-06)

L'audit d'intégrité a identifié 151 chunks enfants sans `parent_chunk_id` dans 3 régulations :

| Régulation | Orphelins |
|---|---:|
| Directive NIS 2 (UE 2022/2555) | 38 |
| Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique | 10 |
| Règlement Machines (UE 2023/1230) — produits IA intégrés | 103 |
| **TOTAL** | **151** |

## Cause racine

Le script de rechunk encodait le numéro d'article des chunks enfants au format `{art}_§{para}` (ex : `"2_§1"`) tandis que les articles parents utilisent juste le numéro `"2"`. De plus, les paragraphes de l'article 1er utilisaient `"premier"` au lieu de `"1"`.

Lors de l'indexation production, le pipeline two-pass ne résolvait pas ces `parent_chunk_id` car le format ne correspondait pas exactement.

## Fix appliqué

Script `scripts/backfill-orphelins.ts` :
1. Pour chaque orphelin, extrait le base article number via `article_number.replace(/_§\d+$/, "")`
2. Cas spécial : `"premier"` → `"1"`
3. Résout `parent_chunk_id` via l'index `(article_number, language)` des articles parents
4. UPDATE en production directement (modification des métadonnées uniquement, pas de rechunk)

## Résultat

```
NIS 2   : 38 orphelins → 0 ✅
DSM     : 10 orphelins → 0 ✅
Machines: 103 orphelins → 0 ✅
TOTAL   : 151 résolus, 0 restant ✅
```

## Impact retrieval

Les chunks étaient déjà visibles au retrieval (embeddings présents). Le fix rétablit la navigation parent-enfant dans le pipeline de réponse contextuelle. Aucun rechunk ni re-embedding nécessaire.

## Dette technique

Le script de rechunk `scripts/rechunk-reglements.ts` produit des `article_number` au format `{art}_§{para}` pour les chunks enfants. Ce format devrait être corrigé pour utiliser uniquement le numéro d'article de base, comme les chunks parents. À documenter dans `RAG_FUTURE_IMPROVEMENTS.md`.
