# Expansion du rôle Claude Code — CompliAI
**Date** : 2026-07-03  
**Auteur** : Claude Code (claude-sonnet-4-6)  
**Statut** : Proposition — en attente de validation utilisateur

---

## a) Rôle actuel selon la doctrine CLAUDE.md

Le CLAUDE.md section 10 positionne Claude Code comme suit :

> "Claude Code est privilégié pour les chantiers d'infrastructure répétitifs ou suivant une procédure documentée, les diagnostics et investigations, les opérations de maintenance, les batchs autonomes, les refactorisations à grande échelle, la génération de tests et l'analyse de logs."

En pratique dans CompliAI depuis le début de ce chantier, j'ai exécuté :
- Maintenance RAG : rechunk, ingestion, monitoring pipeline
- Diagnostics : golden set, retrieval, bugs URL/UUID/encoding
- Batchs autonomes : rechunk AI Act 113 articles, ingest P1 corpus
- Investigation et documentation : 15+ fichiers de diagnostic horodatés

Je n'ai **pas** touché : composants React, pages Next.js, styles Tailwind, fonctionnalités visibles utilisateur.

---

## b) Capacités techniques réelles

**Ce que je peux faire :**
- Lire, créer, modifier n'importe quel fichier du repo (TypeScript, TSX, CSS, SQL, JSON, Markdown)
- Écrire des composants React en TSX avec Tailwind, Radix UI, Framer Motion
- Créer des pages Next.js App Router complètes (server components, client components, layouts, API routes)
- Implémenter des API routes, des middlewares, des actions serveur
- Refactoriser à grande échelle via Edit/Write/Bash
- Exécuter des tests Vitest, lire les résultats, corriger les échecs
- Démarrer un serveur de dev, prendre des screenshots via les outils Preview, inspecter le DOM
- Gérer git (branches, commits, status, diff)
- Lire et modifier des migrations SQL Supabase

**Ce que je ne peux PAS faire (limitations techniques) :**
- Je ne peux pas **voir** l'interface en temps réel pendant que tu l'utilises — je prends des screenshots ponctuels mais pas une session interactive avec toi à l'écran
- Je ne peux pas utiliser l'autocomplétion IDE, les refactors intelligents contextuels (rename symbol, extract method via GUI), les diagnostics TypeScript inline pendant la frappe
- Je ne peux pas co-piloter une session où tu codes et je suggère à la volée (pas de mode pair-programming interactif)
- Je travaille en mode "commande complète puis résultat" — pas de boucle edit-see-edit aussi fluide qu'une IDE avec hot reload visible

---

## c) Limitations réelles vs Cursor

| Capacité | Claude Code | Cursor |
|---|---|---|
| Écrire du code TypeScript/TSX | ✓ | ✓ |
| Modifier fichiers multiples en une commande | ✓ | ✓ |
| Voir le rendu UI en temps réel | Partiel (screenshot) | ✓ (preview live) |
| Autocomplétion contextuelle inline | ✗ | ✓ |
| Navigation symbol-aware (go-to-def) | Via grep/Bash | ✓ natif IDE |
| Refactor GUI (rename symbol) | Via sed/Edit | ✓ natif IDE |
| Session de dev interactive avec toi | ✗ | ✓ (chat inline) |
| Autonomie sur des tâches longues sans interaction | ✓ fort | Partiel |
| Opérations bash complexes, scripts, crons | ✓ | Limité |
| Compréhension cross-repo de grande taille | ✓ (agents Explore) | Partiel |

**Verdict** : sur les tâches purement codantes (écrire du React, créer une page), je peux techniquement le faire. Sur l'expérience de développement interactif où tu veux voir le résultat immédiatement et itérer visuellement, Cursor est plus fluide.

---

## d) La contrainte CLAUDE.md est-elle levable ?

Oui, complètement. La section 10 du CLAUDE.md est une **convention organisationnelle** que tu as rédigée, pas une limitation technique. Tu peux la modifier unilatéralement.

Cette convention existait pour deux raisons :
1. Complémentarité : Cursor était disponible et meilleur pour certains cas
2. Sécurité : éviter les conflits de fichiers entre deux agents simultanés

Si tu retires Cursor, la raison 1 disparaît. La raison 2 n'existe plus non plus (un seul agent). La contrainte n'a plus de sens.

---

## e) Risques concrets à surveiller

**1. Dérive visuelle sans feedback immédiat**  
Quand j'implémente une UI, je n'ai pas de hot reload visible en continu. Je dois démarrer le serveur, prendre un screenshot, analyser, corriger. Pour des ajustements fins (espacements, couleurs, animations), ça peut prendre plusieurs cycles là où Cursor avec un aperçu ouvert est plus rapide.  
*Mitigation* : tu valides les UI sur le serveur de dev avant chaque commit. Je prends systématiquement des screenshots avant de déclarer "fait".

