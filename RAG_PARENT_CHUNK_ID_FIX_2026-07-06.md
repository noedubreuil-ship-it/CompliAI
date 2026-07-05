# RAG — Fix parent_chunk_id — 2026-07-06

## Contexte

Rapport technique sur la Dette B identifiée le 2026-07-05 : la colonne `parent_chunk_id`
ajoutée sur `legal_chunks` (migration 046) restait NULL pour 7411/7411 chunks en production.

---

## 1. Diagnostic — Cause racine

### Flux de promotion staging → production

Lors de la promotion d'un document, l'indexer (`lib/rag-production-indexer/indexer.ts`) insère
chaque `staging_chunk` comme une nouvelle ligne dans `legal_chunks`. Postgres attribue un
**nouveau UUID** à chaque ligne insérée.

### Le problème UUID mismatch

Dans les `staging_chunks`, les chunks enfants (paragraph, point) ont :
```
parent_chunk_id = <UUID du chunk article parent dans staging_chunks>
```

Après promotion, le chunk article parent reçoit un **nouveau UUID** dans `legal_chunks`.
L'UUID staging n'existe pas dans `legal_chunks`. La FK auto-référentielle
`legal_chunks_parent_chunk_id_fkey` aurait rejeté la valeur → l'indexer forçait `null`.

### État observé (2026-07-05)
```
legal_chunks total        : 7411
parent_chunk_id = NULL    : 7411 (100%)
```

### Regulations affectées
Seul l'AI Act (UE 2024/1689) dispose de chunks `granularity='article'` comme parents potentiels
(113 articles + 193 annexes/considérants). Les autres regulations (RGPD, eIDAS 2, etc.) avaient
été ingérées avant le rechunking parent-child et n'ont pas de chunks article : leur
`missing_parent` est attendu à 0 par construction (pas de chunks paragraph/point sans parent
article correspondant).

---

## 2. Fix — Deux composantes

### 2A. Backfill SQL (migration 047)

Pour les chunks déjà en production, un UPDATE SQL résout la hiérarchie par identité sémantique :

```sql
UPDATE legal_chunks child
SET parent_chunk_id = parent.id
FROM legal_chunks parent
WHERE parent.granularity = 'article'
  AND parent.regulation = child.regulation
  AND parent.article_number = child.article_number
  AND parent.language = child.language
  AND child.granularity IN ('paragraph', 'point')
  AND child.parent_chunk_id IS NULL;
```

**Attendu :** ~694 chunks AI Act (527 paragraph + 167 point) liés à leurs 113 articles.

**Fichier :** `supabase/migrations/047_backfill_parent_chunk_id.sql`

**À exécuter** dans Supabase SQL Editor (production), puis vérifier :
```sql
SELECT regulation, granularity,
       COUNT(*) AS total,
       COUNT(parent_chunk_id) AS with_parent,
       COUNT(*) - COUNT(parent_chunk_id) AS missing_parent
FROM legal_chunks
WHERE granularity IN ('paragraph', 'point')
GROUP BY regulation, granularity
ORDER BY regulation, granularity;
```

### 2B. Fix indexer two-pass (lib/rag-production-indexer/)

Pour toutes les promotions futures, le pipeline résout maintenant la hiérarchie en temps réel :

**`types.ts`** — ChunkOutcome enrichi :
```typescript
| { status: "inserted"; ...; legalChunkId?: string; stagingChunkId?: string }
| { status: "updated";  ...; legalChunkId?: string; stagingChunkId?: string }
```

**`indexer.ts`** — Insert avec `.select('id').single()` pour capturer le nouveau UUID.
Le `parent_chunk_id` est maintenant écrit depuis `stagingChunk.parent_chunk_id` (résolu
par le pipeline) au lieu de `null` systématique.

**`pipeline.ts`** — Logique two-pass dans `indexDocument()` :
```typescript
// Pass 1 : chunks granularity='article' (parents)
// Pass 2 : tous les autres (paragraph, point, annexe, considerant)
const articleChunks = chunks.filter(c => c.granularity === 'article');
const childChunks   = chunks.filter(c => c.granularity !== 'article');
const orderedChunks = [...articleChunks, ...childChunks];

// Map staging UUID → legal UUID, alimentée pendant le pass 1
const stagingToLegal = new Map<string, string>();

// Pour chaque chunk enfant, résoudre le parent_chunk_id avant upsert :
const resolvedParentId = chunk.parent_chunk_id
  ? stagingToLegal.get(chunk.parent_chunk_id) ?? null
  : null;
```

---

## 3. Validation requise

### Étape A — Exécuter la migration 047 en production
1. Ouvrir Supabase SQL Editor (production)
2. Copier le contenu de `supabase/migrations/047_backfill_parent_chunk_id.sql`
3. Exécuter le UPDATE
4. Exécuter la requête de vérification
5. Confirmer `missing_parent = 0` pour AI Act

### Étape B — Confirmer le résultat ici
Livrer le résultat de la requête de vérification pour clore la Dette B.

---

## 4. Impact sur les prochains chantiers

Le fix two-pass est actif dès maintenant pour :
- Chantier 2 ePrivacy (rechunk + staging → production)
- Chantier 6 (DSA, DMA, NIS2, CRA, Data Act, DSM, DGA, Machines)
- Toutes promotions futures

**Note :** Les chunks `granularity='annexe'` et `'considerant'` n'ont pas de parent article
dans le modèle actuel → leur `parent_chunk_id` reste NULL. C'est correct.

---

## 5. État post-fix

| Composante | Statut |
|---|---|
| Migration 047 SQL écrite | ✅ |
| Migration 047 exécutée production | ⏳ En attente utilisateur |
| Indexer two-pass codé | ✅ |
| Types enrichis (legalChunkId) | ✅ |
| Backfill vérifié (0 missing_parent) | ⏳ En attente exécution SQL |
| Branche commitée | ✅ |

---

*Rapport généré le 2026-07-06 — branche `claude-code/fix-parent-chunk-id` [via claude-code]*
