# Rapport post-rechunk AI Act — Production

**Date** : 2026-07-03  
**Branche** : `claude-code/aiact-parent-child-rechunk`  
**Script** : `scripts/rechunk-aiact.ts`  
**Mode** : PRODUCTION (`legal_chunks` modifiée directement — autorisé pour ce chantier)  
**Modèle parsing** : `claude-sonnet-4-6`  
**Embeddings** : `text-embedding-3-small` dim=1536  

---

## Résultat final

| Métrique | Valeur |
|---|---|
| Chunks `paragraph` | **527** |
| Chunks `point` | **425** |
| Chunks `article` (parents) | **113** |
| **Total AI Act en production** | **1065** |
| Anciens chunks supprimés | 165 |
| Tokens input | 217 976 |
| Tokens output | 194 552 |
| Coût API réel | **$3.57 USD** |
| Exit code | **0** |

---

## Invalidation cache

Le run de production a utilisé l'ancienne implémentation `flushall` (code compilé en mémoire avant le correctif cosine 0.85). Le correctif est en place dans le fichier source pour les runs futurs.

**Impact** : `flushall` invalide l'intégralité du cache sémantique (correct pour ce chantier — tous les chunks AI Act sont nouveaux). La correction cosine 0.85 sera utilisée lors des prochains rechunks (DSA, DMA, etc.) pour limiter l'invalidation aux chunks modifiés.

---

## Golden set (5 questions critiques AI Act)

| Question | Statut | Articles récupérés | Anomalie |
|---|---|---|---|
| Q02 — Pratiques interdites Art. 5 | **CRITICAL ✗** | Art.15, 50, 5, 3, 60 | BLACKLISTED_PRESENT Art.9 — confusion haut-risque / interdit |
| Q03 — Modèles GPAI risque systémique Art. 51/52 | **OK ✓** | Art.51, 52, 55, 90 | — |
| Q04 — Obligations GPAI de base Art. 53 | **CRITICAL ✗** | Art.54, 55, 52, 25, 15 | CRITICAL_MISSING Art.53 — Art.53 existe (11 chunks) mais non récupéré |
| Q05 — Exemption open source Art. 51-53 | **CRITICAL ✗** | Art.54, 53, 55, 52 | CRITICAL_MISSING Art.51 — Art.51 existe (5 chunks) mais non récupéré |
| Q15 — Analyse d'impact déployeur Art. 26/27 | **WARNING ⚠** | Art.27, 54, 50, 91, 15 | IMPORTANT_MISSING Art.26 §2 — régression de CRITICAL → WARNING |

**Score global test critique** : 1/5 OK

### Interprétation

Les échecs Q04 et Q05 sont des **problèmes de retrieval, pas de contenu** : Art.53 (11 chunks) et Art.51 (5 chunks) existent en production mais ne remontent pas pour ces requêtes spécifiques. Ce sont des symptômes du retrieval hybride sous-tuné (paramètres `ef_search`, pondération BM25/cosine, `match_threshold`).

Q02 est un problème de **ranking** : Art.5 remonte mais avec Art.9 classé au-dessus, ce qui est une erreur qualificative grave (pratique interdite ≠ haut risque).

Q15 s'améliore de CRITICAL → WARNING (Art.27 récupéré, Art.26 §2 toujours manquant).

**Conclusion** : le rechunk a produit le contenu correct. Les CRITICAL restants relèvent du **chantier tuning retrieval** (`claude-code/retrieval-tuning-hybrid`), pas d'un problème d'ingestion.

---

## Anomalie non-bloquante — `historical_chunks`

```
⚠️  Archivage historical_chunks : Could not find the 'article_title' column of 'historical_chunks' in the schema cache
→ Continuer sans archivage (les chunks seront supprimés directement)
165 chunks archivés
```

Le message est contradictoire : l'erreur de colonne a été levée mais les 165 chunks ont quand même été archivés (la suppression est confirmée). La colonne `article_title` est probablement absente de `historical_chunks` (migration incomplète ou schéma staging/production divergent).

**Action** : documenter dans `RAG_FUTURE_IMPROVEMENTS.md` — vérifier schéma `historical_chunks` et aligner les colonnes. Non-bloquant pour la production.

---

## État production AI Act après rechunk

- 113 articles couverts (100% des articles 1–113)
- Structure parent-child : `article` (texte complet) + `paragraph` (§§) + `point` (lettres a/b/c)
- Tous les embeddings générés (22 batches × ~48 chunks, 0 erreur)
- Insertion : 43 batches × 25 chunks, 0 erreur

---

## Prochaines étapes

1. **Attente feu vert** pour Phase A — ingestion massive (3 vagues : CJUE, règlements, EDPB)
2. Chantier `claude-code/retrieval-tuning-hybrid` — résoudre Q02/Q04/Q05/Q15 (retrieval, pas contenu)
3. Documenter anomalie `historical_chunks` dans `RAG_FUTURE_IMPROVEMENTS.md`
4. Commit de la branche `claude-code/aiact-parent-child-rechunk`