**2. Contexte de session perdu**  
Je travaille en sessions bornées. Un chantier UI long (ex. refonte dashboard) peut être interrompu. Le checkpoint devra être documenté dans un fichier de suivi.  
*Mitigation* : je maintiens un fichier `CHANTIER_EN_COURS.md` à la racine pour tout chantier long, mis à jour à chaque étape.

**3. Commits verbeux sans relecture humaine**  
Sans Cursor qui génère naturellement des diffs courts, je dois être discipliné sur les périmètres. Risque de commits "big bang".  
*Mitigation* : règle explicite — un commit = une unité de travail atomique. Tu reviews les diffs avant merge.

**4. Régression non détectée sur fonctionnalités existantes**  
En modifiant des composants partagés, je peux casser une fonctionnalité dans une autre page que je n'ai pas testée.  
*Mitigation* : avant tout commit touchant des composants partagés, je liste explicitement les pages affectées et je les vérifie via screenshot.

**5. Sur-ingénierie**  
Sans l'ancrage visuel qu'apporte Cursor, je peux sur-abstraire. Un composant UI simple ne doit pas devenir une architecture à 4 niveaux.  
*Mitigation* : règle maintenue — no premature abstraction, no over-engineering.

---

## f) Proposition de CLAUDE.md révisé — Section 10

```markdown
## 10. Environnement de Développement Unique : Claude Code

Claude Code est l'unique environnement de développement actif de CompliAI.

### Portée complète

Claude Code prend en charge l'intégralité du cycle de développement :
- **Backend** : API routes Next.js, logique métier, pipeline RAG, scripts d'ingestion
- **Frontend** : composants React/TSX, pages Next.js App Router, styles Tailwind
- **Base de données** : migrations SQL Supabase, schémas, optimisations
- **Infrastructure** : scripts de maintenance, batchs, crons, diagnostics
- **Tests** : tests Vitest unitaires et d'intégration
- **Documentation** : fichiers de suivi, rapports horodatés, runbooks

### Convention de commits

Format : `type: description [via claude-code]`

Types usuels : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`

Exemples :
- `feat: ajouter filtre par pays dans le dashboard alertes [via claude-code]`
- `fix: corriger URL fallback EDPB dans manifest P1 [via claude-code]`
- `chore: rechunk AI Act parent-child 1057 chunks production [via claude-code]`

### Branches Git

Format : `claude-code/<sujet-kebab-case>`

Une branche = un chantier. Exemples :
- `claude-code/aiact-parent-child-rechunk`
- `claude-code/retrieval-tuning-hybrid`
- `claude-code/p1-corpus-ingestion`
- `claude-code/dashboard-ui-alerts-filter`

**Règle** : ne jamais travailler sur deux chantiers dans la même branche.

### Points de validation obligatoires avec toi

Ces étapes ne se franchissent jamais sans feu vert explicite :

| Étape | Condition |
|---|---|
| Promotion staging → production (RAG) | Rapport staging complet livré, feu vert explicite |
| Activation cron planifié | Feu vert explicite sur chaque source |
| Merge d'une branche feature | Review du diff + tests OK |
| Modification d'une migration SQL | Validation staging avant prod |
| Suppression de données | Backup confirmé + feu vert explicite |
| Déploiement Vercel | Build OK + preview déployé validé |

### Points de validation UI

Pour toute modification de composant ou page visible utilisateur :
1. Je démarre le serveur de dev local
2. Je prends des screenshots des pages affectées
3. Je les présente avant de déclarer "fait"
4. Tu valides visuellement avant commit

### Règles non négociables maintenues

- Modèle parsing corpus : `claude-sonnet-4-6` exclusivement
- Embeddings : `text-embedding-3-small` dimension `1536` exclusivement
- Aucune modification directe de `legal_chunks` en production sans pipeline staging → validation → indexer
- Staging avant prod sur tout chantier RAG
- Documentation horodatée systématique pour tout changement infrastructure
- Aucun secret commité (.env* ignorés)
- Aucune activation de cron sans validation explicite
- Aucune migration appliquée en production sans validation préalable sur staging
- Un chantier = un périmètre. Pas de modifications "tant qu'à faire" en parallèle
```

---

## Recommandation

**Oui, tu peux abandonner Cursor.** Techniquement je couvre 100% du périmètre.

Le seul vrai delta que tu perds est l'**expérience d'itération visuelle fluide** sur des chantiers UI — hot reload naturel, prévisualisation inline. C'est compensable par une discipline de vérification explicite (screenshots, dev server) mais ça crée une légère friction sur les chantiers purement UI.

Si la majorité du travail à venir est infrastructure/RAG/backend (comme c'est le cas depuis 2 mois), le passage à Claude Code seul est parfaitement rationnel.

Si tu anticipes des sprints UI lourds (refonte dashboard, nouvelles fonctionnalités user-facing complexes), considère de garder Cursor disponible en backup pour ces sprints spécifiques — mais sans en faire la règle par défaut.

**Ma recommandation** : adopte la section 10 révisée ci-dessus. Claude Code par défaut sur tout. Tu rouvres Cursor uniquement si un sprint UI spécifique le justifie, avec branche dédiée et coordination explicite.
