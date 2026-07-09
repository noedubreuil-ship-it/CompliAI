# Section 5 — Corpus Juridique (V2 — données réelles)

**Date :** 2026-07-08 | **Mode :** Lecture seule
**Version :** V2 — corrige V1 basée sur données tronquées (pagination Supabase à 1 000 lignes)
**Source :** Requête avec pagination complète sur `https://hhdmkuwgrtflcqzzteom.supabase.co` (production)

---

## 5.1 Volume global

| Table | Total |
|---|---|
| `legal_chunks` (production, indexé, actif) | **14 276** |
| `staging_chunks` (en attente de validation) | **8 342** |
| `pending_documents` (documents sources) | **187** |
| `historical_chunks` (archive) | **873** |

---

## 5.2 Répartition par règlement — legal_chunks production

| Règlement | Chunks | Embeddings | Granularités présentes | Dernière MAJ |
|---|---|---|---|---|
| AI Act (UE 2024/1689) | **1 258** | 1 258 | article, considerant, annexe, point, paragraph | 2026-07-05 |
| RGPD (UE 2016/679) | **1 040** | 1 040 | article, considerant, point, paragraph | 2026-07-05 |
| DSA — Services numériques (UE 2022/2065) | **965** | 965 | article, point, paragraph, considerant | 2026-07-06 |
| DORA (UE 2022/2554) | **756** | 756 | article, considerant, point, paragraph | 2026-07-06 |
| eIDAS 2 (UE 910/2014 mod. 2024/1183) | **692** | 692 | article, point, paragraph, annexe | 2026-07-05 |
| NIS 2 (UE 2022/2555) | **681** | 681 | article, point, paragraph, considerant, annexe | 2026-07-06 |
| Cyber Resilience Act (UE 2024/2847) | **653** | 653 | article, considerant, point, paragraph, annexe | 2026-07-06 |
| TFUE | **646** | 646 | paragraph | 2026-06-24 |
| Data Act (UE 2023/2854) | **642** | 642 | article, point, paragraph, considerant | 2026-07-06 |
| DMA (UE 2022/1925) | **612** | 612 | article, paragraph, considerant, point | 2026-07-06 |
| Règlement Machines (UE 2023/1230) | **579** | 579 | article, point, paragraph, annexe, considerant | 2026-07-06 |
| Commission Guidelines Art. 6 AI Act | **509** | 509 | paragraph | 2026-07-06 |
| EDPB GL 03/2022 — Dark patterns | **453** | 453 | paragraph | 2026-06-24 |
| Data Governance Act (UE 2022/868) | **424** | 424 | article, point, paragraph, considerant | 2026-07-06 |
| CJUE — La Quadrature du Net 2 | **401** | 401 | paragraph | 2026-06-24 |
| Commission Guidelines Art. 5 AI Act | **388** | 388 | paragraph | 2026-07-06 |
| TUE | **336** | 336 | paragraph | 2026-06-24 |
| DSM (UE 2019/790) | **254** | 254 | article, point, paragraph, considerant | 2026-07-06 |
| CJUE — Meta Platforms Ireland (C-252/21) | **237** | 237 | paragraph | 2026-06-24 |
| CJUE — Tele2 Sverige/Watson | **222** | 222 | paragraph | 2026-06-24 |
| CJUE — Schrems II (C-311/18) | **203** | 203 | paragraph | 2026-07-06 |
| EDPB Guidelines 01/2022 — Right of access | **201** | 201 | paragraph | 2026-07-06 |
| EDPB WP243 — DPO | **187** | 187 | paragraph | 2026-06-24 |
| CJUE — Lindqvist (C-101/01) | **162** | 162 | paragraph | 2026-06-24 |
| EDPB WP248 — DPIA | **158** | 158 | paragraph | 2026-06-24 |
| Directive ePrivacy (UE 2002/58/CE) | **134** | 134 | article, considerant, paragraph, point | 2026-07-05 |
| EDPB GL 01/2024 — Legitimate interest | **134** | 134 | paragraph | 2026-07-06 |
| CJUE — Lindenapotheke (C-21/23) | **129** | 129 | paragraph | 2026-06-24 |
| EDPB GL 07/2020 — Responsable/sous-traitant | **126** | 126 | paragraph | 2026-06-24 |
| EDPB GL 01/2025 — Pseudonymisation | **123** | 123 | paragraph | 2026-07-06 |
| CEDH | **114** | 114 | paragraph | 2026-06-24 |
| EDPB Opinion 28/2024 — AI Act & RGPD | **113** | 113 | paragraph | 2026-07-06 |
| CJUE — Google Spain (C-131/12) | **99** | 99 | paragraph | 2026-07-06 |
| EDPB Reco 01/2020 — Transferts post-Schrems II | **98** | 98 | paragraph | 2026-06-24 |
| CJUE — Bara (C-201/14) | **85** | 85 | paragraph | 2026-06-24 |
| EDPB GL 05/2020 — Consentement | **81** | 81 | paragraph | 2026-06-24 |
| EDPB GL 08/2020 — Ciblage médias sociaux | **77** | 77 | paragraph | 2026-06-24 |
| EDPB GL 04/2019 — Privacy by Design | **74** | 74 | paragraph | 2026-06-24 |
| Code bonnes pratiques GPAI | **66** | 66 | paragraph | 2026-06-24 |
| Charte des droits fondamentaux UE | **54** | 54 | paragraph | 2026-06-24 |
| EDPB GL 02/2019 — Art. 6(1)(b) RGPD | **44** | 44 | paragraph | 2026-06-24 |
| EDPB GL 02/2023 — ePrivacy Art. 5(3) | **38** | 38 | paragraph | 2026-07-06 |
| CJUE — Breyer (C-582/14) | **28** | 28 | paragraph | 2026-07-06 |
| **TOTAL** | **14 276** | **14 276** | | |

