# RAG Corpus — Audit d'intégrité
Date : 2026-07-07

---

## Synthèse

| Métrique | Valeur |
|---|---|
| Règlements en production | 43 |
| Total chunks | 14 276 |
| Findings P0 (critique) | **0** |
| Findings P1 (important) | **3** |
| Findings P2 (mineur) | 7 |
| Règlements absents du corpus | 10 |
| Règlements inconnus (hors spec) | 15 |

## Findings P1 — Important

- **eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)** : Articles présents : 83/107 (78%)
- **eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)** : Considérants absents (attendus : 108)
- **Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868)** : Articles présents : 38/46 (83%)

## Findings P2 — Mineur

- **Directive ePrivacy (UE 2002/58/CE) — communications électroniques & cookies** : Considérants : 49/68 (72%)
- **DSA — Règlement sur les services numériques (UE 2022/2065)** : 80 chunks enfants sans parent_chunk_id
- **DMA — Règlement sur les marchés numériques (UE 2022/1925)** : 33 chunks enfants sans parent_chunk_id
- **Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847)** : 45 chunks enfants sans parent_chunk_id
- **Data Act — Règlement sur les données (UE 2023/2854)** : 36 chunks enfants sans parent_chunk_id
- **Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868)** : Considérants : 63/72 (88%)
- **Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868)** : 24 chunks enfants sans parent_chunk_id

## Inventaire production

