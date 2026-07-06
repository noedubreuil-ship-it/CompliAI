# RAG — Fix doublon eIDAS 2 — 2026-07-06

## Contexte

Deux entrées coexistaient dans `legal_chunks` pour le règlement eIDAS 2 :

| Regulation | Chunks | Statut |
|---|---|---|
| `eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)` | 692 | ✅ Nouveau (rechunk parent-child) |
| `eIDAS 2 — Identité numérique européenne (UE 2024/1183)` | 19 | ❌ Ancien (paragraph plat) |

Le doublon résulte d'une divergence de nom de règlement entre l'ancien corpus (ingestion initiale) et le rechunk parent-child.

## Action effectuée

**Script** : `scripts/fix-eidas2-doublon.ts`
**Date** : 2026-07-06

### Étapes
1. Dry-run validé : 19 chunks `paragraph` identifiés
2. Archivage des 19 chunks dans `historical_chunks` (`archive_reason = 'superseded'`)
3. Suppression des 19 chunks de `legal_chunks`
4. Vérification : 0 chunk restant pour l'ancien nom

### Résultat post-fix

```
Ancien eIDAS 2 restant : 0 chunks ✅
Nouvel eIDAS 2 en production : 692 chunks ✅
```

## État post-fix eIDAS 2 en production

| Granularité | Chunks |
|---|---|
| `article` | ~113 |
| `paragraph` | ~370 |
| `point` | ~209 |
| `parent_chunk_id ≠ null` | 602 |

---

*Rapport généré le 2026-07-06 — branche `claude-code/rechunk-reglements-p1` [via claude-code]*
