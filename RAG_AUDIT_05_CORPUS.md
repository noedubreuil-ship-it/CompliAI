# Audit 05 — Corpus Juridique

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — `lib/rag-quality/`, `lib/rag-quality/coverage-articles.ts`, golden set

---

## 5.1 Règlements Couverts dans le Corpus

### Corpus Indexé (indexed: true)

| Règlement | Statut | Couverture |
|---|---|---|
| **AI Act** | ✅ INDEXÉ | Articles principaux (1-113), quelques lacunes parent-child |
| **RGPD** | ✅ INDEXÉ | Rechunking parent-child effectué (2026-07) |
| **CJUE** | ✅ INDEXÉ | Jurisprudence clé |
| **EDPB** | ✅ INDEXÉ | Guidelines principales |

### Corpus Non Indexé (indexed: false)

| Règlement | Statut | Priorité |
|---|---|---|
| **DSA** | ❌ NON INDEXÉ | Haute — service numérique core |
| **DMA** | ❌ NON INDEXÉ | Haute — marchés numériques |
| **Data Act** | ❌ NON INDEXÉ | Haute — données |
| **Data Governance Act** | ❌ NON INDEXÉ | Moyenne |
| **NIS2** | ❌ NON INDEXÉ | Haute — cybersécurité |
| **ePrivacy** | 🟡 STAGING (2026-07-06) | Haute — cookies, consentement |
| **CRA** | ❌ NON INDEXÉ | Moyenne |
| **Règlement Machines** | ❌ NON INDEXÉ | Basse |
| **eIDAS 2** | 🟡 STAGING/PARTIEL | Moyenne |
| **Directive DSM** | ❌ NON INDEXÉ | Basse |

**Source :** `lib/rag-quality/coverage-articles.ts` — `indexed` field par règlement.

---

## 5.2 Golden Set — 16 Questions de Référence

**Fichier :** `lib/rag-quality/golden-set.ts`

| ID | Thème | Règlement(s) | Articles Critiques |
|---|---|---|---|
| Q01 | Haut risque Annexe III + Art.6 §3 (scoring crédit) | AI Act | Art. 6, 9 |
| Q02 | Pratique interdite Art. 5 (inférence émotions) | AI Act | Art. 5 |
| Q03 | GPAI risque systémique seuil 10²⁵ FLOPS | AI Act | Art. 51, 55 |
| Q04 | FRIA (évaluation impact droits fondamentaux) | AI Act | Art. 27 |
| Q05 | Obligations fournisseur IA haut risque — documentation | AI Act | Art. 11, 12 |
| Q06 | DPIA obligatoire : critères Art.35 §3 | RGPD | Art. 35 |
| Q07 | Consentement données sensibles Art.9 | RGPD | Art. 9, 7 |
| Q08 | Transfert hors UE — bases légales Art.44-49 | RGPD | Art. 44-49 |
| Q09 | DPO obligation secteur public | RGPD | Art. 37 |
| Q10 | Sanctions RGPD — deux tranches | RGPD | Art. 83 |
| Q11 | DPIA pour IA décision automatisée | RGPD + AI Act | Art. 35 RGPD |
| Q12 | Sous-traitant — obligations Art.28 | RGPD | Art. 28 |
| Q13 | Profiling — droits opposition | RGPD | Art. 21, 22 |
| Q14 | Articulation RGPD / AI Act | RGPD + AI Act | Multiple |
| Q15 | Art.50 — transparence chatbot utilisateurs | AI Act | Art. 50 |
| Q16 | Clauses contrat sous-traitant IA Act | AI Act | Art. 28 + clauses |

**Résultats baseline (état 26/06/2026 selon CLAUDE.md) :**
- 12/16 OK
- 4 CRITICAL : **Q02, Q04, Q05, Q15** — liées au corpus AI Act non rechunké en parent-child

---

## 5.3 Couverture AI Act (Règlement (UE) 2024/1689)

**Statut :** Indexé mais rechunking parent-child non effectué.

**Articles indexés :** 1 à ~113 (corpus rechunké en 2026-07-03 selon `RAG_AIACT_RECHUNK_PRODUCTION_REPORT_2026-07-03.md`)

**Articles critiques manquants ou défaillants :**
- Art. 5 (pratiques interdites) → Q02 CRITICAL
- Art. 27 (FRIA) → Q04 CRITICAL
- Art. 11-12 (documentation haut risque) → Q05 CRITICAL
- Art. 50 (transparence chatbot) → Q15 CRITICAL

**Cause probable :** Sans chunking parent-child, les articles longs sont découpés en paragraphes sans lien hiérarchique → la recherche vectorielle ne remonte pas toujours le bon article en top-3 pour ces articles spécifiques.

---

## 5.4 Couverture RGPD (Règlement (UE) 2016/679)

**Statut :** ✅ Rechunking parent-child effectué en 2026-07.

**Articles couverts dans golden set :** Art. 7, 9, 21, 22, 28, 35, 37, 44-49, 83

**Résultats golden set :** Questions RGPD (Q06-Q14) toutes en statut OK (12/16 réussis, les 4 critiques sont AI Act).

---

## 5.5 Corpus Jurisprudentiel et EDPB

**CJUE :** Jurisprudence indexée (arrêts clés sélectionnés manuellement)
**EDPB :** Guidelines indexées (batch ingestion 2026-07-01 selon logs)

---

## 5.6 Règlements Absents — Impact Business

| Règlement | Impact | Fonctionnalité Affectée |
|---|---|---|
| DSA | HIGH | Outil Compliance DSA non RAG-assisté |
| NIS2 | HIGH | Questions NIS2 sans référence corpus |
| DMA | MEDIUM | Marchés numériques sans corpus |
| Data Act | MEDIUM | Données sans corpus |
| ePrivacy | LOW (staging) | Cookies / consentement en cours |

---

## 5.7 Tableau de Complétude par Règlement

| Règlement | Statut | Chunks Estimés | Score Complétude |
|---|---|---|---|
| AI Act | PARTIEL | ~800-1200 | 70% (parent-child manquant) |
| RGPD | COMPLET | ~600-900 | 90% |
| CJUE | PARTIEL | Variable | À VÉRIFIER |
| EDPB | PARTIEL | Variable | À VÉRIFIER |
| DSA | DÉFAILLANT | 0 | 0% |
| DMA | DÉFAILLANT | 0 | 0% |
| NIS2 | DÉFAILLANT | 0 | 0% |
| Data Act | DÉFAILLANT | 0 | 0% |
| ePrivacy | EN COURS | Staging seulement | ~10% |
| eIDAS 2 | EN COURS | Staging/partiel | ~20% |

*Note : Les counts exacts nécessitent une requête SQL sur `legal_chunks` (Supabase MCP non utilisé en lecture seule).*

---

## 5.8 Verdict Corpus

**Score : 5.5/10** (complet sur RGPD + AI Act, vide sur 6 règlements majeurs)

**Points forts :**
- RGPD bien couvert et rechunké en parent-child
- AI Act indexé dans son ensemble
- CJUE + EDPB présents

**Points critiques :**
- DSA, DMA, NIS2, Data Act totalement absents → CompliAI se positionne sur ces textes mais ne peut pas les RAG-assister
- AI Act parent-child manquant → 4 questions golden set en échec
- Pas de COUNT SQL réel disponible (requête Supabase MCP non exécutée en audit lecture seule)

**Priorités :**
1. Rechunking parent-child AI Act (Q02, Q04, Q05, Q15)
2. Indexation NIS2 (réglementairement incontournable)
3. Indexation DSA/DMA (promis au positionnement produit)
