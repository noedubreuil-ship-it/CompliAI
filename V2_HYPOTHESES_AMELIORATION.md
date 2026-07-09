# V2_HYPOTHESES_AMELIORATION — CompliAI
*Produit le 24 juin 2026. Chaque hypothèse est ancrée dans un constat des Phases 1, 2 ou 3.*

---

## Catégorie A — Qualité juridique du moteur

---

### H01 — Prompt DPIA dédié

**Problème adressé** : Phase 2, E04a — La DPIA (art. 35 RGPD) est l'outil central pour les DPO. Elle tourne actuellement sur `generateDocument` avec une dizaine de lignes de prompt générique, alors que les 15 autres outils disposent chacun d'un cahier métier de 4 000 à 20 000 caractères. `app/api/generate/dpia/route.ts`.

**Hypothèse d'amélioration** : Créer `lib/ai/prompts/data/dpia-art35-rgpd-v1.md` — cahier métier DPIA structuré selon les 9 critères WP248, les 3 types de traitements à AIPD obligatoire, les 7 éléments minimaux art. 35 §7, et les mesures d'atténuation catégorisées. Passer la route DPIA de `generateDocument` générique à `generateDpiaDocument` avec son propre prompt loader + vérification d'intégrité.

**Impact attendu** : Qualité juridique du document livré alignée sur les standards DPO professionnels. Réduction des hallucinations de structure (ex. "paragraphe b) de l'article 35" inventé). Différenciation produit sur le cas d'usage le plus fréquent en RGPD.

**Effort estimé** : Moyen (2-3 semaines : rédaction du cahier métier + plomberie technique)

**Risque d'introduction** : Régression sur le format JSON attendu par le frontend si le nouveau prompt change la structure de sortie. Mitiger avec un schéma Zod dédié.

**Priorité proposée** : **P0** — L'outil le plus stratégique est actuellement le moins bien implémenté.

**Métrique de succès** : Note qualitative par panel de 5 DPO : score moyen > 4/5 sur la complétude des 7 éléments art. 35 §7 dans la sortie générée, contre score actuel mesuré avant déploiement.

---

### H02 — Golden-set de régression qualité juridique

**Problème adressé** : Phase 3, Critère 7 (1/5) — Deux requêtes identiques peuvent produire des qualifications divergentes. Aucun mécanisme ne détecte les régressions de qualité après modification du prompt ou du corpus.

**Hypothèse d'amélioration** : Créer un golden-set de 20 à 30 questions de référence couvrant les cinq régimes AI Act (haut risque, GPAI, pratique interdite, transparence, transfert international) et les cinq cas RGPD les plus fréquents. Pour chaque question : réponse de référence validée par un juriste, critères de validation (articles cités, exemptions identifiées, régime de sanctions mentionné). Intégrer dans un test CI (`vitest`) qui appelle le pipeline chat en mode déterministe (température 0, prompt fixe) et valide les critères.

**Impact attendu** : Détection immédiate des régressions après modification d'un prompt ou d'un chunk RAG. Mesure objective et reproductible de la qualité juridique dans le temps.

**Effort estimé** : Moyen (2-3 semaines : définition du golden-set + validation juriste + outillage CI)

**Risque d'introduction** : Faux positifs si les critères de validation sont trop stricts → CI bloquant. Commencer par des assertions structurelles (articles présents, pas d'ECLI hors-RAG) avant les assertions sémantiques.

**Priorité proposée** : **P0** — Sans golden-set, toute modification de prompt ou de corpus est un déploiement à l'aveugle.

**Métrique de succès** : 0 régression non détectée sur les 30 questions de référence en CI pendant 3 mois consécutifs.

---

### H03 — Enrichissement corpus RAG — textes sectoriels manquants

**Problème adressé** : Phase 3, Critère 1 (3/5) — 9 textes cités dans le protocole universel comme applicables sont absents du corpus : LED, DORA, CRA, MDR, IVDR, EHDS, Convention 108+, DPF 2023, EDPB Opinion 28/2024.

