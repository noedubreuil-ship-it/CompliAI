# Bug Garante — dates `publication_date` non extraites

**Date** : 1er juillet 2026  
**Composant** : `lib/rag-monitoring/sources/garante-scraping.ts`  
**Statut** : documenté — correction différée (batch Garante IT bloqué jusqu'à fix)

---

## Symptôme observé

Les 8+ documents Garante IT en `pending_documents` (production) ont `publication_date = NULL`, alors que :

- le titre contient la date (`Provvedimento del 28 maggio 2026 [10259894]`) ;
- la fixture HTML officielle contient `<div class="data-risultato"><p>28/05/2026</p></div>`.

Exemple production (2026-07-01) :

| Titre | publication_date |
|---|---|
| Provvedimento del 28 maggio 2026 [10259894] | `null` |
| Parere su istanza di accesso civico - 28 maggio 2026 [10259569] | `null` |

---

## Cause racine

Dans `parseGaranteHtml()`, l'extraction de date cherche `.data-risultato` dans le HTML du **parent immédiat** du lien :

```typescript
const parentDiv = linkEl.parentNode?.parentNode;
const rawHtml = parentDiv.outerHTML ?? "";
const dateMatch = rawHtml.match(/class="data-risultato".../)
```

Structure HTML réelle (fixture `tests/fixtures/rag_monitoring/garante-ricerca.html`) :

```html
<div class="data-risultato">
  <p>28/05/2026</p>
</div>
<!-- ... bloc séparé ... -->
<div class="d-flex">
  <div>
    <strong>
      <a class="titolo-risultato" href=".../docweb/10259569">...</a>
    </strong>
  </div>
</div>
```

`.data-risultato` est un **frère** du bloc `.d-flex`, pas un ancêtre du lien. Le regex ne matche donc jamais → `publicationDate` reste `undefined` → `NULL` en base.

`parseGaranteDate()` fonctionne correctement (tests unitaires verts sur `"28/05/2026"`).

---

## Impact

1. **Tri et priorisation** : impossible de trier les provvedimenti Garante par date dans l'admin.
2. **Métadonnées staging** : chunks sans `version_date` fiable.
3. **Déduplication temporelle** : risque de re-détection sans filtre date.
4. **Batch Garante IT** : bloqué dans la file d'ingestion jusqu'à correction (décision opérateur 2026-07-01).

---

## Correction recommandée (non appliquée)

1. Remonter au conteneur résultat commun (ancêtre qui contient à la fois `.data-risultato` et `a.titolo-risultato`).
2. Fallback : parser la date depuis le titre (`del 28 maggio 2026` / `[10259569]`).
3. Ajouter un test unitaire : `parseGaranteHtml` doit retourner `publicationDate` définie pour chaque doc de la fixture.

---

## Workaround temporaire

Avant ingestion batch Garante :

- backfill SQL `publication_date` depuis le titre pour les docs IT existants, **ou**
- corriger le connecteur puis relancer un cycle monitoring Garante.

---

## Références

- `lib/rag-monitoring/sources/garante-scraping.ts` — `parseGaranteHtml`, `parseGaranteDate`
- `lib/rag-monitoring/sources/garante-scraping.test.ts` — pas de test sur `publicationDate` aujourd'hui
- `tests/fixtures/rag_monitoring/garante-ricerca.html`
