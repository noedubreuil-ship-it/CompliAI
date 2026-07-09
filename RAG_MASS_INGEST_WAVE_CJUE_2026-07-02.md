# Rapport ingestion massive — vague cjue

**Date** : 2026-07-02T23:01:44.136Z
**Mode** : dry-run
**Documents** : 5
**URL fails** : 0

## Détail

| # | ID | Titre | URL | Size risk | Résultat |
|---:|---|---|---|---|---|
| 1 | cjeu-c-362-14-schrems-i | CJUE Schrems I (C-362/14) — Invalidation du Safe Harbor | HTTP 202 ✓ | low | (dry-run) |
| 2 | cjeu-c-673-17-planet49 | CJUE Planet49 (C-673/17) — Consentement précoché et cookies | HTTP 202 ✓ | low | (dry-run) |
| 3 | cjeu-c-40-17-fashion-id | CJUE Fashion ID (C-40/17) — Co-responsabilité boutons Like / | HTTP 202 ✓ | low | (dry-run) |
| 4 | cjeu-c-210-16-wirtschaftsakademie | CJUE Wirtschaftsakademie (C-210/16) — Co-responsabilité page | HTTP 202 ✓ | low | (dry-run) |
| 5 | cjeu-c-293-12-digital-rights-ireland | CJUE Digital Rights Ireland (C-293/12 + C-594/12) — Invalida | HTTP 202 ✓ | low | (dry-run) |

## Prochaines étapes

1. Vérifier les URL FAIL et corriger le manifeste
2. Relancer avec --execute après feu vert
3. Puis lancer cron-ingestion.ts pour créer les staging_chunks