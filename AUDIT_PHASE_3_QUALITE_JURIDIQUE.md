# AUDIT_PHASE_3_QUALITE_JURIDIQUE — CompliAI
*Audit réalisé le 24 juin 2026. Lecture du code source uniquement.*

---

## Méthode de notation

Chaque critère reçoit une note de **1 à 5** :
- 5 — Excellence : aucune faille identifiable, architecture robuste
- 4 — Bon : quelques lacunes mineures, pas de risque structurel
- 3 — Acceptable : fonctionne en pratique mais avec des angles morts importants
- 2 — Insuffisant : risques réels sur la qualité juridique
- 1 — Critique : risque de préjudice direct pour l'utilisateur

---

## Critère 1 — Couverture du corpus RAG

**Note : 3/5**

### Preuves dans le code

**Fichiers source présents** (`scripts/data/` — 17 fichiers) :

| Fichier | Langue | Pertinence |
|---------|--------|-----------|
| `AI_ACT_FR.txt` | FR | ✅ AI Act intégral en français |
| `AI_ACT.txt` | EN | Doublon EN (à vérifier si exclu de la DB) |
| `GDPR_FR.txt` | FR | ✅ RGPD intégral en français |
| `GDPR.txt` | EN | Doublon EN |
| `NIS2_FR.txt` | FR | ✅ NIS2 en français |
| `DSM_FR.txt` | FR | ✅ Directive DSM en français |
| `DATA_ACT.txt` | EN | Data Act en anglais (pas de version FR) |
| `DMA.txt` | EN | Digital Markets Act en anglais |
| `DSA.txt` | EN | Digital Services Act en anglais |
| `CEDH.txt` | — | Convention EDH |
| `Charte_UE.txt` | — | Charte des droits fondamentaux UE |
| `TFUE.txt` | — | Traité sur le fonctionnement de l'UE |
| `TUE.txt` | — | Traité sur l'Union européenne |
| `Traite_de_Lisbonne.txt` | — | Traité de Lisbonne |
| `EDPB_WP243_DPO_FR.txt` | FR | ✅ Lignes directrices DPO (ajouté v0.2) |
| `EDPB_WP248_AIPD_FR.txt` | FR | ✅ Lignes directrices DPIA (ajouté v0.2) |
| `GPAI_Code_Bonnes_Pratiques_FR.txt` | FR | ✅ Code GPAI (ajouté v0.2) |

**Corpus de jurisprudence** (`lib/data/`) :
- 8 arrêts EU core (`eu-case-law-seeds.ts`) : Google Spain, Schrems I/II, SCHUFA, Meta Platforms, IAB Europe, Bara & Others, Bodil Lindqvist — synthèses, non textes intégraux
- 30+ arrêts EU extended (`eu-case-law-extended.ts`)
- Décisions DPA nationales (CNIL, UODO, etc.) dans `national-case-law-seeds.ts` et `national-case-law-cnil.ts`

**Chunking** (`scripts/ingest-legal-docs.ts:155-211`) :
- Niveau article : séparation sur regex `Article|Artikel|Artículo`
- Articles longs > 4 000 chars : sous-chunking par paragraphe → identifiants `53_§1`, `53_§2`...
- Fallback paragraphes (P1, P2…) pour les documents sans structure d'articles (lignes directrices EDPB)

### Lacunes identifiées

