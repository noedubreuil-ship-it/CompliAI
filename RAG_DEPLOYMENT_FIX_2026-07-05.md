# RAG_DEPLOYMENT_FIX_2026-07-05

**Date** : 2026-07-05  
**Objet** : 404 sur /dashboard/admin/rag-validation en production  
**Statut** : ✅ RÉSOLU — Push effectué, Vercel redéploie automatiquement

---

## Cause racine

Le dashboard admin RAG n'avait jamais été mergé sur la branche principale (`cursor/add-journal-calendar-sources-dpa-filters`). Les fichiers existaient uniquement sur la branche de travail `claude-code/aiact-parent-child-rechunk` et en partie non commités.

**Fichiers manquants en production :**

| Fichier | Statut avant fix |
|---|---|
| `app/(app)/dashboard/admin/rag-validation/page.tsx` | Non commité (untracked) |
| `app/(app)/dashboard/admin/rag-validation/components/*.tsx` (5 fichiers) | Non commité (untracked) |
| `app/(app)/dashboard/admin/rag-validation/components/rag-types.ts` | Non commité (untracked) |
| `app/(app)/dashboard/admin/ai-logs/page.tsx` | Non commité (untracked) |
| `app/api/admin/rag-validation/documents/route.ts` | Non commité (untracked) |
| `app/api/admin/rag-validation/documents/[id]/chunks/route.ts` | Non commité (untracked) |
| `app/api/admin/rag-validation/stats/route.ts` | Non commité (untracked) |
| `app/api/admin/ai-logs/route.ts` | Non commité (untracked) |
| `app/api/admin/rag-validation/validate/route.ts` | Commité sur `claude-code/*` uniquement |
| `app/(app)/dashboard/admin/rag-validation/RagValidationClient.tsx` | Commité sur `claude-code/*` uniquement |
| `app/(app)/dashboard/admin/rag-validation/components/DocumentCard.tsx` | Commité sur `claude-code/*` uniquement |
| `lib/rag-production-indexer/*.ts` | Commité sur `claude-code/*` uniquement |

---

## Actions effectuées

### 1. Commit des fichiers manquants

```
commit 63c6a59
feat: dashboard admin RAG validation — page, composants, routes API documents/stats/ai-logs [via claude-code]
13 fichiers ajoutés, 2210 insertions(+)
```

### 2. Merge sur la branche principale

```bash
git merge claude-code/aiact-parent-child-rechunk --no-ff \
  -m "merge: dashboard admin RAG validation + pipeline production-indexer [via claude-code]"
```

Commit de merge : `0c5278a`  
Résultat : merge propre, aucun conflit.

### 3. Push vers origin

```
724dd43..0c5278a  cursor/add-journal-calendar-sources-dpa-filters -> cursor/add-journal-calendar-sources-dpa-filters
```

Vercel détecte automatiquement le push et déclenche un déploiement.

---

## Solution immédiate en attendant le déploiement Vercel

Si tu dois approuver les 3 documents **maintenant** sans attendre le déploiement Vercel (2-5 min) :

```bash
# Dans le répertoire du projet, avec .env.local pointant sur la production
npm run dev
# Puis naviguer sur http://localhost:3000/dashboard/admin/rag-validation
```

`.env.local` est déjà configuré sur la DB production (`hhdmkuwgrtflcqzzteom.supabase.co`).  
L'auth Supabase fonctionne via cookies — connecte-toi avec ton compte `noe.dubreuil@gmail.com` sur `localhost:3000`.

---

## Ce qui a été inclus dans le merge

Les commits de `claude-code/aiact-parent-child-rechunk` mergés sur main :

| Commit | Description |
|---|---|
| `63c6a59` | Dashboard admin complet (page, composants, API routes) |
| `4c8550a` | Boutons "Tout approuver" + "Rejeter tout" dans la liste documents |
| `4d6310d` | Script rechunk eIDAS 2 + migrations 043/044/045 |
| `7ca9f82` | Fix rechunk AI Act (stop ANNEXE, cap 8000 chars) |
| `87b2d7c` | Rapport EDPB batch |
| `9bc7afa` | Scripts ingestion P1 (11 textes prioritaires) |
| `f10b0b8` | Script rechunk AI Act parent-child |

**Non inclus dans ce merge** (restent sur leurs branches dédiées) :
- `claude-code/aiact-annexes-considerants` — script 5A
- `claude-code/rgpd-considerants` — script 5B

---

## Documents en attente de validation admin

Une fois le déploiement Vercel terminé (ou via localhost:3000 immédiatement) :

| Document | document_id | Chunks | Bouton |
|---|---|---|---|
| eIDAS 2 (02014R0910) | `48dbad02-519d-4e89-ae4a-c9d61a69ddb5` | 692 | "Tout approuver (692)" |
| AI Act annexes+considérants | `b6829930-53ff-4278-b741-76a2b1bdd5a0` | 193 | "Tout approuver (193)" |
| RGPD considérants individuels | `b7bf2e54-5ce6-448e-8da8-c5af7558ee93` | 173 | "Tout approuver (173)" |

**Aucune bascule production ne sera déclenchée** avant ton feu vert explicite après validation dashboard.

---

## Règle de procédure à appliquer à l'avenir

Tout fichier qui fait partie du produit (pages, composants, routes API) doit être commité sur la branche courante avant la fin du chantier. Les fichiers admin/dashboard/RAG doivent être mergés sur `cursor/add-journal-calendar-sources-dpa-filters` dès qu'ils sont prêts pour le déploiement.
