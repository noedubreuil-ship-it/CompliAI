# AUDIT_PHASE_2_FONCTIONNALITES — CompliAI
*Audit réalisé le 24 juin 2026. Lecture du code source uniquement.*

---

## Conventions

- **Parcours utilisateur** : étapes effectives, de l'action initiale au résultat final
- **Comportement réel** : ce que le code fait, vérifié par lecture des handlers et composants
- **Écarts** : divergences entre intention nominale et code réel, avec référence fichier:ligne
- **Tests** : présence ou absence de tests automatisés pour la fonctionnalité

---

## F01 — Chat consultant juridique IA

**Parcours utilisateur**
1. L'utilisateur ouvre `/dashboard/chat`
2. Il saisit une question juridique (max 8 000 caractères)
3. La réponse arrive en streaming (SSE), les citations sources s'affichent
4. L'historique de la session est conservé ; l'utilisateur peut poser des questions de suivi
5. Un bouton "Réponse synthétique / Note de cabinet" module la profondeur

**Comportement attendu** : Assistant juridique expert en droit européen du numérique, répondant avec rigueur, anti-hallucination, citation des sources, filtrage juridictionnel strict.

**Comportement réel**
- Route `POST /api/chat` avec pipeline en 6 étapes : auth → rate-limit Upstash → preflight crédits → RAG multi-corpus (EU statutes + jurisprudence + EUR-Lex live) → filtrage sources hors-sujet → streaming Claude avec validation citations post-génération (`app/api/chat/route.ts:550-802`)
- Traduction automatique de la requête en français pour le RAG si l'utilisateur écrit dans une autre langue UE (`route.ts:133-134`)
- Validation des citations post-génération : détecte ECLI absents du contexte RAG, en-têtes interdits, dates incohérentes (`lib/ai/consultant-citation-validator.ts:94-122`)
- Réécriture automatique si validation échoue (`route.ts:636-680`)
- Billing : Haiku (free), Sonnet (starter), Opus × 2 (pro, outil `audit`/`jurisprudence`/`investor-report`) × 1.25 consultant × 1.6 detailed = multiplicateur max 3.2 pour une note développée Pro (`lib/ai/model-routing.ts:57-65`)

**Écarts identifiés**
- **E01a** `app/api/chat/route.ts:590-598` — Paramètre `seed` absent de l'appel Anthropic → réponses non-reproductibles entre deux questions identiques. Impossible de mesurer la régression de qualité.
- **E01b** `lib/ai/query-translate.ts:22-25` — La détection "est-ce déjà du français ?" repose sur une heuristique regex (mots courts comme "pour", "sur", "le"). Un texte juridique anglais dense contenant des termes latins ou franco-anglais peut ne pas être traduit pour le RAG → recall basse sur le corpus FR.
- **E01c** `app/api/chat/route.ts:559-572` — Les timings de profiling loggés en JSON en clair incluent `userId` → PII dans les logs Vercel/Sentry.
- **E01d** `lib/credits.ts:61-73` — Le rate limiting Postgres (`ai_rate_limits`) est inopérant (voir Phase 1 R-01) → pas de protection côté DB contre un abus de crédit.

**Couverture des tests** : Tests unitaires sur les guardrails (`validateUserInput`, `isOutOfScope`) et le validator de citations. Aucun test d'intégration sur le pipeline chat complet.

---

## F02 — Audit de conformité complet (projet)

**Parcours utilisateur**
1. L'utilisateur crée un projet (`/dashboard/projects/new`) en remplissant nom, secteur, description
2. Il lance un audit depuis la page projet → `POST /api/audit`
3. Claude retourne un JSON structuré (score, verdict, issues, roadmap)
4. Le rapport s'affiche avec score de conformité, blocking issues, snapshots
5. L'utilisateur peut exporter le rapport en PDF (Pro)
6. Il peut partager le rapport par lien public temporaire