**Textes absents du corpus** alors que le protocole universel les cite comme applicables (`lib/ai/prompts/universal-protocol.ts:39-59`) :
- Directive (UE) 2016/680 (LED — IA dans les services répressifs)
- Règlement (UE) 2018/1725 (EUDPR — institutions UE)
- Règlement (UE) 2017/745 (MDR — IA dispositifs médicaux)
- Règlement (UE) 2017/746 (IVDR)
- Règlement (UE) 2025/327 (EHDS — espace européen de données de santé)
- Règlement (UE) 2022/2554 (DORA — résilience numérique services financiers)
- Règlement (UE) 2024/2847 (CRA — Cyber Resilience Act)
- Convention STCE 225 (Convention de Vilnius IA et droits fondamentaux)
- Convention 108+ (Conseil de l'Europe données personnelles)
- EDPB Opinion 28/2024 (IA et données personnelles) — mentionnée dans le protocole mais absente du corpus
- Directive (UE) 2024/2831 (travailleurs de plateformes)

**Structure éditoriale partiellement préservée** :
- Les sous-chunks portent des numéros artificiels (`53_§2`) qui ne correspondent pas aux paragraphes officiels du règlement. Si le modèle cherche l'art. 53 §2 AI Act, il peut recevoir le chunk `53_§2` qui est en réalité un sous-découpage technique sans rapport avec le §2 officiel.
- Le fallback paragraphe pour les lignes directrices EDPB perd toute structure sémantique (titres, numéros de points).

**Doublon EN/FR** : `AI_ACT.txt` et `AI_ACT_FR.txt` coexistent probablement en DB avec le même nom de règlement. Sans inventaire de production confirmatif, le risque est que des chunks EN remontent sur des requêtes FR, créant de la confusion dans les citations.

### Justification de la note

Le corpus couvre les textes les plus demandés (AI Act FR, RGPD FR, NIS2 FR + jurisprudence CJUE). Mais sur 11 textes cités dans le protocole universel comme applicables, 9 sont absents du corpus. Le modèle peut promettre une analyse sur la LED ou le MDR sans avoir de source. **Note 3/5.**

---

## Critère 2 — Qualité des embeddings et du retrieval

**Note : 3/5**

### Preuves dans le code

**Modèle d'embedding** (`lib/ai/embeddings.ts:1-12`) :
```
model: "text-embedding-3-small"
dimensions: 1536
```
Modèle OpenAI généraliste, non spécialisé droit. Dimension 1536 raisonnablement élevée.

**Stratégie de retrieval** (`lib/ai/rag.ts:36-66`) :
- Recherche pgvector (cosine) avec seuil configurable (défaut 0.65, 0.60 dans le chat)
- Reranking hybride post-cosine : `score = similarity × 0.7 + keywordScore × 0.3`
- `keywordScore` = fraction de mots > 3 caractères de la requête présents dans `regulation + article_title + content` (overlap simple)

**Aucun BM25** — la recherche est purement sémantique + overlap keyword. Le pipeline BM25 n'est pas implémenté (`lib/ai/rag.ts` — confirmé).

**Aucun reranker neuronal** — pas de cross-encoder, pas de modèle type Cohere Rerank ou Voyage Rerank.

**Seuil cosinus** :
- Chat : 0.60 — relativement bas pour du droit (peut remonter des chunks peu pertinents)
- Générateurs via `enrichPromptWithNationalRag` : seuils variables (0.48-0.52 pour la jurisprudence)
- Un seuil < 0.50 pour la jurisprudence est très permissif — risque de chunks hors-sujet contaminant les réponses

**Match count** :
- EU statutes (chat) : 3-5 chunks selon contexte national
- EU case law : 6-8 (heavy jurisprudence mode)
- National statutes : 6-14 selon nombre de pays détectés

**Cas critique : requêtes courtes techniques**
Une requête comme "art. 6 §3 AI Act" est très courte — l'embedding capturera "AI Act" correctement mais pas la spécificité du §3. Le keyword reranker comptabilise les mots > 3 chars : "art" (3 chars, exclu), "AI" (2 chars, exclu) → `keywordScore` quasi nul. Le reranking ne favorise pas les chunks pertinents.

**Qualité des chunks de jurisprudence** (`lib/ingest/case-law-seeds-ingest.ts:69-76`) :
```
CASE_LAW_BODY_PAD → bodies paddés si trop courts
```
Les seeds EU core ont des corps de 300-500 caractères (synthèses). L'embedding d'un corps si court capture peu de signal juridique. Le seuil de similarité doit être abaissé (0.46) pour retrouver ces chunks — augmentant le bruit.

### Justification de la note

Architecture fonctionnelle mais sans les mécanismes de précision du state-of-the-art (BM25 hybride, reranker neuronal). Les seuils bas compensent partiellement mais au prix de bruit. **Note 3/5.**

---

## Critère 3 — Filtrage par juridiction

**Note : 4/5**

### Preuves dans le code

**Détection automatique des pays** (`lib/ai/country-detection.ts` appelé depuis `app/api/chat/route.ts:126`) :
- `detectEuMemberCountriesFromQuestion` extrait les codes pays ISO depuis la question
- `resolveConsultantNationalCountryCodes` détermine le scope RAG national (`lib/ai/consultant-national-scope.ts:24-43`) :
  - Pays nommés → ces pays uniquement
  - `NATIONAL_RAG_SCOPE=eu27` → tous les 27 (opt-in env)
  - Question comparatiste explicite → EU-27
  - Sinon → **aucun droit national** (droit UE seul)

**Règle 11 du prompt consultant** (`lib/ai/prompts/consultant-production-rules.ts:227-234`) :
*"Lorsque la question mentionne explicitement un pays, tu te limites strictement à la juridiction nommée. La présence de sources étrangères dans ton bloc <sources> ne te dispense pas de cette discipline."*

**Filtrage sources hors-sujet** (`lib/ai/source-filter.ts:102-122`) :
- Actuellement **un seul axe** : GPAI (pour éviter contamination Code GPAI sur questions RGPD biométrie)
- Le filtrage est conservateur : ne retire une source que sur correspondance explicite, jamais par inférence

**Test mental lexical dans la règle 11** :
*"Pour chaque nom d'État membre, d'autorité nationale, ou de loi nationale qui apparaît dans ta réponse : ce nom est-il textuellement présent dans la question ?"*

### Limites identifiées

- Le filtre `source-filter.ts` ne couvre qu'un seul axe (GPAI). Un chunk BDSG allemand peut contaminer une réponse sur le droit français si les seuils cosinus sont bas.
- La détection de pays par regex peut échouer sur des formulations indirectes ("notre groupe établi au Rhin" ne détecte pas DE).
- Le filtrage juridictionnel ne s'applique **pas** aux 22 générateurs de documents — seul le chat bénéficie de cette protection.

### Justification de la note

La logique de filtrage juridictionnel est bien pensée côté prompt (règles 11-12) et partiellement implémentée côté code. Le principal angle mort est l'absence d'extension aux générateurs de documents. **Note 4/5.**

---

## Critère 4 — Stabilité du prompt système

**Note : 3/5**

### Preuves dans le code

**Construction du prompt consultant** (`lib/ai/prompts/build-consultant-system-prompt.ts:14-21`) :
```
[CONSULTANT_IDENTITY, CONSULTANT_PRODUCTION_RULES, CONSULTANT_MASTER_SLIM, CONSULTANT_PROMPT].join("\n\n")
```
Composition déterministe à partir de 4 constantes TypeScript statiques.

**Intégrité des prompts MD** (`lib/ai/prompts/load-prompt-markdown.ts:106-135`) :
- `assertPromptIntegrity` : vérification taille min + sections clés à chaque chargement
- Cache in-memory : stable pendant la durée de vie de l'instance serverless
- Erreur au démarrage si un fichier MD est tronqué → protection contre dérive silencieuse

**Versionnage informel** :
- Commentaires dans les fichiers : `v2.0`, `v1`, `addendum-v2`
- **Aucun tag git ou hash de version** injecté dans les logs `ai_interaction_logs` — impossible de relier un log à la version exacte du prompt au moment de la requête

**Partie variable du system prompt** (per-request) :
- `consultantDepthAddendum` : varier selon `response_depth` (brief/detailed) — `route.ts:103-108`
- `languageAddendum` : varier selon langue détectée — `route.ts:581-588`
- Ces addenda s'ajoutent **à la fin** du system prompt fixe → le system prompt effectif n'est pas identique pour deux requêtes dans des langues différentes

**Règle 8 — Vérification finale** (`consultant-production-rules.ts:108`) :
17 contrôles listés explicitement dans la checklist de fin de génération. Très détaillée.

**Temperature = 0.1** (pas 0) :
- Petite variabilité résiduelle → deux requêtes identiques peuvent produire des réponses légèrement différentes même avec le même prompt fixe

### Limites identifiées

- Pas de versionnage tracé dans `ai_interaction_logs.prompt_version` → audit trail incomplet pour conformité AI Act (Art. 12 — documentation technique du système IA)
- Le `UNIVERSAL_CONSULTANT_PROTOCOL` (~366 lignes) **n'est pas injecté dans le stack consultant actuel** (`build-consultant-system-prompt.ts`). Il est défini dans `universal-protocol.ts` mais non importé dans le consultant. Il est potentiellement utilisé pour d'autres outils (à vérifier), mais absent du canal principal.

### Justification de la note

Le prompt est stable et intègre pour une même session. L'absence de versionnage tracé en logs et l'exclusion du protocole universel du canal consultant sont des lacunes pour un produit SaaS légal. **Note 3/5.**

---

## Critère 5 — Configuration de l'appel Claude

**Note : 3/5**

### Preuves dans le code

**Modèles** (`lib/pricing.ts` + `lib/ai/model-routing.ts`) :
- Free → `claude-haiku-4-5-20251001`
- Paid → `claude-sonnet-4-5`
- Pro/Enterprise + 3 outils premium → `claude-opus-4-5`

**Température** :
| Outil | Température |
|-------|-------------|
| Consultant | 0.1 |
| Scanner | 0.1 |
| Art11, FRIA, DPIA, RoPA, Contrat | 0.1 |
| Checklist, Classifier | 0.1 |
| Cerveau | 0.2 |
| Quiz (génération) | 0.3 |
| Arrets guide | 0.2 |

**max_tokens** (`lib/ai/config.ts:50-84`) :
| Outil | max_tokens par défaut |
|-------|----------------------|
| Consultant | 16 384 |
| FRIA | 16 384 |
| Quiz | 6 144 |
| Jurisprudence | 10 000 |
| Art11 | 4 500 |
| Scanner | 2 500 ⚠️ |
| Cerveau | 1 500 ⚠️ |
| DPIA (via generateDocument) | 8 192 |
| Générateurs génériques | 8 192 |

**Seed** : **absent** de tous les appels Anthropic. Paramètre `seed` non supporté par Claude (contrairement à OpenAI GPT-4o).

**Troncature détectée** :
- `stop_reason === "max_tokens"` détecté et loggé pour le consultant (`app/api/chat/route.ts:613-617`)
- `scanner` max_tokens 2 500 est insuffisant pour analyser une page web riche en cookies/trackers

**Modèle pour l'audit complet** :
- L'outil `audit` est dans `OPUS_PREMIUM_TOOLS` → Opus pour Pro/Enterprise
- Mais la température est tirée de `TOOL_CONFIGS.doc_memoire.temperature` (0.1) car il n'y a pas de `TOOL_CONFIGS.audit` (`app/api/audit/route.ts` — confirmé Phase 2)

### Points positifs

- Claude 3.5+ / Claude 4 : modèles récents, bonne compréhension du droit UE
- Température 0.1 quasi universelle : bonne pratique pour le juridique
- max_tokens consultant 16 384 : suffisant pour les analyses longues
- Adaptive token budget pour les users free (évite les coûts excessifs)

### Limites identifiées

- Aucun seed → non-reproductibilité (corolaire du critère 7)
- Scanner max_tokens 2 500 : risque de troncature sur les pages complexes
- Pas de `TOOL_CONFIGS.audit` dédié → couplage imprévu avec `doc_memoire`

### Justification de la note

La configuration est raisonnablement saine (bonne température, modèles récents, max_tokens généreux pour le consultant). L'absence de seed et la configuration incorrecte du température pour l'audit empêchent la note d'être plus haute. **Note 3/5.**

---

## Critère 6 — Validation post-génération

**Note : 3/5**

### Preuves dans le code

**Validation citations consultant** (`lib/ai/consultant-citation-validator.ts:94-122`) :

Contrôles actifs :
1. Détection en-tête interdit "Jurisprudence applicable" → `needsRewrite = true`
2. ECLI cité dans la réponse mais absent du contexte RAG → `needsRewrite = true` + réécriture automatique
3. Mismatch date/ECLI (ex. ECLI 2017 mais date "2019" à proximité) → `needsRewrite = true`
4. Numéros d'affaires sans ECLI correspondant dans le RAG → signalé
5. Affaires mémoire connues sans ECLI RAG (Elite Taxi, Orange România, Schecke) → signalé

**Réécriture automatique** (`app/api/chat/route.ts:636-680`) :
- Si `needsRewrite = true` : second appel Claude avec prompt correctif
- Verification post-réécriture : si la réécriture résout les issues → envoi de la version corrigée
- Si échec de la réécriture → envoi de l'original avec un warning dans les logs

**Validation outputs généraux** (`lib/ai/guardrails.ts:140-168`) :
- Bornes d'articles AI Act (1-113) et RGPD (1-99) : détecte les articles hors-plage → **warning uniquement**, pas de blocage
- Longueur output (8-32 000 chars)
- Patterns d'injection dans l'input

### Limites identifiées

**La validation post-génération ne couvre que le consultant chat** — les 22 générateurs de documents ne bénéficient d'aucune validation de citations post-génération.

Spécifiquement :
- La checklist peut citer "art. 7 §1 point b)" de l'AI Act (qui n'existe pas) sans détection
- Le classifieur peut attribuer une obligation à l'art. 15 AI Act sans que le numéro soit vérifié
- Le validateur guardrails vérifie uniquement les numéros d'articles > 113 (AI Act) ou > 99 (RGPD) — pas la cohérence article/contenu cité