**Hypothèse d'amélioration** : Ingérer par ordre de priorité :
1. Directive (UE) 2016/680 (LED) — IA dans les services répressifs (FR depuis EUR-Lex)
2. Règlement (UE) 2022/2554 (DORA) — IA dans la finance (FR depuis EUR-Lex)
3. Décision d'adéquation Data Privacy Framework (2023) — transferts UE-USA (FR)
4. EDPB Opinion 28/2024 — IA et données personnelles (PDF EDPB)
5. Convention 108+ — droit du Conseil de l'Europe (texte officiel)

Via le pipeline existant `scripts/ingest-legal-docs.ts` avec YAML front-matter.

**Impact attendu** : Couverture des questions sur IA dans la finance, IA dans les services répressifs, IA en santé. Le modèle passera de "Situation C" (aucune source) à "Situation A/B" sur ces sujets. Réduction des hallucinations sur les cas sectoriels.

**Effort estimé** : Petit (3-5 jours par lot : fetch + nettoyage + ingestion + test)

**Risque d'introduction** : Chunks supplémentaires peuvent augmenter le bruit RAG si les seuils cosinus sont trop bas. Vérifier la distribution de similarité sur le golden-set après chaque ingestion.

**Priorité proposée** : **P1** — Impact qualité direct, effort faible.

**Métrique de succès** : Couverture source (Situation A ou B) sur 90 % des questions du golden-set liées aux régimes sectoriels, contre < 40 % actuel.

---

### H04 — Validation post-génération étendue aux générateurs de documents

**Problème adressé** : Phase 3, Critère 6 (3/5) + Phase 2, E04b/E06b/E11b — Les 14 générateurs sans Zod (DPIA, FRIA, classifier, art11, scanner, etc.) livrent leur JSON brut sans validation de structure ni de cohérence interne.

**Hypothèse d'amélioration** : Créer des schémas Zod pour les 5 générateurs à enjeu juridique le plus élevé (DPIA, FRIA, art11, classifier, scanner). Ajouter dans `runGenerateRoute` un passage de validation post-extraction JSON : si la validation échoue, retourner une erreur explicite avec les champs manquants au lieu d'un 500 silencieux.

**Impact attendu** : Réduction des erreurs silencieuses côté client. Messages d'erreur exploitables pour l'utilisateur. Détection précoce des dérives de format des modèles Anthropic lors des mises à jour.

**Effort estimé** : Moyen (1-2 semaines : définition des 5 schémas + intégration)

**Risque d'introduction** : Schéma trop strict → rejet de réponses valides avec champs optionnels absents. Commencer par des schémas `.partial()` Zod.

**Priorité proposée** : **P1**

**Métrique de succès** : Taux d'erreurs 500 non-explicites sur les 5 générateurs cibles passant de > 0 à 0 sur 30 jours post-déploiement.

---

### H05 — Retrieval hybride BM25 + vecteur pour requêtes courtes

**Problème adressé** : Phase 3, Critère 2 (3/5) — La recherche est purement sémantique + overlap keyword simple. Les requêtes courtes techniques ("art. 6 §3 AI Act") ont un `keywordScore` quasi nul (mots < 3 chars exclus, "AI" et "art" exclus).

**Hypothèse d'amélioration** : Implémenter BM25 côté Postgres via `pg_bm25` (extension Supabase Labs) ou via une requête full-text search `tsvector` sur `legal_chunks.content`. Combiner le score BM25 avec le score cosinus en post-fetch : `score = cosine × 0.6 + bm25 × 0.4`. Configurer `tsvector` en dictionnaire `french` pour la lemmatisation.

**Impact attendu** : Amélioration significative du recall sur les requêtes courtes avec numéros d'articles ou termes techniques. Réduction de 20-30 % du taux de "Situation C" (aucune source pertinente) estimé.

