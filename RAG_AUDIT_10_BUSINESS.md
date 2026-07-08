# Audit 10 — Business et Produit

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — Stripe, emails, features, onboarding, analytics

---

## 10.1 Intégration Stripe

### Plans et Tarification

```typescript
// lib/pricing.ts
Plans : free | starter | pro | enterprise
Prix annoncé : 49€/mois (plan Starter)
```

**Routes Stripe identifiées :**
- `POST /api/stripe/checkout` — Checkout abonnement
- `POST /api/stripe/checkout-credits` — Achat pack crédits one-time
- `POST /api/stripe/portal` — Portail client Stripe (gestion abonnement)
- `POST /api/stripe/webhook` — Webhook Stripe
- `POST /api/stripe/confirm-credit-pack` — Confirmation achat crédits
- `GET/POST/DELETE /api/stripe/auto-recharge` — Rechargement automatique
- `POST /api/stripe/setup-payment-method` — Setup PaymentIntent (Stripe Elements)

**Fonctionnalités Stripe implémentées :**
- Abonnements récurrents (checkout mode=subscription)
- Packs de crédits one-time (checkout mode=payment)
- Portail client (annulation, changement de plan)
- Rechargement automatique quand les crédits sont bas
- Setup de méthode de paiement pour rechargement auto
- Idempotence webhook via `processed_stripe_events`
- Attribution des crédits post-paiement

**Robustesse :** Le webhook est correctement sécurisé (HMAC). L'idempotence est implémentée. La logique de mappage prix → plan est dans `lib/stripe/plan-mapping.ts`.

---

## 10.2 Système de Crédits

```typescript
// lib/pricing.ts
CONSULTANT_CREDITS_TYPICAL = { min: 35, typical: 110, max: 220 }
CONSULTANT_MIN_CREDITS = { brief: 18, detailed: 42 }
```

**Modèle :**
- Crédits alloués mensuellement selon le plan
- Crédits supplémentaires achetables en packs
- Rechargement automatique configurable
- `preflightCheck()` avant chaque appel IA
- `billAiCall()` après chaque appel IA (débit en post)
- Alerte email quand les crédits sont bas

---

## 10.3 Emails Transactionnels

**Infrastructure :** Resend (lib/email.ts)  
**From :** `alerts@compliai.eu`

**Emails identifiés dans le code :**
- Alerte crédits bas (`sendLowCreditsAlert` dans lib/credits.ts)
- Rapport d'indexation RAG (`notifier.ts` dans lib/rag-production-indexer)
- Alertes deadlines réglementaires (`/api/cron/deadline-alerts`)
- Rappels deadlines (`/api/cron/deadline-reminders`)

**Template HTML :** Design branded avec header bleu (#003399) CompliAI.

**Lacune :** Pas d'email de bienvenue/onboarding identifié dans le code. L'email de confirmation Supabase Auth est géré par Supabase directement.

---

## 10.4 Analytics

**Sentry :** Monitoring erreurs front+back (`@sentry/nextjs`)

**`ai_interaction_logs` :** Table dédiée aux logs d'interactions IA avec :
- Hash de la question (pour questions répétées)
- Latence
- Nombre de tokens
- Warnings guardrails
- Feedback utilisateur (positif/négatif)
- Version du prompt

**Dashboard admin AI Logs :** `/dashboard/admin/ai-logs` avec agrégats par outil, top questions, latences p50/p95.

**`/dashboard/analytics`** : Page analytics utilisateur — contenu non audité en détail.

**Pas d'analytics marketing** (pas de Mixpanel, Amplitude, PostHog, Plausible identifiés) — à confirmer.

---

## 10.5 Onboarding Utilisateur

**Implémenté :**
- Table `onboarding_steps` (migration 003)
- Route `POST /api/profile/product-funnel` — tracking funnel produit
- Crédits offerts à l'inscription (migration 021 : `free_credits_on_signup`)

**Non identifié :**
- Email de bienvenue
- Guided tour des fonctionnalités
- Checklist d'onboarding dans l'UI

---

## 10.6 Fonctionnalités Implémentées

### Core Conformité (Opérationnel)
- Scanner de conformité
- Classificateur système IA
- Checklist AI Act
- DPIA Art. 35 RGPD
- FRIA Art. 9 AI Act
- ROPA (Registre des traitements)
- Documentation Art. 11 AI Act
- Politique IA
- Contrats et clauses IA
- Mémoire de conformité

### Recherche Juridique
- Consultant RAG (Claude + legal_chunks)
- Jurisprudence CJUE
- Résumé d'arrêt
- Analyse décision DPA
- Explication d'article
- Recherche jurisprudentielle avancée

### Outils Business
- Simulateur obligations
- Comparateur réglements
- Quiz conformité
- Rapport investisseur
- Audit questionnaire rapide (QR)

### Veille et Monitoring
- Journal réglementaire
- Calendrier réglementaire
- Alertes réglementaires
- Sources officielles (12 connecteurs)

### Collaboration
- Organisations multi-utilisateurs
- Partage de documents et audits
- API v1 publique (audits, projets, me)
- Intégrations Slack
- Webhooks

### Cognitif
- Brain (graphe de connaissances personnel avec embeddings)
- Templates de documents
- Registre des traitements

---

## 10.7 Fonctionnalités Annoncées vs Implémentées

D'après le CLAUDE.md (500+ utilisateurs actifs, SaaS en production) et l'analyse du code, toutes les fonctionnalités core semblent implémentées.

**Roadmap V2 identifiée (`V2_ROADMAP.md`) :**
- Chantiers déjà réalisés : RAG automation (phases 0-6)
- En cours : parent-child AI Act, internationalisation, DPA supplémentaires

---

## 10.8 Intégration Slack

```
/api/slack/commands — POST (Slack signing vérification ?)
/api/test-slack — POST (route de debug en production)
/dashboard/integrations — page d'intégration
```

**Attention :** `/api/test-slack` est une route de test présente en production. À sécuriser ou supprimer.

---

## 10.9 API Publique v1

Trois endpoints documentés :
- `GET /api/v1/me` — profil utilisateur
- `GET /api/v1/audits` — liste des audits
- `GET /api/v1/projects` — liste des projets

**Usage :** Accès via API Key (`/dashboard/api-keys`). Permet l'intégration dans les systèmes des clients enterprise.

---

## 10.10 Verdict Business

**Points forts :**
- Richesse fonctionnelle très élevée pour un produit à 49€/mois
- Intégration Stripe robuste (abonnements + crédits + portail + rechargement auto)
- Logs d'interactions IA exploitables pour l'amélioration produit
- API publique pour les cas enterprise
- Modèle crédits flexible (mensuel + packs)

**Lacunes :**
- Interface uniquement en français (frein à l'internationalisation)
- Pas d'email de bienvenue
- Pas d'analytics produit tiers (Mixpanel/Amplitude)
- Route de test Slack en production
- Onboarding utilisateur minimal
