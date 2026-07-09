# RAG_CLEANUP_DOUBLONS_2026-07-05

**Date** : 2026-07-05  
**Chantier** : 3 — Vérification nettoyage doublons apostrophes (migration 045)  
**Statut** : ✅ TERMINÉ

---

## Contexte

Le diagnostic du 2026-07-03 avait identifié 5 chunks dans `legal_chunks` avec une apostrophe typographique U+2019 (`'`) au lieu de l'apostrophe ASCII U+0027 (`'`) dans le champ `regulation`. Cela créait des doublons de regulation dans le corpus (3 regulations apparaissant sous deux orthographes distinctes).

Migration 045 appliquée en staging + production le 2026-07-03 : UPDATE des 5 chunks vers la valeur canonique.

---

## Vérification post-migration (2026-07-05)

### Requête 1 — Zéro apostrophe typographique restante

```sql
SELECT id FROM legal_chunks WHERE regulation LIKE '%' || chr(8217) || '%';
-- Résultat : 0 lignes ✅
```

**Résultat REST API** : `[]` — aucun chunk avec apostrophe U+2019 dans `legal_chunks`.

### Requête 2 — Les 5 chunks cibles vérifiés par UUID

| UUID (8 premiers) | Article | Apostrophe | Regulation |
|---|---|---|---|
| `337fbc95` | Art.152 | U+0027 ASCII ✅ | Traité sur le fonctionnement de l'Union Européenne (TFUE) |
| `7383c055` | Art.80 | U+0027 ASCII ✅ | Traité sur le fonctionnement de l'Union Européenne (TFUE) |
| `93e7ce0b` | Art.58 | U+0027 ASCII ✅ | Traité sur l'Union Européenne (TUE) |
| `dfc77335` | Art.20 | U+0027 ASCII ✅ | Charte des droits fondamentaux de l'Union Européenne (2016/C 202/02) |
| `fcafe3a9` | Art.292 | U+0027 ASCII ✅ | Traité sur le fonctionnement de l'Union Européenne (TFUE) |

**5/5 chunks corrigés — 0 anomalie.**

---

## Résultat

- ✅ **0 doublon de regulation** par apostrophe typographique
- ✅ **5/5 chunks** mis à jour vers la valeur canonique ASCII
- ✅ **Migration 045** validée en production

**Chantier 3 CLOS.**