**Effort estimé** : Grand (1-2 mois : activation extension, index tsvector, refactoring pipeline RAG, tests de régression)

**Risque d'introduction** : Performance — indexation BM25 en Supabase peut ralentir les insertions lors de l'ingestion. `pg_bm25` est une extension expérimentale (Supabase Labs, pas stable).

**Priorité proposée** : **P2** — Impact qualité réel mais effort important et risque technique.

**Métrique de succès** : Recall@6 sur golden-set (proportion de questions ayant au moins 1 chunk pertinent dans les 6 premiers résultats) passant de valeur mesurée à > 85 %.

---

### H06 — Déduplication et correctif des chunks jurisprudence paddés

**Problème adressé** : Phase 1, R-06 — Les seeds de jurisprudence EU core ont des corps paddés (`CASE_LAW_BODY_PAD`, `lib/ingest/case-law-seeds-ingest.ts:69-76`). Des corps < 500 chars génèrent des embeddings bruités.

**Hypothèse d'amélioration** : Remplacer les corps paddés par les textes réels des 8 arrêts EU core via fetch EUR-Lex (les textes intégraux CJUE sont publics). Écrire les corps dans des fichiers `.txt` sous `scripts/data/case-law/` avec le pipeline d'ingestion existant. Mettre à jour les seeds pour supprimer le padding.

**Impact attendu** : Embeddings des arrêts clés (Schrems I/II, SCHUFA...) représentatifs du contenu réel. Meilleure recall sur les questions de jurisprudence. Réduction du bruit pour la validation ECLI.

**Effort estimé** : Moyen (1-2 semaines : fetch des 8 textes + nettoyage + ré-ingestion)

**Risque d'introduction** : Textes intégraux CJUE (50-200 pages) → chunks nombreux, augmentation du volume DB. Limiter à 20 chunks max par arrêt.

**Priorité proposée** : **P2**

**Métrique de succès** : Similarité cosinus moyenne des chunks Schrems I/II > 0.70 sur 5 requêtes jurisprudence de référence, contre valeur actuelle mesurée.

---

## Catégorie B — Expérience utilisateur

---

### H07 — Implémenter réellement l'abonnement email aux alertes

**Problème adressé** : Phase 2, E20b — `AlertSubscriptionPanel` simule une sauvegarde (local state uniquement). Aucun appel API. La fonctionnalité "alertes email personnalisées" est entièrement fictive malgré son affichage dans l'UI et sa mention sur la page pricing.

**Hypothèse d'amélioration** : Créer `PATCH /api/alerts/subscription` pour persister les préférences (règlements, email, fréquence) dans une colonne JSON `alert_prefs` sur `profiles`. Modifier le cron `regulatory-watch` pour respecter ces préférences lors de l'envoi des emails via Resend.

**Impact attendu** : Fonctionnalité conforme à la promesse produit. Valeur ajoutée Pro réelle. Réduction du churn potentiel des utilisateurs qui activent la fonctionnalité sans retour.

**Effort estimé** : Moyen (1-2 semaines : API + migration + cron update + email template)

**Risque d'introduction** : Volume d'emails Resend augmente si beaucoup d'utilisateurs activent. Vérifier les quotas Resend.

**Priorité proposée** : **P0** — Fonctionnalité promise mais non fonctionnelle = promesse commerciale mensongère.

**Métrique de succès** : 100 % des utilisateurs ayant sauvegardé des préférences reçoivent un email de veille dans les 48h suivant la sauvegarde. Taux d'ouverture email > 25 % sur 30 jours.

---

### H08 — Rendu lisible des documents partagés publiquement

**Problème adressé** : Phase 2, E16c + E16a — Les documents partagés via lien public sont rendus en JSON brut dans un `<pre>`. `JSON.parse` non protégé → crash si contenu corrompu. `app/(public)/share/[token]/page.tsx`.

