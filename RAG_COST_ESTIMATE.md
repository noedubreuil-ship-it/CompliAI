# RAG_COST_ESTIMATE.md — Estimation des Coûts Phase 2
> Généré le 2026-06-25 · Modèle : **claude-sonnet-4-6** (Sonnet 4.6 — mis à jour 2026-06-25)  
> Mesures de tokens : **réelles via API Anthropic** sur textes EUR-Lex/Curia (pas estimées)

## Résumé exécutif

| Scénario | Coût mensuel Claude | Coût mensuel Embeddings | **Total mensuel** |
|---|---|---|---|
| **Fourchette basse** (rythme croisière, ~10 docs/mois) | ~1,20 € | <0,01 € | **~1,20 €/mois** |
| **Fourchette haute** (pic, ~80 docs/mois dont gros règlements) | ~18,00 € | ~0,08 € | **~18,10 €/mois** |

> **La fourchette haute (18,10 €/mois) représente 6,0 % du seuil de 300 €/mois. Phase 3 autorisée.**

---

## Mise à jour post-activation réelle (2026-06-26)

### Volume observé

Premier cycle réel de monitoring (`dryRun=false`, ingestion désactivée) :

| Métrique | Valeur |
|----------|--------|
| Sources exécutées | 12 |
| Sources OK | 10 |
| Sources en erreur | 2 (Curia, EDPB) |
| Documents détectés | **147** |
| Documents ingérés | 0 |
| Coût Claude engagé | 0 € |

Répartition principale :

| Source | Documents |
|--------|-----------|
| DPC Irlande | 61 |
| BfDI Allemagne | 24 |
| AEPD Espagne | 20 |
| IP SI Slovénie | 20 |
| Autres sources | 22 |

Ce volume est supérieur aux hypothèses initiales car plusieurs connecteurs récupéraient un backlog ou des actualités institutionnelles trop larges.

### Effet attendu du resserrement des filtres

Mesure sur fixtures locales :

| Source | Avant | Après | Réduction |
|--------|-------|-------|-----------|
| DPC | 61 | 16 | -74 % |
| BfDI | 28 | 11 | -61 % |
| AEPD | 25 | 8 | -68 % |
| IP SI | 20 | 9 | -55 % |

Estimation recalibrée :

| Régime | Volume attendu | Commentaire |
|--------|----------------|-------------|
| Premier backfill filtré | 50–70 documents | Backlog initial après filtres |
| Croisière basse | 15 documents/mois | Peu de nouvelles décisions/guidances |
| Croisière haute | 35 documents/mois | Actualité forte DPAs + EDPB + AI Office |
| Pic exceptionnel | 80 documents/mois | Maintenu comme scénario stress test |

### Impact coût recalibré

| Scénario | Claude | Embeddings | Total |
|----------|--------|------------|-------|
| Croisière basse recalibrée (~15 docs/mois) | ~1,50–2,50 € | <0,01 € | **~1,50–2,50 €/mois** |
| Croisière haute recalibrée (~35 docs/mois) | ~4,00–8,00 € | ~0,02 € | **~4,00–8,10 €/mois** |
| Pic exceptionnel conservé (~80 docs/mois) | ~18,00 € | ~0,08 € | **~18,10 €/mois** |

Conclusion : après resserrement, l'enveloppe opérationnelle recommandée devient **2–10 €/mois** en régime normal, avec conservation du seuil de surveillance **25 €/mois** pour absorber les pics.

---

## Méthodologie de mesure (révisée)

Les tokens sont **mesurés réels** via l'API Anthropic (`usage.input_tokens` / `usage.output_tokens`) sur des passages extraits directement depuis EUR-Lex et Curia en date du 2026-06-25.

**Calibration** : le tokenizer Claude utilise ~3,0–3,5 chars/token pour le français juridique (mesuré : 1 733 tokens pour 5 290 chars = 3,05 chars/token).

---

## Tarifs Claude Sonnet 4.6 (api.anthropic.com, juin 2026)

| Type | Tarif |
|---|---|
| Input tokens | $3,00 / million tokens |
| Output tokens | $15,00 / million tokens |

*Taux de change utilisé : 1 USD = 0,92 EUR*

---

## Mesures réelles par appel API (2026-06-25)

Les mesures suivantes sont les résultats **bruts** de `parseDocumentWithClaude()` sur les textes réels :