**Pas de validation des structures internes des articles** :
- La règle 9.sexies du prompt interdit "article 3, paragraphe 1, point 13" (formulation inexistante)
- Mais aucun validateur de code ne vérifie cette structure post-génération — uniquement un comportement attendu du modèle

**Pas de validation ECLI pour la cohérence** :
- Si un ECLI est dans le RAG mais que la date associée dans la source seed est incorrecte, le validator ne le détecte pas (il valide la cohérence réponse/RAG, pas RAG/vérité)

### Justification de la note

La validation post-génération est solide et originale pour le consultant chat (réécriture automatique, détection ECLI). Mais son absence sur les 22 générateurs de documents laisse la majorité de l'output non-vérifié. **Note 3/5.**

---

## Critère 7 — Reproductibilité

**Note : 1/5**

### Preuves dans le code

**Absence de seed** :
- L'API Anthropic ne supporte pas le paramètre `seed` (contrairement à OpenAI) — c'est une limitation du provider
- Même avec température = 0.1, deux requêtes identiques produisent des réponses légèrement différentes

**Variables non-déterministes dans le pipeline** :

| Variable | Localisation | Impact |
|----------|-------------|--------|
| Traduction RAG (si non-FR) | `lib/ai/query-translate.ts` | La traduction vers le français peut varier → embedding différent → chunks différents |
| Sélection de chunks pgvector | `lib/ai/rag.ts:46-66` | Variations si le vecteur d'embedding change légèrement |
| Live EUR-Lex search | `lib/ai/eurlex.ts` | Résultats EUR-Lex en temps réel → peuvent changer entre deux appels |
| Auto-ingest national en arrière-plan | `lib/ai/national-auto-ingest.ts` | Peut modifier le corpus entre deux appels |
| Temperature 0.1 | Anthropic API | Petite variabilité résiduelle du LLM |
| Addendum langue | `app/api/chat/route.ts:581-588` | Varie selon langue détectée |

