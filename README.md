# CompliAI

**Conformité réglementaire IA européenne pour les startups et PME.**

CompliAI est une plateforme SaaS qui aide les créateurs de solutions IA à naviguer l'AI Act, le RGPD, le DSA et le DMA, en transformant des textes de loi complexes en plans d'action clairs.

## Stack technique


| Composant  | Technologie                                 |
| ---------- | ------------------------------------------- |
| Frontend   | Next.js 14 App Router + Tailwind CSS        |
| Backend    | Next.js Route Handlers (Node.js)            |
| Auth + DB  | Supabase (PostgreSQL + pgvector + RLS)      |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| LLM        | Anthropic Claude                            |
| Paiements  | Stripe                                      |
| PDF        | `@react-pdf/renderer`                       |
| Emails     | Resend                                      |
| Cron       | Vercel Cron Jobs                            |


## Installation

```bash
npm install
cp .env.local.example .env.local
# Remplir les variables d'environnement
```

## Variables d'environnement

Copiez `.env.local.example` en `.env.local` et renseignez :

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_STARTER_PRICE_ID` + `STRIPE_PRO_PRICE_ID`
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

## Base de données (Supabase)

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Activez l'extension `vector` dans **Database > Extensions**
3. Exécutez la migration SQL dans **SQL Editor** :

```sql
-- Copier-coller le contenu de supabase/migrations/001_initial.sql
```

## Ingestion des textes de loi

```bash
# Ingère tous les règlements (AI Act, RGPD, DSA, DMA, Data Act)
npm run ingest

# Ingère un seul règlement
REGULATION=AI_ACT npm run ingest
```

## Développement

```bash
npm run dev
```

## Stripe Webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Déploiement (Vercel)

1. Connectez votre repo GitHub à Vercel
2. Ajoutez toutes les variables d'environnement
3. Le cron `vercel.json` s'exécutera automatiquement (scan EUR-Lex quotidien à 8h)

## Fonctionnalités

### Mode 1 : Project Scanner

Formulaire multi-étapes → analyse Claude → verdict AI Act/RGPD + roadmap + estimation coûts + PDF investor-ready (Pro).

### Mode 2 : Consultant juridique (RAG)

Chat interactif avec RAG pgvector → réponses citant les articles exacts + liens EUR-Lex. Streaming.

### Mode 3 : Espace Projet

- Kanban de suivi des issues bloquantes (open → in_progress → resolved)
- Registre des systèmes IA (obligatoire Art. 49 AI Act) avec export CSV

### Mode 4 : Veille réglementaire

Cron quotidien → scan EUR-Lex → analyse d'impact par projet → alertes email (Resend).

## Plans tarifaires


| Plan       | Prix      | Audits   | PDF | Veille |
| ---------- | --------- | -------- | --- | ------ |
| Gratuit    | 0€        | 1/mois   | Non | Non    |
| Starter    | 49€/mois  | 3/mois   | Non | Non    |
| Pro        | 199€/mois | Illimité | Oui | Oui    |
| Enterprise | Sur devis | Illimité | Oui | Oui    |


## Avertissement légal

Les analyses générées par CompliAI constituent des **informations juridiques générales**, non des conseils juridiques personnalisés.
Consultez un avocat qualifié pour toute décision engageant la responsabilité de votre organisation.