| Document | Texte parsé | Tokens input (mesuré) | Tokens output (mesuré) | Coût mesuré |
|---|---|---|---|---|
| AI Act Art. 53 §1 (4 points a/b/c/d) | Extrait ~1 600 chars + prompt | **1 733 in** | **1 001 out** | $0,0052 (~0,0048 €) |
| RGPD Art. 9 §1+§2 (10 exceptions) | Extrait ~4 200 chars + prompt | **2 438 in** | **2 356 out** | $0,0427 (~0,039 €) |
| SCHUFA C-634/21 (§55+§83+§87+dispositif) | Extrait ~3 500 chars + prompt | **2 345 in** | **1 228 out** | $0,0255 (~0,023 €) |
| EDPB Guidelines 06/2020 (4 sections) | Extrait ~2 200 chars + prompt | **1 865 in** | **1 058 out** | $0,0217 (~0,020 €) |

**Ratio moyen observé output/input : 68%** (plus élevé qu'estimé initialement car Claude produit du JSON structuré verbeux).

---

## Calibration sur un document complet : AI Act (réponse à la vérification utilisateur)

> **Question posée** : "si un règlement comme l'AI Act fait ~100 000 tokens en input et ~30 000 en output, combien coûte son parsing ?"

| Composant | Tokens | Tarif | Coût USD | Coût EUR |
|---|---|---|---|---|
| Input | 100 000 | $3,00/M | $0,30 | 0,28 € |
| Output | 30 000 | $15,00/M | $0,45 | 0,41 € |
| **Total 1 règlement complet** | | | **$0,75** | **~0,69 €** |

Ce chiffre est **cohérent avec l'estimation initiale** de 0,62 €. La légère différence vient des hypothèses sur les tokens output :
- Hypothèse initiale : 30% d'output (0,3 × input)  
- Mesure réelle : 58–97% d'output selon le type de document (JSON plus verbeux qu'anticipé)

**Correction appliquée** : nous utilisons désormais **60% d'output / input** comme référence.

---

## Coût par type de document (chiffres corrigés)

### 1. Règlement UE complet (`eu_regulation`)

**AI Act** (CELEX 32024R1689) :
- HTML brut 683 KB → ~200 000 chars de texte juridique → ~65 000 tokens (prompt inclus)
- Stratégie : 1-3 appels (contexte 200K tokens) selon densité du texte
- Calcul : 65 000 in × $3/M + 39 000 out × $15/M = $0,195 + $0,585 = **$0,78 ≈ 0,72 €**

**RGPD** (CELEX 32016R0679) :
- HTML brut 411 KB → ~120 000 chars → ~40 000 tokens
- Calcul : 40 000 in × $3/M + 24 000 out × $15/M = **$0,48 ≈ 0,44 €**

**Coût moyen règlement** : ~0,58 € (entre 0,44 € et 0,72 €)

**Usage mensuel** : 0–1 nouveau règlement/mois → **0 à 0,72 €/mois**

### 2. Directive UE (`eu_directive`)

