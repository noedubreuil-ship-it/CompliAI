# Spécification — Chantier Audit d'Intégrité Corpus RAG

**Date de création** : 2026-07-03  
**Branche cible** : `claude-code/corpus-integrity-audit`  
**Statut** : EN ATTENTE — à lancer après fin ingestion massive P1+P2+P3 ET re-chunking règlements existants  
**Prérequis** : `claude-code/corpus-mass-edpb`, `claude-code/corpus-mass-cjue`, `claude-code/corpus-mass-regulations`, `claude-code/rechunk-existing-corpus` terminés et validés en production

---

## Objectif

Audit d'intégrité article par article, annexe par annexe, considérant par considérant pour l'ensemble du corpus juridique en production. Lecture seule sur la production. Aucune modification pendant l'audit.

---

## Périmètre

### Règlements et directives UE (existants + ingestion massive)

| Texte | Réf. | Articles attendus | Annexes | Considérants | Méthode audit |
|---|---|---:|---:|---:|---|
| AI Act | UE 2024/1689 | 113 | 13 | 180 | Requête legal_chunks par article_number |
| RGPD | UE 2016/679 | 99 | 4 | 173 | Requête legal_chunks par article_number |
| DSA | UE 2022/2065 | 93 | 1 | 150 | Requête legal_chunks |
| DMA | UE 2022/1925 | 54 | 1 | 100 | Requête legal_chunks |
| Data Act | UE 2023/2854 | 50 | 1 | 117 | Requête legal_chunks |
| NIS2 | UE 2022/2555 | 46 | 11 | 145 | Requête legal_chunks |
| DSM | UE 2019/790 | 32 | 0 | 86 | Requête legal_chunks |
| DGA | UE 2022/868 | 46 | 0 | 72 | Requête legal_chunks |
| CRA | UE 2024/2847 | 71 | 6 | 122 | Requête legal_chunks |
| Machines | UE 2023/1230 | 58 | 9 | 111 | Requête legal_chunks |
| eIDAS 2 | UE 2024/1183 | 107 | 5 | 108 | Requête legal_chunks |
| ePrivacy | Dir 2002/58/CE | 22 | 0 | 68 | Requête legal_chunks |
| DORA | UE 2022/2554 | 64 | 1 | 102 | Requête legal_chunks |
| LED | UE 2016/680 | 72 | 5 | 107 | Requête legal_chunks |
| Règlement 2018/1725 | UE 2018/1725 | 100 | 4 | 170 | Requête legal_chunks |
| P2B | UE 2019/1150 | 22 | 0 | 55 | Requête legal_chunks |
| Product Liability | UE 2024/2853 | 28 | 1 | 80 | Requête legal_chunks |
| Cybersecurity Act | UE 2019/881 | 67 | 0 | 103 | Requête legal_chunks |
| DCD | UE 2019/770 | 24 | 0 | 86 | Requête legal_chunks |
| EHDS | UE 2025/327 | 103 | 13 | 150 | Requête legal_chunks |
| GPSR | UE 2023/988 | 51 | 2 | 130 | Requête legal_chunks |
| CSDDD | UE 2024/1760 | 37 | 0 | 82 | Requête legal_chunks |
| MiCA | UE 2023/1114 | 149 | 0 | 226 | Requête legal_chunks |
| CSRD | UE 2022/2464 | 54 | 0 | 95 | Requête legal_chunks |
| SVG | UE 2019/771 | 26 | 0 | 69 | Requête legal_chunks |
| Géoblocage | UE 2018/302 | 14 | 0 | 42 | Requête legal_chunks |
| TCO | UE 2021/784 | 23 | 0 | 50 | Requête legal_chunks |
| SMA | UE 2018/1808 | 25 | 0 | 66 | Requête legal_chunks |
| Accessibilité | UE 2019/882 | 35 | 0 | 110 | Requête legal_chunks |
| Open Data | UE 2019/1024 | 23 | 0 | 72 | Requête legal_chunks |
| Platform Work | UE 2024/2831 | 31 | 0 | 75 | Requête legal_chunks |

