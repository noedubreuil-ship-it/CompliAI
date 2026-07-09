# Cache Invalidation — Correctif cosine 0.85

**Date** : 2026-07-03  
**Chantier** : claude-code/aiact-parent-child-rechunk  
**Fichier modifié** : `scripts/rechunk-aiact.ts`

---

## Comportement actuel (avant fix)

```typescript
// scripts/rechunk-aiact.ts — lignes 670-681
const resp = await fetch(`${upstashUrl}/flushall`, {
  method: "POST",
  headers: { Authorization: `Bearer ${upstashToken}` },
});
```

`FLUSHALL` invalide **toutes** les entrées du cache sémantique Upstash, même celles sans rapport avec le rechunk AI Act. Sur un cache avec des requêtes RGPD, DSA, DMA, etc., cela cause une vague de cache misses inutile et une surcharge temporaire des appels Claude.

---

## Comportement attendu (après fix)

Utiliser `invalidateSemanticCache` depuis `lib/rag-production-indexer/cache-invalidator.ts` :
- Calcule la similarité cosinus entre chaque entrée du cache (`sc:emb:{sha}`) et les embeddings des chunks nouvellement insérés
- Invalide uniquement les entrées avec similarité ≥ 0.85
- Les requêtes sans rapport (autres règlements, autres sujets) restent en cache

---

## Fix appliqué

Remplacement dans `scripts/rechunk-aiact.ts` (section étape 10) :

```typescript
// AVANT
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
if (upstashUrl && upstashToken) {
  console.log("\n8. Invalidation cache sémantique Upstash...");
  try {
    const resp = await fetch(`${upstashUrl}/flushall`, {
      method: "POST",
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    console.log(`   Cache invalidé (HTTP ${resp.status})`);
  } catch (e) {
    console.warn(`   ⚠️  Invalidation cache échouée : ${(e as Error).message}`);
  }
}

// APRÈS
console.log("\n8. Invalidation cache sémantique Upstash (cosine 0.85)...");
const { invalidateSemanticCache } = await import("../lib/rag-production-indexer/cache-invalidator");
const embeddings = rowsWithEmb
  .filter((r) => r.embedding && r.embedding.length > 0)
  .map((r) => r.embedding as number[]);
const cacheResult = await invalidateSemanticCache(embeddings, 0.85);
if (cacheResult.cacheUnavailable) {
  console.log("   Cache Upstash non configuré — ignoré");
} else {
  console.log(`   Scannées : ${cacheResult.scanned} entrées | Invalidées : ${cacheResult.invalidated}`);
}
```

---

## Note sur le run production 2026-07-03

Le run production du 2026-07-03 (rechunk AI Act 1057 chunks) a utilisé l'ancien comportement `FLUSHALL`. Ce comportement est sur-agressif mais correct : toutes les entrées liées à l'AI Act sont bien invalidées (et aussi les autres, par excès). Le fix s'appliquera aux prochains runs.

---

## Tests de non-régression

1. **Si Upstash non configuré** : `cacheResult.cacheUnavailable = true` → log "ignoré", aucune erreur
2. **Cache vide** : `shas.length = 0` → `{ scanned: 0, invalidated: 0 }` → normal
3. **Cache peuplé** : seules les entrées avec cosine ≥ 0.85 avec un embedding AI Act sont invalidées
4. **Embeddings vides** : `invalidateSemanticCache([], 0.85)` retourne immédiatement `{ scanned: 0, invalidated: 0 }`

Exécuter après chaque rechunk :
```bash
npx tsx --env-file=.env.local scripts/rechunk-aiact.ts --dry-run
# Vérifier dans les logs : "Invalidées : N entrées" (N ≥ 0, pas d'erreur)
```