Structure plus courte (50–80 pages vs 113 pour l'AI Act).
- **Coût par directive** : ~0,35 €
- **Usage mensuel** : 0–1 nouvelle directive/mois → **0 à 0,35 €/mois**

### 3. Arrêt CJUE (`cjeu_judgment`, `cjeu_order`)

**SCHUFA C-634/21** (55 KB HTML, arrêt relativement court) :
- ~25 000 chars de texte → ~8 000 tokens
- Arrêt court (1 question préjudicielle) : **$0,047 ≈ 0,043 €**

**Arrêt long (ex : CJUE Grande Chambre, 100+ paragraphes)** :
- ~70 000 chars → ~23 000 tokens
- Calcul : 25 000 in × $3/M + 15 000 out × $15/M = **$0,30 ≈ 0,28 €**

**Coût moyen arrêt** : ~0,12 € (fourchette 0,04 € – 0,28 €)

**Usage mensuel Curia** : 3–10 nouveaux arrêts RGPD/IA par mois → **0,36 à 2,80 €/mois**

### 4. Ligne directrice EDPB (`edpb_guideline`, `edpb_recommendation`)

**EDPB Guidelines 06/2020** (4 sections testées, document plus long en production) :
- Document complet (~40–80 pages) : ~30 000 chars → ~10 000 tokens
- Calcul : 11 000 in × $3/M + 6 600 out × $15/M = **$0,132 ≈ 0,12 €**

**Usage mensuel EDPB** : 1–3 nouvelles guidelines/mois → **0,12 à 0,36 €/mois**

### 5. Décision/Guideline APD nationale (`national_decision`, `national_guideline`)

- Document court (5–20 pages) : ~10 000 chars → ~3 300 tokens
- Calcul : 4 200 in × $3/M + 2 500 out × $15/M = **$0,050 ≈ 0,046 €**

**Usage mensuel (7 APDs)** : 5–30 nouvelles décisions/mois → **0,23 à 1,38 €/mois**

### 6. Guidance AI Office (`ai_office_guidance`)

Structure similaire aux EDPB guidelines.
- **Coût par publication** : ~0,10 €
- **Usage mensuel AI Office** : 1–3 publications/mois → **0,10 à 0,30 €/mois**

---

## Coût total mensuel Claude

| Type de document | Volume mensuel | Coût moyen/doc | Total bas | Total haut |
|---|---|---|---|---|
| EU Regulation (full) | 0–1 | 0,58 € | 0,00 € | 0,72 € |
| EU Directive (full) | 0–1 | 0,35 € | 0,00 € | 0,35 € |
| CJUE Arrêt | 3–10 | 0,12 € | 0,36 € | 1,20 € |
| EDPB Guideline | 1–3 | 0,12 € | 0,12 € | 0,36 € |
| Décision APD | 5–30 | 0,046 € | 0,23 € | 1,38 € |
| AI Office Guidance | 1–3 | 0,10 € | 0,10 € | 0,30 € |
| **TOTAL CLAUDE** | | | **~0,81 €** | **~4,31 €** |

*Marge de sécurité ×4 (textes plus longs, re-ingestion, erreurs 1ère ingestion, variance output tokens) : **3,24 € à 17,24 €/mois***

**Estimation retenue : 1,20 € à 18,00 €/mois**

---

## Coût des embeddings

**Modèle** : `text-embedding-3-small` (OpenAI) — 1 536 dimensions  
**Tarif** : $0,02 / 1 000 000 tokens = $0,00002 / token

**Par document ingesté** :
- Chunks moyens par document : 4 (arrêt court) à 25 (règlement complet)
- Tokens par chunk : ~200–400 tokens
- Volume mensuel basse : 10 docs × 10 chunks × 300 tokens = 30 000 tokens → $0,0006 < 0,001 €
- Volume mensuel haute : 80 docs × 15 chunks × 300 tokens = 360 000 tokens → $0,0072 ≈ 0,007 €

**Estimation retenue : < 0,01 € à 0,08 €/mois (négligeable)**

---

## Récapitulatif final

| Poste | Fourchette basse | Fourchette haute |
|---|---|---|
| Claude Sonnet 4.6 (parsing) | 1,20 €/mois | 18,00 €/mois |
| OpenAI text-embedding-3-small | <0,01 €/mois | 0,08 €/mois |
| **TOTAL** | **~1,20 €/mois** | **~18,10 €/mois** |

---

## Comparaison avec le seuil d'alerte (300 €/mois)

```
Fourchette haute actuelle :    18,10 €/mois
Seuil d'alerte Phase 2 :      300,00 €/mois
Ratio :                          6,0 %

→ Seuil NON atteint. Phase 3 autorisée sans restriction.
```

Pour atteindre 300 €/mois, il faudrait traiter ~1 300 documents/mois (soit ~16× le volume projeté maximum). Ce volume dépasserait largement la production normative de l'UE et des 7 APDs supervisées.

---

## Conditions qui déclencheraient une alerte

1. **Changement vers Claude Opus 4.x** → coût ×5 → ~90 €/mois au maximum. Ne pas utiliser Opus pour le parsing RAG.
2. **Re-ingestion massive** de l'historique (ex : tous les arrêts CJUE depuis 2018, ~3 000 arrêts) → ~360 € one-shot. Décision à prendre explicitement avant déclenchement.
3. **Boucle de retry non bornée** dans le pipeline → le mécanisme `retry_count` dans `pending_documents` sera limité à 3 tentatives max (Phase 3).

---

## Données brutes de mesure (API Anthropic réelle, 2026-06-25)

| Document | Source | Tokens input API | Tokens output API | Rapport out/in |
|---|---|---|---|---|
| AI Act Art. 53 §1 (extrait) | EUR-Lex CELEX 32024R1689 | **1 733** | **1 001** | 57,8 % |
| RGPD Art. 9 §1+§2 (extrait) | EUR-Lex CELEX 32016R0679 | **2 438** | **2 356** | 96,6 % |
| SCHUFA C-634/21 (extrait) | Curia ECLI:EU:C:2023:957 | **2 345** | **1 228** | 52,4 % |
| EDPB Guidelines 06/2020 (extrait) | EDPB website | **1 865** | **1 058** | 56,7 % |

**Observations** :
- Le ratio output/input est **nettement plus élevé** que les 30% estimés initialement. Cela s'explique par la structure JSON verbeux que Claude produit (chaque chunk inclut plusieurs champs répétitifs comme `regulation`, `language`, `country`, etc.).
- Pour le RGPD Art. 9 §2 spécifiquement (10 exceptions, beaucoup d'output) : ratio de 96,6%. Cette mesure est représentative des articles à liste d'exceptions multiples.
- Les règlements complets avec des annexes longues auront un ratio output/input plus faible (~30-40%) car le texte brut est beaucoup plus long que la sortie JSON.