**Hypothèse d'amélioration** : Créer un renderer de document structuré pour la page publique, réutilisant les composants d'affichage existants (ex. le renderer de résultat checklist, de résultat DPIA). Wrapper `JSON.parse` dans un `try/catch` avec fallback sur affichage texte brut. Ajouter un lien "Ouvrir dans CompliAI" (CTA acquisition).

**Impact attendu** : Les liens partagés sont exploitables par des non-techniciens (DPO partageant un audit avec un comité exécutif). Le `try/catch` supprime le crash de page publique. Le CTA génère des inscriptions depuis les partages.

**Effort estimé** : Moyen (1-2 semaines)

**Risque d'introduction** : Chaque type de document (checklist, DPIA, RoPA...) a un format JSON différent → renderer à multiples cas.

**Priorité proposée** : **P1**

**Métrique de succès** : Taux de crash sur `/share/[token]` = 0. Taux de conversion inscription depuis les pages partagées mesuré sur 30 jours (baseline à établir).

---

### H09 — Supprimer la route orpheline Brain Nodes et unifier le modèle de données

**Problème adressé** : Phase 2, E17a — `/api/brain` opère sur `brain_nodes` (migration 004), table jamais utilisée par l'UI qui utilise exclusivement `brain_notes` (migration 005). Code mort actif en production.

**Hypothèse d'amélioration** : Supprimer `app/api/brain/route.ts` + `app/api/brain/[id]/route.ts` (les routes `brain_nodes`). Documenter que `brain_notes` est le modèle actif. Optionnel : supprimer la table `brain_nodes` via migration si elle est vide.

**Impact attendu** : Suppression de ~100 lignes de code mort. Réduction de la confusion pour les futurs contributeurs. Simplicité de maintenance.

**Effort estimé** : Petit (1-2 jours)

**Risque d'introduction** : Vérifier qu'aucun client externe (API keys) n'appelle ces routes avant suppression.

**Priorité proposée** : **P2**

**Métrique de succès** : Route `/api/brain` retourne 404 après déploiement. 0 erreur Sentry liée à cette route sur 30 jours.

---

### H10 — Recherche sémantique dans le Brain Chat

**Problème adressé** : Phase 2, E17b — La recherche de contexte dans le Brain Chat utilise `ilike` substring sur les 50 premiers caractères de la question. Une note "RGPD - Art. 5 — Principes" n'est pas retrouvée si l'utilisateur demande "principes de licéité des traitements".

**Hypothèse d'amélioration** : Lors de la création/modification d'une note (`PATCH /api/brain/notes/[id]`), calculer et stocker son embedding dans une colonne `embedding vector(1536)` sur `brain_notes`. Dans `/api/brain/chat`, remplacer le `ilike` par une recherche pgvector (comme `search_legal_chunks` mais sur `brain_notes`).

**Impact attendu** : Le Brain Chat retrouve les notes pertinentes sémantiquement, même si les mots-clés diffèrent. Qualité de l'IA grounded in notes multipliée.

**Effort estimé** : Moyen (1-2 semaines : migration + API update + embeddings batch pour notes existantes)

**Risque d'introduction** : Coût OpenAI embeddings à chaque modification de note. Migrer les notes existantes sans embedding.

**Priorité proposée** : **P2**

**Métrique de succès** : Recall@6 dans le Brain Chat (proportion de conversations où au moins 1 note pertinente est retrouvée) passant de valeur actuelle à > 80 % sur un panel de 20 questions de test.

---

## Catégorie C — Performance et coût

---

### H11 — Cache sémantique pour les requêtes fréquentes

**Problème adressé** : Phase 3, Critère 7 (1/5) — Non-reproductibilité et absence de cache. Les mêmes questions légales ("définition de l'IA à haut risque") sont reposées de nombreuses fois sans réutilisation.

