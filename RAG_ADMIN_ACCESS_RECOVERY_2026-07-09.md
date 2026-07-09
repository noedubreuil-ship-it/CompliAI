# RAG_ADMIN_ACCESS_RECOVERY_2026-07-09

**Date** : 2026-07-09  
**Objet** : Diagnostic perte accès admin dashboard — noe.dubreuil@gmail.com  
**Statut** : ✅ DIAGNOSTIC COMPLET — Aucune correction DB ni code requise

---

## 1. Résultat du diagnostic

### Flag admin en base
Documenté dans `RAG_ADMIN_ACCESS_FIX_2026-07-05.md` :

| Champ | Valeur |
|---|---|
| `auth.users.id` | `745cfc37-4a59-408b-ba30-ecda4982709f` |
| `auth.users.email` | `noe.dubreuil@gmail.com` |
| `profiles.role` | `admin` ✅ |
| `profiles.full_name` | `Noé Dubreuil` |

**Conclusion** : le flag `role = 'admin'` est correct en production. Aucune requête SQL nécessaire.

### Logique isAdmin()
`lib/admin.ts` vérifie deux conditions en OR :
- **Condition A** : `profiles.role = 'admin'` → ✅ VRAI
- **Condition B** : `user.id` dans `ADMIN_USER_IDS` env var → non configurée (condition A suffit)

---

## 2. Cause réelle du blocage — Menu admin inexistant dans la navigation

**Le menu admin n'a jamais été intégré dans la navigation principale.**

Après analyse de :
- `lib/navigation/app-nav.ts` → aucune entrée admin
- `components/ui/dashboard-navbar.tsx` → aucune référence admin
- `app/(app)/dashboard/settings/page.tsx` → liens admin absents
- `app/(app)/dashboard/layout.tsx` → `role` non lu (seulement `full_name, subscription_tier`)

**C'est une dette technique connue, documentée dans `RAG_FUTURE_IMPROVEMENTS.md` section A (Audit de sécurité : middleware admin centralisé manquant).**

Les pages admin existent et fonctionnent mais sont uniquement accessibles via URL directe.

---

## 3. Impact des déploiements P0-2 (headers) et P0-1 (CVE) sur l'accès admin

**Aucun impact.** Ces deux chantiers :
- P0-2 (`claude-code/fix-security-headers`) : modification de `next.config.mjs` uniquement — n'affecte pas `lib/admin.ts`, les cookies de session, ni la logique auth
- P0-1 (`claude-code/fix-security-cve`) : mise à jour de `next` 14.2.18 → 14.2.35 — ne change pas la logique isAdmin()
- Les deux branches n'ont d'ailleurs pas encore été mergées dans main

**Cause probable de la confusion** : l'utilisateur avait précédemment accédé via URL directe et ne retrouve plus comment y accéder.

---

## 4. Accès admin — Procédure correcte

L'interface admin est accessible **uniquement via URL directe** :

| Route | Description |
|---|---|
| https://www.compliai.eu/dashboard/admin/rag-validation | Validation des chunks RAG (staging → prod) |
| https://www.compliai.eu/dashboard/admin/credits | Gestion des crédits utilisateurs |
| https://www.compliai.eu/dashboard/admin/ai-logs | Logs des appels IA |

**Prérequis :** être connecté avec noe.dubreuil@gmail.com sur www.compliai.eu.

---

## 5. Si redirection vers /dashboard — Session expirée

Si l'URL directe redirige vers `/dashboard` sans afficher la page admin :

**Cause** : session Supabase expirée ou cookie invalide (même diagnostic que le 5 juillet).

**Solution** :
1. Déconnexion via navbar → profil → déconnexion
2. Reconnexion sur https://www.compliai.eu/auth/login
3. Accès direct à https://www.compliai.eu/dashboard/admin/rag-validation

**Solution alternative (contournement robuste)** : ajouter l'UUID dans la variable d'env `ADMIN_USER_IDS` sur Vercel (court-circuite la vérification DB) :
```
ADMIN_USER_IDS=745cfc37-4a59-408b-ba30-ecda4982709f
```
Vercel → Settings → Environment Variables → Production → redéployer.

---

## 6. Dette technique P1 — Intégrer les liens admin dans la navigation

Pour éviter ce problème à l'avenir, ajouter des liens admin conditionnels dans la navigation :

**Fichiers à modifier :**
- `app/(app)/dashboard/layout.tsx` : ajouter `role` à la requête profiles (`select("full_name, subscription_tier, role")`) et passer `isAdmin` en prop à `DashboardNavbar`
- `components/ui/dashboard-navbar.tsx` : afficher un menu "Admin" conditionnel si `isAdmin = true`
- `lib/navigation/app-nav.ts` : ajouter une section ADMIN_NAV conditionnelle

**Priorité recommandée** : P1 (après Phase P0 complète).

---

## 7. Résumé

| Point | Statut |
|---|---|
| Flag admin en base | ✅ Correct (role = 'admin') |
| Déploiements P0 ont cassé l'accès | ❌ Non — aucun impact |
| Menu admin dans la navigation | ❌ N'a jamais existé — dette technique |
| Accès admin possible | ✅ Via URL directe uniquement |
| Action requise maintenant | 0 — accéder directement à l'URL |
