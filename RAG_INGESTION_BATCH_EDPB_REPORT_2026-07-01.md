# Rapport ingestion batch EDPB FR — 2026-07-01

**Date** : 2026-07-02T07:21 UTC  
**Batch** : `edpb-fr` (9 documents FR — Opinions Art. 64 EDPB)  
**Commande** : `npx tsx --env-file=.env.local scripts/cron-ingestion-batch.ts --batch=edpb-fr`  
**Modèle** : Claude Sonnet 4.6  

---

## Résultat global

| Métrique | Valeur |
|---|---:|
| Documents traités | 9 |
| **Staged (prêts validation)** | **3** |
| Erreurs parsing | 6 |
| Chunks staging produits | 12 (4 × 3 docs) |
| Tokens input | 108 859 |
| Tokens output | 14 979 |
| Coût Claude estimé | ~$0.55 USD |
| Durée | ~4 min 53 s |

---

## Prêts pour validation admin (`/dashboard/admin/rag-validation`)

| Document | Opinion | Chunks |
|---|---|---:|
| Opinion 13/2026 — FI SA certification Art. 43(3) | `fe5149c2-...` | 4 |
| Opinion 17/2026 — Infor Group Processor BCR | `3719f35a-...` | 4 |
| Opinion 11/2026 — Kuwait Petroleum BCR (Belgique) | `6d06b94d-...` | 4 |

**→ 3 documents visibles dans le dashboard admin.**

---

## Échecs (6 documents — statut `error` en pending)

Cause commune : **réponse Claude tronquée / JSON non parseable** sur des Opinions BCR longues (HTML EDPB volumineux).

| Opinion | ID |
|---|---|
| 19/2026 Rubrik Processor BCR | `ac90f27e-...` |
| 18/2026 Rubrik Controller BCR | `b3a83b88-...` |
| 16/2026 Infor Controller BCR | `90fa60d1-...` |
| 9/2026 Jacobs Douwe Egberts BCR | `b1bd5045-...` |
| 12/2026 Santander BCR | `14e4047f-...` |
| 10/2026 SLB BCR | `77e6159b-...` |

**Action recommandée** : augmenter `RAG_INGESTION_MAX_TOKENS` pour `edpb_guideline` ou pré-extraire le texte PDF avant parsing. Relancer batch après correction.

---

## Note batch size

Le monitoring a détecté **9 documents EDPB FR** (pas 10). Les Opinions Art. 64 sur BCR sont classées `edpb_guideline` dans le pipeline.

---

## Prochains batches (ordre validé)

| Batch | Statut |
|---|---|
| EDPB FR | ⚠️ Partiel — 3/9 staged |
| CNIL (1 doc) | En attente |
| DPC top-tech IE (16 EN) | En attente |
| BfDI/AEPD sélection (8) | En attente |
| Garante IT | **Bloqué** — voir `RAG_GARANTE_DATE_BUG_2026-07-01.md` |
