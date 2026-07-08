# Section 7 — Interface Utilisateur

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 7.1 Métriques UI

| Métrique | Valeur |
|---|---|
| Composants React (`components/`) | 57 |
| Pages dashboard authentifiées | 25+ |
| Utilisation classes dark mode (`dark:`) | 152 occurrences |
| Boutons sans aria-label détectés | ~66 |
| Support i18n (next-intl ou équivalent) | 0 — inexistant |
| Langues supportées | FR uniquement |

---

## 7.2 Design system

**Stack :** Tailwind CSS 3.4, Radix UI, Lucide React, Framer Motion, `class-variance-authority`, `tailwind-merge`.

- Composants Radix dans `components/ui/` : Button, Dialog, Dropdown, Select, Tabs, Toast, etc. ✓
- Typographies : Inter (sans-serif) + EB Garamond (serif). Variables CSS `--font-inter`, `--font-garamond`. ✓
- Dark mode : 152 occurrences de classes `dark:`. Implémenté via `DarkModeProvider` dans `app/layout.tsx`. ✓
- Design system documenté dans `design-system/compliai/MASTER.md`. ✓

Cohérence globale satisfaisante. Pas d'incohérences majeures de palette ou typographie détectées.

---

## 7.3 Accessibilité

| Critère | État | Détail |
|---|---|---|
| ARIA labels sur boutons | ⚠️ Partiel | ~66 boutons sans aria-label détectés (analyse statique) |
| Navigation clavier | À VÉRIFIER | Non testé automatiquement |
| Contrastes couleurs | À VÉRIFIER | Non testé (pas d'outil Axe) |
| Focus visible | À VÉRIFIER | Tailwind `focus:ring` présent dans design system |
| HTML sémantique | À VÉRIFIER | Présence de `<main>`, `<nav>`, `<section>` à confirmer |

Note : l'analyse statique des 66 boutons sans aria-label est une borne haute — beaucoup ont probablement un label textuel visible qui supplée l'aria-label. Audit manuel requis pour confirmer.

---

## 7.4 Internationalisation

**Aucune infrastructure i18n.** 0 occurrence de `useTranslation`, `next-intl`, `i18next` ou équivalent.

Tous les textes sont codés en dur en français dans les fichiers TSX. Exemples détectés : "Créer", "Nouveau", "Enregistrer", "Annuler" — des centaines d'occurrences dans les composants.

**Impact business critique :** La cible est internationale (entreprises déployant en UE toutes nationalités). L'interface en français uniquement bloque une large part du marché adressable. Estimation : 70% des prospects hors France potentiellement bloqués.

**Effort de migration :** XL — nécessite d'extraire tous les strings dans des fichiers de traduction, intégrer next-intl ou react-i18next, traduire en anglais (minimum), potentiellement allemand et espagnol.

---

## 7.5 Gestion des états

| État | Gestion | Qualité |
|---|---|---|
| Chargement | Skeleton, spinners, `isLoading` states | ✓ |
| Erreur | Error boundaries sur `/dashboard/error.tsx` | ✓ |
| Auth | Supabase SSR + middleware Next.js | ✓ |
| État global | Pas de Zustand/Redux — Context React local | ✓ (app simple) |

---

## 7.6 Performance rendu

- `ChatInterface.tsx` (1 064 lignes) : composant potentiellement lourd à analyser pour re-renders inutiles
- Pages tools (checklist 1 147, jurisprudence 1 027, resume-arret 733) : pages très volumineuses sans découpage en sous-composants — risque de re-renders inutiles sur les états locaux
- Pas de `useMemo`/`useCallback` systématique détecté (À VÉRIFIER)

---

## 7.7 Responsive et mobile

- Tailwind utilisé avec breakpoints responsive (`sm:`, `md:`, `lg:`) présents dans les composants
- Dashboard conçu principalement pour desktop (outil professionnel B2B)
- Mobile : À VÉRIFIER — pas de test automatisé

---

## 7.8 Problèmes identifiés

### P1 — Absence totale d'internationalisation
Interface 100% française. Bloque l'expansion internationale. Chantier XL nécessitant une décision produit préalable (langues prioritaires : EN, DE, ES ?).

### P2 — ~66 boutons potentiellement sans aria-label
Accessibilité WCAG 2.1 non garantie. Impact : utilisateurs dépendant de lecteurs d'écran.

### P3 — Pages outils trop volumineuses (1 000+ lignes)
`checklist/page.tsx` (1 147 lignes), `jurisprudence/page.tsx` (1 027 lignes). Difficiles à maintenir, risque de re-renders.

### P3 — Pas de tests UI
0 fichier de test pour les 57 composants React ni les 25+ pages dashboard.

---

## 7.9 Score

**70/100** — Dark mode fonctionnel, design system documenté, composants Radix UI accessibles par défaut, gestion erreurs et chargement. Déductions majeures : absence totale i18n, accessibilité partielle non auditée, pages outils monolithiques.
