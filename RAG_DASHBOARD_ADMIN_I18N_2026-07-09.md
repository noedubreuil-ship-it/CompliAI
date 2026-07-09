# RAG_DASHBOARD_ADMIN_I18N_2026-07-09

**Date** : 2026-07-09  
**Branche** : `claude-code/translate-admin-dashboard`  
**Commit** : `7badd8d`  
**Statut** : ✅ PRÊT STAGING — En attente feu vert production

---

## Problème résolu

Sur `/dashboard/admin/rag-validation`, les titres des documents s'affichaient dans leur langue d'origine :
- Anglais (EDPB, Commission Guidelines)
- Allemand (BfDI)
- Espagnol (AEPD)
- Italien (Garante)
- Néerlandais (AP)
- Etc.

La validation manuelle était ralentie par la traduction mentale de chaque titre.

---

## Implémentation technique

### Architecture (Option A — traduction à la volée avec cache)

```
fetchDocuments()
  └─ Fetch /api/admin/rag-validation/documents
  └─ setDocuments(docs)                          ← affichage immédiat (titres originaux)
  └─ [arrière-plan] POST /api/admin/translate-titles
       └─ GET cache Upstash par document_id       ← hits instantanés
       └─ [si miss] Claude Sonnet 4.6 batch       ← traduction max 20/appel
       └─ SET cache Upstash TTL 30j
       └─ setDocuments(prev => merge translations) ← mise à jour réactive
```

### Fichiers modifiés/créés

| Fichier | Rôle |
|---|---|
| `app/api/admin/translate-titles/route.ts` | API POST — prend `[{id, title, language}]`, retourne `[{id, title_fr}]`. Admin only. Cache Upstash 30j. |
| `RagValidationClient.tsx` | Fetch des traductions en arrière-plan après chargement de la liste |
| `components/DocumentCard.tsx` | Affichage titre FR + badge langue originale + titre original en petit |
| `components/rag-types.ts` | Ajout champ `title_fr?: string \| null` dans `DocumentWithStats` |

### Comportement UX

1. **Chargement initial** : titres originaux affichés immédiatement (0ms de latence)
2. **Après traduction** (~1-3s premier chargement) : titres remplacés par la version française
3. **Cache hit** (chargements suivants) : titres français instantanés dès le premier render

### Affichage DocumentCard

```
[DE]  Lignes directrices EDPB sur les cookies               ← titre FR en gros (font-medium)
  DE  Guidelines on the use of cookies                      ← titre original + badge langue (tiny, italic)
```

---

## Détails de l'API `/api/admin/translate-titles`

### Sécurité
- `isAdmin()` obligatoire — 403 si non-admin
- Rate limiting admin existant appliqué

### Prompt Claude Sonnet 4.6
```
Traduis en français les titres de documents juridiques suivants. 
Réponds UNIQUEMENT avec un JSON array de la forme: [{"i":1,"t":"titre traduit"}, ...]. 
Ne traduis pas les acronymes ni les numéros de règlement (RGPD, AI Act, DORA, CELEX, ECLI, etc.). 
Conserve la précision juridique.
```

- Temperature : 0 (déterministe)
- Max tokens : 2048
- Batch size : 20 documents max par appel

### Cache Upstash Redis
- Clé : `tr:doc:{document_id}`
- TTL : 2 592 000 secondes (30 jours)
- Fallback silencieux si Upstash non configuré

### Gestion d'erreurs
- Si Claude retourne un JSON invalide → titres originaux conservés (pas de crash)
- Si Upstash inaccessible → traduction sans cache (fonctionnel, plus lent)
- Si `/api/admin/translate-titles` retourne une erreur → titres originaux conservés (silencieux)

---

## Coût estimé

| Scénario | Coût |
|---|---|
| 100 documents traduits (premier chargement) | ~0.05 USD (Claude Sonnet 4.6 input/output minimal) |
| Chargements suivants (cache hit) | 0 USD |
| Par mois (nouveaux documents) | < 0.10 USD/mois |

---

## Langues couvertes

Tout `language` ≠ `fr` / `FR` / `fra` est traduit. Sources actuelles du corpus :
- `en` — EDPB, Commission, EUR-Lex anglais
- `de` — BfDI (Allemagne)
- `es` — AEPD (Espagne)
- `it` — Garante (Italie)
- `nl` — AP (Pays-Bas)
- `sl` — IP (Slovénie)
- `pl` — UODO (Pologne)

---

## Rollback

Si problème : modifier `DocumentCard.tsx` pour supprimer l'affichage de `doc.title_fr` et revenir à `doc.title ?? identifier`. La logique de traduction est additive — elle ne modifie aucune donnée source.

---

## GO production

En attente validation staging de ta part. Déployer via :
```bash
git checkout claude-code/translate-admin-dashboard
npx vercel --prod
```

Ou cherry-pick sur la branche de production courante (`claude-code/fix-ai-act-art50`).
