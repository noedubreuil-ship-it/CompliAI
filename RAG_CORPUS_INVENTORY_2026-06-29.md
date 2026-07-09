# RAG Corpus Inventory — 2026-06-29

Audit en lecture seule du corpus juridique CompliAI stocké en production dans `legal_chunks`.

## Résumé exécutif

| Métrique | Valeur |
|---|---:|
| Chunks production | 5 487 |
| Libellés `regulation` distincts | 35 |
| Langues présentes | 1 (`fr`) |
| Dernière mise à jour observée | 2026-06-26 09:46:15 UTC |
| Corpus en vrai parent-child | RGPD uniquement |
| Règlements taille-fixe à re-chunker | AI Act, DSA, DMA, CRA, Data Act, NIS2 |

Constat principal : le corpus couvre déjà un socle UE solide pour IA, données, plateformes, cybersécurité et droits fondamentaux. Les manques critiques pour un SaaS B2B international sont surtout sectoriels et transverses : `DORA`, `CSDDD`, `CSRD`, `EHDS`, responsabilité du fait des produits / IA, `MiCA`, `GPSR`, Cybersecurity Act et textes EDPB récents sur IA/pseudonymisation.

Important : aucune donnée Supabase n'a été modifiée pendant cet audit. Les requêtes effectuées étaient des `SELECT` uniquement.

## Méthodologie

- Source auditée : Supabase production, table `legal_chunks`.
- Projet production : `hhdmkuwgrtflcqzzteom`.
- Colonnes utilisées : `regulation`, `article_number`, `content`, `eurlex_url`, `language`, `version_date`, `updated_at`, `text_type`, `country`, `granularity`, `paragraph_number`, `point_letter`.
- Extraction CELEX : depuis `eurlex_url` lorsque présent.
- Limite : certains documents non EUR-Lex (EDPB, CJUE enrichie, CEDH, code GPAI) n'ont pas de CELEX dans `legal_chunks`.

---

## Étape 1 — Inventaire actuel du corpus

### Vue consolidée

