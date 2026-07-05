# RAG — Chantier 2 ePrivacy — Staging 2026-07-06

## Résumé

Rechunking parent-child de la Directive ePrivacy (2002/58/CE) en staging.

| Paramètre | Valeur |
|---|---|
| Regulation | Directive ePrivacy (UE 2002/58/CE) — communications électroniques & cookies |
| CELEX | 32002L0058 |
| Document ID staging | `549f511a-3d24-4afc-9964-202024683f1f` |
| Date | 2026-07-06 |
| Branche | `claude-code/eprivacy-rechunk` |

---

## Volumes staging

| Granularité | Nombre |
|---|---|
| `considerant` | 49 |
| `article` (parents) | 21 |
| `paragraph` | 55 |
| `point` | 9 |
| **Total** | **134** |

Note : les 21 chunks plats existants en production seront mis à jour (même identité
`regulation + article_number + language`) lors de la promotion. Les 49 considérants et
les enfants paragraph/point seront insérés comme nouveaux chunks.

---

## Structure

### Considérants (49)
- (1) à (49) — extraits directement du texte sans parsing Claude
- `granularity = 'considerant'`, `parent_chunk_id = null`

### Articles (21 parents + 64 enfants)
Parsés avec Claude Sonnet 4.6, temperature 0.

| Article | Titre | § | Pts |
|---|---|---|---|
| 1 | Champ d'application et objectif | 3 | 0 |
| 2 | Définitions | 1 | 8 |
| 3 | Services concernés | 3 | 0 |
| 4 | Sécurité | 2 | 0 |
| 5 | Confidentialité des communications | 3 | 0 |
| 6 | Données relatives au trafic | 6 | 0 |
| 7 | Facturation détaillée | 2 | 0 |
| 8 | Présentation et restriction de l'identification | 6 | 0 |
| 9 | Données de localisation | 3 | 0 |
| 10 | Dérogations | 1 | 2 |
| 11 | Renvoi automatique d'appel | 1 | 0 |
| 12 | Annuaires d'abonnés | 4 | 0 |
| 13 | Communications non sollicitées | 5 | 0 |
| 14 | Caractéristiques techniques et normalisation | 3 | 0 |
| 15 | Application de certaines dispositions de la directive 95/46/CE | 3 | 0 |
| 16 | Dispositions transitoires | 2 | 0 |
| 17 | Transposition | 2 | 0 |
| 18 | Réexamen | 1 | 0 |
| 19 | Abrogation | 1 | 0 |
| 20 | Entrée en vigueur | 1 | 0 |
| 21 | Destinataires | 1 | 0 |

---

## Statut

- [x] Script `scripts/rechunk-eprivacy.ts` écrit et exécuté
- [x] 134 chunks insérés dans `staging_chunks` (status `pending`)
- [x] pending_document créé : `549f511a-3d24-4afc-9964-202024683f1f`
- [ ] **Validation admin** requise via `/dashboard/admin/rag-validation`
- [ ] **Promotion production** — après feu vert utilisateur

## Indexer two-pass

Ce chantier utilisera l'indexer fixé (deux-pass) lors de la promotion.
Prérequis : exécuter la migration 047 (backfill parent_chunk_id) en production d'abord.

---

*Rapport généré le 2026-07-06 — branche `claude-code/eprivacy-rechunk` [via claude-code]*
