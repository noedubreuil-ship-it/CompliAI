# Section 8 — Performance et Coûts

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 8.1 Modèles IA et coûts unitaires

Données extraites de `lib/pricing.ts` et `lib/ai/config.ts` :

| Modèle | API ID | Crédits/1K input | Crédits/1K output | Max tokens |
|---|---|---|---|---|
| Haiku | claude-haiku-4-5-20251001 | 0.5 | 2.5 | 4 096 |
| Sonnet | claude-sonnet-4-5 | 2 | 10 | 8 192 |
| Opus | claude-opus-4-5 | 10 | 50 | 4 096 |

Note : le parsing RAG ingestion utilise `claude-sonnet-4-6` (CLAUDE.md impose Sonnet 4.6 exclusivement pour le corpus).

**Coût typique d'une question consultant :**
- Tokens typiques : ~8 000 input (contexte RAG + historique) / ~1 500 output
- Crédits : ~16 input + ~15 output = ~31 crédits (plan Sonnet)
- Coût Anthropic réel : ~$0.024 input + ~$0.015 output = **~$0.04 par question**

**Coût ingestion (session 2026-07-08 mesurée) :**
- 20 documents : 610 926 tokens input / 30 889 tokens output
- Coût estimé Anthropic : ~$1.83 input + ~$0.46 output = **~$2.30 pour 20 documents**

---

## 8.2 Plans tarifaires

| Plan | Crédits/mois | Prix (estimé) | Rate limit |
|---|---|---|---|
| Free | 400 | 0€ | 10 req/min |
| Starter | 4 500 | 49€/mois | 20 req/min |
| Pro | 18 000 | À VÉRIFIER | 30 req/min |
| Enterprise | 60 000 | À VÉRIFIER | 60 req/min |

Note : seul le plan Starter à 49€/mois est mentionné dans le CLAUDE.md. Les prix Pro et Enterprise ne sont pas dans les fichiers lus.

---

## 8.3 Projection coûts infrastructure

Hypothèses : 500 utilisateurs actifs, 20 questions/utilisateur/mois = 10 000 questions/mois.

| Service | Base actuelle | 100 users | 500 users | 1 000 users | 5 000 users |
|---|---|---|---|---|---|
| **Anthropic (Claude)** | ~$40/mois | ~$80 | ~$400 | ~$800 | ~$4 000 |
| **OpenAI (embeddings)** | ~$5/mois | ~$10 | ~$30 | ~$60 | ~$300 |
| **Supabase** | ~$25/mois (Pro) | ~$25 | ~$50 | ~$100 | ~$400 |
| **Vercel** | ~$20/mois | ~$20 | ~$50 | ~$100 | ~$400 |
| **Upstash Redis** | ~$0 (free tier) | ~$0 | ~$10 | ~$25 | ~$100 |
| **Stripe** | 0.5% MRR | ~$25 | ~$125 | ~$250 | ~$1 250 |
| **Resend (emails)** | ~$0 (free tier) | ~$0 | ~$10 | ~$20 | ~$100 |
| **TOTAL** | **~$90/mois** | **~$160** | **~$675** | **~$1 355** | **~$6 550** |

**Revenus projetés (plan Starter 49€) :**
| Users | MRR | Coûts | Marge brute |
|---|---|---|---|
| 100 | 4 900€ | ~160€ | **97%** |
| 500 | 24 500€ | ~675€ | **97%** |
| 1 000 | 49 000€ | ~1 355€ | **97%** |
| 5 000 | 245 000€ | ~6 550€ | **97%** |

Unit economics excellents. La marge brute reste >95% même à grande échelle.

---

## 8.4 Performance requêtes

### Routes potentiellement lentes

| Route | Raison | Impact |
|---|---|---|
| `/api/chat` | Appel Claude + RAG hybride + second pass DB | Streaming atténue l'impact |
| `/api/generate/dpia` | Génération longue (8 192 tokens output) | Streaming SSE |
| `/api/generate/comparateur` | Comparaison 27 États membres | À mesurer |
| `/api/journal` | 1 326 lignes de logique, requêtes DB complexes | À instrumenter |

### Requêtes SQL potentiellement lentes

- Recherche hybride `search_legal_chunks_hybrid` : HNSW ef_search=1000 → ~50-200ms (acceptable)
- Requêtes sur `pending_documents` sans index sur `status` : À VÉRIFIER
- `monitoring_log` sans index sur `source_id` + `executed_at` : À VÉRIFIER

---

## 8.5 Bundles JavaScript

Build Next.js disponible dans l'output précédent :
- First Load JS shared : **87.7 kB** (raisonnable)
- Middleware : **78.1 kB**
- Pages les plus lourdes : dashboard/chat (~160 kB), dashboard/jurisprudence (~115 kB), dashboard/comparateur (~115 kB)

Pas d'images non optimisées détectées (Next.js `<Image>` utilisé). Remote patterns configurés pour Wikimedia et Unsplash.

---

## 8.6 Score

**73/100** — Unit economics excellents (marge >97%), streaming SSE sur toutes les routes IA, bundles JS raisonnables. Déductions : coût ingestion élevé ($2.30/20 docs), pas d'instrumentation APM sur les routes lentes, index SQL potentiellement manquants.