**Hypothèse d'amélioration** : Implémenter un cache sémantique sur Redis Upstash (déjà configuré pour le rate limiting) : à chaque requête chat, calculer l'embedding de la question, chercher dans un index Redis si une question similaire (cosine > 0.95) a déjà reçu une réponse dans les 24h. Si match : retourner la réponse cachée directement. Si miss : appel Claude normal + stockage en cache.

**Impact attendu** : Réduction des appels Anthropic de 20-40 % sur les questions fréquentes. Amélioration de la reproductibilité (même question → même réponse pendant la durée de cache). Réduction de la latence.

**Effort estimé** : Grand (3-4 semaines : design du système, invalidation sur mise à jour corpus, tests de qualité pour éviter le stale cache)

**Risque d'introduction** : Réponse cachée incorrecte si le corpus a été mis à jour entre temps (ex. nouvelle EDPB guideline). Invalidation de cache difficile à cibler.

**Priorité proposée** : **P2**

**Métrique de succès** : Cache hit rate > 20 % sur requêtes chat après 30 jours. Coût Anthropic mensuel réduit de > 15 %.

---

### H12 — Augmenter max_tokens scanner et corriger config audit

**Problème adressé** : Phase 3, Critère 5 (3/5) + Phase 2, E02a — Scanner max_tokens = 2 500 (insuffisant pour pages complexes). Audit utilise `TOOL_CONFIGS.doc_memoire.temperature` (0.1) via une clé incorrecte.

**Hypothèse d'amélioration** :
1. Ajouter `TOOL_CONFIGS.scanner.maxTokens` → 4 000 (via env `AI_MAX_TOKENS_SCANNER=4000`)
2. Créer `TOOL_CONFIGS.audit` dédié avec temperature 0.1 et utiliser cette config dans `app/api/audit/route.ts`

**Impact attendu** : Rapports scanner complets sur les pages riches. Cohérence de la configuration audit.

**Effort estimé** : Petit (< 1 jour)

**Risque d'introduction** : Coût Claude légèrement supérieur sur scanner. Aucun sur l'audit.

**Priorité proposée** : **P1**

**Métrique de succès** : `stop_reason === "max_tokens"` sur scanner : 0 occurrences sur 30 jours post-déploiement.

---

## Catégorie D — Conformité interne du produit à l'AI Act

---

### H13 — Versionnage des prompts dans les logs d'interaction

**Problème adressé** : Phase 3, Critère 4 (3/5) — Aucun hash ou tag de version du system prompt n'est enregistré dans `ai_interaction_logs`. Impossibilité de relier un incident de qualité à la version exacte du prompt au moment de la requête. Requis par AI Act Art. 12 (transparence et traçabilité).

**Hypothèse d'amélioration** : Calculer un hash SHA-256 des 4 composants du system prompt consultant à la construction (`buildConsultantSystemPrompt`). Stocker ce hash dans `ai_interaction_logs.prompt_version`. Faire de même pour les prompts des générateurs (hash du fichier MD chargé). Permettre de rejouer une requête avec un prompt archivé.

**Impact attendu** : Traçabilité complète de la configuration IA par requête. Détection immédiate du changement de prompt entre deux périodes. Conformité Art. 12 AI Act et Art. 13 (journalisation).

**Effort estimé** : Petit (2-3 jours)

**Risque d'introduction** : Aucun — ajout de colonne nullable dans `ai_interaction_logs`.

**Priorité proposée** : **P0** — Exigence de conformité AI Act pour un produit qui aide les autres à se conformer.

**Métrique de succès** : 100 % des lignes `ai_interaction_logs` créées après déploiement ont `prompt_version` non-null. Audit trail de prompt disponible en requête SQL.

---

### H14 — Documentation technique du système AI Act (Annexe IV)

