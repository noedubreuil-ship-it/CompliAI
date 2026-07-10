# ROADMAP PRODUIT COMPLIAI — Chantiers post-lancement

**Date de cadrage :** 2026-07-09
**Statut produit :** en production sur www.compliai.eu
**Mode d'exécution Claude Code :** ATTENTE. Aucun chantier lancé sans "GO Chantier X.Y" explicite de l'utilisateur.

## État de référence au 2026-07-09
- Corpus : 14 276 chunks parent-child, 43 règlements
- Golden Set : 16/16 OK, 0 CRITICAL, 0 WARNING
- Sécurité : 0 CVE CRITICAL, headers HTTP, rate limiting
- Conformité Art. 50 AI Act
- Menu admin + traduction FR dashboard
- Retrieval hybride optimisé (seuil 0.20, article boost, second-pass étendu)

## Règles globales (appliquées à chaque chantier)
- Sonnet 4.6 exclusivement pour parsing/analyse
- Documentation horodatée par chantier
- Commits atomiques `[via claude-code]`
- Staging avant production TOUJOURS
- Validation admin obligatoire avant bascule prod
- Rapport de synthèse en fin de chantier + rollback prêt
- Méthodologie standard : diagnostic → staging → validation → production → documentation

## Points de contrôle obligatoires par chantier
1. Diagnostic préalable + estimation validée
2. Bascule staging après implémentation
3. Validation admin staging par l'utilisateur
4. Bascule production après feu vert
5. Rapport final horodaté
6. Métriques avant/après documentées
7. (impact visible) Screenshots avant/après + test parcours complet

---

## PHASE 1 — Validation corpus & lancement commercial (action utilisateur)
Rôle Claude Code : support technique bug urgent, réponses ponctuelles, doc feedbacks. Aucun nouveau chantier.
- Rejet 193 chunks AI Act staging obsolètes
- Validation 5 batches staging (DSA/DORA/eIDAS2/CRA · Data Act/DMA/DGA · Machines/NIS2 · Commission Guidelines · EDPB Opinions/CJUE)
- Google Ads, LinkedIn Ads, prospection + publications LinkedIn

## PHASE 2 — Conversion & premiers utilisateurs
- **2.1 Onboarding** `claude-code/onboarding-flow` → `RAG_ONBOARDING_FLOW_*.md`. Parcours guidé 5 étapes, persona, emails J+1/J+3/J+7. Cible 60% 1re question, 40% 5+ questions/semaine.
- **2.2 Landing page** `claude-code/landing-page-conversion` → `RAG_LANDING_PAGE_*.md`. Argument 16/16 golden set, personas, preuves, FAQ, Lighthouse 90+.
- **2.3 Emails transactionnels** `claude-code/transactional-emails` → `RAG_TRANSACTIONAL_EMAILS_*.md`. Bienvenue, facturation, renouvellement, réengagement. Test délivrabilité multi-clients.

## PHASE 3 — International & fonctionnalités avancées
- **3.1 Interface anglaise** `claude-code/i18n-english` → `RAG_I18N_ENGLISH_*.md`. i18n complet, détection navigateur, hreflang. Dashboard admin reste FR.
- **3.2 Monitoring activation progressive** `claude-code/activate-monitoring-progressive` → `RAG_MONITORING_ACTIVATION_*.md`. Sources RSS→HTML→spécialisées, workflows GitHub Actions (monitoring 6h, ingestion 1x/j). ⚠️ Règle projet : aucun cron activé sans validation explicite.
- **3.3 Analytics/observabilité** `claude-code/observability-stack` → `RAG_OBSERVABILITY_*.md`. PostHog, métriques business + techniques, dashboard admin, rapport hebdo.

## PHASE 4 — Fonctionnalités différenciantes
- **4.1 Génération documents juridiques** `claude-code/document-generation` → `RAG_DOCUMENT_GENERATION_*.md`. Registre Art.30, doc Art.11 AI Act, DPIA, politiques. PDF + Word. Justifie plan Premium.
- **4.2 Alertes réglementaires** `claude-code/regulatory-alerts` → `RAG_REGULATORY_ALERTS_*.md`. Détection nouveautés, digest hebdo personnalisé.
- **4.3 Bibliothèque de prompts** `claude-code/prompts-library` → `RAG_PROMPTS_LIBRARY_*.md`. 50+ questions types par persona/règlement.

## PHASE 5 — Scale & expansion
- **5.1 i18n DE/ES/IT** `claude-code/i18n-multilingual` → `RAG_I18N_MULTILINGUAL_*.md`
- **5.2 API publique** `claude-code/public-api` → `RAG_PUBLIC_API_*.md`. REST, clés API, OpenAPI, SDK JS/Python, facturation usage.
- **5.3 Intégrations Slack/Teams** `claude-code/integrations-slack-teams` → `RAG_INTEGRATIONS_SLACK_TEAMS_*.md`
- **5.4 Programme partenaires** `claude-code/partners-program` → `RAG_PARTNERS_PROGRAM_*.md`
- **5.5 Plan Enterprise** `claude-code/enterprise-plan` → `RAG_ENTERPRISE_PLAN_*.md`. SSO, DPA, SLA, 500-2000€/mois.

## PHASE 6 — Consolidation long terme
- **6.1 Corpus droits nationaux** `claude-code/national-laws` → `RAG_NATIONAL_LAWS_*.md`. LIL FR, BDSG DE, LOPDGDD ES, etc.
- **6.2 App mobile** `claude-code/mobile-app` → `RAG_MOBILE_APP_*.md`. React Native iOS/Android.
- **6.3 Migration Next.js 15/16** `claude-code/next-migration` → `RAG_NEXT_MIGRATION_*.md`. Corrige 4 HIGH CVE résiduels. Staging étendu 1 semaine min.

## Chantiers bonus (selon feedback marché)
1. Comparateur juridique — règlements côte à côte
2. Calendrier réglementaire — échéances AI Act/RGPD/DSA
3. Simulateur de conformité — questionnaire guidé
4. Mode équipe — partage recherches/historique
5. Export audit — PDF pro rapport annuel
