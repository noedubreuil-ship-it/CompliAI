# Rapport préparation ingest P1

**Date** : 2026-07-02T07:44:58.922Z
**Mode** : dry-run
**Modèle** : claude-sonnet-4-6

## Documents

| # | ID | Titre | URL OK | Taille | Chunks est. | Fichier local | Statut |
|---:|---|---|---|---:|---|---|---|
| 1 | `edpb-03-2023-art15` | EDPB Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD) | FAIL 404 | — | 60–100 | à télécharger | dry-run |
| 2 | `edpb-02-2023-eprivacy-5-3` | EDPB Guidelines 02/2023 — Portée technique Art. 5(3) ePrivacy | FAIL 404 | — | 60–100 | à télécharger | dry-run |
| 3 | `edpb-opinion-28-2024-ai` | EDPB Opinion 28/2024 — IA génératives et modèles de fondation | HTTP 200 | — | 80–130 | à télécharger | dry-run |
| 4 | `edpb-01-2024-legitimate-interest` | EDPB Guidelines 01/2024 — Intérêt légitime (Art. 6(1)(f) RGPD) | FAIL 404 | — | 80–130 | à télécharger | dry-run |
| 5 | `edpb-01-2025-pseudonymisation` | EDPB Guidelines 01/2025 — Pseudonymisation | FAIL 404 | — | 70–110 | à télécharger | dry-run |
| 6 | `cjeu-c-311-18-schrems-ii` | CJUE Schrems II (C-311/18) | HTTP 202 | — | 180–280 | à télécharger | dry-run |
| 7 | `cjeu-c-131-12-costeja` | CJUE Costeja González / Google Spain (C-131/12) | HTTP 202 | — | 100–180 | à télécharger | dry-run |
| 8 | `cjeu-c-582-14-breyer` | CJUE Breyer (C-582/14) — adresses IP dynamiques | HTTP 202 | — | 60–100 | à télécharger | dry-run |
| 9 | `commission-ai-act-art5-guidelines` | Commission — Guidelines on prohibited AI practices (Art. 5 AI Act) | HTTP 200 | — | 80–140 | à télécharger | dry-run |
| 10 | `commission-ai-act-annex-iii-guidelines` | Commission — Guidelines on high-risk AI systems (Annexe III AI Act) | HTTP 200 | — | 60–100 | à télécharger | dry-run |
| 11 | `dora-2022-2554` | DORA — Règlement (UE) 2022/2554 | HTTP 202 | — | 120–200 | à télécharger | dry-run |

## Commandes d'exécution (après feu vert explicite)

### Insérer tous les documents en pending_documents
```bash
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute
```

### Lancer l'ingestion (après insertion)
```bash
npx tsx --env-file=.env.local scripts/cron-ingestion.ts
```

### Document par document
```bash
# EDPB Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD)
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-03-2023-art15
# EDPB Guidelines 02/2023 — Portée technique Art. 5(3) ePrivacy
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-02-2023-eprivacy-5-3
# EDPB Opinion 28/2024 — IA génératives et modèles de fondation
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-opinion-28-2024-ai
# EDPB Guidelines 01/2024 — Intérêt légitime (Art. 6(1)(f) RGPD)
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-01-2024-legitimate-interest
# EDPB Guidelines 01/2025 — Pseudonymisation
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=edpb-01-2025-pseudonymisation
# CJUE Schrems II (C-311/18)
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=cjeu-c-311-18-schrems-ii
# CJUE Costeja González / Google Spain (C-131/12)
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=cjeu-c-131-12-costeja
# CJUE Breyer (C-582/14) — adresses IP dynamiques
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=cjeu-c-582-14-breyer
# Commission — Guidelines on prohibited AI practices (Art. 5 AI Act)
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=commission-ai-act-art5-guidelines
# Commission — Guidelines on high-risk AI systems (Annexe III AI Act)
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=commission-ai-act-annex-iii-guidelines
# DORA — Règlement (UE) 2022/2554
npx tsx --env-file=.env.local scripts/ingest-p1-corpus.ts --execute --document=dora-2022-2554
```