# Audit 07 — Interface Utilisateur

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — app/**/page.tsx, components/

---

## 7.1 Pages Existantes

### Interface Authentifiée (Dashboard)

**Navigation principale :**
- `/dashboard` — Vue d'ensemble (redirect vers overview)
- `/dashboard/overview` — Dashboard principal
- `/dashboard/projects` — Projets de conformité
- `/dashboard/projects/[id]` — Projet spécifique
- `/dashboard/projects/[id]/audit/[auditId]` — Audit détaillé
- `/dashboard/projects/new` — Nouveau projet
- `/dashboard/chat` — Consultant IA RAG
- `/dashboard/brain` — Graphe de connaissances (Brain)
- `/dashboard/documents` — Documents générés
- `/dashboard/register` — Registre des traitements
- `/dashboard/templates` — Templates documentaires
- `/dashboard/alerts` — Alertes réglementaires
- `/dashboard/calendar` — Calendrier réglementaire
- `/dashboard/journal` — Journal réglementaire
- `/dashboard/benchmark` — Benchmarks sectoriels
- `/dashboard/analytics` — Analytics conformité
- `/dashboard/audit-trail` — Piste d'audit
- `/dashboard/sources` — Sources réglementaires
- `/dashboard/integrations` — Intégrations (Slack, webhooks)
- `/dashboard/api-keys` — Clés API
- `/dashboard/team` — Gestion équipe / organisations
- `/dashboard/settings` — Paramètres utilisateur
- `/dashboard/credits` — Solde crédits
- `/dashboard/upgrade` — Upgrade plan
- `/dashboard/support` — Support
- `/dashboard/lawyers` — Annuaire avocats

**Outils IA (20+) :**
- `/dashboard/tools` — Hub des outils
- `/dashboard/tools/scanner` — Scanner conformité
- `/dashboard/tools/checklist` — Checklist AI Act
- `/dashboard/tools/classifier` — Classificateur système IA
- `/dashboard/tools/dpia` — DPIA Art. 35
- `/dashboard/tools/fria` — FRIA Art. 9 AI Act
- `/dashboard/tools/ropa` — Registre des traitements (ROPA)
- `/dashboard/tools/art11` — Documentation Art. 11 AI Act
- `/dashboard/tools/policy` — Politique IA
- `/dashboard/tools/contracts` — Contrats IA
- `/dashboard/tools/clauses-contrat` — Clauses contractuelles
- `/dashboard/tools/memoire-conformite` — Mémoire conformité
- `/dashboard/tools/plan-memoire` — Plan mémoire
- `/dashboard/tools/explication-article` — Explication d'article
- `/dashboard/tools/jurisprudence` — Jurisprudence
- `/dashboard/tools/resume-arret` — Résumé d'arrêt
- `/dashboard/tools/analyse-decision` — Analyse décision DPA
- `/dashboard/tools/simulateur` — Simulateur obligations
- `/dashboard/tools/comparateur` — Comparateur réglements
- `/dashboard/tools/quiz` — Quiz conformité
- `/dashboard/tools/investor-report` — Rapport investisseur
- `/dashboard/tools/audit-qr` — Audit Questionnaire Rapide
- `/dashboard/tools/recherche-jurisprudentielle` — Recherche jurisprudentielle

**Admin (3 pages) :**
- `/dashboard/admin/rag-validation` — Validation chunks RAG
- `/dashboard/admin/credits` — Gestion crédits admin
- `/dashboard/admin/ai-logs` — Logs interactions IA

---

### Pages Marketing

- `/` — Landing page (762 lignes)
- `/pricing` — Tarification
- `/blog` — Blog
- `/blog/[slug]` — Article blog
- `/changelog` — Historique versions
- `/roadmap` — Feuille de route
- `/contact` — Contact
- `/docs` — Documentation
- `/dpo` — Service DPO
- `/ai-act` — Page AI Act
- `/rgpd` — Page RGPD

### Pages Légales

- `/legal/cgu` — Conditions Générales d'Utilisation
- `/legal/privacy` — Politique de confidentialité
- `/legal/mentions-legales` — Mentions légales
- `/legal/disclaimer` — Avertissement légal

### Pages Auth

- `/auth/login` — Connexion
- `/auth/forgot-password` — Mot de passe oublié
- `/auth/reset-password` — Réinitialisation

