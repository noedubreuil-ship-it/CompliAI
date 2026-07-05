# Rapport batch ingestion EDPB — 2026-07-02

## Contexte

Analyse du batch EDPB (9 documents `edpb_guideline`) présents dans `pending_documents` en production.

Ces documents sont des **EDPB Opinions Art.64** (avis sur projets de décisions d'autorités de contrôle nationales), détectés par le monitoring automatique. Ils sont différents des **11 textes P1 prioritaires** (EDPB Guidelines 03/2023 etc.) qui nécessitent les scripts de la branche 3.

---

## État actuel (2026-07-02)

| Status | Nombre | Détail |
|--------|-------:|-------|
| staged | 3 | Opinions 11, 13, 17 — 4 chunks chacune = **12 staging_chunks** |
| error  | 6 | Opinions 9, 10, 12, 16, 18, 19 |
| **Total** | **9** | — |

### Documents stagés (prêts pour validation admin)

Ces 3 documents ont des `staging_chunks` en attente de validation via `/dashboard/admin/rag-validation` :

- Opinion 11/2026 (Belgian SA) — `6d06b94d-7d21-4127-ad33-13c64b26746d`
- Opinion 13/2026 (Finnish Ombudsman) — `fe5149c2-6065-4769-989e-38e54b22901c`
- Opinion 17/2026 (Dutch SA) — `3719f35a-df75-4b72-a85f-497f4748f3c1`

**→ SIGNAL : ces 12 staging_chunks sont prêts pour validation dans le dashboard.**

---

## Bug : 6 documents en erreur (max_tokens)

### Cause racine

Le parseur Claude (`lib/rag-ingestion/parsers/base-parser.ts`) est limité à `max_tokens = 8192` en sortie (`RAG_INGESTION_MAX_TOKENS` dans `lib/rag-ingestion/parsers/types.ts`).

Pour les Opinions EDPB volumineuses (BCR — Binding Corporate Rules), le texte HTML de la page EDPB est long. La réponse JSON de Claude (incluant tous les chunks) dépasse 8192 tokens, tronquant le JSON mid-field :

```
Réponse Claude non parseable en JSON : {
  "regulation": "Opinion 19/2026...",
  "celex": null,
  "publication_date":   ← troncature ici
```

### Documents en erreur

- Opinion 9/2026 (Dutch SA) — `b1bd5045-1fd8-4c45-a385-6c42e9074150`
- Opinion 10/2026 (Dutch SA) — `77e6159b-3d91-4eab-9e1b-a4cbc6a07d76`
- Opinion 12/2026 (Spanish SA) — `14e4047f-c419-4455-91c3-221836bf5b4b`
- Opinion 16/2026 (Dutch SA) — `90fa60d1-7bba-4741-8266-addc924e05f9`
- Opinion 18/2026 (Dutch SA) — `b3a83b88-a44f-4392-a114-32411664b086`
- Opinion 19/2026 (Dutch SA) — `ac90f27e-cdca-4ca1-80d5-d937c85dc579`

### Fix requis (chantier dédié)

Dans `lib/rag-ingestion/parsers/types.ts` :
```typescript
// Avant
export const RAG_INGESTION_MAX_TOKENS = 8192 as const;

// Après (proposition)
export const RAG_INGESTION_MAX_TOKENS = 32768 as const;
```

Tester sur ces 6 documents après correction. Reset du status à `pending` (retry_count = 0) avant relance.

### Script de reset (à lancer APRÈS correction du max_tokens)

```sql
UPDATE pending_documents
SET status = 'pending', retry_count = 0, error_message = NULL, last_attempted_at = NULL
WHERE id IN (
  'b1bd5045-1fd8-4c45-a385-6c42e9074150',
  '77e6159b-3d91-4eab-9e1b-a4cbc6a07d76',
  '14e4047f-c419-4455-91c3-221836bf5b4b',
  '90fa60d1-7bba-4741-8266-addc924e05f9',
  'b3a83b88-a44f-4392-a114-32411664b086',
  'ac90f27e-cdca-4ca1-80d5-d937c85dc579'
);
```

---

## Ordre d'exécution recommandé

1. **Maintenant** : valider les 12 staging_chunks (3 Opinions stagées) via `/dashboard/admin/rag-validation`
2. **Chantier dédié** : augmenter `RAG_INGESTION_MAX_TOKENS` de 8192 → 32768, tester, documenter
3. **Après fix max_tokens** : reset status → pending pour les 6 docs en erreur, relancer pipeline

---

## Note sur les textes P1 EDPB

Les 11 textes P1 (EDPB Guidelines 03/2023 etc.) ne sont PAS dans `pending_documents` actuellement.
Ils nécessitent le script `scripts/ingest-p1-corpus.ts --execute` (branche 3).
4 URLs EDPB retournent 404 sur HEAD — à corriger dans le manifeste P1 (voir tâche spawned).