**Aucun mécanisme de mesure de la reproductibilité** :
- Pas de test "pose la même question 5 fois et compare les réponses"
- Pas de golden-set de questions avec réponses de référence
- Pas de CI qui detecterait une régression de qualité après modification du prompt

**Impact pratique** :
- Un utilisateur qui pose deux fois la même question peut obtenir des qualifications juridiques différentes (par exemple "probable haut risque" vs "non-haut-risque sous réserve d'art. 6§3" selon les chunks remontés)
- Impossible d'effectuer un audit de régression du système avant un déploiement

### Justification de la note

L'absence de reproductibilité est structurelle (limitation Anthropic) mais aucun mécanisme de mesure ou de stabilisation (cache sémantique de réponses, golden-set) n'a été mis en place. Pour un produit à vocation juridique, c'est un risque élevé. **Note 1/5.**

---

## Critère 8 — Couverture des cas d'usage

**Note : 3/5**

### Les cinq régimes principaux

**Régime 1 — Systèmes IA à haut risque**
- Corpus : AI Act FR complet (art. 6 + Annexe III dans le texte)
- Outil dédié : Classifieur AI Act (prompt 20 000 chars couvrant Annexe III)
- Outil Art. 11 : documentation technique Annexe IV
- Règle 9.quinquies : identification des exemptions art. 6 §3
- **Verdict : COUVERT** ✅