### Pages Publiques (Partageables)

- `/share/[token]` — Document partagé
- `/share/audit/[token]` — Audit partagé

---

## 7.2 Composants (57 fichiers)

Structure `components/` :
```
components/
├── ui/              # Primitives design system (button, card, dialog, etc.)
├── chat/            # ChatInterface.tsx (1064L), MessageBubble, etc.
├── audit/           # Composants audit
├── brain/           # Graphe de connaissances
├── dashboard/       # Navigation, layout dashboard
├── documents/       # Gestion documents
├── marketing/       # Landing, pricing, testimonials
├── register/        # Registre traitements
├── tools/           # Composants outils IA
├── EUFlag.tsx       # Drapeau UE
└── ErrorBoundary.tsx
```

---

## 7.3 Design System

**Stack UI :**
- Tailwind CSS 3.4.1 + Typography plugin
- Radix UI (primitives accessibles : Dialog, Accordion, Label, etc.)
- Lucide React (icônes)
- Framer Motion (animations)
- class-variance-authority + tailwind-merge

**Documentation :**
- `design-system/compliai/MASTER.md` — référence principale
- `design-system/compliai/pages/landing.md` — landing
- `design-system/compliai/pages/dashboard.md` — dashboard

**Cohérence :** Le design system est documenté. Les composants `ui/` s'appuient sur les primitives Radix UI — garantit une base accessible.

---

## 7.4 Accessibilité (ARIA)

**Points positifs :**
- Radix UI fournit des primitives accessibles nativement (Dialog, Accordion, Label, NavigationMenu)
- Composants Radix utilisés : Dialog, Label, Accordion, NavigationMenu, Slot

**Points à vérifier :**
- Les composants custom (ChatInterface, outils) n'ont pas été audités pour ARIA
- `dangerouslySetInnerHTML` dans le blog peut produire du HTML non accessible
- 1064 lignes de ChatInterface — à vérifier pour les attributs `aria-live` sur les messages en streaming

---

## 7.5 Dark Mode

- Tailwind CSS supporte le dark mode via la classe `.dark` ou `prefers-color-scheme`
- Non évalué sans accès au CSS global ou au `tailwind.config.js`
- `design-system/compliai/MASTER.md` devrait documenter le support dark mode

---

## 7.6 i18n (Internationalisation)

**État actuel :** Interface entièrement en **français**.

**Lacune business importante :** La cible produit est internationale (entreprises déployant en UE toutes nationalités). L'absence d'anglais est un frein à l'acquisition. Le CLAUDE.md (section 9) liste la traduction anglaise comme chantier prioritaire #5.

**Pas de lib i18n** (next-intl, i18next, etc.) dans les dépendances — la traduction nécessiterait un chantier d'architecture.

---

## 7.7 Pages Marketing

La landing page (`app/(marketing)/page.tsx`, 762 lignes) contient :
- Hero section avec vidéo upscalée (script `video:upscale-hero`)
- Sections pricing, fonctionnalités, témoignages
- Intégration Framer Motion (animations)

Les pages légales existent (CGU, privacy, mentions légales, disclaimer) — bonne pratique pour la conformité RGPD du produit lui-même.

---

## 7.8 Composants Tiers

| Lib | Usage |
|---|---|
| `@react-pdf/renderer` | Génération PDF côté client |
| `react-force-graph-3d` | Visualisation 3D Brain |
| `react-markdown` + `remark-gfm` | Rendu Markdown dans le chat |
| `d3` | Visualisations data |
| `three.js` | 3D (Brain graph) |
| `fuse.js` | Recherche floue |
| `codemirror` | Éditeur de code (Markdown) |
| `zustand` | State management |
| `use-debounce` | Debounce inputs |

---

## 7.9 Verdict UI

**Points forts :**
- Richesse fonctionnelle exceptionnelle (50+ pages, 20+ outils métier)
- Design system documenté
- Primitives accessibles via Radix UI
- Pages légales complètes (CGU, privacy, mentions)

**Points à améliorer :**
- Interface uniquement en français (frein international)
- Absence de tests UI (composants non testés)
- `ChatInterface.tsx` monolithique (1064 lignes)
- Certaines pages outils très volumineuses (checklist 1147L, jurisprudence 1027L)
- Dark mode à confirmer