| Texte / source | Référence officielle détectée | Chunks | Articles distincts | Granularité présente | Dernière version | Dernier update chunks | Langues |
|---|---|---:|---:|---|---|---|---|
| AI Act (UE 2024/1689) | CELEX `32024R1689` | 165 | 165 | paragraph | 2026-06-24 | 2026-06-24 21:07 | fr |
| CEDH | n/a | 114 | 59 | paragraph | 2021-08-01 | 2026-06-24 22:05 | fr |
| Charte des droits fondamentaux de l'Union Européenne (2016/C 202/02) | CELEX `12016P/TXT` | 53 | 53 | paragraph | 2026-06-24 | 2026-06-24 21:21 | fr |
| Charte des droits fondamentaux de l’Union Européenne (2016/C 202/02) | CELEX `12016P/TXT` | 1 | 1 | paragraph | 2016-10-26 | 2026-06-24 22:05 | fr |
| CJUE — Bara (C-201/14) | CELEX `62014CJ0201` | 85 | 85 | paragraph | 2026-06-24 | 2026-06-24 21:53 | fr |
| CJUE — La Quadrature du Net 2 (C-511/18, C-512/18, C-520/18) | CELEX `62018CJ0511` | 401 | 401 | paragraph | 2026-06-24 | 2026-06-24 21:53 | fr |
| CJUE — Lindenapotheke (C-21/23) | CELEX `62023CJ0021` | 129 | 129 | paragraph | 2026-06-24 | 2026-06-24 21:54 | fr |
| CJUE — Lindqvist (C-101/01) | CELEX `62001CJ0101` | 162 | 162 | paragraph | 2026-06-24 | 2026-06-24 21:53 | fr |
| CJUE — Meta Platforms Ireland (C-252/21) | CELEX `62021CJ0252` | 237 | 237 | paragraph | 2026-06-24 | 2026-06-24 21:54 | fr |
| CJUE — Tele2 Sverige/Watson (C-203/15, C-698/15) | CELEX `62015CJ0203` | 222 | 222 | paragraph | 2026-06-24 | 2026-06-24 21:53 | fr |
| Code de bonnes pratiques GPAI — IA à usage général (AI Office, 2025) | n/a | 66 | 66 | paragraph | 2025-07-10 | 2026-06-24 21:32 | fr |
| Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847) | CELEX `32024R2847` | 102 | 102 | paragraph | 2026-06-24 | 2026-06-24 21:49 | fr |
| Data Act — Règlement sur les données (UE 2023/2854) | CELEX `32023R2854` | 70 | 70 | paragraph | 2026-06-24 | 2026-06-24 21:21 | fr |
| Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868) | CELEX `32022R0868` | 51 | 51 | paragraph | 2026-06-24 | 2026-06-24 21:49 | fr |
| Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique | CELEX `32019L0790` | 37 | 37 | paragraph | 2026-06-20 | 2026-06-24 21:21 | fr |
| Directive ePrivacy (UE 2002/58/CE) | CELEX `32002L0058` | 21 | 21 | paragraph | 2026-06-24 | 2026-06-24 21:49 | fr |
| Directive NIS 2 (UE 2022/2555) | CELEX `32022L2555` | 70 | 70 | paragraph | 2026-06-20 | 2026-06-24 21:21 | fr |
| DMA — Règlement sur les marchés numériques (UE 2022/1925) | CELEX `32022R1925` | 74 | 74 | paragraph | 2026-06-24 | 2026-06-24 21:21 | fr |
| DSA — Règlement sur les services numériques (UE 2022/2065) | CELEX `32022R2065` | 113 | 113 | paragraph | 2026-06-24 | 2026-06-24 21:21 | fr |
| EDPB Guidelines 02/2019 — Article 6(1)(b) RGPD | n/a | 44 | 44 | paragraph | 2019-10-09 | 2026-06-24 21:50 | fr |
| EDPB Guidelines 03/2022 — Dark patterns | n/a | 453 | 453 | paragraph | 2023-02-14 | 2026-06-24 21:50 | fr |
| EDPB Guidelines 04/2019 — Article 25 RGPD privacy by design | n/a | 74 | 74 | paragraph | 2020-10-20 | 2026-06-24 21:52 | fr |
| EDPB Guidelines 05/2020 — Consentement | n/a | 81 | 81 | paragraph | 2020-05-04 | 2026-06-24 21:52 | fr |
| EDPB Guidelines 07/2020 — Responsable / sous-traitant | n/a | 126 | 126 | paragraph | 2021-07-07 | 2026-06-24 21:52 | fr |
| EDPB Guidelines 08/2020 — Ciblage médias sociaux | n/a | 77 | 77 | paragraph | 2021-04-13 | 2026-06-24 21:52 | fr |
| EDPB WP243 — DPO | n/a | 187 | 187 | paragraph | 2017-04-05 | 2026-06-24 21:32 | fr |
| EDPB WP248 — DPIA / AIPD | n/a | 158 | 158 | paragraph | 2017-10-04 | 2026-06-24 21:32 | fr |
| EDPB Recommendations 01/2020 — Schrems II | n/a | 98 | 98 | paragraph | 2021-06-18 | 2026-06-24 21:50 | fr |
| eIDAS 2 — Identité numérique européenne (UE 2024/1183) | CELEX `32024R1183` | 19 | 19 | paragraph | 2026-06-24 | 2026-06-24 21:49 | fr |
| Règlement Machines (UE 2023/1230) — produits IA intégrés | CELEX `32023R1230` | 114 | 114 | paragraph | 2026-06-24 | 2026-06-24 21:49 | fr |
| RGPD (UE 2016/679) | CELEX `32016R0679` | 901 | 133 | article, paragraph, point | 2016-05-04 | 2026-06-26 09:46 | fr |
| Traité sur l'Union Européenne (TUE) | CELEX `12016M/TXT` | 335 | 92 | paragraph | 2026-06-24 | 2026-06-24 21:21 | fr |
| Traité sur l’Union Européenne (TUE) | CELEX `12016M/TXT` | 1 | 1 | paragraph | 2016-10-26 | 2026-06-24 22:05 | fr |
| Traité sur le fonctionnement de l'Union Européenne (TFUE) | CELEX `12016E/TXT` | 643 | 386 | paragraph | 2026-06-24 | 2026-06-24 21:21 | fr |
| Traité sur le fonctionnement de l’Union Européenne (TFUE) | CELEX `12016E/TXT` | 3 | 3 | paragraph | 2016-10-26 | 2026-06-24 22:05 | fr |

### Observations d’inventaire

- Le corpus est presque entièrement francophone (`fr`).
- Le RGPD est le seul texte avec granularité réellement mixte `article / paragraph / point`.
- Plusieurs textes primaires affichent une granularité SQL `paragraph`, mais les identifiants et longueurs montrent un héritage de chunking taille-fixe.
- Doublons à normaliser : `Union Européenne` vs `Union Européenne` avec apostrophe typographique courbe pour Charte, TUE, TFUE.
- `text_type` est surtout renseigné pour le RGPD ; beaucoup de corpus historique reste à `null`.
- Les décisions CJUE sont présentes en granularité très fine par paragraphes / points de jugement, ce qui est bon pour la recherche jurisprudentielle.

