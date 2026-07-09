# RAG_ADMIN_ACCESS_FIX_2026-07-05

**Date** : 2026-07-05  
**Objet** : Blocage accès dashboard admin `/dashboard/admin/rag-validation`  
**Statut** : ✅ DIAGNOSTIC COMPLET — Aucune action DB requise

---

## 1. Diagnostic — Implémentation `isAdmin()`

**Fichier** : `lib/admin.ts`

L'accès admin est accordé si **l'une ou l'autre** condition est vraie :

| Condition | Mécanisme |
|---|---|
| A | `profiles.role = 'admin'` pour l'`user.id` connecté |
| B | `user.id` dans la variable d'env `ADMIN_USER_IDS` (liste séparée par virgules) |

La condition A est vérifiée en base via `@supabase/supabase-js` service-role.  
La condition B court-circuite la vérification DB (plus rapide).

**Fichier** : `lib/supabase/server.ts` — client SSR via `@supabase/ssr` + cookies Next.js App Router.

---

## 2. Résultat du diagnostic sur le compte noe.dubreuil@gmail.com

```
auth.users :
  id    : 745cfc37-4a59-408b-ba30-ecda4982709f
  email : noe.dubreuil@gmail.com

profiles :
  id        : 745cfc37-4a59-408b-ba30-ecda4982709f
  role      : admin          ← ✅ déjà 'admin'
  full_name : Noé Dubreuil
```

**Conclusion : le flag admin est déjà correct en base. Aucune requête SQL nécessaire.**

---

## 3. Requête SQL de vérification (à exécuter dans SQL Editor Supabase production)

Pour confirmer l'état actuel :

```sql
SELECT
  au.id,
  au.email,
  p.role,
  p.full_name
FROM auth.users au
JOIN profiles p ON p.id = au.id
WHERE au.email = 'noe.dubreuil@gmail.com';
```

Résultat attendu :

| id | email | role | full_name |
|---|---|---|---|
| `745cfc37-...` | `noe.dubreuil@gmail.com` | `admin` | `Noé Dubreuil` |

Si jamais le rôle devait être réinitialisé manuellement :

```sql
-- Uniquement si role ≠ 'admin' — actuellement inutile
UPDATE profiles
SET role = 'admin'
WHERE id = '745cfc37-4a59-408b-ba30-ecda4982709f';
```

---

## 4. Cause réelle du blocage — Session navigateur

Puisque `profiles.role = 'admin'` est déjà correct, le blocage vient de la session côté navigateur. `isAdmin()` est une fonction **serveur** : si elle ne trouve pas de session valide dans les cookies, elle retourne `false` et la page redirige vers `/dashboard`.

### Causes possibles (par ordre de probabilité)

**Cause 1 — Session expirée (la plus probable)**

La session Supabase a expiré ou le refresh token est invalide. Le middleware rafraîchit la session à chaque requête, mais si le token est corrompu ou expiré depuis trop longtemps, il échoue silencieusement.

**Solution : se déconnecter puis se reconnecter sur https://www.compliai.eu**

1. Aller sur https://www.compliai.eu/auth/login
2. Se déconnecter si connecté (navbar → profil → déconnexion)
3. Se reconnecter avec noe.dubreuil@gmail.com
4. Aller directement sur https://www.compliai.eu/dashboard/admin/rag-validation

**Cause 2 — Cookie de session absent ou mal envoyé**

Si la session a été créée depuis un autre domaine ou port, les cookies ne correspondent pas.

**Solution : vider le cache et les cookies du navigateur pour compliai.eu, puis se reconnecter.**

**Cause 3 — Vercel en cache l'ancienne version (moins probable)**

Si la page admin a été déployée récemment sans invalidation de cache Vercel.

**Solution : ajouter `?nocache=1` à l'URL en premier accès, ou forcer un redéploiement.**

---

## 5. Accès admin alternatif via variable d'env (solution de contournement rapide)

Si la reconnexion ne suffit pas, ajouter l'UUID dans la variable d'env `ADMIN_USER_IDS` dans Vercel — cela court-circuite la vérification DB et est plus robuste :

```
ADMIN_USER_IDS=745cfc37-4a59-408b-ba30-ecda4982709f
```

**Procédure Vercel :**
1. Dashboard Vercel → projet CompliAI → Settings → Environment Variables
2. Ajouter `ADMIN_USER_IDS` = `745cfc37-4a59-408b-ba30-ecda4982709f`
3. Scope : Production uniquement
4. Redéployer (ou déclencher un re-deploy depuis l'interface Vercel)

Cette variable est lue au runtime dans `lib/admin.ts` ligne 31 — pas besoin de modifier le code.

---

## 6. Documents en attente de validation admin

| Document | document_id | Chunks | Action |
|---|---|---|---|
| eIDAS 2 (02014R0910-20240520) | `48dbad02-519d-4e89-ae4a-c9d61a69ddb5` | 692 | Tout approuver |
| AI Act — Annexes + Considérants | `b6829930-53ff-4278-b741-76a2b1bdd5a0` | 193 | Tout approuver |
| RGPD — Considérants individuels | `b7bf2e54-5ce6-448e-8da8-c5af7558ee93` | 173 | Tout approuver |

Une fois connecté en admin sur le dashboard : le bouton **"Tout approuver (N)"** est visible sur chaque document dans la liste de gauche.

Aucune bascule production ne sera lancée avant ton feu vert explicite après validation dashboard.
