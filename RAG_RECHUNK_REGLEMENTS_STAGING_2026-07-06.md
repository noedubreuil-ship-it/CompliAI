# RAG — Chantier 6 — Rechunk 8 règlements — Rapport staging 2026-07-06

*Rapport généré le 2026-07-06 — branche `claude-code/rechunk-reglements-p1` [via claude-code]*

---

## Résumé

Rechunking parent-child des 8 règlements/directives EU prioritaires.
Script générique : `scripts/rechunk-reglements.ts`
Modèle parsing : Claude Sonnet 4.6, temperature 0, max_tokens 8192
Throttle inter-article : 2 500 ms

---

## Résultats staging

| Règlement | CELEX | Cons. | Art. | Annexes | Enfants | **Total** | Doc ID | Erreurs |
|-----------|-------|-------|------|---------|---------|-----------|--------|---------|
| DSA | 32022R2065 | 156 | 93 | 0 | 679 | **928** | `84b4fa6d` | 0 |
| DMA | 32022R1925 | 109 | 54 | 0 | 416 | **579** | `1b42e485` | 0 |
| NIS2 | 32022L2555 | 144 | 46 | 2 | 451 | **643** | `82348c40` | 0 |
| CRA | 32024R2847 | 130 | 71 | 7 | 450 | **658** | `64bcc20f` | 1 ⚠️ |
| Data Act | 32023R2854 | 119 | 50 | 0 | 481 | **650** | `bb3c01a2` | 0 |
| DSM | 32019L0790 | 86 | 32 | 0 | 126 | **244** | `7677dc51` | 0 |
| DGA | 32022R0868 | 63 | 38 | 0 | 299 | **400** | `87cde1d6` | 0 |
| Machines | 32023R1230 | 86 | 54 | 11 | 358 | **509** | `44aa471d` | 0 |
| **TOTAL** | | **893** | **438** | **20** | **3 260** | **4 611** | | **1** |

---

## Anomalie CRA Art.60

- **Article** : Art.60 — "Opérations coup de balai"
- **Erreur** : `Expected ',' or '}' after property value in JSON` (position 310)
- **Cause probable** : guillemets typographiques «» dans le contenu renvoyé par Claude
- **Impact** : chunk article parent inséré ✅, enfants (paragraphes/points) manquants ❌
- **Action** : à re-parser manuellement ou via un re-run ciblé avant promotion production

---

## Structure chunks

Hiérarchie appliquée :
- `considerant` : `article_number = "considérant N"`, `paragraph_number = "N"`, `parent_chunk_id = null`
- `annexe` : `article_number = "annexe N"`, `parent_chunk_id = null`
- `article` : parent, `parent_chunk_id = null`
- `paragraph` : enfant de `article`, `paragraph_number` normalisé à "1" si null
- `point` : enfant de `paragraph` ou `article`, `point_letter` présent

---

## Fixes ePrivacy appliqués (hérités)

- NBSP (` `) normalisé avant tout parsing regex
- Considérants : format inline `(N) texte` ET format multi-lignes `(N)\n\ntexte`
- `paragraph_number = "1"` si null (évite collision identité avec chunk article parent)
- Considérants bornés avant "ONT ADOPTÉ LE PRÉSENT RÈGLEMENT:" / "ONT ARRÊTÉ LA PRÉSENTE DIRECTIVE:"
- Articles arrêtés avant première `ANNEXE [IVX]+`

---

## Statut validation

| Règlement | Validation admin | Bascule production |
|-----------|-----------------|-------------------|
| DSA | ⏳ En attente | ⏳ |
| DMA | ⏳ En attente | ⏳ |
| NIS2 | ⏳ En attente | ⏳ |
| CRA | ⏳ En attente ⚠️ Art.60 | ⏳ |
| Data Act | ⏳ En attente | ⏳ |
| DSM | ⏳ En attente | ⏳ |
| DGA | ⏳ En attente | ⏳ |
| Machines | ⏳ En attente | ⏳ |

**Prochaine étape** : validation admin dans `/dashboard/admin/rag-validation` pour chaque document, puis feu vert utilisateur pour bascule production vague par vague.

---

*Rapport généré le 2026-07-06 — branche `claude-code/rechunk-reglements-p1` [via claude-code]*