---

## Étape 2 — Textes manquants potentiels

### Priorité 1 — Manquants critiques

| Texte manquant | Référence officielle | Pertinence CompliAI | Source officielle | Chunks attendus |
|---|---|---|---|---:|
| DORA — Digital Operational Resilience Act | Règlement (UE) 2022/2554, CELEX `32022R2554` | Critique pour finance, fintech, SaaS financiers, prestataires ICT et risques cyber. | https://eur-lex.europa.eu/eli/reg/2022/2554/oj | 80-140 |
| CSDDD — Corporate Sustainability Due Diligence Directive | Directive (UE) 2024/1760 | Très pertinent pour grandes entreprises internationales, chaînes de valeur et gouvernance ESG/risques. | https://eur-lex.europa.eu/eli/dir/2024/1760/oj | 80-130 |
| CSRD — Corporate Sustainability Reporting Directive | Directive (UE) 2022/2464, CELEX `32022L2464` | Complément naturel de CSDDD pour grands comptes et reporting de durabilité. | https://eur-lex.europa.eu/eli/dir/2022/2464/oj | 50-90 |
| Product Liability Directive refondue | Directive (UE) 2024/2853 | Responsabilité produits logiciels/IA, très utile pour fabricants et fournisseurs B2B. | https://eur-lex.europa.eu/eli/dir/2024/2853/oj | 50-90 |
| EHDS — European Health Data Space | Règlement (UE) 2025/327, CELEX `32025R0327` | Critique pour IA santé, MedTech, données de santé et réutilisation secondaire. | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R0327 | 100-180 |
| MiCA — Markets in Crypto-Assets | Règlement (UE) 2023/1114, CELEX `32023R1114` | Important pour fintech, crypto, services numériques financiers et compliance transfrontière. | https://eur-lex.europa.eu/eli/reg/2023/1114/oj | 120-220 |
| GPSR — General Product Safety Regulation | Règlement (UE) 2023/988, CELEX `32023R0988` | Sécurité produit, marketplaces, produits connectés et obligations distributeurs. | https://eur-lex.europa.eu/eli/reg/2023/988/oj | 70-120 |
| Cybersecurity Act | Règlement (UE) 2019/881, CELEX `32019R0881` | Cadre certification cyber, complément naturel de CRA/NIS2 pour produits numériques. | https://eur-lex.europa.eu/eli/reg/2019/881/oj | 80-130 |

### Priorité 2 — Manquants importants à intégrer dans les 3 prochains mois

| Texte manquant | Référence officielle | Pertinence CompliAI | Source officielle | Chunks attendus |
|---|---|---|---|---:|
| EDPB Opinion 28/2024 — AI models & personal data | Opinion EDPB 28/2024, adoptée le 17 décembre 2024 | Indispensable pour IA générative, scraping, base légale, anonymisation des modèles. | https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en | 50-90 |
| EDPB Guidelines 01/2025 — Pseudonymisation | Guidelines EDPB 01/2025 | Très utile pour privacy engineering, data minimisation, sécurité et IA santé/data spaces. | https://www.edpb.europa.eu/system/files/2025-01/edpb_guidelines_202501_pseudonymisation_en.pdf | 60-100 |
| CJUE — EDPS v SRB | Affaire C-413/23 P | Jurisprudence clé sur données pseudonymisées / identifiabilité / destinataire. | EUR-Lex / CURIA, CELEX à confirmer selon arrêt final | 80-160 |
| CJUE — Meta Platforms / Bundeskartellamt déjà présent mais à surveiller updates | CELEX `62021CJ0252` | Déjà présent ; utile de vérifier complétude et parent-child jurisprudentiel. | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62021CJ0252 | n/a |
| Lignes directrices EDPB sur web scraping IA | En cours / à surveiller | Sujet central IA générative ; à intégrer dès adoption officielle. | https://www.edpb.europa.eu/our-work-tools/our-documents_en | 50-100 |
| EDPB annual report / statements IA 2025-2026 | EDPB statements / reports | Moins normatif qu'une guideline mais utile pour veille et contexte DPA. | https://www.edpb.europa.eu/our-work-tools/our-documents_en | 30-80 |

### Priorité 3 — Compléments utiles

