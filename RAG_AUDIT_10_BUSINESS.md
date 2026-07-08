# Section 10 — Business et Produit

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 10.1 Modèle de facturation

**Modèle hybride :** abonnement mensuel + packs de crédits.

| Plan | Crédits/mois | Prix affiché | Cible |
|---|---|---|---|
| Free | 400 | 0€ | Découverte |
| Starter | 4 500 | **49€/mois** | PME, DPO solo |
| Pro | 18 000 | À VÉRIFIER | Équipes conformité |
| Enterprise | 60 000 | À VÉRIFIER | Grands comptes |

**Packs crédits** disponibles séparément (achat one-shot via `/api/stripe/checkout-credits`).

**Rechargement automatique** configurable (`/api/stripe/auto-recharge`).

---

## 10.2 Intégration Stripe

| Fonctionnalité | Statut |
|---|---|
| Abonnements récurrents | ✓ (`/api/stripe/checkout`) |
| Portail client (gestion abonnement) | ✓ (`/api/stripe/portal`) |
| Packs crédits one-shot | ✓ (`/api/stripe/checkout-credits`) |
| Rechargement automatique | ✓ (`/api/stripe/auto-recharge`) |
| Enregistrement méthode paiement | ✓ (`/api/stripe/setup-payment-method`) |
| Webhook Stripe signé | ✓ (`/api/stripe/webhook` — vérification signature) |
| Idempotence webhook | ✓ (`/api/stripe/confirm-credit-pack`) |

Intégration Stripe complète et robuste. Tous les cas d'usage couverts.

---

## 10.3 Fonctionnalités implémentées

20+ outils métier confirmés dans le code :

| Outil | Route | Statut |
|---|---|---|
| Consultant IA (chat) | `/api/chat` | ✓ Production |
| Classifier AI Act | `/api/generate/classifier` | ✓ Production |
| DPIA Art.35 | `/api/generate/dpia` | ✓ Production |
| FRIA Art.27 | `/api/generate/fria` | ✓ Production |
| Documentation Art.11 + Annexe IV | `/api/generate/art11` | ✓ Production |
| ROPA (Registre traitements) | `/api/generate/ropa` | ✓ Production |
| Checklist AI Act | `/api/generate/checklist` | ✓ Production |
| Comparateur 27 États membres | `/api/generate/comparateur` | ✓ Production |
| Générateur contrats IA | `/api/generate/contract` | ✓ Production |
| Générateur politique IA | `/api/generate/policy` | ✓ Production |
| Clauses contractuelles | `/api/generate/clauses-contrat` | ✓ Production |
| Mémoire de conformité | `/api/generate/memoire-conformite` | ✓ Production |
| Investor report | `/api/generate/investor-report` | ✓ Production |
| Simulateur cas pratique | `/api/generate/simulateur` | ✓ Production |
| Recherche jurisprudentielle | `/api/generate/recherche-jurisprudentielle` | ✓ Production |
| Résumé arrêts | `/api/generate/resume-arret` | ✓ Production |
| Analyse décisions autorités | `/api/generate/analyse-decision` | ✓ Production |
| Guide arrêts (stream) | `/api/arrets-guide` | ✓ Production |
| Scanner site web | `/api/generate/scanner` | ✓ Production (bêta) |
| Cerveau (KM personnel) | `/api/brain/**` | ✓ Production |
| Journal réglementaire | `/api/journal` | ✓ Production |
| Calendrier deadlines | `/dashboard/calendar` | ✓ Production |
| Alertes veille | `/dashboard/alerts` | ✓ Production |
| Quiz EU | `/api/generate/quiz` | ✓ Production |
| API publique v1 | `/api/v1/**` | ✓ Production |
| Intégration Slack | `/api/slack/commands` | ✓ Production |

---

## 10.4 Emails transactionnels

`lib/email.ts` gère les emails via Resend. Types détectés :
- Bienvenue nouvel utilisateur
- Alertes crédits bas
- Alertes deadlines réglementaires
- Veille réglementaire (regulatory-watch)
- Notifications équipes

---

## 10.5 Analytics

**Aucun outil d'analytics produit détecté** (pas de PostHog, Mixpanel, Amplitude, Plausible, Google Analytics dans le code applicatif).

Seul Sentry est présent pour le monitoring d'erreurs.

**Impact :** Impossible de mesurer MRR, churn, feature adoption, funnel d'onboarding, NPS. Décisions produit prises à l'aveugle.

---

## 10.6 Onboarding

`app/api/profile/product-funnel/route.ts` suggère un funnel d'onboarding. Interface `/dashboard/overview` comme page d'accueil post-connexion. Pas d'onboarding guidé étape-par-étape détecté dans le code.

---

## 10.7 Problèmes identifiés

### P1 — Absence totale d'analytics produit
Impossible de suivre MRR, churn, activation, rétention. Risque de prendre de mauvaises décisions produit.

### P1 — Interface uniquement en français
Frein majeur à la croissance internationale (cible : entreprises déployant en UE, toutes nationalités).

### P2 — Prix Pro et Enterprise non trouvés dans le code
À VÉRIFIER dans Stripe dashboard. La grille tarifaire complète n'est pas documentée dans le code.

### P2 — Pas d'onboarding guidé
Un SaaS B2B complexe (20+ outils) sans onboarding structuré génère du churn à l'activation.

### P3 — Route test-slack en production
`/api/test-slack/route.ts` ne devrait pas être en production.

---

## 10.8 Score

**77/100** — Intégration Stripe complète et robuste, 20+ outils couvrant le cycle conformité complet, emails transactionnels, API publique v1, Slack. Déductions : absence d'analytics produit, interface FR uniquement, onboarding non guidé.
