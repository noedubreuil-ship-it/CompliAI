# Audit 08 — Performance et Coûts

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — package.json, migrations, lib/pricing.ts, lib/ai/config.ts

---

## 8.1 Bundle Front-end

### Dépendances Lourdes Identifiées

| Package | Poids estimé | Impact |
|---|---|---|
| `three.js` (~600KB gzip) | Très lourd | Brain 3D graph — à lazy-loader |
| `react-force-graph-3d` | Lourd | Dépend de Three.js |
| `d3` (~500KB) | Lourd | Visualisations |
| `framer-motion` (~150KB) | Moyen | Animations landing |
| `@codemirror/*` (5 packages) | Moyen | Éditeur Markdown |
| `@react-pdf/renderer` | Moyen | PDF côté client |

**Risque :** Sans code splitting agressif, le bundle initial peut être très lourd. Three.js en particulier ne doit être chargé que sur `/dashboard/brain`.

---

## 8.2 Performance Base de Données

### Requêtes Potentiellement Lentes

| Requête | Risque |
|---|---|
| `search_legal_chunks_hybrid` avec `ef_search=1000` | Latence augmentée vs ef_search par défaut (40) — nécessite benchmarking |
| Scan `monitoring_sources` sans filtre `active=true` | Petit table — risque faible |
| `ai_interaction_logs` sur longues périodes | Table volumineuse avec index sur migration 028 |
| Requêtes `legal_chunks` sans index sur `regulation` | Full scan sur colonne non indexée |

### HNSW ef_search=1000

Migration 049 force `hnsw.ef_search=1000` dans la fonction de recherche. L'index HNSW a `ef_construction=64` et `m=16`. Avec ef_search=1000 >> ef_construction=64, PostgreSQL scan plus de voisins que nécessaire. Latence estimée : 200-500ms vs 50-100ms avec ef_search=64. À mesurer en production.

---

## 8.3 Modèle de Crédits

### Plans et Allocations

```typescript
// lib/pricing.ts
haiku:  apiId = "claude-haiku-4-5-20251001"
sonnet: apiId = "claude-sonnet-4-5"
opus:   apiId = "claude-opus-4-5"

// Crédits par 1K tokens
haiku:  0.5 cr/K input, 2.5 cr/K output
sonnet: 2 cr/K input, 10 cr/K output
opus:   10 cr/K input, 50 cr/K output
```

**Plan Free :** Crédits limités, pas d'accès aux outils premium.  
**Plan Starter (49€/mois) :** Crédits mensuels + achat de packs.  
**Plans Pro/Enterprise :** Modèles premium + Opus disponible.

### Coûts Réels Anthropic (référence API 2026)

| Modèle | Input | Output | 1 session consultant typique |
|---|---|---|---|
| claude-sonnet-4-5 | ~$3/M tokens | ~$15/M tokens | ~$0.05-0.15 |
| claude-sonnet-4-6 (parsing) | ~$3/M tokens | ~$15/M tokens | ~$0.10-0.50/doc |
| claude-haiku-4-5 | ~$0.25/M tokens | ~$1.25/M tokens | ~$0.005 |

### Coûts Embeddings OpenAI

| Modèle | Coût |
|---|---|
| text-embedding-3-small | ~$0.02/M tokens |

---

## 8.4 Projections de Coûts par Palier Utilisateurs

Hypothèses :
- Utilisateur actif moyen : 20 sessions consultant/mois, 5 documents générés/mois
- Corpus RAG : ~50K chunks (embedding à l'ingestion uniquement)
- Monitoring : ~100 documents/mois ingérés

### Estimation Mensuelle (ordres de grandeur)

| Service | 100 users | 500 users | 1000 users | 5000 users |
|---|---|---|---|---|
| Anthropic (chat) | ~$30 | ~$150 | ~$300 | ~$1 500 |
| Anthropic (parsing RAG) | ~$10 | ~$20 | ~$40 | ~$200 |
| OpenAI (embeddings) | ~$1 | ~$3 | ~$5 | ~$25 |
| Supabase (DB + vector) | ~$25 | ~$100 | ~$200 | ~$800 |
| Vercel (hosting) | ~$20 | ~$50 | ~$100 | ~$400 |
| Upstash Redis | ~$5 | ~$10 | ~$20 | ~$80 |
| Resend (email) | ~$5 | ~$10 | ~$20 | ~$80 |
| **Total infra** | **~$96** | **~$343** | **~$685** | **~$3 085** |

**Revenus à 49€/mois (100% Starter) :**  
- 100 users → €4 900/mois (marge ~$4 700)  
- 500 users → €24 500/mois (marge ~$24 000)  
- 1000 users → €49 000/mois

**Unit economics :** Très favorables. La marge brute est > 90% à tous les paliers.

---

## 8.5 Cache Sémantique — Impact sur les Coûts

Le cache sémantique (Upstash, cosine > 0.95, TTL 24h) permet d'éviter les appels Claude sur les questions répétées. Avec 500 utilisateurs actifs partageant des questions similaires (conformité UE = corpus de questions convergent), le cache peut réduire les coûts Anthropic de 20-40%.

---

## 8.6 Optimisations Identifiées

| Optimisation | Impact | Effort |
|---|---|---|
| Lazy-loader Three.js / react-force-graph-3d | Réduction First Load JS | S |
| Index B-tree sur `legal_chunks.regulation` | Réduction latence requêtes hybrides | S |
| Ajuster ef_search selon le type de query (pas toujours 1000) | Réduction latence RAG | M |
| Code splitting agressif pour les outils PDF | Réduction bundle | S |
| Monitoring des coûts par outil (ai_interaction_logs) | Visibilité coûts | S — déjà partiellement implémenté |

---

## 8.7 Rate Limiting et Protection Anti-Abus

```typescript
// lib/ai/config.ts
AI_RATE_LIMITS = {
  perUserPerHour: 50,
  freeTierPerHour: 10,
}
```

Les routes `/api/generate/*` n'ont pas de rate limit HTTP — seulement le débit crédits. Un utilisateur avec beaucoup de crédits peut saturer l'API Anthropic. Le modèle crédits protège partiellement via `preflightCheck`.

---

## 8.8 Streaming

Le streaming Claude via `streamClaude()` améliore la perception de performance (Time to First Token). L'implémentation SSE est correcte pour Vercel Edge/Node.

---

## 8.9 Conclusion Performance

**Points forts :**
- Cache sémantique Upstash pour le chat
- Recherche hybride vectorielle + BM25 optimisée (migration 049)
- Modèle de crédits qui limite naturellement les abus
- Unit economics très sains (>90% marge brute)

**Points d'amélioration :**
- ef_search=1000 peut être coûteux en latence — benchmarker
- Bundle front-end potentiellement lourd (Three.js, D3)
- Absence d'index sur `legal_chunks.regulation`
- Rate limit HTTP absent sur les routes de génération