| Texte manquant | Référence officielle | Pertinence CompliAI | Source officielle | Chunks attendus |
|---|---|---|---|---:|
| WP29 Opinion 06/2014 legitimate interests | WP217 | Base historique toujours citée pour intérêt légitime, utile IA/RGPD. | Archives EDPB/WP29 | 60-100 |
| WP29 Guidelines automated decision-making and profiling | WP251 rev.01 | Très utile pour scoring, IA RH, crédit, profilage, Art. 22 RGPD. | Archives EDPB/WP29 | 70-120 |
| WP29 Guidelines transparency | WP260 rev.01 | Complément RGPD Art. 12-14, utile UX juridique et obligations d'information. | Archives EDPB/WP29 | 80-130 |
| Open Data Directive | Directive (UE) 2019/1024, CELEX `32019L1024` | Utile data products, réutilisation données publiques, IA entraînée sur données publiques. | https://eur-lex.europa.eu/eli/dir/2019/1024/oj | 50-90 |
| Platform Work Directive | Directive (UE) 2024/2831 | Algorithmes de management et transparence travail ; utile RH/LegalTech. | https://eur-lex.europa.eu/eli/dir/2024/2831/oj | 50-90 |
| European Accessibility Act | Directive (UE) 2019/882, CELEX `32019L0882` | Accessibilité produits/services numériques, utile SaaS B2B et UX compliance. | https://eur-lex.europa.eu/eli/dir/2019/882/oj | 60-100 |
| Representative Actions Directive | Directive (UE) 2020/1828 | Risques contentieux consommateurs / plateformes numériques. | https://eur-lex.europa.eu/eli/dir/2020/1828/oj | 40-80 |

---

## Étape 3 — Qualité du chunking existant

### Couverture articles vs textes officiels

| Règlement | Articles officiels | Articles de base présents | Chunks | Granularité SQL | État couverture |
|---|---:|---:|---:|---|---|
| AI Act | 113 | 113 | 165 | paragraph | Complète en articles |
| DSA | 93 | 93 | 113 | paragraph | Complète en articles |
| DMA | 54 | 54 | 74 | paragraph | Complète en articles |
| CRA | 71 | 71 | 102 | paragraph | Complète en articles |
| Data Act | 50 | 50 | 70 | paragraph | Complète en articles |
| NIS2 | 46 | 46 | 70 | paragraph | Complète en articles |

### Indices de chunking taille-fixe

| Règlement | Articles single chunk | Articles multi chunk | Articles avec suffixes `_§n` | Chunks > 3 500 chars | Max chars | Diagnostic |
|---|---:|---:|---:|---:|---:|---|
| AI Act | 86 | 27 | 28 | 54 | 4 000 | Taille-fixe probable, pas parent-child |
| DSA | 77 | 16 | 16 | 26 | 3 990 | Taille-fixe probable |
| DMA | 42 | 12 | 12 | 18 | 3 966 | Taille-fixe probable |
| CRA | 58 | 13 | 13 | 33 | 3 997 | Taille-fixe probable |
| Data Act | 35 | 15 | 15 | 23 | 3 993 | Taille-fixe probable |
| NIS2 | 33 | 13 | 13 | 24 | 3 990 | Taille-fixe probable |

### Articles suspects ou à vérifier manuellement

La requête n'a pas détecté de chunks contenant explicitement plusieurs marqueurs `§1`, `§2`, `§3` dans le contenu. En revanche, plusieurs chunks atteignent presque exactement 4 000 caractères, ce qui signale un découpage par taille et non par structure juridique.

Cas suspects les plus nets :

| Texte | Article | Symptôme | Pourquoi c'est suspect |
|---|---:|---|---|
| AI Act | 41 | 1 seul chunk, 3 952 caractères | Article long potentiellement agrégé/tronqué sans sous-structure |
| AI Act | 70 | seulement `70_§1`, 4 000 caractères | Suffixe `§1` sans `§2`, pile sur plafond de taille |

Autres articles multi-splits à reconstituer en parent-child :

- AI Act : Art. 2, 3, 6, 25, 26, 31, 36, 57, 58, 66, 74, 79, 113.
- CRA : Art. 3, 13, 14, 16, 32, 52, 54, 71.
- Data Act : Art. 1, 4, 11, 25, 36.
- NIS2 : Art. 6, 23, 46.
- DMA : Art. 2, 6, 18, 54.
- DSA : Art. 15, 21, 37, 40, 69.

Conclusion qualité : la couverture article est bonne, mais la qualité de granularité n'est pas suffisante pour les questions juridiques fines. Les identifiants `_§n` semblent souvent désigner des tranches techniques de texte, pas des paragraphes juridiques officiels. Le parent-child RGPD doit être étendu aux textes primaires clés.

---

## Étape 4 — Recommandations

### Priorité d’ajout des textes manquants