**Comportement attendu** : Rapport de conformité AI Act/RGPD complet, différencié par plan (nombre d'audits par mois, accès PDF).

**Comportement réel**
- Route `POST /api/audit/route.ts` (~312 lignes) : auth + credit preflight + limite mensuelle `audits_per_month` par tier
- Appel Claude via `generateDocument` (prompt générique) avec température tirée de `TOOL_CONFIGS.doc_memoire` → clé de config incorrecte
- Extraction JSON par regex `/\{[\s\S]*\}/` (greedy)
- Création chaîne : `projects` → `audits` → `audit_snapshots` → `blocking_issues` (non atomique)
- Si `audits` insert échoue après succès LLM : le projet orphelin reste en DB
- Webhooks outbound + Slack + audit_trail déclenchés en fin de pipeline
- PDF via `GET /api/pdf/[auditId]` — réservé Pro (`lib/pdf/`)
- Partage via `POST /api/audits/share` — token 24 bytes, expiry configurable (défaut 30 jours)

**Écarts identifiés**
- **E02a** `app/api/audit/route.ts` — Température de génération prise de `TOOL_CONFIGS.doc_memoire.temperature` au lieu d'un config audit dédié.
- **E02b** `app/api/audit/route.ts` — Extraction JSON par regex greedy : si Claude retourne deux objets JSON (ex. texte JSON + réponse intermédiaire), la regex peut capturer un objet incomplet.
- **E02c** `app/api/audit/route.ts` — Pas de transaction DB : si `blocking_issues` insert échoue, l'audit est créé sans ses issues bloquantes. L'erreur est ignorée silencieusement.
- **E02d** `app/api/pdf/[auditId]/route.ts` — Tier lu de `profiles.subscription_tier` qui peut être en retard sur `user_credits.plan` (webhook Stripe non encore traité) → refus d'export PDF injuste.

**Couverture des tests** : Aucun test identifié sur le pipeline d'audit complet.

---

## F03 — Générateur checklist de conformité

**Parcours utilisateur**
1. L'utilisateur accède à `/dashboard/tools/checklist`
2. Il saisit contexte, secteur, règlement cible
3. Soumet → `POST /api/generate/checklist`
4. La checklist JSON est affichée et sauvegardée dans `generated_documents`

**Comportement attendu** : Questionnaire interactif de conformité avec items structurés par article et niveau de priorité.

**Comportement réel**
- `authenticateForGenerate` + `runGenerateRoute` (`lib/ai/generate-route.ts`)
- Modèle : Haiku (free), Sonnet (paid)
- System prompt : `compliance-checklist-interactive-v1.md` (>10 000 chars, validé à l'intégrité)
- Sortie validée par schéma **Zod** (`lib/ai/schemas/compliance-checklist.ts`)
- Multilingual via `buildToolLanguageAddendum`

**Écarts identifiés**
- **E03a** Aucun écart majeur. C'est l'un des outils les mieux implémentés (prompt dédié + Zod + multilingual).
- **E03b** Minor : l'enrichissement RAG national est présent mais le prompt ne spécifie pas explicitement comment utiliser les sources nationales pour les items de checklist.

**Couverture des tests** : Tests Zod schema présents.

---

## F04 — Générateur DPIA / AIPD (art. 35 RGPD)

**Parcours utilisateur**
1. L'utilisateur accède à `/dashboard/tools/dpia`
2. Il saisit : nom du traitement, finalités, catégories de données, mesures de sécurité, contexte
3. Soumet → `POST /api/generate/dpia`
4. Document JSON affiché et sauvegardé

**Comportement attendu** : DPIA structurée selon art. 35 RGPD avec analyse de risques, mesures d'atténuation, conclusions.

**Comportement réel**
- Appelle `generateDocument` (fonction générique) avec un **prompt système hardcodé inline** dans la route (`app/api/generate/dpia/route.ts`) — quelques dizaines de caractères, pas un cahier métier dédié
- Pas de validation Zod de la sortie JSON
- Multilingual via `buildToolLanguageAddendum`
- Modèle : Sonnet (paid), Haiku (free)

**Écarts identifiés**
- **E04a** `app/api/generate/dpia/route.ts` — **Absence de prompt spécialisé** : la DPIA est l'outil RGPD central, celui qu'un DPO utilise pour justifier sa conformité. Il tourne sur `generateDocument` avec un prompt générique court, alors que les 15 autres outils disposent chacun d'un cahier métier de 4 000 à 20 000 caractères. C'est l'écart le plus grave entre attendu et réel sur l'ensemble des outils.
- **E04b** Pas de validation Zod → si la structure JSON est malformée, l'utilisateur reçoit une erreur 500 sans message explicite.
- **E04c** Aucune vérification des 9 critères obligatoires du WP248 dans le prompt.

**Couverture des tests** : Aucun test dédié DPIA identifié.

---

## F05 — Générateur RoPA (Registre art. 30 RGPD)

**Parcours utilisateur**
1. `/dashboard/tools/ropa` — formulaire multi-étapes (entreprise, activités de traitement, responsables, données, transferts)
2. `POST /api/generate/ropa`
3. Document JSON structuré affiché

**Comportement attendu** : Registre de traitement conforme art. 30 RGPD avec toutes les rubriques obligatoires.

**Comportement réel**
- Normalisation de l'input via `normalizeRopaIntake` (nettoyage + valeurs par défaut)
- System prompt `ropa-registre-art30-v1.md` (>4 000 chars, validé)
- Multilingual via `buildToolLanguageAddendum`
- Schéma Zod partiel

**Écarts identifiés**
- **E05a** Minor : le schéma Zod est "partiel" — certains champs optionnels du RoPA (ex. coordonnées DPO, transferts vers pays tiers) ne sont pas validés, la sortie peut être incomplète sans que l'utilisateur en soit informé.

**Couverture des tests** : Tests unitaires sur normalisation identifiés.

---

## F06 — Générateur FRIA (art. 27 AI Act)

**Parcours utilisateur**
1. `/dashboard/tools/fria` — formulaire (entité, description système, contexte de déploiement, catégories de personnes concernées)
2. `POST /api/generate/fria`
3. Rapport structuré affiché

**Comportement attendu** : Évaluation de l'impact sur les droits fondamentaux conformément à l'art. 27 AI Act.

**Comportement réel**
- System prompt `fria-art27-ai-act-v1.md` (>4 000 chars, validé)
- `max_tokens` = 16 384 (`AI_MAX_TOKENS_DOC_FRIA`) — le plus élevé de tous les générateurs
- Multilingual via `buildToolLanguageAddendum`
- Pas de validation Zod de la sortie

**Écarts identifiés**
- **E06a** `app/api/generate/fria/route.ts` — billing tool `doc_fria` correct, mais `max_tokens` de 16 384 peut générer des réponses très longues facturées cher en Opus si l'utilisateur est Pro. Le multiplicateur n'est pas appliqué (FRIA n'est pas dans `OPUS_PREMIUM_TOOLS`).
- **E06b** Pas de validation Zod.

**Couverture des tests** : Aucun test dédié.

---

## F07 — Générateur politique salariale IA (art. 4 AI Act)

**Parcours utilisateur**
1. `/dashboard/tools/policy` — entreprise, secteur, outils IA utilisés, nombre de salariés
2. `POST /api/generate/policy`
3. Document politique RH affiché

**Comportement attendu** : Politique IA pour les salariés conforme à l'obligation de littératie art. 4 AI Act.

**Comportement réel**
- System prompt `employee-policy-ia-v1.md` (>15 000 chars, validé)
- Multilingual via `buildToolLanguageAddendum`
- Billing tool key : **`doc_memoire`** au lieu de `policy`

**Écarts identifiés**
- **E07a** `app/api/generate/policy/route.ts:24` — Billing tool key `doc_memoire` incorrecte → les métriques d'usage confondent "Politique RH" avec "Mémoire de conformité". Impossible de mesurer l'usage réel de la politique RH.

**Couverture des tests** : Aucun test dédié.

---

## F08 — Documentation technique art. 11 (Annexe IV AI Act)

**Parcours utilisateur**
1. `/dashboard/tools/art11` — description du système, fournisseur, données d'entraînement
2. `POST /api/generate/art11`
3. Documentation Annexe IV 9 sections affichée

**Comportement attendu** : Documentation technique conforme Annexe IV AI Act, exigée pour les systèmes haut risque.

**Comportement réel**
- System prompt `art11-annex-iv-v1.md` (>15 000 chars, validé)
- `max_tokens` = 4 500
- Pas de multilingual (pas de `buildToolLanguageAddendum`)
- Pas de validation Zod

**Écarts identifiés**
- **E08a** `app/api/generate/art11/route.ts` — Pas de multilingual malgré le besoin évident (fournisseurs non-francophones dans toute l'UE).
- **E08b** Pas de validation Zod.

**Couverture des tests** : Tests sur le prompt md.

---

## F09 — Analyse de contrat tiers (art. 28 RGPD)

**Parcours utilisateur**
1. `/dashboard/tools/contracts` — upload/copier-coller le texte du contrat DPA
2. `POST /api/generate/contract`
3. Rapport d'analyse JSON avec scoring par clause

**Comportement attendu** : Analyse du DPA (Data Processing Agreement) avec identification des clauses manquantes et scoring.

**Comportement réel**
- System prompt `third-party-contract-analysis-v1.md` (>8 000 chars, validé)
- Résultats sauvegardés dans `contract_analyses` (table dédiée, non `generated_documents`)
- Pas de multilingual, pas de Zod

**Écarts identifiés**
- **E09a** `app/api/generate/contract/route.ts` — Pas de multilingual. Les DPA sont souvent rédigés en anglais → une PME française analysant un DPA anglais ne bénéficie pas du système.

**Couverture des tests** : Aucun test dédié.

---

## F10 — Scanner de page web (RGPD/ePrivacy)

**Parcours utilisateur**
1. `/dashboard/tools/scanner` — URL de la page à scanner
2. `POST /api/generate/scanner` → fetch de la page HTML côté serveur + analyse
3. Rapport markdown avec indicateurs 🔴🟡🟢

**Comportement attendu** : Analyse automatique d'une page web pour détecter trackers, cookies, formulaires, mentions légales.

**Comportement réel**
- Le scanner fetch la page HTML via `fetch()` côté serveur avec protections SSRF (blocage IPs privées, timeout 12s, cap 800 KB)
- System prompt `scanner-page-web-v1.md` (>10 000 chars, validé)
- `max_tokens` = 2 500 — le plus petit de tous les générateurs de documents
- Pas de multilingual

**Écarts identifiés**
- **E10a** `app/api/generate/scanner/route.ts` — `max_tokens` 2 500 est très bas pour une page web complexe. Des pages avec beaucoup d'éléments RGPD risquent d'avoir leur rapport tronqué.
- **E10b** Pas de multilingual — le contenu HTML peut être en n'importe quelle langue UE mais le prompt ne l'anticipe pas.

**Couverture des tests** : Aucun test dédié.

---

## F11 — Classifieur AI Act

**Parcours utilisateur**
1. `/dashboard/tools/classifier` — description du système IA
2. `POST /api/generate/classifier`
3. Fiche de classification JSON (régime, catégorie Annexe III, obligations)

**Comportement attendu** : Classification précise du système IA dans le régime AI Act (haut risque / pratique interdite / GPAI / transparence / minimal).

**Comportement réel**
- System prompt `ai-act-classifier-v1.md` (>20 000 chars — le plus grand) validé
- Pas de Zod, pas de multilingual

**Écarts identifiés**
- **E11a** Pas de multilingual — outil potentiellement utilisé par des développeurs non-francophones dans toute l'UE.
- **E11b** Pas de Zod → impossible de garantir la cohérence du format JSON de la fiche de classification.

**Couverture des tests** : Tests sur le prompt md.

---

## F12 — Analyseur de jurisprudence EU

**Parcours utilisateur**
1. `/dashboard/tools/jurisprudence` — ECLI ou description d'une décision
2. `POST /api/generate/jurisprudence`
3. Commentaire structuré : sens / valeur / portée

**Comportement attendu** : Commentaire juridique académique d'une décision CJUE/CEDH/DPA.

**Comportement réel**
- System prompt `jurisprudence-eu-commentaire-addendum-v2.md` (>10 000 chars, validé)
- Modèle : Opus pour Pro/Enterprise (outil dans `OPUS_PREMIUM_TOOLS`)
- Multilingual via `buildToolLanguageAddendum`
- Sortie validée par Zod

**Écarts identifiés**
- **E12a** Minor : le `tool` billing est `jurisprudence` partagé avec `recherche-jurisprudentielle` → impossible de distinguer l'usage entre les deux outils dans les métriques.

**Couverture des tests** : Tests Zod schema.

---

## F13 — Annuaire avocats + formulaire de référencement

**Parcours utilisateur**
1. `/dashboard/lawyers` — listing filtrable par pays, spécialisation, texte libre
2. Clic "Référencer votre cabinet" → Sheet form
3. `POST /api/lawyers/listing-request` → emails admin + confirmation

**Comportement attendu** : Annuaire de cabinets spécialisés en droit numérique + capture de leads B2B.

**Comportement réel**
- L'annuaire est **100% statique** (`lib/data/law-firms.ts` — 327 lignes, ~40 cabinets hardcodés)
- La demande de référencement n'est pas persistée en DB — uniquement envoi email via Resend
- Le formulaire est authentifié (l'utilisateur doit être connecté à CompliAI)

**Écarts identifiés**
- **E13a** `app/(app)/dashboard/lawyers/page.tsx` — L'annuaire statique donne une impression d'exhaustivité alors que c'est un dataset figé non maintenu automatiquement. Les informations sur les cabinets peuvent être obsolètes.
- **E13b** `app/api/lawyers/listing-request/route.ts` — Les données du formulaire (nom du cabinet, email de contact) sont interpolées directement dans le HTML de l'email admin sans échappement → risque d'injection HTML dans l'email admin.
- **E13c** `app/api/lawyers/listing-request/route.ts` — Un cabinet qui n'a pas de compte CompliAI ne peut pas soumettre le formulaire (auth requise) — contradiction avec la cible B2B (les avocats ne sont pas les utilisateurs habituels de l'appli).
- **E13d** Aucune trace DB des demandes → l'admin ne dispose d'aucune file de traitement, uniquement des emails.

**Couverture des tests** : Aucun test.

---

## F14 — Gestion des crédits (achat, solde, alertes)

**Parcours utilisateur**
1. L'utilisateur consulte son solde sur `/dashboard/credits`
2. Il sélectionne un credit pack → Stripe Checkout → retour `/dashboard/credits?success=1`
3. Confirmation côté client via `/api/stripe/confirm-credit-pack` (fallback si webhook tardif)
4. Le solde est mis à jour ; alertes email à 20 % et 5 % du quota mensuel

**Comportement attendu** : Achat de crédits unitaires en complément de l'abonnement, avec feedback immédiat.

**Comportement réel**
- Deux chemins pour les credit packs : DB `credit_pack_catalog` (avec price ID Stripe) ou static inline (`STATIC_PACKS`)
- Les static packs (`id: null`) ne créent pas de ligne `credit_pack_purchases` pending → la confirmation client est le seul mécanisme de fulfillment (fragile)
- La migration 022 insère des `price_id = ''` pour les credit packs DB → les price IDs Stripe ne sont pas configurés en base
- Auto-recharge UI : enregistre un threshold mais ne crée pas de charge Stripe automatique — c'est une alerte email uniquement (`app/(app)/dashboard/credits/page.tsx`)

**Écarts identifiés**
- **E14a** `supabase/migrations/022_credit_pack_stripe_price_ids.sql` — Stripe price IDs insérés comme chaînes vides → les credit packs DB ne fonctionnent pas sans configuration manuelle post-déploiement.
- **E14b** `app/(app)/dashboard/credits/page.tsx` — L'UI présente "Auto-recharge" avec un label "activer la recharge automatique" mais le code ne fait qu'une alerte email ; Stripe ne sera jamais chargé automatiquement. C'est trompeur pour l'utilisateur.
- **E14c** `app/api/stripe/webhook/route.ts` — Les événements sont marqués processed **avant** l'exécution du handler. Si le handler échoue à mi-chemin, l'événement Stripe ne sera pas retraité par idempotency.
- **E14d** `app/api/stripe/checkout/route.ts` — Aucun `try/catch` autour des appels Stripe → les erreurs réseau deviennent des 500 sans message utile.

**Couverture des tests** : Tests sur la logique de billing (`calculateCredits`, `getPlanConfig`). Aucun test d'intégration Stripe.

---

## F15 — Exports PDF

**Parcours utilisateur**
1. Depuis la page d'un audit ou d'un document généré, clic "Exporter en PDF"
2. `GET /api/pdf/[auditId]` ou `GET /api/generate/*/pdf`
3. Téléchargement du PDF

**Comportement attendu** : Export PDF professionnel des rapports, réservé aux plans payants.

**Comportement réel**
- Génération via `@react-pdf/renderer` côté serveur (`runtime = "nodejs"`)
- Audit PDF : gated Pro via `getTierLimits` (`app/api/pdf/[auditId]/route.ts:26`)
- Documents générés : routes `/api/generate/*/pdf/route.ts` (art11, contract, dpia, fria, policy, ropa, checklist)
- Export chat consultant via `POST /api/consultant/export-pdf`
- PDF généré on-demand, pas mis en cache

**Écarts identifiés**
- **E15a** `app/api/pdf/[auditId]/route.ts` — Le tier est lu de `profiles.subscription_tier` (colonne profiles) alors que la source de vérité des crédits/plan est `user_credits.plan` → désynchronisation possible après upgrade Stripe.
- **E15b** PDF généré à chaque appel sans cache → latence et coût CPU sur Vercel pour des documents statiques (un audit ne change pas après génération).

**Couverture des tests** : Aucun test dédié.

---

## F16 — Partage par lien public (audit / document)

**Parcours utilisateur**
1. L'utilisateur active le partage via le bouton "Partager" sur un audit ou un document
2. `POST /api/audits/share` ou `POST /api/documents/share` génère un token et une URL
3. L'URL `/share/audit/[token]` ou `/share/[token]` est accessible sans authentification
4. L'utilisateur peut désactiver le lien

**Comportement attendu** : Partage sécurisé temporaire en lecture seule.

**Comportement réel**
- Token `randomBytes(24).toString('hex')` (48 chars hex) — bonne entropie
- Expiry configurable côté client (défaut 30 jours) — pas validé côté serveur
- Page publique `app/(public)/share/[token]/page.tsx` : service_role Supabase pour bypass RLS
- Contenu rendu en `<pre>` JSON, non formaté comme document

**Écarts identifiés**
- **E16a** `app/(public)/share/[token]/page.tsx` — Le contenu JSON du document est rendu via `JSON.parse()` non protégé par `try/catch` → si le champ `content` est corrompu, la page publique crash avec une erreur non gracieuse.
- **E16b** `app/api/documents/share/route.ts` — `NEXT_PUBLIC_APP_URL` sans fallback : si cette variable d'environnement manque, l'URL de partage retournée est `undefined/share/...`.
- **E16c** Les documents partagés sont rendus en JSON brut (`<pre>`) — pas en PDF ou format lisible. Pour un utilisateur non-technique recevant le lien, c'est inexploitable.
- **E16d** `expiresInDays` non validé côté serveur → valeur négative ou 0 acceptée, expiration immédiate passant inaperçue.

**Couverture des tests** : Aucun test.

---

## F17 — Cerveau / Brain (base de connaissances)

**Parcours utilisateur**
1. L'utilisateur ouvre `/dashboard/brain`
2. Il crée/édite des notes (éditeur CodeMirror)
3. Navigation via wiki-links `[[Titre de note]]`
4. Vue graphe des connexions (WebGL 3D via `react-force-graph-3d`)
5. Chat IA grounded dans les notes via `/api/brain/chat`

**Comportement attendu** : Outil de knowledge management juridique type Obsidian, avec IA conversationnelle sur les notes.

**Comportement réel**
- Table `brain_notes` (migration 005) ; table `brain_nodes` (migration 004) — **deux modèles coexistants**
- L'UI n'utilise que `brain_notes` via `/api/brain/notes` — `/api/brain` (`brain_nodes`) est une route orpheline
- Search brain chat utilise `ilike` substring (pas pgvector) sur les 50 premiers caractères de la question
- Wiki-links résolus par titre exact (casse-sensitive en DB) — `app/api/brain/notes/[id]/route.ts`
- Graph : edges via `brain_note_links` (pas de cascade delete → orphan edges possibles)

**Écarts identifiés**
- **E17a** `app/api/brain/route.ts` — Route opérant sur `brain_nodes` (legacy) **jamais appelée par l'UI** → code mort actif en production.
- **E17b** `app/api/brain/chat/route.ts` — La recherche de contexte notes utilise un `ilike` sur les 50 premiers caractères de la question sur les colonnes `title` et `content` — pas de RAG sémantique pour trouver les notes pertinentes. Une note intitulée "RGPD - Art. 5" ne remonte pas si l'utilisateur demande "principes de licéité des traitements".
- **E17c** `app/api/brain/notes/route.ts` — Les wiki-links ne sont pas extraits à la création (POST), seulement à la modification (PATCH) → une note fraîchement créée avec des `[[links]]` n'a pas ses connexions graph avant la première édition.
- **E17d** `app/api/brain/chat/route.ts:~45` — L'interpolation PostgREST `.or(...)` avec des données utilisateur non sanitisées peut casser si la question contient `%`, `_` ou des virgules.

**Couverture des tests** : Aucun test.

---

## F18 — Audit trail + export CSV

**Parcours utilisateur**
1. `/dashboard/audit-trail` — liste des 100 dernières actions utilisateur
2. Bouton "Exporter CSV" → télécharge un fichier CSV (max 1 000 entrées)

**Comportement attendu** : Journal d'activité immutable conforme art. 12 AI Act (supervision humaine / traçabilité).

**Comportement réel**
- Table `audit_trail` alimentée automatiquement par les routes API (audit, génération, actions sensibles)
- UI : serveur-side, 100 lignes max (`app/(app)/dashboard/audit-trail/page.tsx`)
- Export CSV : 1 000 lignes max via API, encoding UTF-8, timezone Paris

**Écarts identifiés**
- **E18a** `app/(app)/dashboard/audit-trail/page.tsx` vs `app/api/audit-trail/export/route.ts` — Limite d'affichage UI (100) vs limite d'export CSV (1 000) non cohérentes, mais pas un bug fonctionnel.
- **E18b** `app/(app)/dashboard/audit-trail/page.tsx:~30` — `user!.id` sans null guard explicite (rely on middleware). Si le middleware est contourné, erreur TypeScript runtime.
- **E18c** `app/api/audit-trail/export/route.ts` — La colonne `details` est stringifiée via `JSON.stringify()` sans nettoyage préalable → les virgules internes peuvent rompre le format CSV si `escapeCsv` a une faille.

**Couverture des tests** : Aucun test.

---

## F19 — Registre des systèmes IA

**Parcours utilisateur**
1. `/dashboard/register` — liste des systèmes IA enregistrés (gated Starter+)
2. L'utilisateur crée/modifie une entrée (nom, type, risque, statut)
3. Les données servent de référence pour l'audit et les autres outils

**Comportement attendu** : Registre conforme AI Act Art. 49 des systèmes IA utilisés par l'organisation.

**Comportement réel**
- Page server-side, gating sur `subscription_tier` (`app/(app)/dashboard/register/page.tsx`)
- API `POST /api/register/route.ts` : insert sans liste blanche des champs → tout champ client est inséré en DB
- `GET /api/register` retourne le tableau brut (non wrappé), `GET /api/register-list` retourne `{ systems: [] }` — incohérence d'API

**Écarts identifiés**
- **E19a** `app/api/register/route.ts:~35` — **Absence de validation des champs en entrée** : le POST fait `{ ...body, user_id: user.id }` directement. Un client malveillant peut injecter des colonnes arbitraires (ex. `created_at` passé, `id` forcé).
- **E19b** `app/api/register/route.ts` vs `app/api/register-list/route.ts` — Deux routes pour la même ressource avec des comportements différents (filtrage `status=active` / pas de filtre). Incohérence non documentée.
- **E19c** La page register utilise `subscription_tier` pour le gating, mais l'API ne protège pas — un utilisateur free peut appeler `POST /api/register` directement.

**Couverture des tests** : Aucun test.

---

## F20 — Veille réglementaire (journal, alertes, calendrier)

**Parcours utilisateur**
1. `/dashboard/journal` — flux personnalisé d'actualités juridiques UE
2. `/dashboard/alerts` (Pro) — alertes ciblées par règlement/secteur + "abonnement email"
3. `/dashboard/calendar` — calendrier statique des échéances réglementaires

**Comportement attendu** : Veille personnalisée avec alertes email, calendrier des deadlines, personnalisation.

**Comportement réel**

*Journal* :
- Route `GET /api/journal` : 1 326 lignes, articles curatés statiques + live RSS de ~15 sources (regex XML, 6s timeout par source)
- Score de pertinence utilisateur via `scoreAlertForUser` (profil secteur/règlements)
- Déduplication déclarée dans les commentaires mais non implémentée dans le code (`app/api/journal/route.ts`)

*Alertes* :
- Pro-gated, table `regulatory_alerts`, toutes les alertes marquées "lues" à chaque chargement de page (`app/(app)/dashboard/alerts/page.tsx`)
- `AlertSubscriptionPanel` : UI de personnalisation (règlements, email, fréquence) — **aucune sauvegarde API** — le bouton "Sauvegarder" met `saved: true` localement puis retour à `false` après 2 secondes. Aucun appel API.

*Calendrier* :
- Entièrement statique (`lib/data/eu-calendar.ts`) — aucune API, aucune personnalisation
- `CalendarRemindersBanner` présent sur la page mais la logique de rappels est dans la page settings (non confirmée reliée)

**Écarts identifiés**
- **E20a** `app/api/journal/route.ts` — Déduplication des articles curatés + live non implémentée malgré le commentaire → doublons possibles si un article curatel est aussi dans un flux RSS.
- **E20b** `app/(app)/dashboard/alerts/page.tsx` — **L'abonnement email aux alertes ne fonctionne pas** : le `AlertSubscriptionPanel` simule une sauvegarde sans appeler aucune API. C'est la fonctionnalité la plus trompeuse de l'application.
- **E20c** `app/(app)/dashboard/alerts/page.tsx:~30` — Les alertes sont systématiquement marquées lues à chaque chargement, indépendamment du comportement utilisateur → le badge "unread" sur le sidebar est réinitialisé à zéro à chaque visite.
- **E20d** `app/api/journal/route.ts` — Le parsing RSS utilise des regex ad hoc au lieu d'un vrai parseur XML → fragile face aux variations de format entre sources (CDATA, namespaces, caractères spéciaux).

**Couverture des tests** : Aucun test.

---

## Synthèse des écarts par criticité

### Critiques (fonctionnalités trompeuses ou cassées)

| Réf | Fonctionnalité | Écart | Fichier:ligne |
|-----|---------------|-------|--------------|
| E04a | DPIA | Absence de prompt spécialisé pour l'outil RGPD central | `app/api/generate/dpia/route.ts` |
| E14b | Crédits | "Auto-recharge" ne charge pas Stripe automatiquement — alerte email uniquement | `app/(app)/dashboard/credits/page.tsx` |
| E20b | Alertes | Panel d'abonnement email entièrement fictif (0 appel API) | `app/(app)/dashboard/alerts/page.tsx` |

### Majeurs (dégradation qualité ou sécurité)

| Réf | Fonctionnalité | Écart | Fichier:ligne |
|-----|---------------|-------|--------------|
| E19a | Registre | POST sans validation des champs → injection de colonnes | `app/api/register/route.ts:35` |
| E13b | Annuaire | Injection HTML dans email admin via données formulaire non échappées | `app/api/lawyers/listing-request/route.ts` |
| E16a | Partage | JSON.parse non protégé sur page publique → crash visible | `app/(public)/share/[token]/page.tsx` |
| E17b | Brain | Recherche de contexte notes par ilike — pas de RAG sémantique | `app/api/brain/chat/route.ts` |
| E14c | Stripe | Webhook idempotency : événement marqué processed avant exécution | `app/api/stripe/webhook/route.ts` |

### Mineurs (dette ou incohérences)

| Réf | Fonctionnalité | Écart | Fichier:ligne |
|-----|---------------|-------|--------------|
| E07a | Politique RH | Billing tool key erronée (`doc_memoire`) | `app/api/generate/policy/route.ts:24` |
| E12a | Jurisprudence | Billing tool partagé avec recherche-jp | Métriques usage |
| E17a | Brain | `/api/brain` (brain_nodes) — route orpheline en production | `app/api/brain/route.ts` |
| E16c | Partage | Documents partagés rendus en JSON brut illisible | `app/(public)/share/[token]/page.tsx` |
| E20c | Alertes | Marque-tout-lu systématique au chargement | `app/(app)/dashboard/alerts/page.tsx` |
| E18a | Audit trail | Limite affichage 100 vs export 1 000 incohérente | Page + API |

---

## Couverture des tests — Synthèse globale

| Fonctionnalité | Tests unitaires | Tests intégration | Tests E2E |
|---------------|-----------------|-------------------|-----------|
| Chat consultant | Partiel (guardrails, citations) | ❌ | ❌ |
| Audit complet | ❌ | ❌ | ❌ |
| Checklist | Partiel (Zod) | ❌ | ❌ |
| DPIA | ❌ | ❌ | ❌ |
| RoPA | Partiel (normalisation) | ❌ | ❌ |
| FRIA | ❌ | ❌ | ❌ |
| Tous autres générateurs | ❌ | ❌ | ❌ |
| Stripe billing | Partiel (credits) | ❌ | ❌ |
| Brain | ❌ | ❌ | ❌ |
| Audit trail / export | ❌ | ❌ | ❌ |
| Partage par lien | ❌ | ❌ | ❌ |

**Absence totale de tests d'intégration et E2E.** Les 30 routes `/api/generate/*` ne sont couvertes par aucun test automatisé.

---

*Fin de la Phase 2. Ce document et AUDIT_PHASE_1_CARTOGRAPHIE.md constituent la base factuelle pour les Phases 3, 4 et 5.*
