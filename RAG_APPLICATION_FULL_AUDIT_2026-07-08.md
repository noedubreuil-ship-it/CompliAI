# Rapport d'Audit Complet — Application CompliAI

**Date :** 2026-07-08
**Auditeur :** Claude Code (claude-sonnet-4-6)
**Mode :** Lecture seule — aucune modification
**Données :** Codebase local + requêtes Supabase production live

---

## 1. RÉSUMÉ EXÉCUTIF

### Score Global de Santé : 69/100

| Dimension | Score | Poids | Contribution |
|---|---|---|---|
| Architecture | 72/100 | 15% | +10.8 |
| Base de données | 72/100 | 15% | +10.8 |
| Sécurité | 58/100 | 20% | +11.6 |
| Pipeline RAG | 80/100 | 15% | +12.0 |
| Corpus juridique | 55/100 | 10% | +5.5 |
| API | 62/100 | 10% | +6.2 |
| UI/UX | 70/100 | 5% | +3.5 |
| Performance | 73/100 | 5% | +3.7 |
| Conformité légale | 60/100 | 5% | +3.0 |
| Business | 77/100 | 0% | — |
| **TOTAL** | **69/100** | | |

---

### Top 5 Points Forts

1. **Richesse fonctionnelle exceptionnelle** — 25+ outils métier couvrant l'intégralité du cycle conformité AI Act/RGPD (DPIA, FRIA, ROPA, checklist, classifier, contrats, mémoire, jurisprudence, comparateur EU27, scanner, Cerveau, journal, alertes, API publique, Slack). Rare à ce niveau pour un produit à 49€/mois.

2. **Pipeline RAG mature** — Architecture 4 étapes (monitoring → ingestion → validation admin → indexer production) avec idempotence SHA-256, déduplication multi-niveaux, cache sémantique Upstash, recherche hybride vectorielle + BM25 (migration 049), golden set 16 questions, scripts rechunk par règlement.

3. **Intégration Stripe complète** — Abonnements + packs crédits + portail client + rechargement automatique + webhook signé + idempotence. Modèle de crédits flexible bien conçu. Unit economics excellents (marge brute >97% à toutes les échelles).

4. **52 migrations SQL versionnées** avec blocs ROLLBACK systématiques. Séparation stricte staging/production. RLS Supabase configurée. HNSW ef_search=1000 optimisé.

5. **Qualité code TypeScript strict** — Conventions cohérentes, 62 fichiers de tests sur lib/ai et lib/rag-*, 44 dépendances production seulement (codebase léger), Sentry monitoring.

---

### Top 5 Points Critiques

1. **🔴 AI Act quasi absent du corpus (15 chunks, 10 articles sur 113+)**  
   Le produit se positionne sur AI Act mais le règlement central n'a que 9% de couverture. Cause directe : 4 questions CRITICAL dans le golden set (Q02, Q04, Q05, Q15). Le script `rechunk-aiact.ts` existe (823 lignes) mais n'a pas été exécuté en production.

2. **🔴 2 CVE CRITICAL + 6 HIGH en production (npm audit)**  
   Vulnérabilités connues non corrigées. Risque de sécurité actif.

3. **🔴 Absence totale de headers HTTP de sécurité**  
   Pas de CSP, X-Frame-Options, HSTS, X-Content-Type-Options dans `next.config.mjs`. Exposition aux attaques XSS et clickjacking.

4. **🟠 Interface 100% française — frein à l'expansion internationale**  
   Cible : entreprises internationales déployant en UE. 70% du marché adressable potentiellement bloqué. 0 infrastructure i18n dans le codebase.

5. **🟠 Art. 50 AI Act non respecté (obligation depuis août 2025)**  
   Le chatbot consultant ne se déclare pas explicitement comme IA dans l'interface. Sanction potentielle : jusqu'à 15M€.

---

### Verdict : **QUASI PRÊT POUR LA CROISSANCE**