### Traités primaires UE

| Texte | Articles | Note |
|---|---:|---|
| TFUE | 358 + protocoles | Corpus actuel — à vérifier si présent |
| TUE | 55 + protocoles | Corpus actuel — à vérifier si présent |
| Charte droits fondamentaux | 54 | Corpus actuel — à vérifier si présent |
| CEDH | 59 + 16 protocoles | À vérifier |

### Textes EDPB

Pour chaque guideline/opinion en production : vérifier qu'aucune section n'est manquante (en comparant nombre de chunks au nombre de sections attendues dans la table des matières officielle).

### Jurisprudence CJUE

Pour chaque arrêt en production : vérifier présence du dispositif, des motifs complets, des questions préjudicielles si C-../ renvoi.

---

## Méthodologie d'exécution

### Phase 1 — Inventaire production

```sql
-- 1a. Compter les chunks par article_number et granularity
SELECT regulation, article_number, granularity, COUNT(*) as chunks
FROM legal_chunks
GROUP BY regulation, article_number, granularity
ORDER BY regulation, article_number;

-- 1b. Vérification embeddings manquants (AJOUT — bug silencieux critique)
-- Un chunk sans embedding est invisible à la recherche vectorielle
SELECT regulation,
       COUNT(*) as total_chunks,
       COUNT(embedding) as chunks_with_embedding,
       COUNT(*) - COUNT(embedding) as missing_embedding_count,
       array_agg(DISTINCT article_number) FILTER (WHERE embedding IS NULL) as articles_missing_embedding
FROM legal_chunks
GROUP BY regulation
HAVING COUNT(*) - COUNT(embedding) > 0;
```

Tout chunk avec `embedding IS NULL` doit être signalé en **P0** — il est présent en base mais totalement invisible au retrieval vectoriel. C'est un bug silencieux : le contenu existe, aucune erreur n'est levée, mais les questions sur cet article retournent silence.

### Phase 2 — Comparaison avec structure officielle

Pour chaque règlement :
1. Interroger Supabase (lecture seule) via Supabase MCP
2. Récupérer la liste des `article_number` distincts présents
3. Comparer avec la liste attendue (hardcodée dans `scripts/audit/expected-corpus.ts`)
4. Identifier les numéros manquants, les articles sans paragraphes, les articles sans `article` parent

### Phase 3 — Analyse qualité chunking

