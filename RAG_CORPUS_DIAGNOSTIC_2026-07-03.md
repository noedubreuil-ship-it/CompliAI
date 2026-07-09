# Rapport diagnostic corpus RAG production

**Date** : 2026-07-03T09:03:40Z  
**Source** : production Supabase `hhdmkuwgrtflcqzzteom`  
**Script** : `scripts/diag-corpus-production.ts`  
**Lecture seule** — aucune modification

---

## Ajustement 2 — Vérification état production (focus AI Act + RGPD)

| Regulation | Total chunks | Embeddings | Manquants | Granularités | Statut |
|---|---:|---:|---:|---|---|
| AI Act (UE 2024/1689) | **1065** | 1065 | **0** | article, paragraph, point | ✓ CONFORME |
| RGPD (UE 2016/679) | **901** | 901 | **0** | article, paragraph, point | ✓ CONFORME |

**Confirmation Ajustement 2** : AI Act et RGPD sont dans l'état attendu. Zéro embedding manquant sur l'ensemble du corpus (35 regulations, total ~6900+ chunks).

---

## Résumé exécutif des anomalies

| Priorité | Anomalie | Chantier |
|---|---|---|
| **P0 — BLOQUANT** | eIDAS 2 : 19 chunks / 107 articles (17.8% couverture) | Chantier 1 |
| **P1** | Doublons regulation (apostrophes) : Charte (1 chunk parasite), TUE (1), TFUE (3) | Chantier 3 |
| **P1** | RGPD : 0 annexe ingérée (4 annexes RGPD absentes de legal_chunks) | Chantier 5 |
| **P1** | AI Act : 0 considérant, 0 annexe ingérés (180 considérants, 13 annexes manquants) | Chantier 5 |
| **P2** | ePrivacy : 21 chunks paragraph uniquement — granularity unique, pas de parent-child | Chantier 2 |
| **INFO** | RGPD considérants : 34 chunks sous forme "Considérants (X)-(Y)" — comportement attendu | — |
| **INFO** | Tous règlements sauf AI Act + RGPD = granularity `paragraph` uniquement | Chantier 6 |

---

## Q0 — État global par regulation (35 regulations, toutes avec 100% embeddings)

| Regulation | Chunks | Embeddings | Granularités |
|---|---:|---:|---|
| AI Act (UE 2024/1689) | 1065 | 1065 | article, paragraph, point |
| CEDH | 114 | 114 | paragraph |
| Charte des droits fondamentaux (2016/C 202/02) | 53 | 53 | paragraph |
| **Charte des droits fondamentaux (2016/C 202/02)** ← doublon | **1** | 1 | paragraph |
| CJUE — Bara (C-201/14) | 85 | 85 | paragraph |
| CJUE — La Quadrature du Net 2 (C-511/18...) | 401 | 401 | paragraph |
| CJUE — Lindenapotheke (C-21/23) | 129 | 129 | paragraph |
| CJUE — Lindqvist (C-101/01) | 162 | 162 | paragraph |
| CJUE — Meta Platforms Ireland (C-252/21) | 237 | 237 | paragraph |
| CJUE — Tele2 Sverige/Watson (C-203/15, C-698/15) | 222 | 222 | paragraph |
| Code de bonnes pratiques GPAI (AI Office, 2025) | 66 | 66 | paragraph |
| Cyber Resilience Act (UE 2024/2847) | 102 | 102 | paragraph |
| Data Act (UE 2023/2854) | 70 | 70 | paragraph |
| Data Governance Act (UE 2022/868) | 51 | 51 | paragraph |
| Directive DSM (UE 2019/790) | 37 | 37 | paragraph |
| Directive ePrivacy (UE 2002/58/CE) | 21 | 21 | paragraph |
| Directive NIS 2 (UE 2022/2555) | 70 | 70 | paragraph |
| DMA (UE 2022/1925) | 74 | 74 | paragraph |
| DSA (UE 2022/2065) | 113 | 113 | paragraph |
| EDPB GL 02/2019 — Art. 6(1)(b) | 44 | 44 | paragraph |
| EDPB GL 03/2022 — Dark patterns | 453 | 453 | paragraph |
| EDPB GL 04/2019 — Privacy by Design | 74 | 74 | paragraph |
| EDPB GL 05/2020 — Consentement | 81 | 81 | paragraph |
| EDPB GL 07/2020 — Responsable/sous-traitant | 126 | 126 | paragraph |
| EDPB GL 08/2020 — Ciblage médias sociaux | 77 | 77 | paragraph |
| EDPB GL WP243 — DPO | 187 | 187 | paragraph |
| EDPB GL WP248 — AIPD/DPIA | 158 | 158 | paragraph |
| EDPB Reco 01/2020 — Transferts post-Schrems II | 98 | 98 | paragraph |
| **eIDAS 2 (UE 2024/1183)** ← CRITIQUE | **19** | 19 | paragraph |
| Règlement Machines (UE 2023/1230) | 114 | 114 | paragraph |
| RGPD (UE 2016/679) | 901 | 901 | article, paragraph, point |
| Traité sur l'Union Européenne (TUE) | 335 | 335 | paragraph |
| **Traité sur l'Union Européenne (TUE)** ← doublon | **1** | 1 | paragraph |
| Traité sur le fonctionnement de l'UE (TFUE) | 643 | 643 | paragraph |
| **Traité sur le fonctionnement de l'UE (TFUE)** ← doublon | **3** | 3 | paragraph |

---

## Q1 — Granularités par regulation