**Régime 2 — Modèles GPAI (art. 51-56 AI Act)**
- Corpus : AI Act FR art. 51-56 + Code GPAI (GPAI_Code_Bonnes_Pratiques_FR.txt)
- Source filter anti-contamination GPAI implémenté
- Règle 9.sexies distingue art. 51/53/55/56
- **Lacune** : l'art. 52 (obligations de transparence GPAI) est distinct de l'art. 53 — vérifiable uniquement si le chunk AI Act FR couvre cet article correctement
- **Verdict : COUVERT avec lacunes mineures** ✅⚠️

**Régime 3 — Pratiques interdites (art. 5 AI Act)**
- Corpus : AI Act FR contient art. 5
- Règle 0 et règle 9.ter distinguent art. 5 et art. 6 (régimes distincts)
- Prompt consultant : "Niveau 1 — Interdiction" en premier
- **Lacune** : aucune protection spécifique contre la confusion art. 5 / art. 6 (jailbreak thématique possible)
- **Verdict : COUVERT** ✅

**Régime 4 — Obligations de transparence (art. 50 AI Act)**
- Corpus : AI Act FR présent — art. 50 dans le texte
- Pas d'outil dédié "transparence"
- Pas de règle de production spécifique à la transparence
- **Lacune** : la confiance dans ce régime repose uniquement sur les chunks RAG art. 50 sans guardrail spécifique
- **Verdict : PARTIELLEMENT COUVERT** ⚠️

