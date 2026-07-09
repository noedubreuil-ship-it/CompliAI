# AUDIT_PHASE_1_CARTOGRAPHIE — CompliAI
*Audit réalisé le 24 juin 2026. Lecture du code source uniquement.*

---

## Méthode

Cet inventaire a été produit par lecture directe de l'ensemble des fichiers source. Chaque constat cite le fichier et les lignes examinés. Aucune inférence à partir de la documentation marketing.

---

## 1. Stack technique

| Couche | Technologie | Version | Localisation |
|--------|-------------|---------|--------------|
| Framework | Next.js App Router | 14.2.18 | `package.json` |
| Base de données | Supabase Postgres + pgvector | — | `lib/supabase/` |
| LLM | Anthropic Claude (Haiku 4.5 / Sonnet 4.5 / Opus 4.5) | `@anthropic-ai/sdk` | `lib/ai/client.ts` |
| Embeddings | OpenAI `text-embedding-3-small` 1536D | `openai` | `lib/ai/embeddings.ts` |
| Paiements | Stripe | — | `lib/stripe/` |
| Emails transactionnels | Resend | — | `lib/email.ts` |
| Monitoring | Sentry | `@sentry/nextjs` | `sentry.client.config.ts`, `sentry.server.config.ts` |
| Rate limiting | Upstash Redis REST (optionnel) + in-memory fallback | — | `lib/rate-limit-distributed.ts` |
| Déploiement | Vercel (crons + edge) | — | `vercel.json` |

---

## 2. Architecture globale

```
Utilisateur
  ↓ HTTPS
Next.js App Router (Vercel)
  ├── app/(marketing)/          Pages publiques SEO + blog
  ├── app/(auth)/               Login / reset password
  ├── app/(app)/dashboard/      Interface authentifiée (48 pages)
  └── app/api/                  91 routes API serveur
        ├── /chat               Consultant juridique IA principal
        ├── /audit              Audit de conformité complet (JSON)
        ├── /generate/*         30 générateurs de documents
        └── /stripe/*           Billing, webhooks
              ↓
        lib/ai/                 Orchestration IA
          ├── client.ts         callClaude / streamClaude
          ├── rag.ts            Recherche pgvector + reranking keyword
          ├── national-rag.ts   Corpus national / jurisprudence UE
          └── generators.ts     40+ fonctions de génération
              ↓
        Anthropic API           Claude models
        OpenAI API              text-embedding-3-small (RAG uniquement)
        Supabase                Auth + Postgres + pgvector
```

---

## 3. Composants — Fiches détaillées

---

### 3.1 Chat consultant juridique

**Localisation** : `app/api/chat/route.ts` (802 lignes), `lib/ai/client.ts` (~269 lignes), `lib/ai/prompts/build-consultant-system-prompt.ts`, `lib/ai/prompts/consultant-production-rules.ts` (~282 lignes)

**Fonction réelle** : Route POST `/api/chat`. Pipeline complet en 6 étapes :
1. Auth Supabase + rate limit HTTP (Upstash/in-memory) + preflight crédits
2. Traduction de la question en français si non-francophone (`query-translate.ts`) pour la recherche RAG
3. Recherche multi-corpus : `searchLegalChunks` (pgvector EU statutes), `searchNationalStatuteChunks`, `searchEuCaseLawTexts`, `searchNationalCaseLawTexts`, `searchIntlStandardsTexts`, EUR-Lex live search
4. Filtrage des sources hors-sujet (`filterOffTopicSources`)
5. Composition du contexte RAG (textes EU + jurisprudence + doctrine + portails nationaux)
6. Streaming SSE via `streamClaude`, post-validation citations, récriture si problèmes détectés

**État de maturité** : **Stable, fonctionnel.** C'est le composant le plus mature du codebase.

**Dépendances externes** : Anthropic Claude (streaming), OpenAI embeddings, Supabase pgvector, Upstash Redis (optionnel), Resend (alertes crédits)