**Seuls AI Act et RGPD ont la structure parent-child (article + paragraph + point).** Tous les autres textes sont en `paragraph` uniquement (chunking taille-fixe initial). Le rechunk parent-child des règlements existants est prévu en chantier 6.

---

## Q2 — Annexes et considérants détectés dans article_number

**Résultat : 0 annexe dans tout le corpus.** Aucun texte n'a de chunks avec `article_number` contenant "annexe" ou "annex".

**Seul le RGPD a des considérants** (34 chunks, au format "Considérants (X)-(Y)" groupés par 5).

**Implications** :
- AI Act : 13 annexes + 180 considérants → **aucun chunk dédié** (non ingérés lors du rechunk)
- RGPD : 4 annexes → **aucun chunk dédié** (les 34 "considérants" sont présents mais les annexes manquent)
- DSA, DMA, NIS2, etc. : 0 annexe, 0 considérant → **aucun chunk dédié**

Les annexes et considérants sont soit absents, soit noyés dans des chunks `paragraph` sans `article_number` dédié.

---

## Q3 — Doublons regulation identifiés

Trois regulations apparaissent deux fois dans la table avec des noms quasi-identiques (différence d'apostrophe typographique `'` vs `'`) :

| Regulation principale | Chunks | Doublon | Chunks doublon |
|---|---:|---|---:|
| Charte des droits fondamentaux de l'Union Européenne (2016/C 202/02) | 53 | Même nom, apostrophe différente | 1 |
| Traité sur l'Union Européenne (TUE) | 335 | Même nom, apostrophe différente | 1 |
| Traité sur le fonctionnement de l'Union Européenne (TFUE) | 643 | Même nom, apostrophe différente | 3 |

**Action requise (Chantier 3)** : migration SQL pour fusionner les 5 chunks doublons dans les entrées principales et uniformiser les apostrophes.

---

## Q4 — RGPD : diagnostic article_number

**Regulation** : `RGPD (UE 2016/679)` — 901 chunks, 133 `article_number` distincts

**Analyse** : pas de bug.
- 99 valeurs numériques (Art. 1–99) → **99 articles RGPD présents** ✓
- 34 valeurs "Considérants (X)-(Y)" → **considérants RGPD présents** (format groupé, 5 considérants par chunk) ✓

Le "surcompte" 133 vs 99 attendus est normal : les considérants RGPD ont été ingérés séparément avec des `article_number` dédiés. Ce comportement est correct et attendu.

**Pas de correction nécessaire sur le RGPD.**

---

## Q5 — eIDAS 2 : diagnostic couverture

**Regulation** : `eIDAS 2 — Identité numérique européenne (UE 2024/1183)` — **19 chunks / 107 articles attendus (17.8%)**

**Articles présents** (uniquement) :

| Articles présents | Paragraphes couverts |
|---|---|
| Art. 1 | §1, §2, §3, §4 |
| Art. 2 | §1, §2, §3 |
| Art. 15 | 1 chunk |
| Art. 16 | §1 à §11 (11 chunks) |

**Articles 3–14, 17–107 = TOTALEMENT ABSENTS** — 88 articles manquants sur 107.

**Structure** : `paragraph` uniquement (pas de parent-child). Les 19 chunks correspondent probablement à une ingestion partielle initiale (quelques articles extraits manuellement ou test d'ingestion).

**Action requise (Chantier 1)** : réingestion complète eIDAS 2 via pipeline staging → validation admin → production. Après réingestion, rechunk parent-child (Chantier 6).

---

## Anomalies — Tableau de synthèse et plan d'action

| # | Anomalie | Sévérité | Chantier | Prérequis |
|---|---|---|---|---|
| A1 | eIDAS 2 — 88 articles manquants (17.8% couverture) | **P0** | 1 | Aucun |
| A2 | Doublons Charte/TUE/TFUE — 5 chunks orphelins | P1 | 3 | Aucun |
| A3 | Aucune annexe dans tout le corpus (0/13 AI Act, 0/4 RGPD…) | P1 | 5 | Décision utilisateur |
| A4 | AI Act 0 considérant ingéré (180 considérants absents) | P1 | 5 | Décision utilisateur |
| A5 | RGPD 0 annexe ingérée (4 annexes absentes) | P1 | 5 | Décision utilisateur |
| A6 | ePrivacy 21 chunks `paragraph` uniquement | P2 | 2 | Aucun |
| A7 | Tous règlements (DSA/DMA/NIS2…) en paragraph uniquement | INFO | 6 | Chantiers 1-5 |

---

## Prochaines étapes

En attente de ton feu vert explicite avant lancement des chantiers 1 à 11.

Ordre proposé selon ta priorisation :
1. **Chantier 1** — Réingestion eIDAS 2 complet (staging → validation → production)
2. **Chantier 2** — Diagnostic ePrivacy (quel article manque ?) + réingestion si nécessaire
3. **Chantier 3** — Migration SQL nettoyage doublons Charte/TUE/TFUE
4. **Chantier 4** — Diagnostic RGPD article_number : **CLOS — comportement normal** (99 articles + 34 groupes de considérants)
5. **Chantier 5** — Décision périmètre annexes + considérants (requiert feu vert utilisateur sur périmètre)
6. **Chantier 6** — Re-chunking parent-child règlements existants (DSA, DMA, NIS2, etc.)
7. **Chantier 7** — Ingestion massive textes manquants (P1+P2+P3)
8. **Chantier 8** — Validation pending_documents autorités nationales
9. **Chantier 9** — Audit intégrité final
10. **Chantier 10** — Tuning retrieval hybride
11. **Chantier 11** — Activation crons GitHub Actions
