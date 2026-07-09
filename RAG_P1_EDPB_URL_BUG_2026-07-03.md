# Bug URLs EDPB — Manifeste P1

**Date de détection** : 2026-07-03  
**Branche** : claude-code/aiact-parent-child-rechunk  
**Fichier concerné** : `scripts/ingest-p1/manifest.ts`

---

## Symptôme

4 documents EDPB dans le manifeste P1 retournaient HTTP 404 lors du dry-run :
```
[1/11] edpb-03-2023-art15          → FAIL 404
[2/11] edpb-02-2023-eprivacy-5-3   → FAIL 404
[4/11] edpb-01-2024-legitimate-interest → FAIL 404
[5/11] edpb-01-2025-pseudonymisation   → FAIL 404
```

---

## Causes racines

### Bug 1 — Référence inexistante (edpb-03-2023-art15)

Le document "EDPB Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD)" **n'existe pas**.

Le document sur le droit d'accès est en réalité les **Guidelines 01/2022** (version finale adoptée le 28 mars 2023).  
La numérotation "03/2023" est une erreur du document d'audit source (`RAG_CORPUS_GAPS_EXTENDED_2026-06-30.md`).

**Document correct** :
- Titre : EDPB Guidelines 01/2022 — Droit d'accès (Art. 15 RGPD), version finale v2.0
- Page officielle : `https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012022-data-subject-rights-right-access_en`
- PDF direct : `https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf`

### Bug 2 — Slugs avec zéro de padding incorrect (3 documents)

L'EDPB n'utilise PAS de zéro de padding dans ses slugs d'URL :
- ❌ Incorrect : `guidelines-022023-...` (format avec zéro de padding)
- ✅ Correct  : `guidelines-22023-...` (format sans zéro de padding)

Même logique pour `012024` → `12024` et `012025` → `12025`.

**URLs incorrectes dans le manifeste** :

| Document | URL incorrecte | URL correcte |
|---|---|---|
| Guidelines 02/2023 ePrivacy | `.../guidelines-022023-technical-scope-art-53-eprivacy_en` | `.../guidelines-22023-technical-scope-art-53-eprivacy-directive_en` |
| Guidelines 01/2024 intérêt légitime | `.../guidelines-012024-legitimate-interest_en` | `.../guidelines-12024-processing-personal-data-based_en` |
| Guidelines 01/2025 pseudonymisation | `.../guidelines-012025-pseudonymisation_en` | `.../guidelines-012025-pseudonymisation_en` ✓ (URL OK, page différente) |

---

## Correction appliquée

Fichier `scripts/ingest-p1/manifest.ts` :

1. `edpb-03-2023-art15` → renommé `edpb-01-2022-art15-access` avec titre et URLs corrigés
2. `edpb-02-2023-eprivacy-5-3` → `officialUrl` et `rawContentUrl` corrigés  
3. `edpb-01-2024-legitimate-interest` → `officialUrl` et `rawContentUrl` corrigés
4. `edpb-01-2025-pseudonymisation` → URL page correcte + `rawContentUrl` PDF direct ajouté

---

## Preuve de correction — Dry-run

Après correction, les 4 URLs retournent HTTP 200 ou HTTP 202 :

```
[1/11] edpb-01-2022-art15-access       → HTTP 200 ✓ (PDF direct)
[2/11] edpb-02-2023-eprivacy-5-3       → HTTP 200 ✓ (PDF direct)
[4/11] edpb-01-2024-legitimate-interest → HTTP 200 ✓ (PDF direct)
[5/11] edpb-01-2025-pseudonymisation   → HTTP 200 ✓ (PDF direct)
```

Voir commande : `npx tsx scripts/ingest-p1-corpus.ts`

---

## Impact sur le corpus

Le document "Guidelines 01/2022 — Droit d'accès" est **différent** du "Guidelines 03/2023" référencé dans l'audit.  
Il s'agit du même sujet (droit d'accès Art. 15 RGPD) mais avec le bon numéro de version.  
Le corpus P1 reste cohérent — c'est le bon texte de référence pour Art.15.