Le produit est en production stable avec 500+ utilisateurs. Les P0 sécurité (CVE + headers) et conformité (Art.50) sont traçables en quelques heures. Le re-chunking AI Act est le seul P0 avec un effort significatif (L). L'internationalisation est le levier de croissance prioritaire mais représente un chantier XL.

---

## 2. MATRICE DE PRIORITÉS

### P0 — BLOQUANT (traiter cette semaine)

| # | Description | Impact | Effort | Chantier |
|---|---|---|---|---|
| P0.1 | 2 CVE CRITICAL npm en production | Faille sécurité active | S | `npm audit fix` + `npm audit fix --force` |
| P0.2 | Absence headers HTTP sécurité | XSS, clickjacking, HSTS | S | Ajouter `headers()` dans `next.config.mjs` |
| P0.3 | Re-chunking AI Act parent-child (15 chunks → objectif 400+) | 4 questions CRITICAL golden set, qualité consultant dégradée | L | Exécuter `scripts/rechunk-aiact.ts` en staging → validation → production |

### P1 — CRITIQUE (2 semaines)

| # | Description | Impact | Effort | Chantier |
|---|---|---|---|---|
| P1.1 | Art. 50 AI Act — mention IA manquante dans chat | Non-conformité légale active depuis août 2025 | S | Ajouter bandeau/tooltip "Assistant IA" dans ChatInterface.tsx |
| P1.2 | Droit à l'effacement (RGPD Art.17) non implémenté | Non-conformité RGPD, risque réclamation CNIL | M | Endpoint `/api/user/delete-account` + suppression cascade |
| P1.3 | RGPD quasi absent du corpus (8 chunks, 4 articles) | Réponses RGPD incomplètes — cœur de valeur produit | L | Exécuter `scripts/rechunk-rgpd.ts` complet |
| P1.4 | 91 routes generate sans rate limiting | Abus coûts Anthropic possibles | M | Middleware rate-limit sur toutes routes `/api/generate/**` |
| P1.5 | Toutes sources monitoring inactives | Veille réglementaire non opérationnelle | M | Activer sources progressivement (CNIL RSS, EUR-Lex en premier) |
| P1.6 | Analytics produit absents | Décisions produit à l'aveugle, MRR non suivi | M | Intégrer PostHog ou Plausible |

### P2 — IMPORTANT (dans le mois)

| # | Description | Impact | Effort | Chantier |
|---|---|---|---|---|
| P2.1 | Interface 100% française | Blocage expansion internationale | XL | Migration i18n (next-intl) + traduction EN |
| P2.2 | Transferts USA (Anthropic/OpenAI) non documentés | Risque RGPD Art.46 | S | Documenter SCCs dans politique de confidentialité |
| P2.3 | isAdmin non centralisé au middleware | Risque oubli sur nouvelle route admin | M | Middleware Next.js pour routes `/api/admin/**` |
| P2.4 | lib/ai/generators.ts monolithique (1 882 lignes) | Maintenabilité dégradée | M | Découper par domaine métier |
| P2.5 | route /api/test-slack en production | Surface d'attaque inutile | S | Supprimer le fichier |
| P2.6 | 136 documents pending non validés | Corpus potentiel inexploité | M | Session validation admin + promotion production |
| P2.7 | dangerouslySetInnerHTML blog sans sanitisation vérifiée | XSS potentiel | S | Vérifier renderMarkdown + ajouter DOMPurify |
| P2.8 | Onboarding non guidé | Churn activation élevé | M | Flow onboarding étape par étape |

### P3 — AMÉLIORATION (backlog)

| # | Description | Impact | Effort |
|---|---|---|---|
| P3.1 | Couverture tests < 15% sur routes API et UI | Régressions non détectées | XL |
| P3.2 | Chunking parent-child DSA/DMA/CRA (sans hiérarchie) | Qualité réponses sur chapitres entiers | L |
| P3.3 | eIDAS 2, ePrivacy, Charte UE absents du corpus | Lacunes sur textes secondaires | L |
| P3.4 | Documentation OpenAPI manquante | Friction intégrations tierces | M |
| P3.5 | Pages outils > 1 000 lignes (checklist, jurisprudence) | Maintenabilité | M |
| P3.6 | Prix Pro/Enterprise non trouvés dans le code | Documentation tarifaire | S |
| P3.7 | Retry automatique ingestion absent | Documents bloqués sur échec transitoire | S |
| P3.8 | Worktree résiduel .claude/worktrees/ | Pollution grep/métriques | S |

