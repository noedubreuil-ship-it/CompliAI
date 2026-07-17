# Monitoring Sources — Cartographie des sources officielles
> Phase 0 — CompliAI RAG Automation System

## Séquençage Phase 1 : deux vagues

Le déploiement des sources est découpé en deux vagues pour isoler les bugs par famille de source et limiter le risque global.

### Phase 1A — Sources européennes prioritaires
Sources stables, bien structurées, flux RSS ou scraping documenté. Objectif : pipeline de bout en bout fonctionnel sur des sources connues.

| Source | ID | Fréquence | Langue |
|---|---|---|---|
| EUR-Lex JO (RSS) | `eurlex-rss` | Quotidien | FR |
| EUR-Lex CELLAR (API SPARQL) | `eurlex-api` | Hebdomadaire | FR |
| CJUE arrêts (scraping HTML) | `curia-scraping` | Quotidien | FR |
| EDPB toutes publications | `edpb-all` | Quotidien | FR |

> **Validation intermédiaire requise** avant le lancement de Phase 1B.

### Phase 1B — AI Office + DPAs nationales
Sources plus hétérogènes (scraping HTML, langues multiples, absence de RSS). Lancée uniquement après validation de Phase 1A.

| Source | ID | Fréquence | Langue |
|---|---|---|---|
| AI Office Commission | `ai-office` | Hebdomadaire | FR/EN |
| CNIL France | `cnil` | Hebdomadaire | FR |
| DPC Irlande | `dpc-ie` | Hebdomadaire | EN |
| Garante Italie | `garante-it` | Hebdomadaire | IT |
| BfDI Allemagne | `bfdi-de` | Hebdomadaire | DE |
| AEPD Espagne | `aepd-es` | Hebdomadaire | ES |
| AP Pays-Bas | `ap-nl` | Hebdomadaire | NL |
| IP SI Slovénie | `ip-si` | Hebdomadaire | SL |

> **Validation finale Phase 1** après confirmation que toutes les sources 1B sont opérationnelles.

---

## Langue d'ingestion — politique pour ce chantier

**EDPB et CJUE : ingestion en français uniquement** (continuité avec le corpus existant de 4 704 chunks FR).

- Pour EUR-Lex et CJUE : téléchargement de la version FR via les URLs `legal-content/FR/TXT/HTML/`
- Pour EDPB : téléchargement du PDF FR quand disponible ; si uniquement EN disponible, le document est mis en `status = 'pending'` avec `language = 'en'` et attend une décision manuelle
- La colonne `language` est **obligatoirement renseignée** sur chaque chunk ingéré dès la Phase 1 — valeur `'fr'` ou `'en'` selon la version téléchargée
- Un mode d'ingestion multilingue (FR + EN simultanés) est documenté dans `RAG_FUTURE_IMPROVEMENTS.md`

---

## Vue d'ensemble

| Catégorie | Sources | Fréquence | Format principal | Vague |
|---|---|---|---|---|
| EUR-Lex | 1 flux RSS + 1 API SPARQL | Quotidien/Hebdo | RSS/Atom + HTML | **1A** |
| CJUE | 1 page scraping HTML | Quotidien | HTML | **1A** |
| EDPB | 1 page (scraping, toutes publications) | Quotidien | HTML + PDF | **1A** |
| AI Office | 1 page (scraping) | Hebdomadaire | HTML | **1B** |
| Autorités nationales | 7 DPAs | Hebdomadaire | RSS (si dispo) ou HTML | **1B** |
| Parlement européen | 1 API REST (watchlist de 13 procédures) | Hebdomadaire | JSON-LD | **1C** |

---

## Phase 1C — Veille législative (Parlement européen)

Ajoutée le 17 juillet 2026. Comble un angle mort structurel : **toutes les
sources ci-dessus n'observent que du droit adopté** — EUR-Lex diffuse le
Journal officiel, CELLAR interroge les actes publiés, les DPAs publient des
décisions. Aucune ne voyait un texte en cours de négociation.

Cas déclencheur : le vote du Parlement du 2026-07-09 sur la procédure
2025/0429(COD) — prolongation de la dérogation ePrivacy, « Chat Control 1.0 » —
n'était détectable par aucun connecteur.

| Source | ID | source_type | Fréquence | Langue |
|---|---|---|---|---|
| Parlement européen — procédures législatives | `ep-procedures` | `ep_procedure_api` | Hebdomadaire | FR (repli EN) |

**Veille uniquement, jamais ingérée.** Les documents portent le
`document_type` `legislative_procedure`, absent de `SUPPORTED_DOCUMENT_TYPES`
(`lib/rag-ingestion/pipeline.ts`) : le pipeline d'ingestion les écarte et rien
n'atteint `legal_chunks`. Une proposition en négociation n'est pas du droit
applicable et ne doit jamais être citée au client comme une obligation en
vigueur. Ne pas ajouter ce type à cet ensemble sans porter d'abord un marquage
« proposition — non applicable » jusque dans les prompts de génération.

