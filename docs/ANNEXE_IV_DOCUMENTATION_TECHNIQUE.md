# DOCUMENTATION TECHNIQUE — ANNEXE IV AI ACT
# CompliAI — Système d'IA de qualification réglementaire
# Règlement (UE) 2024/1689, Article 11 et Annexe IV
# Version : 1.0 — Juin 2026

---

## IDENTIFICATION

| Champ | Valeur |
|-------|--------|
| **Nom du système** | CompliAI — Assistant de conformité réglementaire IA |
| **Version** | 1.0 |
| **Fournisseur** | CompliAI (opérateur du service) |
| **Date d'établissement** | Juin 2026 |
| **Date de révision** | À réviser annuellement ou en cas de modification substantielle |
| **Classification AI Act** | Risque limité (Art. 50 AI Act — obligations de transparence) |
| **Registre EU AIDA** | [À compléter avant déploiement commercial à grande échelle] |

**Note sur la classification** : CompliAI est un outil d'assistance à la conformité qui fournit
des informations juridiques basées sur les textes officiels de l'UE. Il n'entre pas dans les
catégories Annexe III (haut risque) car il n'est pas utilisé pour des décisions automatisées
ayant des effets juridiques directs sur les personnes. Ses sorties constituent des informations
juridiques, non des avis juridiques contraignants. L'utilisateur conserve un contrôle total
et est clairement informé de cette limitation.

---

## SECTION 1 — DESCRIPTION GÉNÉRALE DU SYSTÈME
*(Annexe IV pt. 1 · Règlement (UE) 2024/1689)*

### 1.1 Description fonctionnelle

CompliAI est un système d'intelligence artificielle de type assistant conversationnel spécialisé
dans le droit européen du numérique et de l'intelligence artificielle. Il fournit :

1. **Consultation juridique IA** : réponses à des questions relatives à l'AI Act, au RGPD, au DSA,
   au DMA, à NIS2, DORA, au Data Act et aux textes associés.
2. **Génération de documents de conformité** : DPIA (Art. 35 RGPD), RoPA (Art. 30 RGPD),
   FRIA (Art. 27 AI Act), documentation technique Annexe IV, checklist de conformité AI Act/RGPD,
   politique IA employés (Art. 4 AI Act), classification AI Act.
3. **Analyse de jurisprudence** : analyse des décisions de la CJUE, du CEPD/EDPB, des DPA nationales.
4. **Scanner de conformité web** : analyse d'une page web au regard du RGPD.

### 1.2 Architecture technique

| Composant | Description |
|-----------|-------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, déployé sur Vercel |
| **Backend** | Next.js API Routes (Node.js runtime), Supabase (PostgreSQL) |
| **Modèle LLM** | Claude (Anthropic) — claude-sonnet-4-5 (payants), claude-haiku-4-5 (gratuit) |
| **Pipeline RAG** | Embeddings OpenAI text-embedding-3-small, base vectorielle pgvector (Supabase) |
| **Corpus légal** | Textes officiels EUR-Lex : AI Act, RGPD, DSA, DMA, NIS2, DORA, Data Act, EDPB Guidelines |
| **Authentification** | Supabase Auth (JWT) |
| **Paiements** | Stripe (abonnements + packs de crédits) |

### 1.3 Finalités et cas d'usage

- Aider les DPO, juristes, responsables conformité et développeurs à comprendre leurs obligations
  au titre du droit européen du numérique.
- Générer des premiers projets de documents de conformité à compléter par un professionnel.
- Identifier les risques de non-conformité dans un système IA ou une activité de traitement.

### 1.4 Utilisateurs cibles

Entreprises européennes (PME, startups, grandes entreprises) et professionnels du droit ou
de la conformité, principalement francophones mais avec support multilingue EU.

---

## SECTION 2 — DESCRIPTION DU DÉVELOPPEMENT
*(Annexe IV pt. 2 · Règlement (UE) 2024/1689)*

### 2.1 Données d'entraînement

CompliAI n'entraîne pas ses propres modèles de langage. Il utilise l'API Claude (Anthropic)
via des appels API. Les données d'entraînement de Claude sont documentées dans la documentation
technique d'Anthropic (à consulter séparément).

### 2.2 Corpus RAG (Retrieval Augmented Generation)

Le système utilise une base de connaissances vectorielle composée exclusivement de :
- Textes officiels publiés au Journal Officiel de l'UE (EUR-Lex) en français
- Lignes directrices officielles du CEPD/EDPB
- Codes de bonnes pratiques officiels (ex. Code de Bonnes Pratiques GPAI)