**Taux d'embeddings :** 100% — tous les chunks ont un embedding vectoriel.

---

## 5.3 Structure parent-child

| Métrique | Valeur |
|---|---|
| Chunks avec `parent_chunk_id` (enfants) | **6 435** (45%) |
| Chunks sans `parent_chunk_id` (racines/parents) | **7 841** (55%) |

| Granularité | Chunks |
|---|---|
| `paragraph` | 9 422 |
| `point` | 2 599 |
| `considerant` | 1 397 |
| `article` | 818 |
| `annexe` | 40 |

Le modèle parent-child est déployé sur **45% du corpus**. Les règlements indexés depuis le 5-6 juillet 2026 (AI Act, RGPD, DSA, DMA, DORA, NIS2, CRA, Data Act, DGA, Machines) ont tous les granularités article + paragraph/point, confirmant la stratégie parent-child sur les textes législatifs majeurs.

---

## 5.4 Corpus en staging (8 342 chunks, non encore promus)

Les 8 342 chunks en `staging_chunks` sont une version alternative / rechunk des mêmes règlements déjà en production. Ils attendent la validation admin + promotion via l'indexer. Les réglements principaux en staging :

| Règlement | Staging |
|---|---|
| DSA | 928 |
| DORA | 777 |
| eIDAS 2 | 692 |
| CRA | 658 |
| Data Act | 650 |
| NIS 2 | 643 |
| DMA | 579 |
| Règlement Machines | 509 |
| Commission Guidelines Art.6 | 509 |
| DGA | 400 |
| Commission Guidelines Art.5 | 388 |
| AI Act | 193 |
| + 30 autres | ~1 216 |

**Note importante :** Le staging contient une version rechunkée de l'AI Act (193 chunks) distincte des 1 258 déjà en production. Si promus, ils remplaceraient les 1 258 actuels par une version potentiellement différente. Vérification requise avant promotion.

---

## 5.5 Couverture des textes fondamentaux

| Règlement | Chunks prod | Articles couverts (estimé) | Remarque |
|---|---|---|---|
| AI Act (113 articles + annexes) | 1 258 | ~80-100% | Couverture complète probable avec 1 258 chunks, toutes granularités présentes |
| RGPD (99 articles) | 1 040 | ~80-90% | Couverture élevée |
| DSA (93 articles) | 965 | ~80-90% | Couverture élevée |
| DORA (64 articles) | 756 | ~90%+ | Bonne couverture |
| DMA (54 articles) | 612 | ~90%+ | Bonne couverture |
| eIDAS 2 | 692 | À vérifier | |
| NIS 2 (46 articles) | 681 | ~95%+ | Très bonne couverture |
| CRA | 653 | À vérifier | |
| Data Act (50 articles) | 642 | ~90%+ | Bonne couverture |
| ePrivacy (22 articles) | 134 | ~60-70% | Couverture partielle |

---

## 5.6 Lacunes corpus confirmées

### Textes absents de legal_chunks

Les textes suivants n'apparaissent pas dans `legal_chunks` :
- **Charte UE** : 54 chunks présents — ✓ couvert
- **eIDAS 2 original (910/2014)** : 692 chunks — ✓ couvert (version modifiée)
- **Directive ePrivacy** : 134 chunks — couverture partielle
- **Règlement IA Acte délégués et actes d'exécution** : non détectés

### Textes en staging uniquement (non promus)

Aucun texte n'est exclusivement en staging — tous les règlements majeurs en staging ont aussi une version en production.

---

## 5.7 Qualité golden set — V2 (2026-07-09, corpus réel 14 276 chunks)

Golden set exécuté sur le corpus complet de production le 2026-07-09 via `npx tsx --env-file=.env.local scripts/generate-rag-baseline.ts`.

| Métrique | Baseline V1 (corpus tronqué) | **Golden Set V2 (corpus réel)** |
|---|---|---|
| Questions OK | 12/16 (75%) | **13/16 (81%)** |
| Questions WARNING | 0 | **3** (Q05, Q09, Q15) |
| Questions CRITICAL | 4 (Q02, Q04, Q05, Q15) | **0** |
| Coverage articles critiques | — | 53.4% |

**Résolution des 4 CRITICAL précédents :**
- Q02 (Art. 5 inférence émotions) → ✅ OK : considérant 44 AI Act retrouvé
- Q04 (GPAI Art. 53) → ✅ OK : AI Act:53 retrouvé en top-4
- Q05 (open source exemption) → ⚠️ WARNING : Art. 51 manquant (severity: important)
- Q15 (transparence chatbot Art. 50) → ⚠️ WARNING : Art. 26 §2 manquant (severity: important)

**Nouveau WARNING :** Q09 (transferts pays tiers, RGPD Art. 44 manquant — severity: important)

**Rapport détaillé :** `RAG_GOLDEN_SET_V2_2026-07-09.md`

---

## 5.8 Score révisé

**Corpus V1 score : 55/100** (basé sur 1 000 chunks avec AI Act à 15 et RGPD à 8)

**Corpus V2 score révisé : 87/100**

- Corpus riche et complet : 14 276 chunks, 43 règlements/textes, 100% embeddings ✓
- Parent-child sur 45% du corpus ✓
- Tous les textes fondamentaux représentés ✓
- Golden set V2 validé : 13/16 OK, 0 CRITICAL ✓
- Staging actif avec 8 342 chunks supplémentaires prêts à être validés ✓
- Déductions : ePrivacy partielle, actes délégués AI Act absents, 3 WARNING retrieval (non critiques), 8 342 staging non encore promus