**Problème adressé** : Phase 3, Critères 4 et 7 — CompliAI est lui-même potentiellement un système IA à haut risque (Annexe III, catégorie 5 : systèmes d'aide à la décision juridique utilisés par des professionnels). L'application n'a pas de documentation technique Annexe IV pour elle-même.

**Hypothèse d'amélioration** : Produire `TECHNICAL_DOCUMENTATION_ANNEX_IV.md` (interne) décrivant : description du système, données d'entraînement (aucune — modèle fondation tiers), mesures de supervision humaine, limitations déclarées, mécanismes de logging. Utiliser l'outil Art. 11 de CompliAI lui-même pour produire ce document.

**Impact attendu** : Conformité "dogfooding" — CompliAI se conforme aux exigences qu'il aide à documenter. Crédibilité renforcée vis-à-vis des prospects DPO qui vérifieront cette conformité.

**Effort estimé** : Petit (2-3 jours avec l'outil Art. 11)

**Risque d'introduction** : Aucun.

**Priorité proposée** : **P0** — Un outil de qualification AI Act non conforme à l'AI Act lui-même est un risque réputationnel critique.

**Métrique de succès** : Document `TECHNICAL_DOCUMENTATION_ANNEX_IV.md` accessible publiquement dans le repo ou sur la page `/docs`. Checklist Annexe IV remplie à 100 %.

---

### H15 — Mécanisme de signalement des réponses incorrectes

**Problème adressé** : Phase 3, Critère 4 + Art. 14 AI Act (supervision humaine) — Les utilisateurs n'ont aucun moyen de signaler une réponse juridiquement incorrecte. Les erreurs persistent silencieusement.

**Hypothèse d'amélioration** : Ajouter un bouton 👎 / "Signaler une erreur" sur chaque réponse du consultant et chaque document généré. Le signalement crée une ligne dans une table `feedback_reports(user_id, interaction_id, category, comment)` et envoie un email à l'admin. Afficher un disclaimer visible sur toutes les réponses IA : "Cette analyse ne se substitue pas à un avis d'avocat."

**Impact attendu** : Boucle de feedback humain sur la qualité. Données réelles pour identifier les cas où les règles de production échouent. Conformité Art. 14 AI Act (mesures permettant la supervision humaine).

**Effort estimé** : Moyen (1 semaine : UI + API + email + migration)

**Risque d'introduction** : Volume potentiel de signalements à traiter. Commencer sans SLA.

**Priorité proposée** : **P0** — Exigence Art. 14 AI Act.

**Métrique de succès** : Bouton présent sur 100 % des réponses consultant. Au moins 1 boucle de correction de prompt initiée suite à des signalements dans les 30 jours post-déploiement.

---

### H16 — Corriger le bug checkRateLimit (rate limiting inopérant)

**Problème adressé** : Phase 1, R-01 + R-02 — `lib/credits.ts:61-73` — La RPC `increment_count` n'existe pas, le rate limiting Postgres est un no-op. Affecte à la fois les appels IA et la protection anti-brute-force sur le reset de mot de passe.

**Hypothèse d'amélioration** : Remplacer la logique d'upsert défaillante par une approche correcte : utiliser une fonction SQL `upsert_ai_rate_limit(p_user_id, p_window_start) RETURNS integer` qui incrémente atomiquement le compteur et retourne la valeur. Créer cette fonction via migration. Mettre à jour `checkRateLimit` pour appeler cette RPC.

**Impact attendu** : Rate limiting Postgres effectif pour les appels IA et le reset de mot de passe. Protection réelle contre les abus de crédits et les attaques brute-force.

**Effort estimé** : Petit (1-2 jours)

**Risque d'introduction** : Migration DB à appliquer. Test en staging recommandé.

**Priorité proposée** : **P0** — Bug de sécurité actif.

**Métrique de succès** : `ai_rate_limits.count` s'incrémente correctement pour chaque requête d'un même user dans la même fenêtre. Taux de dépassement de la limite observé et bloqué dans les logs.

---

## Catégorie E — Monétisation

---

### H17 — Réparer l'auto-recharge de crédits

**Problème adressé** : Phase 2, E14b — L'UI "Auto-recharge" affiche une option d'activation mais ne crée pas de charge Stripe automatique. C'est une alerte email, pas une recharge. Confusion pour l'utilisateur qui pense avoir activé un paiement automatique.

**Hypothèse d'amélioration** : Deux options mutuellement exclusives :
- Option A (court terme) : Renommer le feature "Alerte crédits bas" pour refléter sa réalité actuelle. Supprimer le label "recharge automatique" trompeur.
- Option B (moyen terme) : Implémenter la vraie auto-recharge via Stripe Payment Intents + clé de paiement sauvegardée (nécessite consentement utilisateur RGPD art. 6).

**Impact attendu** (Option A) : Suppression d'une promesse mensongère. (Option B) : Revenu récurrent automatisé, réduction du churn par manque de crédits.

**Effort estimé** : Option A : Petit (1 jour). Option B : Grand (3-4 semaines).

**Risque d'introduction** : Option B — Traitement de paiements automatiques, conformité RGPD/PSD2.

**Priorité proposée** : Option A **P0** (correction immédiate). Option B P2.

**Métrique de succès** : Option A : 0 utilisateur rapportant une confusion sur l'auto-recharge dans les 30 jours. Option B : Taux de churn par manque de crédits réduit de > 30 %.

---

### H18 — Corriger la billing key `policy` → `doc_memoire`

**Problème adressé** : Phase 2, E07a — `app/api/generate/policy/route.ts:24` — La route policy facture sur `doc_memoire` au lieu de `policy`. Les métriques d'usage confondent les deux outils.

**Hypothèse d'amélioration** : Changer `tool: "doc_memoire"` en `tool: "policy"` dans la route. Vérifier que `TOOL_CONFIGS` contient une entrée `policy` (ou utiliser `doc_memoire` en aliasant correctement dans `TOOL_CONFIGS`).

**Impact attendu** : Métriques d'usage correctes. Capacité à mesurer l'adoption de chaque outil séparément.

**Effort estimé** : Petit (< 1 heure)

**Risque d'introduction** : Si `TOOL_CONFIGS` n'a pas d'entrée `policy`, erreur à runtime. Vérifier avant déploiement.

**Priorité proposée** : **P1**

**Métrique de succès** : Métriques d'usage `policy` et `doc_memoire` distinctes dans les dashboards admin.

---

### H19 — Injection HTML dans les emails admin — correction sécurité

**Problème adressé** : Phase 2, E13b — `app/api/lawyers/listing-request/route.ts` — Les champs `firmName`, `contactName` sont interpolés directement dans le HTML de l'email Resend sans échappement.

**Hypothèse d'amélioration** : Créer une fonction `escapeHtml(str: string): string` (remplacement de `<`, `>`, `&`, `"`, `'` par entités HTML) et l'appliquer à tous les champs utilisateur avant injection dans les templates HTML d'email. Appliquer la même correction à toutes les routes d'email Resend.

**Impact attendu** : Suppression du risque d'injection HTML dans les emails admin. Pratique défensive générale.

**Effort estimé** : Petit (< 1 jour)

**Risque d'introduction** : Aucun.

**Priorité proposée** : **P1**

**Métrique de succès** : Audit de code : 0 interpolation de donnée utilisateur non-échappée dans les templates HTML des 5 routes d'email.

---

## Catégorie F — Observabilité

---

### H20 — Dashboard admin pour `ai_interaction_logs`

**Problème adressé** : Phase 1 §3.13 — La table `ai_interaction_logs` est alimentée à chaque interaction IA (question, réponse, warnings guardrails, tokens, latence) mais n'est pas exploitée dans l'UI admin.

**Hypothèse d'amélioration** : Créer `app/(app)/dashboard/admin/logs/page.tsx` accessible aux admins uniquement. Afficher : top 10 questions les plus posées, taux de `stop_reason === "max_tokens"`, taux de `needsRewrite` citations, distribution des latences par modèle, warnings guardrails les plus fréquents.

**Impact attendu** : Visibilité opérationnelle sur la qualité IA en production. Détection des patterns d'abus ou de questions hors-scope. Données pour prioriser les améliorations de prompt.

**Effort estimé** : Moyen (1-2 semaines)

**Risque d'introduction** : Accès admin à des données utilisateur — vérifier le gating admin.

**Priorité proposée** : **P2**

**Métrique de succès** : Au moins 1 décision produit basée sur les données de `ai_interaction_logs` dans les 60 jours post-déploiement.

---

### H21 — Alerting Sentry sur troncatures et erreurs critiques

**Problème adressé** : Phase 1, §3.13 — Sentry est configuré mais sans alertes personnalisées. Les troncatures `max_tokens` sont loggées en console (`console.warn`) mais ne déclenchent aucune alerte.

**Hypothèse d'amélioration** : Dans `app/api/chat/route.ts:613-617` et les routes generate, appeler `Sentry.captureMessage("response_truncated", { extra: { tool, outputTokens, maxTokens } })` lors d'une troncature. Configurer une alerte Sentry sur les événements `response_truncated` avec seuil > 5/heure.

**Impact attendu** : Détection proactive des outils avec max_tokens insuffisant. Signal immédiat si une mise à jour de modèle Anthropic change les comportements de troncature.

**Effort estimé** : Petit (1-2 jours)

**Risque d'introduction** : Volume d'alertes si seuil trop bas. Commencer avec seuil conservateur (> 20/heure).

**Priorité proposée** : **P1**

**Métrique de succès** : Temps de détection d'un problème de troncature systémique < 2 heures (contre détection actuelle : jamais, sauf signalement utilisateur).

---

## Synthèse par priorité

| Priorité | Hypothèse | Effort | Catégorie |
|----------|-----------|--------|-----------|
| **P0** | H16 — Bug checkRateLimit | Petit | Sécurité |
| **P0** | H01 — Prompt DPIA dédié | Moyen | Qualité juridique |
| **P0** | H02 — Golden-set CI régression | Moyen | Qualité juridique |
| **P0** | H07 — Alertes email réelles | Moyen | UX / Promesse produit |
| **P0** | H13 — Versionnage prompts en logs | Petit | Conformité AI Act |
| **P0** | H14 — Documentation technique Annexe IV | Petit | Conformité AI Act |
| **P0** | H15 — Mécanisme signalement réponses | Moyen | Conformité AI Act |
| **P0** | H17a — Renommer auto-recharge (Option A) | Petit | Monétisation |
| **P1** | H03 — Corpus sectoriels manquants | Petit/lot | Qualité juridique |
| **P1** | H04 — Zod validation 5 générateurs | Moyen | Qualité juridique |
| **P1** | H08 — Rendu documents partagés | Moyen | UX |
| **P1** | H12 — Scanner max_tokens + config audit | Petit | Performance |
| **P1** | H18 — Billing key policy | Petit | Monétisation |
| **P1** | H19 — Escaping HTML emails | Petit | Sécurité |
| **P1** | H21 — Alerting Sentry troncatures | Petit | Observabilité |
| **P2** | H05 — BM25 hybride | Grand | Qualité juridique |
| **P2** | H06 — Chunks jurisprudence paddés | Moyen | Qualité juridique |
| **P2** | H09 — Supprimer brain_nodes | Petit | UX / Nettoyage |
| **P2** | H10 — Brain Chat sémantique | Moyen | UX |
| **P2** | H11 — Cache sémantique | Grand | Performance |
| **P2** | H17b — Auto-recharge Stripe réelle | Grand | Monétisation |
| **P2** | H20 — Dashboard admin logs | Moyen | Observabilité |

**Total : 22 hypothèses** (15-25 requis : ✅)

---

*Fin de la Phase 4. La Phase 5 hiérarchise les P0 et P1 en quatre sprints de deux semaines.*