---

## 3. ROADMAP 30 JOURS

### Semaine 1 — P0 (3 chantiers)
- **Jour 1 :** `npm audit fix` → build → déploiement
- **Jour 1 :** Headers HTTP sécurité dans `next.config.mjs`
- **Jours 2-5 :** Re-chunking AI Act en staging → validation admin → promotion production

### Semaine 2 — P1 première moitié
- Art. 50 AI Act : bandeau "Assistant IA" dans ChatInterface.tsx
- Rate limiting sur toutes routes `/api/generate/**`
- Droit à l'effacement : endpoint delete-account

### Semaine 3 — P1 seconde moitié
- Re-chunking RGPD complet (staging → validation → production)
- Activation progressive sources monitoring (CNIL RSS, EUR-Lex)
- Intégration analytics (PostHog recommandé)

### Semaine 4 — P2 sélectionnés
- Documentation transferts USA dans politique de confidentialité
- Middleware isAdmin centralisé
- Validation 136 documents pending + promotion production
- Suppression route test-slack

---

## 4. RECOMMANDATIONS STRATÉGIQUES

### Optimisations de coûts
- **Semantic cache Upstash** : déjà implémenté — vérifier le hit rate. Un bon cache peut réduire les coûts Anthropic de 20-40%.
- **Haiku pour les requêtes simples** : le routing modèle existe (`lib/ai/model-routing.ts`). Vérifier que les requêtes courtes utilisent bien Haiku (5x moins cher que Sonnet).
- **Batching ingestion** : le batch size de 20 documents est optimisé. OK.

### Fonctionnalités manquantes critiques pour la croissance
1. **Internationalisation EN** — Priorité 1 pour le marché international
2. **Onboarding guidé** — Réduire le churn activation
3. **Dashboard analytics DPO** — Page `/dashboard/analytics` existe mais À VÉRIFIER son contenu
4. **Export RGPD / portabilité** — Obligation légale + argument commercial

### Dettes techniques à documenter dans RAG_FUTURE_IMPROVEMENTS.md
- Middleware admin centralisé (section A existante)
- Migration i18n
- Découpage generators.ts
- Tests UI/API (< 15% couverture)

---

## 5. MÉTRIQUES GLOBALES CONSOLIDÉES

| Métrique | Valeur |
|---|---|
| **Codebase** | |
| Total LOC TS/TSX | 104 339 |
| Fichiers TypeScript | 466 |
| Fichiers React | 230 |
| Migrations SQL | 52 |
| Routes API | 100 |
| Composants React | 57 |
| Fichiers de tests | 62 |
| Couverture tests estimée | < 15% (lib/ai + lib/rag-* uniquement) |
| Dépendances production | 44 |
| **Corpus RAG** | |
| Total chunks production | 1 000 |
| Règlements représentés | 22 |
| Chunks avec parent-child | 264 (26%) |
| Couverture AI Act | 9% (10/113+ articles) |
| Couverture RGPD | 4% (4/99 articles) |
| Questions golden set OK | 12/16 (75%) |
| Questions golden set CRITICAL | 4/16 (25%) |
| **Coûts mensuels** | |
| Coût actuel estimé | ~90$/mois |
| Coût à 100 users | ~160$/mois |
| Coût à 500 users | ~675$/mois |
| Coût à 1 000 users | ~1 355$/mois |
| Coût à 5 000 users | ~6 550$/mois |
| Marge brute (tous paliers) | >97% |
| **Sécurité** | |
| CVE CRITICAL | 2 |
| CVE HIGH | 6 |
| Headers HTTP sécurité | 0/6 |
| Routes avec rate limit | 9/100 |