1. **DORA** : fort impact B2B/fintech, obligations cyber opérationnelles, complément direct NIS2/CRA.
2. **EDPB Opinion 28/2024 AI models** : directement aligné avec la promesse IA/RGPD ; petit volume, fort impact retrieval.
3. **EDPB Guidelines 01/2025 Pseudonymisation** : utile pour data minimisation, anonymisation, IA, EHDS.
4. **Product Liability Directive 2024/2853** : responsabilité IA/logiciels, fort intérêt pour fabricants et SaaS.
5. **EHDS** : critique pour santé/MedTech, gros texte mais différenciant international.
6. **CSDDD + CSRD** : utiles grands comptes, mais plus éloignés du cœur IA/digital pur.
7. **MiCA / GPSR / Cybersecurity Act** : importants selon verticales clients observées.

### Priorité de re-chunking parent-child

1. **AI Act** : priorité absolue. Corrige probablement Q02, Q04, Q05, Q15 du golden set.
2. **DSA** : plateformes, transparence, modération, risques systémiques ; très utile B2B numérique.
3. **Data Act** : contrats data, accès, switching, IoT, partage B2B.
4. **NIS2** : sécurité, gouvernance, incidents ; utile avec DORA/CRA.
5. **CRA** : utile produits connectés et logiciels, dépend de la cible clients.
6. **DMA** : moins prioritaire sauf clients plateformes/gatekeepers.

### Estimation coût et temps

Hypothèses :

- Parsing Claude Sonnet 4.6 : coût moyen faible par texte structuré, mais temps d'ingénierie et validation humaine dominants.
- Embeddings `text-embedding-3-small` : négligeables à l’échelle actuelle.
- Validation admin : prévoir 30 à 90 minutes par gros texte primaire.

| Chantier | Coût Claude estimé | Temps technique | Temps validation | Commentaire |
|---|---:|---:|---:|---|
| Re-chunk AI Act parent-child | 1-3 USD | 0,5 j | 1-2 h | Priorité golden set |
| Re-chunk DSA | 1-3 USD | 0,5 j | 1 h | Texte long mais structuré |
| Re-chunk Data Act | <2 USD | 0,5 j | 45 min | Taille moyenne |
| Re-chunk NIS2 | <2 USD | 0,5 j | 45 min | Directive structurée |
| Re-chunk CRA | 1-3 USD | 0,5 j | 1 h | Annexes / exigences techniques à vérifier |
| Ajout DORA | 1-3 USD | 0,5 j | 1 h | Critique fintech |
| Ajout EDPB Opinion 28/2024 | <1 USD | 2-3 h | 30 min | Très fort ROI |
| Ajout EDPB Pseudonymisation 01/2025 | <1 USD | 2-3 h | 30 min | Fort ROI RGPD/IA |
| Ajout EHDS | 2-5 USD | 0,5-1 j | 1-2 h | Gros texte, secteur santé |
| Ajout CSDDD/CSRD | 2-5 USD | 1 j | 1-2 h | Grands comptes |

### Roadmap réaliste 3 à 6 mois

#### Mois 1 — Stabiliser la pertinence AI Act

- Re-chunker AI Act en parent-child.
- Rejouer golden set complet.
- Corriger Q02, Q04, Q05, Q15 ou documenter les résidus.
- Ajouter EDPB Opinion 28/2024 et Guidelines 01/2025 pseudonymisation.

#### Mois 2 — Renforcer le socle B2B numérique

- Ajouter DORA.
- Re-chunker DSA et Data Act.
- Ajouter Product Liability Directive.
- Créer un mini golden set DORA/DSA/Data Act.

#### Mois 3 — Cybersécurité, produits et secteurs

- Re-chunker NIS2 et CRA.
- Ajouter Cybersecurity Act.
- Ajouter GPSR si la cible produit/marketplace est confirmée.

#### Mois 4 à 6 — International grands comptes et verticales

- Ajouter EHDS pour santé/MedTech.
- Ajouter CSDDD + CSRD pour grands comptes.
- Ajouter MiCA si traction fintech/crypto.
- Ajouter WP29 historique utile : profiling, legitimate interest, transparency.
- Normaliser les libellés `regulation` et remplir `text_type` pour tout le corpus historique.

---

## Actions proposées immédiatement

1. Valider l'ordre : **AI Act parent-child → EDPB AI models → EDPB pseudonymisation → DORA**.
2. Créer un chantier séparé pour le re-chunk AI Act, sans toucher aux autres règlements.
3. Après re-chunk AI Act, rejouer le golden set avant tout ajout de nouveaux textes.
4. Ensuite seulement, intégrer DORA et les nouvelles lignes directrices EDPB via le pipeline staging -> validation admin -> indexer.
