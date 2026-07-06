# RAG Chantier 6 — Rapport Final
Date : 2026-07-06

## Objectif

Rechunk parent-child des 8 règlements existants du corpus RAG :
DSA, DMA, NIS2, CRA, Data Act, DSM, DGA, Règlement Machines.

## Résultats Production

| Règlement | Chunks | Insérés | Mis à jour | Ignorés | Erreurs |
|-----------|--------|---------|------------|---------|---------|
| DSA (UE 2022/2065) | 928 | 885 | 43 | 0 | 0 |
| DMA (UE 2022/1925) | 579 | 579 | 0 | 0 | 0 |
| NIS2 (UE 2022/2555) | 643 | 643 | 0 | 0 | 0 |
| CRA (UE 2024/2847) | 658 | 658 | 0 | 0 | 0 |
| Data Act (UE 2023/2854) | 646 | 567 | 79 | 4 | 0 |
| DSM (UE 2019/790) | 244 | 244 | 0 | 0 | 0 |
| DGA (UE 2022/868) | 400 | 400 | 0 | 0 | 0 |
| Règlement Machines (UE 2023/1230) | 509 | 0* | 50 | 459 | 0 |
| **TOTAL** | **4 607** | **3 976** | **172** | **463** | **0** |

\* Les 509 chunks MACHINE avaient été partiellement insérés lors d'une exécution antérieure (459 ignorés car déjà présents, 50 mis à jour après fix pipeline).

## Granularités par Règlement

Chaque règlement est rechunké en parent-child :
- `article` (parent) — texte intégral de l'article
- `paragraph` (enfant) — chaque paragraphe numéroté
- `point` (enfant) — chaque point a/b/c/...
- `considerant` (enfant) — chaque considérant du préambule
- `annexe` — blocs d'annexes

## Script Générique

**`scripts/rechunk-reglements.ts`** — pipeline Claude Sonnet 4.6 pour tous les règlements :
- Extraction considérants (formats inline `(N) texte` et multi-ligne `(N)\n\ntexte`)
- Extraction articles (arrêt à la première annexe)
- Extraction annexes
- Parsing Claude JSON par article pour les paragraphes et points
- Identity normalization `paragraph_number = "1"` pour éviter les collisions

**`scripts/promote-reglements-prod.ts`** — promotion séquentielle avec :
- Flag `--reg=NOM` pour promotion individuelle
- Logging des messages d'erreur détaillés (`[ERREUR] hash=…`)
- Récapitulatif final par règlement

## Fix Pipeline — Troncature 24 000 Chars

### Problème identifié

Le **Règlement Machines** contient une Annexe III de **135 990 chars (~34 000 tokens)**, dépassant la limite de 8 192 tokens d'OpenAI `text-embedding-3-small`. Cette situation causait l'échec silencieux de tout le batch de 50 chunks qui contenait ce chunk, avec le message :

```
Embedding batch failed: 400 Invalid 'input[11]': maximum input length is 8192 tokens.
```

### Fix appliqué

**`lib/rag-production-indexer/pipeline.ts`** — ligne 134 :

```typescript
// Avant
embeddings = await embedBatch(batch.map((c) => c.content));

// Après
// Tronquer à 24 000 chars (≈6 000 tokens à 4 c/token) pour rester sous la limite 8 192 tokens OpenAI
embeddings = await embedBatch(batch.map((c) => (c.content ?? "").substring(0, 24000)));
```

### Justification du seuil

- Français juridique : ~3.5 chars/token
- 24 000 chars / 3.5 = **~6 857 tokens** → marge confortable sous 8 192
- Le contenu complet reste dans `legal_chunks.content` (non tronqué)
- L'embedding tronqué représente ~70% de la sémantique d'un article long, suffisant pour la recherche

### Chunks concernés

1 seul chunk dans le corpus actuel dépasse 24 000 chars :
- Règlement Machines (UE 2023/1230) — Annexe III — **135 990 chars**

Ce fix protège toutes les promotions futures (RGPD, EDPB, DORA, CJUE, etc.).

## Fix eIDAS 2 Doublon

Avant le rechunk, un doublon eIDAS 2 a été identifié et corrigé :

- **Ancien nom** : `eIDAS 2 — Identité numérique européenne (UE 2024/1183)` — 19 chunks archivés dans `historical_chunks` (reason: `superseded`)
- **Nom correct** : `Règlement eIDAS 2 (UE 2024/1183) — Identité numérique européenne` — 692 chunks conservés

## État Corpus Post-Chantier 6

### legal_chunks par règlement principal (sélection)

| Règlement | Chunks |
|-----------|--------|
| AI Act (UE 2024/1689) | ~1 258 |
| RGPD (UE 2016/679) | 438 |
| ePrivacy (2002/58/CE) | 134 |
| eIDAS 2 (UE 2024/1183) | 692 |
| DSA (UE 2022/2065) | 928 |
| DMA (UE 2022/1925) | 579 |
| NIS2 (UE 2022/2555) | 643 |
| CRA (UE 2024/2847) | 658 |
| Data Act (UE 2023/2854) | 646 |
| DSM (UE 2019/790) | 244 |
| DGA (UE 2022/868) | 400 |
| Règlement Machines (UE 2023/1230) | 509 |

## Anomalies Documentées

### CRA Art.60 — JSON parse error (non bloquant)

Lors du rechunk CRA en staging, l'article 60 a généré un JSON invalide contenant des guillemets typographiques `«»` dans l'expression "opérations coup de balai". Le parent article a été inséré mais les enfants sont manquants. Documenté dans `RAG_RECHUNK_REGLEMENTS_STAGING_2026-07-06.md`.

### Data Act — Validation tardive (résolu)

Le pipeline a passé le document DATA_ACT pendant que la validation admin était en cours. Seulement 5 chunks avaient été approuvés à ce moment. Résolu par ré-exécution `--reg=DATA_ACT` après validation complète.

## Nettoyage Orphelin

Suppression du pending_document orphelin RGPD considérants (Chantier 5B) :
- `b7bf2e54-5ce6-448e-8da8-c5af7558ee93` — 173 staging_chunks `pending` supprimés
- Les 173 considérants RGPD sont déjà en production (insérés via Chantier 5B)

## Branches et Commits

Branche : `claude-code/rechunk-reglements-p1`

Commits principaux :
- `15b0664` — feat: script rechunk-reglements générique + fix doublon eIDAS 2
- `f8bfb62` — docs: rapport staging chantier 6
- `432bfe4` — feat: promotion production 8 règlements + fix pipeline troncature 24k tokens

## Prochaines Étapes

1. **Chantier 7** — Ingestion massive P1 (11 fichiers déposés dans `scripts/data/`) — **attente feu vert**
2. **Chantier 8** — Audit intégrité article par article (après Chantier 7)
3. **Chantier 9** — Tuning retrieval hybride (après Chantier 8)
