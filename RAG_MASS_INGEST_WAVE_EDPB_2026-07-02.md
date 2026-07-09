# Rapport ingestion massive — vague edpb

**Date** : 2026-07-02T23:04:29.256Z
**Mode** : dry-run
**Documents** : 1
**URL fails** : 1

## Détail

| # | ID | Titre | URL | Size risk | Résultat |
|---:|---|---|---|---|---|
| 1 | edpb-statement-04-2024-ai-models | EDPB Statement 04/2024 — Modèles d'IA et données personnelle | FAIL 404 ✗ | low | (dry-run) |

## Prochaines étapes

1. Vérifier les URL FAIL et corriger le manifeste
2. Relancer avec --execute après feu vert
3. Puis lancer cron-ingestion.ts pour créer les staging_chunks