**Aucune donnée utilisateur n'est incorporée dans le corpus RAG.** Les questions des utilisateurs
ne sont jamais stockées en clair (hash SHA-256 uniquement — Art. 5(1)(c) RGPD minimisation).

### 2.3 Développement du prompt système

Le prompt système est versionné (hash SHA-256 stocké dans ai_interaction_logs). Il contient :
- Des règles anti-hallucination explicites (ne jamais fabriquer de numéros d'article inexistants)
- Des règles de vérification des sources avant citation
- Des limites épistémiques obligatoires (honnêteté sur les incertitudes)
- Un filtrage juridictionnel strict

### 2.4 Métriques de performance

| Métrique | Valeur cible | Méthode de mesure |
|----------|-------------|-------------------|
| Précision articles cités | ≥ 95 % articles valides | Validator automatique post-génération |
| Taux de troncature | < 2 % | Monitoring stopReason = max_tokens |
| Latence P95 consultant | < 30 secondes | Logs ai_interaction_logs.latency_ms |
| Taux d'erreur API | < 0.1 % | Logs d'erreur Vercel |

---

## SECTION 3 — MONITORING, FONCTIONNEMENT ET CONTRÔLE
*(Annexe IV pt. 3 · Règlement (UE) 2024/1689)*

### 3.1 Supervision humaine

CompliAI applique le principe de contrôle humain à deux niveaux :

1. **Au niveau utilisateur** : Chaque réponse est accompagnée d'un avertissement légal explicite
   indiquant qu'elle constitue une information juridique, non un conseil juridique, et recommandant
   la consultation d'un avocat spécialisé.
2. **Au niveau opérateur** : Un mécanisme de feedback (👍/👎) permet aux utilisateurs de signaler
   les réponses incorrectes. Ces signalements sont loggés dans ai_interaction_logs et consultables
   par l'opérateur pour amélioration continue.

### 3.2 Journalisation (Art. 12 AI Act — Logs)

| Donnée loggée | Table | Finalité |
|---------------|-------|----------|
| Hash SHA-256 de la question | ai_interaction_logs.input_hash | Audit (sans donnée personnelle) |
| Outil utilisé | ai_interaction_logs.tool | Analyse d'usage |
| Modèle appelé | ai_interaction_logs.model | Observabilité |
| Latence | ai_interaction_logs.latency_ms | Performance |
| Avertissements | ai_interaction_logs.warnings | Qualité |
| Version du prompt | ai_interaction_logs.prompt_version | Traçabilité |
| Feedback utilisateur | ai_interaction_logs.feedback | Amélioration |

### 3.3 Détection des anomalies

- Troncatures (stopReason = "max_tokens") : loggées + alerte Sentry
- Citations d'articles invalides : validateur post-génération (consultant-citation-validator.ts)
- Questions hors champ : garde-fous (guardrails.ts) avec message de refus explicite

### 3.4 Incidents

Tout incident affectant la qualité des réponses (hallucination documentée, article inexistant
cité, réponse erronée signalée) doit être : documenté dans le journal interne, évalué dans un
délai de 5 jours ouvrés, corrigé via mise à jour du prompt ou du corpus si nécessaire.

---

## SECTION 4 — ADÉQUATION DES MÉTRIQUES DE PERFORMANCE
*(Annexe IV pt. 4 · Art. 15 pertinent)*

### 4.1 Exactitude

Le système intègre plusieurs mécanismes pour limiter les hallucinations :
- Règle d'interdiction absolue de fabriquer des articles (RÈGLE 9.ter)
- Validation post-génération des références d'articles (consultant-citation-validator.ts)
- Réponse uniquement sur les textes présents dans le corpus RAG (Règle 9 auto-vérification)
- Mention obligatoire des incertitudes (Règle 13 honnêteté épistémique)

### 4.2 Robustesse

- Rate limiting par utilisateur (60 requêtes/minute) — protection contre abus
- Garde-fous anti-injection de prompt (guardrails.ts)
- Détection des questions hors champ juridique

### 4.3 Cybersécurité

- Authentification JWT (Supabase Auth)
- Clés API serveur uniquement (jamais exposées côté client)
- Validation des entrées utilisateur (longueur maximale, filtrage injection)
- Escaping HTML systématique dans les emails transactionnels

---

## SECTION 5 — SYSTÈME DE GESTION DES RISQUES
*(Annexe IV pt. 5 · Art. 9)*

### 5.1 Risques identifiés et mesures

| Risque | Probabilité | Impact | Mesure d'atténuation |
|--------|------------|--------|---------------------|
| Hallucination d'articles inexistants | Moyen | Élevé | Validateur citations + Règle 9.ter |
| Sur-conformité (faux positifs d'obligations) | Moyen | Moyen | Règle 9.quater inversion seuils |
| Réponse hors corpus (texte non indexé) | Élevé | Moyen | Règle 9 auto-vérification + mention lacunes |
| Troncature de la réponse | Faible | Moyen | max_tokens augmentés + détection + alerte |
| Injection de prompt malveillante | Faible | Élevé | Garde-fous + filtrage entrée |
| Utilisation pour des décisions automatisées sans supervision | Faible | Critique | Disclaimer légal systématique |

### 5.2 Risques résiduels acceptés

- **Corpus non exhaustif** : certains textes sectoriels nationaux ne sont pas indexés.
  Mitigation : le système indique explicitement les limitations de son corpus.
- **Évolution législative** : les textes sont indexés à une date donnée. Le corpus est mis à jour
  trimestriellement mais des évolutions récentes peuvent ne pas être reflétées.

---

## SECTION 6 — JOURNAL DES MODIFICATIONS
*(Annexe IV pt. 6 · Règlement (UE) 2024/1689)*

| Version | Date | Modifications |
|---------|------|---------------|
| 0.1 | Mai 2026 | Version initiale — consultant + outils de base |
| 0.2 | Juin 2026 | Ajout multilinguisme, nouvelles règles AI (9.quinquies-13), EDPB corpus |
| 1.0 | Juin 2026 | Correctifs critiques v2 : rate limiting, DPIA prompt dédié, Zod validation, HTML escaping, versionnage prompts |

---

## SECTION 7 — NORMES ET SPÉCIFICATIONS TECHNIQUES
*(Annexe IV pt. 7 · Règlement (UE) 2024/1689)*

### Standards appliqués

- **RGPD** (UE 2016/679) : minimisation des données, privacy by design
- **AI Act** (UE 2024/1689) : conformité Art. 50 (transparence), préparation Art. 11
- **EDPB Guidelines on AI** : approche fondée sur les risques
- **ISO/IEC 42001** : Système de management de l'IA (référence, non certifié)

### Dépendances techniques critiques

| Dépendance | Fournisseur | Criticité | Alternative |
|------------|-------------|-----------|-------------|
| Claude API | Anthropic | Critique | Aucune (vendor lock-in documenté) |
| Supabase | Supabase Inc. | Critique | Migration PostgreSQL possible |
| OpenAI Embeddings | OpenAI | Élevée | Remplacement par embeddings open-source |
| Vercel | Vercel Inc. | Élevée | Migration vers autre hébergeur Node.js |

---

## SECTION 8 — DÉCLARATION EU DE CONFORMITÉ
*(Annexe IV pt. 8 · Art. 47)*

CompliAI (Risque limité — Art. 50 AI Act) ne requiert pas de déclaration EU de conformité
obligatoire au sens de l'Art. 47 (réservé aux systèmes à haut risque). Ce document est établi
volontairement dans le cadre des bonnes pratiques de transparence.

**Engagement de conformité** : L'opérateur de CompliAI s'engage à respecter les obligations
de transparence de l'Art. 50 AI Act, notamment l'information claire des utilisateurs sur
l'utilisation d'un système IA.

---

## SECTION 9 — SURVEILLANCE POST-COMMERCIALISATION
*(Annexe IV pt. 9 · Arts 72–73)*

### 9.1 Plan de surveillance

- **Monitoring continu** : ai_interaction_logs — latence, taux d'erreur, warnings
- **Alertes troncature** : Sentry (stopReason = max_tokens)
- **Feedback utilisateur** : système 👍/👎 intégré au consultant
- **Révision du corpus** : trimestrielle, avec vérification des nouvelles publications EUR-Lex
- **Révision du prompt** : à chaque modification significative (versionnée par hash)

### 9.2 Critères de déclenchement d'une révision complète

- Taux de feedback négatif > 15 % sur une période de 7 jours
- Identification d'une hallucination systémique sur un corpus de textes important
- Publication d'un nouveau règlement EU impactant les obligations analysées
- Incident de sécurité (injection, accès non autorisé)

---

## AVERTISSEMENT

Ce document constitue la documentation technique interne de CompliAI conformément aux
exigences de l'Annexe IV du Règlement (UE) 2024/1689. Il doit être mis à jour à chaque
modification substantielle du système et rendu disponible aux autorités compétentes sur
demande (Art. 11(3) AI Act).