| Règlement | Chunks | Art. | Cons. | Para. | Points | Annexes | Embed. manquants |
|---|---:|---:|---:|---:|---:|---:|---:|
| AI Act (UE 2024/1689) | 1258 | 113 | 180 | 527 | 425 | 13 | 0 |
| CEDH | 114 | 0 | 0 | 114 | 0 | 0 | 0 |
| CJUE — Arrêt Bara (C-201/14) — Transferts de données entr… | 85 | 0 | 0 | 85 | 0 | 0 | 0 |
| CJUE — Arrêt Breyer (C-582/14) — Adresses IP et données p… | 28 | 0 | 0 | 28 | 0 | 0 | 0 |
| CJUE — Arrêt Google Spain (C-131/12) — Droit à l'oubli | 99 | 0 | 0 | 99 | 0 | 0 | 0 |
| CJUE — Arrêt La Quadrature du Net 2 (C-511/18, C-512/18, … | 401 | 0 | 0 | 401 | 0 | 0 | 0 |
| CJUE — Arrêt Lindenapotheke (C-21/23) — Qualification de … | 129 | 0 | 0 | 129 | 0 | 0 | 0 |
| CJUE — Arrêt Lindqvist (C-101/01) — Définition données pe… | 162 | 0 | 0 | 162 | 0 | 0 | 0 |
| CJUE — Arrêt Meta Platforms Ireland (C-252/21) — Traiteme… | 237 | 0 | 0 | 237 | 0 | 0 | 0 |
| CJUE — Arrêt Schrems II (C-311/18) — Transferts de donnée… | 203 | 0 | 0 | 203 | 0 | 0 | 0 |
| CJUE — Arrêt Tele2 Sverige/Watson (C-203/15, C-698/15) — … | 222 | 0 | 0 | 222 | 0 | 0 | 0 |
| Charte des droits fondamentaux de l'Union Européenne (201… | 54 | 0 | 0 | 54 | 0 | 0 | 0 |
| Code de bonnes pratiques GPAI — IA à usage général (AI Of… | 66 | 0 | 0 | 66 | 0 | 0 | 0 |
| Commission Guidelines — Classification of high-risk AI sy… | 509 | 0 | 0 | 509 | 0 | 0 | 0 |
| Commission Guidelines — Prohibited AI practices (Art. 5 A… | 388 | 0 | 0 | 388 | 0 | 0 | 0 |
| Cyber Resilience Act — Règlement sur la cyberrésilience (… | 653 | 71 | 130 | 343 | 102 | 7 | 0 |
| DMA — Règlement sur les marchés numériques (UE 2022/1925) | 612 | 54 | 109 | 275 | 174 | 0 | 0 |
| DSA — Règlement sur les services numériques (UE 2022/2065) | 965 | 93 | 156 | 401 | 315 | 0 | 0 |
| Data Act — Règlement sur les données (UE 2023/2854) | 642 | 50 | 119 | 275 | 198 | 0 | 0 |
| Data Governance Act — Règlement sur la gouvernance des do… | 424 | 38 | 63 | 169 | 154 | 0 | 0 |
| Directive DSM (UE 2019/790) — droit d'auteur marché uniqu… | 254 | 32 | 86 | 102 | 34 | 0 | 0 |
| Directive NIS 2 (UE 2022/2555) | 681 | 46 | 144 | 278 | 211 | 2 | 0 |
| Directive ePrivacy (UE 2002/58/CE) — communications élect… | 134 | 21 | 49 | 54 | 10 | 0 | 0 |
| EDPB Guidelines 01/2022 — Right of access (Art. 15 GDPR) | 201 | 0 | 0 | 201 | 0 | 0 | 0 |
| EDPB Guidelines 01/2024 — Legitimate interest (Art. 6(1)(… | 134 | 0 | 0 | 134 | 0 | 0 | 0 |
| EDPB Guidelines 01/2025 — Pseudonymisation as a data prot… | 123 | 0 | 0 | 123 | 0 | 0 | 0 |
| EDPB Guidelines 02/2023 — Technical scope of Art. 5(3) eP… | 38 | 0 | 0 | 38 | 0 | 0 | 0 |
| EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : … | 44 | 0 | 0 | 44 | 0 | 0 | 0 |
| EDPB Lignes directrices 03/2022 — Dark patterns / interfa… | 453 | 0 | 0 | 453 | 0 | 0 | 0 |
| EDPB Lignes directrices 04/2019 — Article 25 RGPD : prote… | 74 | 0 | 0 | 74 | 0 | 0 | 0 |
| EDPB Lignes directrices 05/2020 — Consentement au sens du… | 81 | 0 | 0 | 81 | 0 | 0 | 0 |
| EDPB Lignes directrices 07/2020 — Notions de responsable … | 126 | 0 | 0 | 126 | 0 | 0 | 0 |
| EDPB Lignes directrices 08/2020 — Ciblage des utilisateur… | 77 | 0 | 0 | 77 | 0 | 0 | 0 |
| EDPB Lignes directrices WP243 — Délégué à la Protection d… | 187 | 0 | 0 | 187 | 0 | 0 | 0 |
| EDPB Lignes directrices WP248 — Analyse d'Impact relative… | 158 | 0 | 0 | 158 | 0 | 0 | 0 |
| EDPB Opinion 28/2024 — AI Act & personal data protection | 113 | 0 | 0 | 113 | 0 | 0 | 0 |
| EDPB Recommandations 01/2020 — Transferts internationaux … | 98 | 0 | 0 | 98 | 0 | 0 | 0 |
| RGPD (UE 2016/679) | 1040 | 99 | 173 | 421 | 347 | 0 | 0 |
| Règlement DORA (UE 2022/2554) — Résilience opérationnelle… | 756 | 64 | 102 | 287 | 303 | 0 | 0 |
| Règlement Machines (UE 2023/1230) — produits IA intégrés | 579 | 54 | 86 | 316 | 112 | 11 | 0 |
| Traité sur l'Union Européenne (TUE) | 336 | 0 | 0 | 336 | 0 | 0 | 0 |
| Traité sur le fonctionnement de l'Union Européenne (TFUE) | 646 | 0 | 0 | 646 | 0 | 0 | 0 |
| eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183) | 692 | 83 | 0 | 388 | 214 | 7 | 0 |

## Règlements absents du corpus

| Règlement | Articles | Considérants |
|---|---:|---:|
| LED (UE 2016/680) — Protection données pénales | 72 | 107 |
| Règlement 2018/1725 — Protection données institutions UE | 100 | 170 |
| P2B (UE 2019/1150) — Relations plateformes-entreprises | 22 | 55 |
| Cybersecurity Act (UE 2019/881) | 67 | 103 |
| EHDS (UE 2025/327) — Espace européen des données de santé | 103 | 150 |
| MiCA (UE 2023/1114) — Marchés cryptoactifs | 149 | 226 |
| CSRD (UE 2022/2464) — Reporting développement durable | 54 | 95 |
| CSDDD (UE 2024/1760) — Devoir de vigilance | 37 | 82 |
| Product Liability (UE 2024/2853) | 28 | 80 |
| GPSR (UE 2023/988) — Sécurité générale produits | 51 | 130 |

## Règlements en production hors spec

- CEDH
- CJUE — Arrêt Bara (C-201/14) — Transferts de données entre administrations et information des personnes concernées
- CJUE — Arrêt La Quadrature du Net 2 (C-511/18, C-512/18, C-520/18) — Conservation données et surveillance de masse
- CJUE — Arrêt Lindenapotheke (C-21/23) — Qualification de données de santé en vente en ligne
- CJUE — Arrêt Lindqvist (C-101/01) — Définition données personnelles et publications sur internet
- CJUE — Arrêt Tele2 Sverige/Watson (C-203/15, C-698/15) — Conservation données de communications et ePrivacy
- Charte des droits fondamentaux de l'Union Européenne (2016/C 202/02)
- Code de bonnes pratiques GPAI — IA à usage général (AI Office, 2025)
- EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux
- EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités
- EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO)
- EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA)
- EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires)
- Traité sur l'Union Européenne (TUE)
- Traité sur le fonctionnement de l'Union Européenne (TFUE)