### Pourquoi une watchlist et non une découverte automatique

Les endpoints de découverte de l'API sont inexploitables (vérifié le
2026-07-17 sur données réelles) :

- `GET /procedures` n'accepte aucun filtre par année — la spec OpenAPI ne
  documente que `process-type`, `offset`, `limit`. Un `?year=` est
  silencieusement ignoré.
- Son index est incomplet : 2025/0429(COD) n'apparaît sur aucune page (717
  procédures lues jusqu'au HTTP 204), alors que `GET /procedures/{id}` la sert
  parfaitement.
- `GET /procedures/feed`, prévu pour la veille, renvoie 0 procédure mise à jour
  sur un mois, tous types confondus.

D'où le choix d'interroger des procédures connues. Coût : ~13 requêtes
hebdomadaires, ~10 s par run. Quota API : 500 requêtes / 5 min.

### Maintenance

La liste par défaut (`EP_DEFAULT_WATCHLIST`, 13 identifiants vérifiés un à un
contre l'API) est surchargeable **sans redéploiement** via le `config` jsonb de
la source :

```json
{ "procedures": ["2025-0429", "2021-0106"] }
```

Format d'identifiant : `AAAA-NNNN` (`2025-0429`), et non `2025/0429(COD)`.
Ajouter une entrée quand une nouvelle proposition du périmètre entre en
négociation ; la découverte se fait via EUR-Lex une fois le texte publié, ou à
la lecture de la presse spécialisée.

### Piège de déduplication

L'`externalId` est `${process_id}:${activity_id}`, jamais le seul
`process_id` : une procédure suivie est réinterrogée chaque semaine pendant des
années. Avec un identifiant figé sur la procédure, chaque nouveau vote passerait
pour un doublon d'une procédure déjà connue — c'est-à-dire précisément le
scénario du 9 juillet.

---

## Politique de throttling et filtrage post-activation

> Mise à jour : 2026-06-26, après première tentative d'activation réelle.

### Throttling

| Source type | Délai inter-source | Justification |
|-------------|--------------------|---------------|
| `eurlex_rss` | 1 200 ms | API/RSS stable, <1 req/s |
| `curia_scraping` | 2 000 ms + retry 5s/15s/30s | Portail JSF instable |
| `edpb_scraping` | **5 000 ms** | 2 000 ms a déclenché HTTP 429 en activation réelle |
| `ai_office_scraping` | 1 200 ms | RSS Commission stable |
| `national_authority_rss` | 1 200 ms | Flux RSS nationaux |
| `national_authority_scraping` | 2 000 ms | Pages HTML hétérogènes |

### Audit du premier cycle réel

Premier cycle `dryRun=false` du 2026-06-26 : **147 documents** détectés, dont plusieurs sources trop bruyantes.

| Source | Volume observé | Diagnostic | Filtrage resserré |
|--------|----------------|------------|-------------------|
| CNIL France | 3 en staging sûr | Prix/webinaires/recherche hors scope | Exclusion `prix`, `webinaire`, `événement`, `colloque`, `recherche sur` |
| DPC Irlande | 61 | Backlog historique complet des décisions | Big Tech, transferts, mineurs, breaches uniquement |
| BfDI Allemagne | 24 | Flux général, beaucoup d'actualités institutionnelles | Retrait de `Datenschutz` générique + négatifs événements/nomination |
| AEPD Espagne | 20 | Notes de presse, prix, événements, revue | Négatifs prix/événements + focus guidances, sanctions, IA, neurodatos |
| IP SI Slovénie | 20 | Actualités institutionnelles et recrutement | Focus décisions/guidances, IA, GDPR, digital children, eCRP, fraude |

Effet mesuré sur fixtures locales :

| Source | Avant | Après filtres | Réduction |
|--------|-------|---------------|-----------|
| DPC | 61 | 16 | -74 % |
| BfDI | 28 | 11 | -61 % |
| AEPD | 25 | 8 | -68 % |
| IP SI | 20 | 9 | -55 % |

Volume attendu après resserrement :

- Premier cycle/backfill : **50–70 documents** au lieu de 147.
- Régime de croisière mensuel : **15–35 documents** selon actualité réglementaire.
- Sources “sûres” pour reprise progressive : EUR-Lex RSS, CNIL, AEPD.

### Filtres calibrés

| Source | Mots-clés positifs principaux | Exclusions |
|--------|-------------------------------|------------|
| CNIL | sanctions, mises en demeure, référentiels, recommandations, lignes directrices, IA/RGPD | prix, webinaires, événements, annonces recherche |
| DPC | `Meta`, `Facebook`, `Instagram`, `WhatsApp`, `TikTok`, `Microsoft`, `Apple`, `LinkedIn`, `Twitter`, transferts, mineurs, breaches | PME/collectivités locales non systémiques, Airbnb, banque/santé hors signal produit |
| BfDI | `DSGVO`, `KI`, `Data Act`, `ReguLab`, `Chatkontrolle`, `Cookie`, `DSFA`, `Orientierungshilfe` | prix, nominations, événements, baromètres |
| AEPD | sanctions, résolutions, guidances, `IA`, neurodatos, décisions automatisées, rapports juridiques | prix, cours, directs, revues, annonces institutionnelles |
| IP SI | décisions, pritožbi, GDPR, IA, sandbox IA, enfants/digital, eCRP, fraude carte | recrutement, prix, conférences, concours, rapports cérémoniels |

Ces filtres doivent être réévalués après 2 semaines de monitoring réel.

---

## 1. EUR-Lex

### 1.1 Flux RSS Journal Officiel
| Attribut | Valeur |
|---|---|
| **URL** | `https://eur-lex.europa.eu/oj/daily-view/P3/1/RSS/FR.xml` |
| **Format** | RSS 2.0 |
| **Fréquence** | Quotidien (JO publié en semaine) |
| **Contenu** | Tous les actes publiés au JO UE — à filtrer |
| **Auteur** | Office des Publications de l'UE |

**Filtrage requis** : les sections suivantes du JO sont pertinentes :
- Série L (actes législatifs) : règlements, directives, décisions
- Mots-clés CELEX : `32` (règlements), `31` (directives), domaines `N13` (protection des données), `N78` (technologies), `L10` (marché intérieur), `N25` (justice)

**Implémentation** :
```python
EURLEX_RSS_URL = "https://eur-lex.europa.eu/oj/daily-view/P3/1/RSS/FR.xml"

EURLEX_KEYWORD_FILTERS = [
    "données personnelles", "protection des données", "intelligence artificielle",
    "systèmes d'IA", "cybersécurité", "résilience", "gouvernance des données",
    "services numériques", "marchés numériques", "identité numérique"
]

EURLEX_CELEX_PREFIXES = [
    "32024R",  # Règlements 2024
    "32025R",  # Règlements 2025+
    "32024L",  # Directives 2024
    "32025L",  # Directives 2025+
]
```

### 1.2 API EUR-Lex (CELLAR/SPARQL)
| Attribut | Valeur |
|---|---|
| **URL SPARQL** | `https://publications.europa.eu/webapi/rdf/sparql` |
| **Format** | SPARQL/JSON |
| **Fréquence** | Hebdomadaire (complémentaire au RSS) |
| **Usage** | Récupérer les métadonnées complètes d'un document CELEX |

**Requête type** (métadonnées d'un règlement) :
```sparql
SELECT ?title ?date ?celex WHERE {
  ?doc cdm:resource_legal_id_celex ?celex .
  ?doc dc:title ?title .
  ?doc cdm:work_date_document ?date .
  FILTER(LANG(?title) = "fr")
}
```

**Note** : l'API CELLAR permet aussi de récupérer le texte HTML complet via :
`https://publications.europa.eu/resource/celex/{CELEX}/fre/txt_html`

---

## 2. CJUE — Cour de Justice de l'Union Européenne

### 2.1 Scraping HTML — juris.curia.europa.eu

> **Note (vérifié le 2026-06-25)** : Aucun flux RSS actif n'a été identifié sur les domaines `curia.europa.eu` et `juris.curia.europa.eu`. Toutes les URLs RSS historiquement documentées retournent 403 ou 404. Le scraping HTML est la seule méthode fiable en 2026.

| Attribut | Valeur |
|---|---|
| **URL** | `https://juris.curia.europa.eu/juris/documents.jsf` |
| **Méthode** | POST (formulaire JSF) |
| **Format** | HTML — tableau `table_document_ligne` |
| **Fréquence** | Quotidien (arrêts publiés en semaine) |
| **Auteur** | Greffe de la Cour de Justice de l'Union Européenne |
| **Domaine actif** | `juris.curia.europa.eu` (migré depuis `curia.europa.eu`) |

**Paramètres POST du formulaire JSF** (mis à jour 25/06/2026 — affaires clôturées, tri date décroissante) :
```
mainForm=mainForm
mainForm:jur_C=on                  # Cour de justice (C-XXX)
mainForm:td=ALL                    # Tous types de documents
mainForm:langCode=FR               # Langue française
mainForm:critereAffaire=clot       # Affaires CLÔTURÉES uniquement (arrêts rendus)
mainForm:triPrefTri=dateDesc       # Tri par date de prononcé décroissante
mainForm:triPrefAff=doc            # Vue "Liste des documents"
mainForm:btnRec=Rechercher
```

> **Pourquoi `critereAffaire=clot` ?** Sans ce paramètre, le formulaire retourne par défaut les affaires récemment *déposées*, c'est-à-dire des renvois préjudiciels en cours d'instruction. Avec `clot`, on obtient uniquement les affaires *clôturées* — des arrêts rendus.

**Sélecteurs CSS** (identifiés sur fixture réelle du 25/06/2026) :
```typescript
CURIA_SELECTORS = {
  document_row:       "tr.table_document_ligne",
  cell_case:          "td.table_cell_aff",        // Numéro d'affaire : "C-601/23"
  cell_doc_type:      "td.table_cell_doc",        // Type + span.outputEcli
  cell_date:          "td.table_cell_date",       // Date décision : "DD/MM/YYYY"
  cell_parties:       "td.table_cell_nom_usuel",  // Noms des parties
  cell_links_eurlex:  "td.table_cell_links_eurlex", // Lien EUR-Lex
  ecli_span:          "span.outputEcli",          // ECLI (parfois vide)
  pdf_link:           "a[href*='showPdf']",       // PDF Curia
}
```

**Colonnes du tableau retourné** :

| Classe CSS | Contenu | Exemple |
|---|---|---|
| `table_cell_aff` | Numéro d'affaire | `C-182/26 PPU` |
| `table_cell_doc` | Type de document + ECLI | `Arrêt` / `Ordonnance (JO)` / `Demande de décision préjudicielle` |
| `table_cell_date` | Date du prononcé | `25/06/2026` |
| `table_cell_nom_usuel` | Parties | `Hardeker` |
| `table_cell_links_curia` | Lien PDF Curia | `/juris/showPdf.jsf?docid=...` |
| `table_cell_links_eurlex` | Lien EUR-Lex | `eur-lex.europa.eu/...` |

### 2.2 Classification des types de documents — critère discriminant

Le champ `table_cell_doc` contient le type explicite du document. C'est le critère discriminant pour distinguer arrêts rendus et renvois préjudiciels.

| Texte dans `table_cell_doc` | `documentType` | Ingéré dans pipeline | Notes |
|---|---|---|---|
| `Arrêt` | `cjeu_judgment` | **Oui** | Arrêt rendu, ECLI présent |
| `Arrêt (JO)` | `cjeu_judgment` | **Oui** | Référence JO, ECLI absent |
| `Ordonnance` | `cjeu_order` | **Oui** | Ordonnance avec ECLI |
| `Ordonnance (JO)` | `cjeu_order` | **Oui** | Référence JO, ECLI absent |
| `Demande de décision préjudicielle` | `cjeu_referral` | **Non** | Question soumise, pas encore tranchée |
| `Request for a preliminary ruling` | `cjeu_referral` | **Non** | Idem (version anglaise) |
| `Résumé` | *(ignoré)* | **Non** | Résumé d'un arrêt, pas un acte primaire |
| `Conclusions` | *(ignoré)* | **Non** | Avis de l'avocat général |

### 2.3 Politique d'ingestion des renvois préjudiciels

Un **renvoi préjudiciel** (`Demande de décision préjudicielle`) est une question posée à la Cour par une juridiction nationale — l'affaire est *en cours*, aucun arrêt n'a encore été rendu. Ingérer ce type de document dans le RAG produirait de la **jurisprudence fictive** : le chat citerait comme "arrêts" des questions sans réponse.

**Règle appliquée :**
- Les renvois préjudiciels (`cjeu_referral`) sont **exclus du pipeline principal** (`pending_documents`).
- Ils ne sont **pas ignorés silencieusement** : la fonction `parseCuriaDocumentsHtml` les retourne avec `documentType = "cjeu_referral"` quand `includeReferrals: true` est activé.
- **Stockage futur prévu (Phase 3+)** : table `pending_judicial_referrals` avec colonnes `(external_id, case_number, parties, submission_date, status: 'pending_judgment')` pour suivre l'évolution des affaires et déclencher une nouvelle ingestion quand un arrêt est rendu.

**Filtrage requis** — mots-clés à détecter dans les parties ou le numéro d'affaire :
```typescript
CJUE_KEYWORD_FILTERS = [
  "données à caractère personnel", "données personnelles", "protection des données",
  "RGPD", "règlement général", "intelligence artificielle", "transfert",
  "consentement", "profilage", "surveillance", "ePrivacy", "communications électroniques",
  "droit à l'oubli", "accès aux données", "responsable du traitement",
  "AI Act", "vie privée", "données sensibles"
]
```

**ECLI** : format standard `ECLI:EU:C:YYYY:NNN` (Cour) ou `ECLI:EU:T:YYYY:NNN` (Tribunal) — utilisé comme clé de déduplication quand disponible dans `span.outputEcli`. Sinon : CELEX approximatif `6{YEAR}CJ{NUM}`.

**URL du texte complet** : `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:{CELEX}`

**Rate limiting** : délai de 2 000 ms entre les requêtes Curia (aucune politique documentée, mais serveur JSF potentiellement sensible au flood).

---

## 3. EDPB — European Data Protection Board

**Scope complet** : toutes les publications EDPB sont surveillées via une source unique. Les lignes directrices sont le type le plus impactant sur la qualité opérationnelle — elles ont la priorité maximale dans le pipeline de traitement.

### 3.1 Source unique — Page "Our documents" (toutes publications)
| Attribut | Valeur |
|---|---|
| **URL principale** | `https://www.edpb.europa.eu/our-work-tools/our-documents_fr` |
| **Format** | Scraping HTML (pas de RSS officiel côté EDPB) |
| **Fréquence** | Quotidien |
| **Auteur** | European Data Protection Board |
| **`expected_min_frequency_days`** | 14 (une publication environ toutes les 2 semaines) |
| **`silence_alert_threshold_days`** | 30 |

**Types de documents surveillés** (filtre sur le champ `type` de chaque entrée) :

| Type EDPB | Priorité de traitement | `document_type` dans `pending_documents` |
|---|---|---|
| Lignes directrices | **P0 — immédiate** | `edpb_guideline` |
| Recommandations | P0 — immédiate | `edpb_recommendation` |
| Décisions Art. 65 | P0 — immédiate | `edpb_binding_decision` |
| Avis | P1 | `edpb_guideline` |
| Rapports annuels | P2 | `other` |
| Communications | P2 | `other` |

**Sélecteurs CSS** (identifiés sur la page réelle `edpb.europa.eu`, vérifié le 2026-06-24) :
```typescript
EDPB_SELECTORS = {
  list_items:  ".document-card",               // Conteneur de chaque publication
  title:       ".document-card__title a",      // Titre + lien vers la page du document
  date:        ".document-card__date time",    // Date de publication (attribut datetime)
  doc_type:    ".document-card__document-type", // Type EDPB (ex. "Guidelines", "Recommendation")
  pdf_link:    "a[href$='.pdf']",              // Lien direct vers le PDF
}
```

> **Note** : les sélecteurs `.views-row` et `.views-field-*` documentés dans les versions antérieures de ce fichier correspondaient à l'ancienne version Drupal du site EDPB. Le site a été migré et utilise désormais des sélecteurs `.document-card*`. Le code `edpb-scraping.ts` est synchronisé avec ces sélecteurs réels.

**Pipeline PDF extraction** :
1. Détecter nouveau document via scraping (titre + date + URL absente de `pending_documents`)
2. Extraire le lien PDF depuis la page du document
3. Télécharger le PDF avec HTTP/1.1 forcé + retry backoff exponentiel (3 tentatives, délais 5s/15s/30s) — **le serveur EDPB tronque les connexions HTTP/2** (observé le 2026-06-24)
4. Extraire le texte via `pdfplumber` (meilleur que `pypdf` pour la mise en page EDPB)
5. Parser via Claude (prompt `parse_edpb_guideline.md` ou `parse_edpb_decision.md` selon le type)

**Déduplication** : clé = hash SHA-256 de l'URL canonique du document EDPB (ex. `https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-05...`).

---

## 4. AI Office — Bureau de l'IA (Commission Européenne)

### 4.1 Flux RSS DG CONNECT (vérifié le 2026-06-25)
| Attribut | Valeur |
|---|---|
| **URL RSS** | `https://digital-strategy.ec.europa.eu/en/rss.xml` |
| **Format** | RSS 2.0 (XML valide) |
| **Fréquence** | Hebdomadaire |
| **Auteur** | DG CONNECT / AI Office — Commission Européenne |
| **`silence_alert_threshold_days`** | 60 |
| **Langue** | EN |

**Connecteur** : `lib/rag-monitoring/sources/ai-office-rss.ts`
**Fixture** : `tests/fixtures/rag_monitoring/ai-office-rss.xml` (10 items, récupéré le 2026-06-25)

**Note sur le filtrage** : la source est le flux général "Shaping Europe's digital future" de la DG CONNECT.
Il couvre le Digital Decade, l'IA, la cybersécurité, etc. On filtre uniquement les publications liées à l'IA
via les mots-clés `AI_OFFICE_KEYWORDS` (voir `ai-office-rss.ts`). Les items non IA sont ignorés.

**Types de documents** : guidance papers, Q&A, codes of practice, delegated acts → `ai_office_guidance`

**Déduplication** : `externalId = SHA-256(sourceUrl)[0:16]`
**Rate limit** : 1 200 ms entre appels (même règle que EUR-Lex)

---

## 5. Autorités Nationales de Protection des Données

### 5.1 CNIL (France — Commission Nationale de l'Informatique et des Libertés)
| Attribut | Valeur |
|---|---|
| **URL RSS** | `https://www.cnil.fr/fr/rss.xml` |
| **Format** | RSS 2.0 (XML valide) |
| **Fréquence** | Hebdomadaire |
| **Langue** | FR |
| **`silence_alert_threshold_days`** | 30 |

**Connecteur** : `lib/rag-monitoring/sources/cnil-rss.ts`
**Fixture** : `tests/fixtures/rag_monitoring/cnil-rss.xml` (10 items, récupéré le 2026-06-25)

**Filtrage** : le RSS CNIL est un flux général. On filtre via `CNIL_DECISION_KEYWORDS` :
délibérations, sanctions, mises en demeure, recommandations, référentiels, lignes directrices IA.

**Classification des types** :
| Mot-clé détecté dans le titre | `documentType` |
|---|---|
| sanction, amende, mise en demeure, avertissement, délibération | `national_decision` |
| recommandation, référentiel, lignes directrices, guide | `national_guideline` |

**Déduplication** : `externalId = SHA-256(sourceUrl)[0:16]`
**Rate limit** : 1 200 ms entre appels

### 5.2 BfDI (Allemagne — Bundesbeauftragter für den Datenschutz und die Informationsfreiheit)
| Attribut | Valeur |
|---|---|
| **URL RSS** | `https://www.bfdi.bund.de/SiteGlobals/Functions/RSSFeed/Allgemein/rssnewsfeed.xml?nn=251944` |
| **Format** | RSS 2.0 (XML valide) |
| **Fréquence** | Hebdomadaire |
| **Langue** | DE (flux bilingue DE + EN) |
| **`silence_alert_threshold_days`** | 60 |

**Connecteur** : `lib/rag-monitoring/sources/bfdi-rss.ts`
**Fixture** : `tests/fixtures/rag_monitoring/bfdi-rss.xml` (30 items DE+EN, récupéré le 2026-06-25)

**Note** : l'ancienne URL `SiteGlobals/Functions/Feeds/DE/pressemitteilungen.xml` est inactive (404).
L'URL active est le flux "Allgemein" avec le paramètre `nn=251944`.

**Stratégie documents bilingues (décision Phase 2 — 2026-06-25)** :

Le flux BfDI est bilingue : chaque item est publié deux fois avec des URLs distinctes (`/DE/` et `/EN/`).
**Décision : ingestion de la version originale DE uniquement. La version EN est ignorée.**

Raisonnement :
1. L'allemand est la langue de la décision originale — la version EN est une traduction secondaire.
2. Ingérer les deux versions doublerait les coûts d'embedding sans valeur ajoutée (même contenu).
3. Deux chunks quasi-identiques dilueraient les scores de similarité vectorielle.
4. Le champ `language = "de"` permet une évolution future vers un mode multilingue (documenté dans `RAG_FUTURE_IMPROVEMENTS.md`).

Implémentation : le connecteur `bfdi-rss.ts` filtre les items dont l'URL contient `/EN/`.
Un item DE a une URL type `...bfdi.bund.de/SharedDocs/Kurzmeldungen/DE/2026/...`.

**Déduplication** : `externalId = SHA-256(sourceUrl)[0:16]` + filtre `/EN/` pré-déduplication
**Rate limit** : 1 200 ms entre appels

### 5.3 AEPD (Espagne — Agencia Española de Protección de Datos)
| Attribut | Valeur |
|---|---|
| **URL RSS** | `https://www.aepd.es/noticias/feed.xml` |
| **Format** | RSS 2.0 (XML valide) |
| **Fréquence** | Hebdomadaire |
| **Langue** | ES |
| **`silence_alert_threshold_days`** | 30 |

**Connecteur** : `lib/rag-monitoring/sources/aepd-rss.ts`
**Fixture** : `tests/fixtures/rag_monitoring/aepd-rss.xml` (25 items, récupéré le 2026-06-25)

**Note** : l'ancienne URL `notas-de-prensa/rss` retournait 503. L'URL active est `noticias/feed.xml`.

**Filtrage** : mots-clés en espagnol (`AEPD_KEYWORDS`). Les mots courts (≤ 3 chars, ex. "IA") utilisent
des frontières de mots (`\bIA\b`) pour éviter les faux positifs dans les suffixes (ex. "conferencia").

**Déduplication** : `externalId = SHA-256(sourceUrl)[0:16]`
**Rate limit** : 1 200 ms entre appels

### 5.4 DPC (Irlande — Data Protection Commission)
| Attribut | Valeur |
|---|---|
| **URL scraping** | `https://www.dataprotection.ie/en/dpc-guidance/decisions` |
| **RSS** | Non disponible |
| **Format** | HTML scraping (Drupal CMS) |
| **Fréquence** | Trimestrielle (~4 décisions/trimestre) |
| **Importance** | Très haute — supervise Meta, Google, Apple, Microsoft |
| **`silence_alert_threshold_days`** | 95 |
| **Langue** | EN |

**Connecteur** : `lib/rag-monitoring/sources/dpc-scraping.ts`
**Fixture** : `tests/fixtures/rag_monitoring/dpc-decisions.html` (61 décisions uniques, récupéré le 2026-06-25)

**Sélecteurs CSS** (vérifiés le 2026-06-25) :
```typescript
DPC_SELECTORS = {
  grid:     ".views-view-grid",              // Conteneur de la grille à 2 colonnes
  item:     ".faq-section-results-box",      // Conteneur de chaque décision
  title:    "h3 a",                          // Titre + lien vers la page de la décision
  date:     ".datetime",                     // Date (format "10 Dec 2025")
  category: ".faq-section-category-link a",  // Catégorie (ex. "University")
}
```

**Note sur les doublons** : la grille est en 2 colonnes — certaines décisions apparaissent deux fois dans le HTML.
Le connecteur déduplique par `externalId` (slug de l'URL).

**Déduplication** : `externalId = slug du chemin URL` (ex. `inquiry-concerning-university-limerick`)
**Rate limit** : 2 000 ms entre appels (prudence — serveur Drupal)

### 5.5 Garante (Italie — Autorità Garante per la protezione dei dati personali)
| Attribut | Valeur |
|---|---|
| **URL scraping** | `https://www.garanteprivacy.it/home/ricerca/-/search/tipologia/Provvedimenti` |
| **RSS** | `/gpdp-rss` (retourne du HTML Liferay invalide — inutilisable) |
| **Format** | HTML scraping (Liferay portal) |
| **Fréquence** | Hebdomadaire |
| **Langue** | IT |
| **`silence_alert_threshold_days`** | 30 |

**Connecteur** : `lib/rag-monitoring/sources/garante-scraping.ts`
**Fixture** : `tests/fixtures/rag_monitoring/garante-ricerca.html` (10 provvedimenti, récupéré le 2026-06-25)

**Note sur le RSS** : le flux `/gpdp-rss` retourne une page HTML Liferay complète (avec `<!DOCTYPE html>`)
plutôt qu'un XML RSS valide. Il est inutilisable. Le scraping de la page de recherche est la méthode retenue.

**Sélecteurs CSS** (vérifiés le 2026-06-25) :
```typescript
GARANTE_SELECTORS = {
  titleLink:     "a.titolo-risultato",   // Lien vers le document (avec title= et docweb ID dans href)
  dateContainer: ".data-risultato p",    // Date au format "28/05/2026"
}
```

**Déduplication** : `externalId = DocwID numérique` (extrait de l'URL `.../docweb/<ID>`)
Ex. pour `/web/guest/home/docweb/-/docweb-display/docweb/10259569` → `"10259569"`

**Rate limit** : 2 000 ms entre appels (Liferay portal, potentiellement lent)

### 5.6 AP (Pays-Bas — Autoriteit Persoonsgegevens)
| Attribut | Valeur |
|---|---|
| **URL scraping** | `https://www.autoriteitpersoonsgegevens.nl/actueel` |
| **RSS** | Non disponible (URLs RSS testées : 404) |
| **Format** | HTML scraping (Drupal 11) |
| **Fréquence** | Hebdomadaire |
| **Langue** | NL |
| **`silence_alert_threshold_days`** | 30 |

**Connecteur** : `lib/rag-monitoring/sources/ap-scraping.ts`
**Fixture** : `tests/fixtures/rag_monitoring/ap-actueel.html` (7 articles, récupéré le 2026-06-25)

**Sélecteurs CSS** (vérifiés le 2026-06-25) :
```typescript
AP_SELECTORS = {
  article:     "article.node-article-teaser",          // Conteneur de chaque article
  action_link: "a.node-article-teaser__action",        // Lien vers l'article
  title:       ".node-article-teaser__title span",     // Titre
  date:        ".node-article-teaser__submitted",      // Date en NL "24 juni 2026"
}
```

**Parsing des dates néerlandaises** : le format est "DD maand YYYY" (ex. "24 juni 2026").
La carte `DUTCH_MONTHS` mappe les 12 noms de mois néerlandais vers leurs numéros.
Le parsing fonctionne indépendamment de toute locale système.

**Déduplication** : `externalId = slug de l'URL` (ex. `ap-grote-toename-van-privacyklachten`)
**Rate limit** : 2 000 ms entre appels

### 5.7 IP SI (Slovénie — Informacijski pooblaščenec)
| Attribut | Valeur |
|---|---|
| **URL scraping** | `https://www.ip-rs.si/novice/` |
| **RSS** | `/feed/` et `/en/feed/` testés : 404 |
| **Format** | HTML scraping (tableau `<table>`) |
| **Fréquence** | Hebdomadaire |
| **Langue** | SL |
| **`silence_alert_threshold_days`** | 60 |

**Connecteur** : `lib/rag-monitoring/sources/ipsi-scraping.ts`
**Fixture** : `tests/fixtures/rag_monitoring/ipsi-novice.html` (20 articles, récupéré le 2026-06-25)

**Structure HTML** (vérifiée le 2026-06-25) :
```html
<table>
  <thead><tr><th>Datum</th><th>Naslov</th></tr></thead>
  <tbody>
    <tr>
      <td align="center">24.06.2026</td>
      <td align="left">
        <a href="https://www.ip-rs.si/go?u=%2Fnovice%2Farticle-slug">Titre SL</a>
      </td>
    </tr>
  </tbody>
</table>
```

**Sélecteurs CSS** :
```typescript
IPSI_SELECTORS = {
  table_row:  "table tr",           // Chaque ligne du tableau
  date_cell:  "td:first-child",     // Première colonne = date "JJ.MM.AAAA"
  title_link: "td:last-child a",    // Deuxième colonne = lien vers l'article
}
```

**Proxy URL** : les liens passent par un proxy `go?u=<percent_encoded_path>`.
La fonction `decodeIpsiProxyUrl()` décode les URLs et retourne la vraie URL canonique.

**Format de date** : `JJ.MM.AAAA` (ex. "24.06.2026") — format stable, indépendant de la langue.

**Déduplication** : `externalId = slug de l'URL décodée` (ex. `jesenski-delavnici-za-ucitelje`)
**Rate limit** : 2 000 ms entre appels

---

## 6. ISO/IEC (référence uniquement, pas d'indexation directe)

| Norme | Référence | Statut |
|---|---|---|
| ISO/IEC 42001 | Management des systèmes IA | Surveiller les nouvelles versions |
| ISO/IEC 27001 | Sécurité de l'information | Surveiller les nouvelles versions |
| ISO/IEC 23894 | Gestion du risque IA | Surveiller les nouvelles versions |

**Raison de non-indexation** : les normes ISO sont sous copyright commercial. Indexer leur texte intégral constituerait une violation de droit d'auteur. Stratégie : mentionner les normes par référence dans le système prompt du chat, sans indexer le contenu.

**Surveillance recommandée** :
- Page ISO : `https://www.iso.org/search.html?q=42001` (vérification manuelle mensuelle)
- Alerte sur la page `https://www.iso.org/standard/81230.html` (ISO 42001) pour les révisions

---

## Tableau récapitulatif — Configuration recommandée

| ID | Source | Type | URL principale | Fréquence | Format | Langue ingérée | Vague |
|---|---|---|---|---|---|---|---|
| `eurlex-rss` | EUR-Lex JO | `eurlex_rss` | RSS JO | Quotidien | RSS | FR | **1A** |
| `eurlex-api` | EUR-Lex CELLAR | `eurlex_rss` | API SPARQL | Hebdomadaire | JSON | FR | **1A** |
| `curia-scraping` | CJUE arrêts | `curia_scraping` | Scraping HTML Curia | Quotidien | HTML | FR | **1A** |
| `edpb-all` | EDPB toutes publications | `edpb_scraping` | Our documents | Quotidien | HTML+PDF | FR (EN si pas de version FR) | **1A** |
| `ai-office` | AI Office Commission | `ai_office_scraping` | Page Commission | Hebdomadaire | HTML | FR/EN | **1B** |
| `cnil` | CNIL France | `national_authority_rss` | RSS CNIL | Hebdomadaire | RSS | FR | **1B** |
| `dpc-ie` | DPC Irlande | `national_authority_scraping` | Page DPC | Hebdomadaire | HTML | EN | **1B** |
| `garante-it` | Garante Italie | `national_authority_rss` | RSS Garante | Hebdomadaire | RSS | IT | **1B** |
| `bfdi-de` | BfDI Allemagne | `national_authority_rss` | RSS BfDI | Hebdomadaire | RSS | DE | **1B** |
| `aepd-es` | AEPD Espagne | `national_authority_rss` | RSS AEPD | Hebdomadaire | RSS | ES | **1B** |
| `ap-nl` | AP Pays-Bas | `national_authority_rss` | RSS AP | Hebdomadaire | RSS | NL | **1B** |
| `ip-si` | IP SI Slovénie | `national_authority_rss` | RSS IP SI | Hebdomadaire | RSS | SL | **1B** |

---

## Contraintes techniques identifiées

### Accès aux PDFs EDPB
Le serveur EDPB (`edpb.europa.eu`) présente des problèmes de connexion HTTP/2 qui tronquent les téléchargements (observé lors de la session d'ingestion manuelle du 2026-06-24). Solution recommandée : forcer HTTP/1.1, utiliser des connexions persistantes, implémenter un retry avec backoff exponentiel.

### Rate limiting EUR-Lex
EUR-Lex tolère une fréquence de scraping raisonnable (< 1 requête/seconde). Le flux RSS est préférable au scraping HTML. Pour les textes complets, utiliser l'API CELLAR ou les URLs HTML avec un délai de 2 secondes entre requêtes.

### Langues des autorités nationales
Les DPAs nationales publient en langue nationale. **Toutes les langues sont indexées en Phase 1 dans leur langue originale** (DE, IT, ES, NL, SL, EN, FR). Aucune traduction préalable n'est nécessaire : le modèle d'embedding (text-embedding-3-small) est multilingue et gère la similarité sémantique cross-lingue. Le champ `language` du chunk permet au modèle de génération de contextualiser la source.

La colonne `language` dans `staging_chunks` et `legal_chunks` indique la langue du texte. Le modèle de chat lit le chunk dans sa langue originale et répond dans la langue de l'utilisateur — c'est le comportement attendu et souhaité.

### Absence de RSS sur certaines sources
DPC Irlande n'a pas de flux RSS — scraping HTML nécessaire avec détection de changements par hash du contenu de la page.