**Régime 5 — Transferts internationaux (RGPD Chapitre V)**
- Corpus : RGPD FR présent + Schrems I/II dans les seeds jurisprudence
- Règle 2 sur le périmètre géographique
- **Lacune** : les décisions d'adéquation (Adequacy Decisions) ne sont pas dans le corpus. "Transfert vers les États-Unis post-DPF" → le modèle ne dispose d'aucune source RAG sur le Data Privacy Framework (DPF 2023)
- **Verdict : PARTIELLEMENT COUVERT** ⚠️

### Cas d'usage spécifiques importants

| Cas d'usage | Couverture | Note |
|-------------|-----------|------|
| DPO obligatoire (art. 37 RGPD) | ✅ WP243 dans corpus + règle 0 | Bon |
| DPIA obligatoire (art. 35 RGPD) | ✅ WP248 dans corpus + règle 0 | Bon |
| AI Act + santé (MDR/IVDR) | ❌ MDR/IVDR absents | Lacune |
| AI Act + finance (DORA) | ❌ DORA absent | Lacune |
| Recrutement algorithmique | ✅ Seeds jurisprudence recrutement | Bon |
| IA dans les services répressifs (LED) | ❌ LED absente | Lacune |
| Données biométriques | ✅ RGPD art. 9 dans corpus | Bon |
| Convention 108+ / CEDH | ⚠️ CEDH présent, 108+ absent | Partiel |

### Justification de la note

Les cinq régimes principaux sont représentés, avec une couverture solide sur haut risque, GPAI et pratiques interdites. Les principales lacunes concernent les régimes sectoriels (santé, finance, services répressifs) et l'absence de certaines sources clés (DPF, DORA, LED). **Note 3/5.**

---

## Synthèse

| Critère | Note | Résumé |
|---------|------|--------|
| 1. Couverture corpus RAG | **3/5** | Textes clés présents mais 9+ textes cités dans le protocole absents |
| 2. Embeddings et retrieval | **3/5** | text-embedding-3-small + reranking keyword ; pas de BM25 ni reranker neuronal |
| 3. Filtrage juridictionnel | **4/5** | Bien conçu côté prompt + détection pays ; angle mort : générateurs |
| 4. Stabilité prompt système | **3/5** | Prompt fixe + intégrité vérifiée ; pas de versionnage en logs, UNIVERSAL_PROTOCOL non injecté dans le consultant |
| 5. Configuration Claude | **3/5** | Température 0.1, modèles récents ; pas de seed, scanner max_tokens insuffisant |
| 6. Validation post-génération | **3/5** | Robuste pour le chat ; absente pour les 22 générateurs de documents |
| 7. Reproductibilité | **1/5** | Non-déterministe structurellement ; aucun golden-set ni mesure de régression |
| 8. Couverture cas d'usage | **3/5** | 5 régimes couverts ; lacunes sectorielles (santé, finance, services répressifs) |

**Score global : 23/40 (58 %)**

### Les trois failles structurelles prioritaires

**F1 — Non-reproductibilité sans mesure** (critère 7 : 1/5)
Le produit qualifie des obligations légales qui peuvent engager des organisations. Deux questions identiques peuvent produire des qualifications divergentes sans que personne ne le détecte. L'absence de golden-set et de CI de régression constitue un risque de responsabilité.

**F2 — Validation post-génération inexistante hors chat** (critère 6)
Les 22 générateurs (DPIA, RoPA, FRIA, art.11...) n'ont aucun mécanisme de détection des hallucinations post-génération. Un DPIA livré avec un article 35 §3 a) inventé passe sans alerte.

**F3 — Corpus incomplet sur les régimes sectoriels** (critère 1)
Le protocole universel promet une couverture sur 11 domaines juridiques. 9 textes cités comme applicables sont absents du corpus. Le modèle peut se retrouver en "Situation C" (aucune source) sans le signaler si le chunk le plus proche est thématiquement proche mais d'un autre texte.

---

*Fin de la Phase 3. Les Phases 4 et 5 s'appuient sur les constats des Phases 1, 2 et 3.*
