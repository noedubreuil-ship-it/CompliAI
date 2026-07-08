# Section 5 — Corpus juridique

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 5.1 Inventaire complet (données réelles 2026-07-08)

| Regulation | Chunks | Articles distincts | Parent-child | Statut |
|---|---|---|---|---|
| EDPB WP243 (DPO) | 187 | 187 | Non | ⚠️ INCOMPLET — guidelines sans hiérarchie |
| EDPB WP248 (DPIA) | 158 | 158 | Non | ⚠️ INCOMPLET — guidelines sans hiérarchie |
| Directive DSM (UE 2019/790) | 85 | 27 | À vérifier | ✅ Raisonnable |
| Directive NIS2 (UE 2022/2555) | 80 | 35 | À vérifier | ✅ Raisonnable |
| Code bonnes pratiques GPAI | 66 | 66 | Non | ✅ OK (1 chunk/section) |
| DSA (UE 2022/2065) | 62 | 62 | Non | ⚠️ INCOMPLET — 93 articles, 62 couverts |
| Data Governance Act | 60 | 36 | À vérifier | ✅ Raisonnable |
| TFUE | 55 | 44 | À vérifier | ✅ OK (traité de référence) |
| CJUE — Lindqvist (C-101/01) | 49 | 49 | Non | ✅ OK |
| Cyber Resilience Act | 44 | 43 | À vérifier | ✅ Raisonnable |
| DMA (UE 2022/1925) | 41 | 41 | Non | ⚠️ INCOMPLET — 54 articles |
| Data Act (UE 2023/2854) | 22 | 22 | Non | 🟠 INCOMPLET — 50 articles |
| **AI Act (UE 2024/1689)** | **15** | **10** | **Non** | 🔴 **DÉFAILLANT — 113 articles + 13 annexes** |
| CEDH | 14 | 14 | Non | ✅ OK (articles de référence) |
| CJUE — Meta Platforms (C-252/21) | 13 | 13 | Non | ✅ OK |
| DORA (UE 2022/2554) | 12 | 12 | Non | 🟠 INCOMPLET — 64 articles |
| CJUE — Lindenapotheke (C-21/23) | 9 | 9 | Non | ✅ OK |
| **RGPD (UE 2016/679)** | **8** | **4** | **Non** | 🔴 **DÉFAILLANT — 99 articles + considérants** |
| TUE | 7 | 7 | Non | ✅ OK |
| Commission Guidelines Art.5 AI Act | 6 | 0 | Non | ⚠️ Sans numéros articles |
| Règlement Machines (UE 2023/1230) | 5 | 4 | Non | 🔴 **DÉFAILLANT** |
| eIDAS 2 (mod. UE 2024/1183) | 2 | 1 | Non | 🔴 **DÉFAILLANT** |
| **TOTAL** | **1 000** | | **264 (26%)** | |

---

## 5.2 Score de complétude par règlement prioritaire

| Règlement | Articles officiels | Articles couverts | % couverture |
|---|---|---|---|
| AI Act | 113 + 13 annexes | 10 | **9%** 🔴 |
| RGPD | 99 | 4 | **4%** 🔴 |
| DSA | 93 | 62 | **67%** ⚠️ |
| DMA | 54 | 41 | **76%** ⚠️ |
| Data Act | 50 | 22 | **44%** 🟠 |
| DORA | 64 | 12 | **19%** 🟠 |
| NIS2 | 46 | 35 | **76%** ✅ |
| CRA | ~71 | 43 | **61%** ⚠️ |

---

## 5.3 Analyse critique

### Paradoxe EDPB sur-représenté / AI Act absent
Les 2 lignes directrices EDPB (WP243 + WP248) représentent 345 chunks (35% du corpus total), soit plus que l'AI Act et le RGPD réunis (23 chunks). L'outil se présente comme spécialiste AI Act mais le règlement central n'a que 15 chunks.

### RGPD quasi absent
8 chunks pour 99 articles + 87 considérants. Les questions RGPD basiques (bases légales art.6, droits des personnes art.15-22, transferts art.44-49) sont très partiellement couvertes. Le script `scripts/rechunk-rgpd.ts` (871 lignes) existe — il a visiblement été utilisé pour un re-chunking partiel.

### Parent-child : 26% seulement
264 chunks avec parent_chunk_id sur 1000. Les textes AI Act, RGPD, DSA, DMA ne sont pas structurés en hiérarchie parent-child, ce qui dégrade la qualité des réponses sur les chapitres entiers.

### Scripts rechunk disponibles mais non tous exécutés
- `scripts/rechunk-rgpd.ts` — exécuté partiellement (8 chunks résultants)
- `scripts/rechunk-aiact.ts` (823 lignes) — non exécuté en production
- `scripts/rechunk-eidas2.ts` (796 lignes) — exécuté (2 chunks seulement)
- `scripts/rechunk-reglements.ts` (579 lignes) — état inconnu
- `scripts/rechunk-eprivacy.ts` (541 lignes) — état inconnu

---

## 5.4 Textes manquants identifiés

D'après `RAG_CORPUS_GAPS_EXTENDED_2026-06-30.md` (fichier existant dans le repo) et l'inventaire :

- **ePrivacy Directive** (2002/58/CE) — non présente
- **Charte des droits fondamentaux UE** — non présente
- **Règlement eIDAS original** (910/2014) — non présent (seul eIDAS2 avec 2 chunks)
- **AI Act complet** — critique, voir ci-dessus
- **RGPD complet** — critique, voir ci-dessus
- Décisions DPC (Irlande), Garante (Italie) — monitoring configuré mais non activé

---

## 5.5 Score

**55/100** — Corpus diversifié (22 textes représentés), scripts rechunk existants, golden set défini. Déductions majeures : AI Act à 9% de couverture, RGPD à 4%, 74% des chunks sans parent-child, ePrivacy et Charte UE absents.
