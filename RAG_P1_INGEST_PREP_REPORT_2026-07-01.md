# Rapport préparation ingest P1

**Date** : 2026-07-02T07:16:00.355Z
**Mode** : dry-run

| # | ID | Titre | URL OK | Taille | Chunks est. | Fichier local |
|---:|---|---|---|---:|---|---|
| 1 | edpb-03-2023-art15 | EDPB Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD) | FAIL 404 | — | 60–100 | à télécharger |
| 2 | edpb-02-2023-eprivacy-5-3 | EDPB Guidelines 02/2023 — Portée technique Art. 5(3) ePrivacy | FAIL 404 | — | 60–100 | à télécharger |
| 3 | edpb-opinion-28-2024-ai | EDPB Opinion 28/2024 — IA génératives et modèles de fondation | HTTP 200 | — | 80–130 | à télécharger |
| 4 | edpb-01-2024-legitimate-interest | EDPB Guidelines 01/2024 — Intérêt légitime (Art. 6(1)(f) RGPD) | FAIL 404 | — | 80–130 | à télécharger |
| 5 | edpb-01-2025-pseudonymisation | EDPB Guidelines 01/2025 — Pseudonymisation | FAIL 404 | — | 70–110 | à télécharger |
| 6 | cjeu-c-311-18-schrems-ii | CJUE Schrems II (C-311/18) | HTTP 200 | — | 180–280 | à télécharger |
| 7 | cjeu-c-131-12-costeja | CJUE Costeja González / Google Spain (C-131/12) | HTTP 200 | — | 100–180 | à télécharger |
| 8 | cjeu-c-582-14-breyer | CJUE Breyer (C-582/14) — adresses IP dynamiques | HTTP 200 | — | 60–100 | à télécharger |
| 9 | commission-ai-act-art5-guidelines | Commission — Guidelines on prohibited AI practices (Art. 5 AI Act) | HTTP 200 | 7311 | 80–140 | à télécharger |
| 10 | commission-ai-act-annex-iii-guidelines | Commission — Guidelines on high-risk AI systems (Annexe III) | HTTP 200 | 7311 | 60–100 | à télécharger |
| 11 | dora-2022-2554 | DORA — Règlement (UE) 2022/2554 | HTTP 202 | — | 120–200 | à télécharger |

## Commande d'exécution (après feu vert)

`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-03-2023-art15`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-02-2023-eprivacy-5-3`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-opinion-28-2024-ai`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-01-2024-legitimate-interest`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-01-2025-pseudonymisation`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=cjeu-c-311-18-schrems-ii`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=cjeu-c-131-12-costeja`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=cjeu-c-582-14-breyer`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=commission-ai-act-art5-guidelines`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=commission-ai-act-annex-iii-guidelines`
`npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=dora-2022-2554`