Pour chaque article présent :
- Vérifier qu'il existe au moins 1 chunk `granularity=article` (parent)
- Vérifier qu'il existe au moins 1 chunk `granularity=paragraph` ou `granularity=point` (enfants)
- Signaler les articles avec seulement 1 chunk total (suspects d'agrégation)
- Signaler les articles avec `embedding IS NULL` (invisibles à la recherche vectorielle)

### Phase 4 — Rapport

Générer `RAG_CORPUS_INTEGRITY_AUDIT_2026-XX-XX.md` avec les 5 sections (voir livrable).

### Phase 5 — Vérification cache Upstash (AJOUT)

Après l'audit des chunks, vérifier l'état du cache sémantique Upstash :

```typescript
// Via lib/rag-production-indexer/cache-invalidator.ts
const shas = await redisSmembers(redis, "sc:idx");
// Compter les entrées cache
// Récupérer sc:emb:{sha} pour chaque sha → extraire cached_at
// Comparer cached_at avec la date du dernier rechunk en production
// Signaler les entrées antérieures au dernier rechunk → potentiellement obsolètes
```

Métriques à produire :
- Nombre total d'entrées en cache
- Entrées antérieures au dernier rechunk production (date : 2026-07-03 pour AI Act)
- Entrées potentiellement obsolètes (générées avant rechunk → peuvent masquer de nouveaux résultats)
- Recommandation : invalidation ciblée cosine 0.85 ou flush sélectif par regulation

Si des entrées obsolètes sont détectées, **ne pas invalider pendant l'audit** — documenter uniquement. L'invalidation sera effectuée dans un chantier dédié après validation utilisateur.

---

## Script d'audit (à créer sur la branche)

```
scripts/audit/corpus-integrity-audit.ts
```

Architecture :
- Mode lecture seule (Supabase MCP ou client JS en lecture)
- Pas d'appels API Anthropic pendant l'audit
- Structure officielle attendue : fichier de données `scripts/audit/expected-corpus.ts`
- Rapport Markdown généré automatiquement

---

## Règles strictes

- **Lecture seule** sur la production
- **Aucune re-ingestion** pendant l'audit
- **Sonnet 4.6** si analyse IA nécessaire (non prévu — audit purement mécanique)
- **Documentation exhaustive** — signaler même les anomalies mineures
- **Aucun raccourci** — si un texte est incomplet, le signaler

---

## Ordre d'exécution dans la roadmap

```
[1] Ingestion massive P1+P2+P3 (3 vagues) → staging + validation admin + production
[2] Re-chunking règlements existants (claude-code/rechunk-existing-corpus)
[3] ← ICI → Audit intégrité (claude-code/corpus-integrity-audit)
[4] Diagnostic tuning retrieval hybride (claude-code/retrieval-tuning-hybrid)
[5] Activation crons GitHub Actions
[6] Rapport final consolidé
```

---

## Livrable final

`RAG_CORPUS_INTEGRITY_AUDIT_2026-XX-XX.md` avec :
- Section 1 : Résumé exécutif (nb textes complets / incomplets / articles manquants)
- Section 2 : Détail par texte (COMPLET / INCOMPLET / STRUCTURE DÉFAILLANTE)
- Section 3 : Priorisation P0 / P1 / P2 / INFO
- Section 4 : Chantiers de correction proposés avec coût API et timing
- Section 5 : **Recommandation déploiement** (voir ci-dessous)

Validation utilisateur obligatoire avant lancement de tout chantier de correction.

---

## Section 5 — Recommandation déploiement (template)

### Verdict global

```
CORPUS PRÊT POUR LA PRODUCTION : [OUI / NON / CONDITIONNEL]
```

Trois niveaux possibles :
- **OUI** — aucun blocant P0, couverture ≥ 95% sur AI Act + RGPD (les 2 règlements cœur du produit)
- **NON** — blocants P0 présents (embeddings manquants, articles core absents) ou couverture < 80% sur AI Act/RGPD
- **CONDITIONNEL** — aucun P0, mais lacunes P1 documentées. Déploiement possible avec message de limitation utilisateur

### Actions correctives obligatoires avant déploiement commercial

Listées sous forme de checklist. Exemple :

```
- [ ] P0 — Re-embeddeder les chunks AI Act Articles 5/6/13 (embedding NULL)
- [ ] P0 — Réingérer DSA Articles 34-43 manquants
- [ ] P1 — Compléter EDPB Guidelines 01/2022 sections 3.2 et 3.3
```

Seules les actions P0 sont bloquantes. Les P1/P2 peuvent être lancés post-déploiement.

### Métriques de couverture par règlement

| Règlement | Articles présents | Articles attendus | Couverture | Chunks avec embedding | Statut |
|---|---:|---:|---:|---:|---|
| AI Act | - | 113 | -% | -% | - |
| RGPD | - | 99 | -% | -% | - |
| DSA | - | 93 | -% | -% | - |
| DMA | - | 54 | -% | -% | - |
| ... | | | | | |

Seuils d'alerte :
- **Couverture articles < 80%** → P1 (à corriger en priorité post-audit)
- **Couverture articles < 60%** → P0 (bloquant)
- **Embeddings manquants > 0** → P0 automatique