**Risques identifiés** :
- Pas de seed Anthropic → non-reproductibilité entre deux requêtes identiques (`app/api/chat/route.ts:590-598` — paramètre `seed` absent de l'appel)
- La détection de langue (`query-translate.ts:22-25`) repose sur une heuristique regex. Un texte juridique anglais avec des mots français communs (« pour », « sur ») sera faussement classifié FR et ne sera pas traduit pour le RAG
- Les `timings` de profiling sont loggés en clair dans les logs Vercel incluant le `userId` (`route.ts:562-572`) — exposition potentielle de PII dans les logs

---

### 3.2 Moteur RAG — corpus EU (legal_chunks)

**Localisation** : `lib/ai/rag.ts` (81 lignes), `lib/ai/embeddings.ts` (22 lignes), `supabase/migrations/001_initial.sql:242-261` (RPC `search_legal_chunks`)

**Fonction réelle** : 
- Embedding de la requête via OpenAI `text-embedding-3-small` 1536 dimensions
- Recherche pgvector avec seuil cosinus (défaut 0.65 hors chat, 0.60 dans le chat)
- Reranking maison : score combiné = 70 % similarité vectorielle + 30 % overlap keyword (`rag.ts:36-44`)
- Corpus : textes UE en français (AI Act FR, RGPD FR, NIS2 FR, DSM FR), lignes directrices EDPB WP243/WP248, Code GPAI — 4 180+ chunks total

**État de maturité** : **Stable.** Le reranker keyword est simple mais efficace pour les requêtes mentionnant un numéro d'article.

**Dépendances externes** : OpenAI API (embeddings), Supabase pgvector

**Risques identifiés** :
- Recherche purement sémantique+keyword, **aucun BM25** — pour les requêtes courtes (2-3 mots techniques : « art. 6 §3 AI Act »), la recall peut être basse
- Le seuil 0.60 dans le chat est inférieur à 0.65 → peut faire remonter des chunks peu pertinents
- L'article chunking max à 4000 chars (`scripts/ingest-legal-docs.ts:~198`) peut couper des articles longs sans conserver la numérotation des paragraphes internes, rendant les citations de sous-paragraphes fragiles

---

### 3.3 Moteur RAG — corpus national et jurisprudence (national_legal_texts)

**Localisation** : `lib/ai/national-rag.ts`, `lib/ai/national-ingest-pipeline.ts`, `supabase/migrations/011_national_legal_texts.sql`, `lib/data/eu-case-law-seeds.ts` + `eu-case-law-extended.ts`, `lib/data/national-case-law-seeds.ts`

**Fonction réelle** :
- Table `national_legal_texts` séparée avec colonnes `country_code`, `domain`, `ecli`, `court`, `judgment_date`
- Jurisprudence CJUE : 8 arrêts seeds core (Google Spain, Schrems I/II, IAB Europe...) + 30+ extended (SCHUFA, Meta, Orange România...)
- Jurisprudence nationale : décisions DPA (CNIL, BfDI...) via `national-case-law-seeds.ts`
- **Attention** : les corpus seeds sont des **synthèses** (`eu-case-law-seeds.ts:3-6` — « synthèse fidèle destinée au pgvector »), pas les textes intégraux EUR-Lex. Les corps sont souvent < 500 caractères pour les seeds core.
- Ingestion cron : `/api/cron/case-law-seeds` (15h04 quotidien), `/api/cron/national-corpus-agents` (horaire)

**État de maturité** : **Stable pour EU, variable pour national.** La qualité des seeds varie — certains arrêts EU ont des corps très courts (< 420 chars, padded artificiellement, `case-law-seeds-ingest.ts:69-76`).

**Risques identifiés** :
- Les corps de jurisprudence paddés (`CASE_LAW_BODY_PAD`, `case-law-seeds-ingest.ts:69`) peuvent fausser les embeddings et remonter des chunks non pertinents
- Aucune vérification de fraîcheur des seeds — si un arrêt est modifié ou complété sur EUR-Lex, le corpus n'est pas mis à jour automatiquement
- Le live fetch EUR-Lex (`EU_CASE_LAW_LIVE_FETCH=1`) est opt-in et non activé en production par défaut

---

### 3.4 Orchestrateur LLM (callClaude / streamClaude)

**Localisation** : `lib/ai/client.ts` (~269 lignes)

**Fonction réelle** : Wrapper Anthropic SDK. Gère :
- Sélection du modèle via `resolveModelApiId` (free→Haiku, paid→Sonnet, Pro/Enterprise+3 outils→Opus)
- Paramètres par outil définis dans `AI_CONFIG` et `TOOL_CONFIGS` (`lib/ai/config.ts`)
- Historique conversationnel tronqué à 6 échanges (`trimHistory`)
- Injection du contexte RAG en tête du message utilisateur
- Billing post-appel via `billAiCall`

**État de maturité** : **Stable.**

**Risques identifiés** :
- Le singleton Anthropic client (`let _client: Anthropic | null = null`, `client.ts:31`) n'est pas thread-safe en théorie, mais Node.js étant single-threaded cela est accepté
- Aucun `seed` passé à l'API Anthropic → réponses non reproductibles entre requêtes identiques
- Le `max_tokens` consultant (8192 par défaut) est proche du plafond de Claude Sonnet sur certains modes de réponse, entraînant des troncatures signalées dans les logs (`stop_reason === "max_tokens"` détecté, `route.ts:613-617`)

---

### 3.5 Système de prompts

**Localisation** : `lib/ai/prompts/` (25+ fichiers TypeScript), `lib/ai/prompts/data/` (fichiers .md)

**Fonction réelle** :
- Stack consultant : `buildConsultantSystemPrompt()` = IDENTITÉ + RÈGLES_PRODUCTION (14.bis règles) + MASTER_SLIM + MISSION_CONSULTANT (`build-consultant-system-prompt.ts`)
- Stack outils : chaque générateur charge son prompt MD via `loadPromptMarkdown()` avec vérification d'intégrité (taille min + sections clés requises)
- `PROMPT_APPLICATION_FOOTER` injecté en fin de chaque prompt MD
- Les 14+ règles de production (`consultant-production-rules.ts`) couvrent : anti-hallucination, filtrage juridictionnel, gestion des seuils numériques, citations ECLI, exemptions, sanctions, structure éditoriale, honnêteté épistémique

**État de maturité** : **Stable et bien structuré.** Le système d'intégrité au démarrage (`assertPromptIntegrity`) est une bonne pratique. Charge à froid validée (pas de dérive silencieuse de prompt).

**Risques identifiés** :
- `consultant-definitive-protocol.ts` (250 lignes, `lib/ai/prompts/`) : **code mort** — jamais importé dans aucun fichier du codebase. Risque de confusion lors de futures modifications.
- Le système prompt consultant totalise ~4 000-5 000 tokens en entrée systématiquement, pesant sur les coûts Haiku (plan free)
- Certains prompts MD (`analyseur-decisions-autorites-v1.md`, `generateur-clauses-ia-v1.md`) ont des règles de format très prescriptives qui peuvent entrer en conflit avec l'instruction de langue (`buildToolLanguageAddendum`) si le format impose des titres en français

---

### 3.6 Générateurs de documents (30 routes /api/generate/*)

**Localisation** : `app/api/generate/*/route.ts`, `lib/ai/generators.ts` (~1 882 lignes)

**Fonction réelle** : 30 routes de génération de documents structurés. Pipeline standard : auth → enrichissement RAG national → appel LLM → extraction JSON → sauvegarde `generated_documents` ou `contract_analyses`.

**Matrice des générateurs** :

| Générateur | Prompt système | JSON validé | SystemAddendum langue | Billing tool |
|-----------|----------------|-------------|----------------------|-------------|
| checklist | `compliance-checklist-interactive-v1.md` | ✅ Zod | ✅ | `checklist` |
| dpia | Prompt générique hardcodé | ❌ Zod | ✅ | `dpia` |
| ropa | `ropa-registre-art30-v1.md` | ✅ Zod (partial) | ✅ | `ropa` |
| fria | `fria-art27-ai-act-v1.md` | ❌ Zod | ✅ | `doc_fria` |
| policy | `employee-policy-ia-v1.md` | ❌ Zod | ✅ | `doc_memoire` ⚠️ |
| art11 | `art11-annex-iv-v1.md` | ❌ Zod | ❌ | `doc_art11` |
| contract | `third-party-contract-analysis-v1.md` | ❌ Zod | ❌ | `contract` |
| scanner | `scanner-page-web-v1.md` | ❌ Zod | ❌ | `scanner` |
| classifier | `ai-act-classifier-v1.md` | ❌ Zod | ❌ | `classifier` |
| jurisprudence | `jurisprudence-eu-commentaire-addendum-v2.md` | ✅ Zod | ✅ | `jurisprudence` |
| comparateur | `comparateur-legislations-eu27-v1.md` | ✅ Zod | ❌ | `comparateur` |
| plan-memoire | Prompt générique + user MD cahier | ❌ Zod | ❌ | `plan-memoire` |
| memoire-conformite | Prompt générique + user MD cahier | ❌ Zod | ❌ | `memoire-conformite` |
| explication-article | Prompt générique + user MD cahier | ❌ Zod | ❌ | `explication-article` |
| investor-report | Prompt générique + user MD cahier | ❌ Zod | ❌ | `investor-report` |
| audit-qr | Prompt générique + user MD cahier | ❌ Zod | ❌ | `audit` |
| quiz | `quiz-eu-etudiants-v1.md` | ❌ Zod | ❌ | `quiz` |
| simulateur | `simulateur-cas-pratique-v1.md` | ❌ Zod | ❌ | `simulateur` |
| recherche-jp | `recherche-jurisprudentielle-eu-v1.md` | ❌ Zod | ❌ | `jurisprudence` |
| resume-arret | `resume-arrets-etudiants-v2.md` | ❌ Zod | ❌ | `arrets_guide` |
| clauses-contrat | `generateur-clauses-ia-v1.md` | ❌ Zod | ❌ | `clauses-ia` |
| analyse-decision | `analyseur-decisions-autorites-v1.md` | ❌ Zod | ❌ | `analyse-decision` |

**Observations critiques** :
- La DPIA utilise `generateDocument` avec un **prompt générique** (`lib/ai/generators.ts:1462-1473`) — aucun prompt spécifique DPIA. C'est le seul outil majeur de conformité RGPD sans cahier dédié
- `policy` route utilise le billing tool `doc_memoire` au lieu de `policy` (`generate/policy/route.ts:24`) — mauvaise attribution dans les métriques d'usage
- 14 des 22 générateurs ne passent pas par validation Zod — la sortie JSON peut être malformée et renvoie une erreur 500 non explicite à l'utilisateur
- `export-pdf` et `certificate` ne font pas d'appel IA (génération PDF pure) mais sont dans `/api/generate/` — confusion possible sur leur nature

**État de maturité** : **Stable pour les outils à prompt dédié, prototype pour les outils génériques.**

---

### 3.7 Système de crédits

**Localisation** : `lib/credits.ts` (362 lignes), `lib/pricing.ts` (117 lignes), `supabase/migrations/006_credits.sql`, `lib/ai/bill-ai-call.ts`

**Fonction réelle** :
- RPC Postgres atomiques `consume_credits` et `grant_credits` pour éviter les race conditions
- Plans : free 400/mois, starter 4 500, pro 18 000, enterprise 60 000
- Modèles : Haiku (0.5/2.5 per 1K), Sonnet (2/10), Opus (10/50)
- Multiplicateurs : Opus premium ×2, consultant ×1.25, consultant detailed ×1.25×1.6 = ×2
- Alertes email low credits à 20 % et 5 % de l'allocation mensuelle

**État de maturité** : **Globalement stable, mais avec un bug critique sur le rate limiting Postgres.**

**Bug critique** (`lib/credits.ts:61-73`) :
```
// Si l'upsert échoue (ligne existante), on incrémente manuellement
const { data: updated } = await admin
  .from("ai_rate_limits")
  .update({ count: admin.rpc("increment_count" as never, {}) })
  ...
// Fallback : on autorise en cas d'erreur DB pour ne pas bloquer les users
return true;
```
L'upsert sur conflit de clé primaire retourne une erreur au lieu de mettre à jour (comportement Supabase PostgREST). Le code tente alors d'appeler `admin.rpc("increment_count")` qui **n'existe pas** dans le schéma DB. L'update est donc systématiquement un no-op. Résultat : **le rate limiting Postgres (`ai_rate_limits`) ne fonctionne pas** — tous les utilisateurs peuvent dépasser leur limite de requêtes par minute tant que le rate limit HTTP Upstash/in-memory (couche supérieure) tient. Sans Upstash configuré, la protection est en mémoire par instance Vercel — inefficace en multi-instance.

---

### 3.8 Système de billing Stripe

**Localisation** : `lib/stripe/`, `app/api/stripe/`, `supabase/migrations/007_credit_packs.sql`

**Fonction réelle** :
- Abonnements (monthly recurring) et credit packs (one-shot)
- Webhook Stripe idempotent via table `processed_stripe_events`
- Portail client Stripe pour gestion des abonnements
- Plans mappés dans `lib/stripe/plans.ts`

**État de maturité** : **Stable.**

**Risques identifiés** :
- `scripts/fulfill-credit-pack-once.ts` contient un **session ID Stripe live hardcodé** — risque de double fulfillment si le script est exécuté à nouveau
- `supabase/migrations/022_credit_pack_stripe_price_ids.sql` insère des placeholder `''` pour les price IDs Stripe — les credit packs n'ont pas de price IDs configurés en DB (à vérifier en production)

---

### 3.9 Audit de conformité complet

**Localisation** : `app/api/audit/route.ts` (~312 lignes)

**Fonction réelle** : POST `/api/audit`. Génère un rapport JSON structuré d'audit de conformité à partir d'un questionnaire. Limites par tier (nombre d'audits/mois). Supporte les webhooks outbound. Billing tool `audit` → Opus sur Pro/Enterprise.

**État de maturité** : **Stable.**

**Risques identifiés** :
- Le prompt système de l'audit est injecté via `generateDocument` (prompt générique) — contrairement aux outils spécialisés, l'audit n'a pas de cahier métier dédié distinct de la route elle-même
- La logique de limite mensuelle par plan est dans la route, non dans la DB → désynchronisation possible si plusieurs instances s'exécutent simultanément

---

### 3.10 Authentification et session

**Localisation** : `middleware.ts` (79 lignes), `app/(auth)/`, `lib/supabase/`, `app/api/auth/`

**Fonction réelle** :
- Supabase SSR via `@supabase/ssr`, cookie-based
- Middleware protège `/dashboard/*` → redirect `/auth/login`
- Route `/api/auth/request-reset` avec rate limiting DB (`auth_rate_limits`, migration 024)
- Triggers Postgres `handle_new_user` → création automatique profil + 400 crédits gratuits

**État de maturité** : **Stable.**

**Risques identifiés** :
- Le rate limit sur `/api/auth/request-reset` utilise la même table `ai_rate_limits` que le rate limit IA — si le bug `checkRateLimit` (§3.7) persiste, les protections anti-brute-force sur le reset password sont aussi inefficaces

---

### 3.11 Pipeline d'ingestion du corpus (scripts)

**Localisation** : `scripts/ingest-legal-docs.ts` (355 lignes), `scripts/fetch-eurlex-fr.ts`, `scripts/ingest-national-legal-texts.ts`, `lib/ai/national-ingest-pipeline.ts`, `lib/ingest/`

**Fonction réelle** :
- Ingestion des textes UE (`scripts/data/*.txt`) avec chunking article-level + sub-chunking paragraphe si > 4000 chars
- Fetch automatique depuis EUR-Lex (HTML → strip → YAML front-matter)
- Ingestion nationale via agents cron (scraping portails législatifs EU27) ou seeds statiques
- Embeddings OpenAI par batch, upsert dans `legal_chunks` ou `national_legal_texts`

**État de maturité** : **Fonctionnel, mais fragile pour l'ingestion nationale en temps réel.**

**Risques identifiés** :
- L'ingestion EUR-Lex live dépend de la disponibilité des URLs hardcodées — pas de retry exponentiel ni de circuit breaker documenté
- Le scraping national (`national-corpus-agents`) tente de fetcher des portails législatifs qui peuvent changer leur structure HTML sans notification

---

### 3.12 Exports PDF

**Localisation** : `lib/pdf/` (multiples fichiers), `app/api/generate/*/pdf/route.ts`, `@react-pdf/renderer`

**Fonction réelle** : Génération PDF côté serveur via React PDF. Couvre : audit, art11, dpia, ropa, fria, policy, contract, checklist. Export du chat consultant via `app/api/consultant/export-pdf/route.ts`.

**État de maturité** : **Stable.**

**Risques identifiés** :
- `@react-pdf/renderer` bundle lourd — peut allonger les cold starts Vercel
- Les PDF sont générés on-demand sans mise en cache — régénération à chaque appel

---

### 3.13 Monitoring et observabilité

**Localisation** : `sentry.client.config.ts`, `sentry.server.config.ts`, `lib/ai/monitoring.ts`, logs structurés JSON

**Fonction réelle** :
- Sentry : client (`NEXT_PUBLIC_SENTRY_DSN`) + serveur (`SENTRY_DSN`), prod uniquement, traces 20 % client / 10 % serveur
- Sentry `captureException` dans les `error.tsx` Next.js (ajouté v0.2)
- `logAIInteraction` (`lib/ai/monitoring.ts`) persiste dans `ai_interaction_logs` : question, réponse, warnings guardrails, tokens, latence
- Timings détaillés loggés côté console à chaque chat (`route.ts:559-573`)

**État de maturité** : **Partiellement actif.** Sentry n'est activé qu'en production et ne dispose d'aucun dashboard personnalisé documenté. Le logging `ai_interaction_logs` est fonctionnel mais non exploité dans l'UI admin.

**Risques identifiés** :
- Les deux variables DSN (`NEXT_PUBLIC_SENTRY_DSN` et `SENTRY_DSN`) doivent être distinctement configurées — si l'une manque, les erreurs de la couche correspondante ne remontent pas
- Aucun alerting Sentry sur les erreurs 5xx dans `/api/chat` ni sur les `stop_reason === "max_tokens"` documenté comme objectif de monitoring

---

### 3.14 Organisations et API publique

**Localisation** : `supabase/migrations/009_organizations_webhooks.sql`, `app/api/organizations/`, `app/api/user/api-keys/`, `app/api/v1/`

**Fonction réelle** :
- Migration 009 crée les tables `organizations`, `organization_members`, `webhook_endpoints` — mais la page `/dashboard/team` peut être cassée si cette migration n'a pas été appliquée en production
- Routes `/api/v1/me`, `/api/v1/projects`, `/api/v1/audits` — API publique beta promue sur la page pricing

**État de maturité** : **Prototype / incomplet.** L'API v1 existe mais sa complétude fonctionnelle et sa documentation sont inconnues sans tests d'exécution.

**Risques identifiés** :
- La page pricing promet « Webhooks / API (bêta) » mais l'implémentation n'est pas documentée ni testée publiquement
- La migration 009 contient ~250 lignes de SQL incluant des politiques RLS — risque de conflit si appliquée sur une DB avec migrations partielles

---

### 3.15 Blog et pages marketing

**Localisation** : `app/(marketing)/blog/`, `lib/blog/articles.ts`

**Fonction réelle** : 5 articles statiques TypeScript (TS objects, pas MDX). Pages `/blog` (listing) et `/blog/[slug]` (article) avec métadonnées SEO. Un renderer Markdown minimal (`renderMarkdown` dans `page.tsx`) convertit la chaîne article en HTML via regex.

**État de maturité** : **Stable mais fragile.**

**Risques identifiés** :
- Le renderer Markdown est une série de `.replace()` regex (`blog/[slug]/page.tsx:55-80`) — non exhaustif, peut produire du HTML malformé sur des articles avec imbrication complexe (listes dans blockquotes, tableaux multiples)
- Les articles sont des strings brutes — injection XSS possible si un article inclut du HTML malveillant (atténué par `dangerouslySetInnerHTML` sur un contenu statique TypeScript contrôlé, mais à surveiller si le process d'ajout d'articles est collaboratif)

---

### 3.16 Composants morts (code jamais appelé)

| Fichier | Lignes | Raison |
|---------|--------|--------|
| `lib/ai/prompts/consultant-definitive-protocol.ts` | ~250 | Aucun import dans le codebase |
| `components/dashboard/DashboardNav.tsx` | ~200 | Legacy, orphelin — remplacé par `dashboard-navbar.tsx` |
| `LEGAL_SYSTEM_PROMPT` alias dans `lib/ai/prompts.ts` | — | Alias legacy vers `buildSystemPrompt` |
| `app/api/legal-tools/route.ts` | — | Usage non confirmé, à vérifier |
| `scripts/fulfill-credit-pack-once.ts` | 19 | Script one-shot, ne doit plus être exécuté |

---

## 4. Dépendances externes — Résumé des risques

| Dépendance | Usage | Single point of failure | Alternative |
|------------|-------|------------------------|-------------|
| Anthropic Claude | Tous les appels IA | ✅ Oui — aucun fallback | Non prévu |
| OpenAI embeddings | RAG uniquement | ✅ Oui — aucun fallback | Voyage AI, Cohere (prévu?) |
| Supabase | Auth + DB + pgvector | ✅ Oui | — |
| Stripe | Billing | ✅ Oui | — |
| Resend | Emails | ⚠️ Partiel — Supabase SMTP fallback | Supabase SMTP |
| Upstash Redis | Rate limiting | ❌ Fallback in-memory | In-memory (faible en multi-instance) |
| EUR-Lex | Ingestion corpus | ⚠️ Partiel — seeds statiques fallback | Seeds |
| Crisp | Chat support | ❌ Composant UI uniquement | — |

---

## 5. Tests

**Localisation** : `lib/ai/*.test.ts` (~30 fichiers), `vitest` configuré

**Couverture observée** :
- Tests unitaires sur les prompts, guardrails, génération de schema Zod, billing
- Aucun test d'intégration API documenté
- Aucun test end-to-end (Playwright / Cypress absent des dépendances)
- Tests axés sur la logique de prompt, pas sur le comportement runtime du pipeline RAG

---

## 6. Infrastructure cron (Vercel)

| Cron | Heure | Objet | État |
|------|-------|-------|------|
| `regulatory-watch` | 08:00 | Veille réglementaire | Stable |
| `low-credits` | 09:00 | Alertes crédits bas | Stable |
| `deadline-reminders` | 08:30 | Rappels échéances | Stable |
| `deadline-alerts` | 08:00 | Alertes AI Act | ⚠️ Même heure que regulatory-watch |
| `national-corpus-agents` | toutes les heures | Corpus national EU27 | Potentiellement coûteux |
| `case-law-seeds` | 04:15 | Seeds jurisprudence | Stable |
| `supplementary-corpus` | 04:30 dim. | Corpus ICO/intl | Stable |
| `benchmark-aggregation` | 03:00 | Agrégation benchmarks | Nouveau (v0.2) |

**Risque** : `regulatory-watch` et `deadline-alerts` déclenchés à 08:00 simultanément — compétition possible sur les ressources Vercel (cold starts parallèles).

---

## 7. Synthèse des risques par criticité

### Critiques (bloquants potentiels)

| Ref | Fichier | Nature |
|-----|---------|--------|
| R-01 | `lib/credits.ts:61-73` | Bug checkRateLimit : RPC `increment_count` inexistante → rate limiting Postgres inopérant |
| R-02 | `lib/credits.ts:61-73` | Même bug affecte le rate limiting auth (reset password) |
| R-03 | Anthropic API | Aucun fallback — toute indisponibilité Anthropic coupe tous les outils |
| R-04 | `app/api/generate/dpia/route.ts` | DPIA sans prompt spécialisé — outil majeur sur prompt générique |

### Majeurs (dégradation qualité)

| Ref | Fichier | Nature |
|-----|---------|--------|
| R-05 | `lib/ai/client.ts` | Aucun `seed` API → non-reproductibilité |
| R-06 | `lib/data/eu-case-law-seeds.ts:69-76` | Bodies jurisprudence paddés → embeddings bruités |
| R-07 | `app/api/generate/*/route.ts` | 14/22 générateurs sans validation Zod → erreurs silencieuses |
| R-08 | `lib/ai/prompts/consultant-definitive-protocol.ts` | Code mort créant confusion de maintenance |
| R-09 | `scripts/fulfill-credit-pack-once.ts` | Session Stripe live hardcodée → risque double fulfillment |

### Mineurs (dette technique)

| Ref | Fichier | Nature |
|-----|---------|--------|
| R-10 | `app/api/generate/policy/route.ts:24` | Billing tool key `doc_memoire` au lieu de `policy` |
| R-11 | `app/(marketing)/blog/[slug]/page.tsx` | Renderer Markdown maison fragile |
| R-12 | `lib/rate-limit-distributed.ts` | Sans Upstash, rate limiting in-memory inefficace multi-instance |
| R-13 | `vercel.json` | `regulatory-watch` et `deadline-alerts` à 08:00 simultanément |

---

*Fin de la Phase 1. Ce document constitue la base factuelle exclusive des phases suivantes.*
