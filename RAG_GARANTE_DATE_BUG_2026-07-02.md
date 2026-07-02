# Bug Garante — publication_date NULL

**Date de détection :** 2026-07-01  
**Branche :** claude-code/aiact-parent-child-rechunk  
**Priorité :** bloquante pour l'ingestion du batch Garante IT

---

## Symptôme

Tous les documents Garante IT présents dans `pending_documents` ont `publication_date = NULL`.

**Requête de vérification :**
```sql
SELECT id, title, publication_date, status
FROM pending_documents
WHERE source_id = '<garante_source_id>'
ORDER BY detected_at DESC;
```

La date est pourtant présente dans le titre au format : `«28 maggio 2026 [ID numérique]»`  
Exemple : `"28 maggio 2026 [10120906]"`

---

## Cause

Le connecteur de monitoring Garante (`lib/rag-monitoring/`) n'extrait pas la date de publication depuis le flux RSS ou HTML de la source Garante IT. La date est encodée dans le champ `title` de l'entrée RSS plutôt que dans le champ `pubDate`.

**Localisation probable :**  
`lib/rag-monitoring/connectors/` — fichier du connecteur Garante (pattern `garante.ts` ou `it-garante.ts`)

Le champ `detected_at` reflète la date de détection par le monitoring, pas la date de publication réelle du document.

---

## Impact

- Les 10 documents Garante IT ont `publication_date = NULL`.
- Le pipeline d'ingestion peut fonctionner sans cette date (elle n'est pas obligatoire pour le parsing).
- La date NULL est problématique pour :
  - Le tri chronologique des ingestions
  - La qualité des métadonnées dans `legal_chunks`
  - Les requêtes de filtrage par date dans le RAG

---

## Fix à implémenter

Dans le connecteur Garante :

1. Extraire la date depuis le champ `title` avec un regex :
   ```typescript
   const dateMatch = title.match(/^(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i);
   ```

2. Mapper les noms de mois italiens vers des numéros :
   ```typescript
   const MESI: Record<string, string> = {
     gennaio: "01", febbraio: "02", marzo: "03", aprile: "04",
     maggio: "05", giugno: "06", luglio: "07", agosto: "08",
     settembre: "09", ottobre: "10", novembre: "11", dicembre: "12",
   };
   ```

3. Construire la date ISO : `YYYY-MM-DD`

4. Backfiller les 10 docs existants après la correction.

---

## Ordre d'exécution

1. **NE PAS ingérer le batch Garante IT avant correction.**
2. Corriger le connecteur Garante sur une branche dédiée.
3. Backfill des 10 docs existants via migration SQL ou script.
4. Valider en staging.
5. Donner feu vert ingestion batch Garante IT.

---

## Lien avec l'ingestion P1

Le batch Garante IT n'est PAS un texte P1 prioritaire. C'est un batch de monitoring de décisions nationales.  
L'ingestion des 11 textes P1 (EDPB Guidelines, CJUE, Commission) ne dépend pas de ce bug.
