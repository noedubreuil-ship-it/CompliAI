# Audit étendu des lacunes du corpus RAG — CompliAI
**Date** : 30 juin 2026  
**Fait suite à** : `RAG_CORPUS_INVENTORY_2026-06-29.md`  
**Mode** : lecture seule — aucune modification de données  
**Objectif** : compléter l'audit initial avec quatre catégories non traitées + roadmap consolidée

---

## Section 1 — Textes IA spécifiques manquants

### 1.1 — Lignes directrices officielles de la Commission européenne sur l'AI Act

La Commission européenne et l'AI Office ont publié plusieurs documents d'orientation depuis l'entrée en vigueur de l'AI Act (1er août 2024). Aucun de ces documents n'est présent dans le corpus actuel au-delà du Code GPAI (66 chunks, version 2025-07-10 déjà ingérée).

| Document | Référence / date | URL officielle | Pertinence CompliAI | Chunks estimés |
|----------|-----------------|----------------|---------------------|---------------|
| **Guidelines on prohibited AI practices (Art. 5)** | Commission européenne, février 2025 — COM(2025) guidance | https://digital-strategy.ec.europa.eu/fr/policies/ai-act-guidelines | **Critique** — Art. 5 AI Act interdit les pratiques IA (manipulation subliminale, social scoring, biométrie temps réel en espace public) : article le plus consulté en conformité IA. Ces guidelines opérationnalisent les 6 pratiques interdites avec exemples concrets. | 80–140 |
| **Guidelines on high-risk AI systems (Annexe III)** | AI Office / Commission, 2025 | https://digital-strategy.ec.europa.eu/fr/policies/ai-act-guidelines | **Critique** — Classification des systèmes haut risque : 8 catégories Annexe III (infrastructures critiques, éducation, emploi, services essentiels, justice, frontières, biométrie, sécurité produits). Indispensable pour aider les clients à déterminer si leur système IA est haut risque. | 60–100 |
| **Guidelines on GPAI models (Art. 51–56)** | AI Office, 2024–2025 | https://digital-strategy.ec.europa.eu/fr/policies/gpai-models-guidelines | **Très important** — Obligations des fournisseurs de modèles GPAI (documentation technique, politique droits d'auteur, évaluation des capacités, signalement incidents). Prioritaire pour les utilisateurs développant ou intégrant des LLM. | 50–90 |
| **Guidelines on transparency obligations (Art. 50)** | Commission / AI Office, 2025 | https://digital-strategy.ec.europa.eu/fr/policies/ai-act-guidelines | **Important** — Art. 50 impose des obligations de transparence envers les utilisateurs de systèmes IA génératifs et chatbots (information que le contenu est généré par IA). Cas d'usage directs pour les clients CompliAI déployant des chatbots. | 30–50 |
| **Lignes directrices sur les bacs à sable réglementaires IA (Art. 57–63)** | Commission / AI Office, 2024 | https://digital-strategy.ec.europa.eu/fr/policies/ai-regulatory-sandboxes | Utile pour les clients développant des systèmes IA innovants et souhaitant utiliser les bacs à sable. Moins critique en priorité 1. | 30–50 |

> **Note technique** : ces guidelines sont publiées sous forme de documents PDF/HTML par la Commission et l'AI Office, pas sur EUR-Lex. Elles ne sont pas des actes juridiquement contraignants mais constituent la référence d'interprétation officielle. À ingérer manuellement depuis les URLs indiquées.

### 1.2 — Code de bonnes pratiques GPAI — versions et historique

Le corpus contient déjà le **Code GPAI version 2025** (66 chunks, version_date 2025-07-10). Toutefois, le processus d'élaboration a produit des versions intermédiaires qui peuvent être utiles pour comprendre l'évolution des obligations :

| Document | Date | Statut dans corpus | Action recommandée |
|----------|------|-------------------|-------------------|
| Code GPAI — Version finale 2025 | 2025-07-10 | **Présent** (66 chunks) ✓ | Aucune action nécessaire |
| Code GPAI — Draft v1.0 | mai 2025 | Absent | Pas nécessaire (version finale présente) |
| Code GPAI — Drafts antérieurs (v0.1, v0.2) | 2024 | Absent | Non prioritaire |
| Rapport du bureau de l'AI Office sur les soumissions consultation GPAI | 2025 | Absent | P3 — utile pour contexte historique |

### 1.3 — Actes délégués et actes d'exécution de l'AI Act

L'AI Act confère à la Commission le pouvoir d'adopter des actes délégués (mise à jour des annexes) et des actes d'exécution. Ces textes ont une valeur juridique contraignante mais n'ont pas encore tous été publiés au JO UE au 30/06/2026.

| Acte | Base légale AI Act | Statut au 30/06/2026 | CELEX (si publié) | Chunks estimés |
|------|--------------------|---------------------|-------------------|---------------|
| **Acte délégué — mise à jour Annexe I** (techniques IA) | Art. 97(1) | Prévu — calendrier non confirmé au 30/06/2026 | À confirmer | 10–20 |
| **Acte délégué — mise à jour Annexe III** (systèmes haut risque) | Art. 97(2) | Prévu — première révision attendue 2026 | À confirmer | 20–40 |
| **Décision d'exécution sur les normes harmonisées** (Art. 40) | Art. 40(3) | Demande de normalisation envoyée à CEN/CENELEC en 2024 | Pas encore publié | n/a |
| **Règlement d'exécution sur les mesures RIA pour les autorités** | Art. 70(3) | Non publié | — | — |
| **Actes délégués sur l'interopérabilité des journaux** | Art. 12(5) | Non publié | — | — |

> **Recommandation** : surveiller la publication de ces actes via le monitoring EUR-Lex CELLAR SPARQL (déjà activé). Dès publication au JO, ils seront détectés automatiquement. Aucune ingestion manuelle préalable requise. À intégrer manuellement uniquement si la Commission publie des versions de consultation avant adoption formelle.

### 1.4 — Désignations de modèles GPAI à risque systémique

L'AI Office est compétent pour désigner les modèles GPAI présentant un risque systémique (seuil : 10²⁵ FLOPs d'entraînement ou décision de l'AI Office — Art. 51 AI Act). Ces désignations sont des décisions individuelles, pas des règlements généraux.

| Document | Statut au 30/06/2026 | Pertinence |
|----------|---------------------|------------|
| Liste officielle des modèles GPAI désignés à risque systémique | L'AI Office n'avait pas publié de liste formelle de désignations nominatives au 30/06/2026 — des évaluations sont en cours | À surveiller via AI Office RSS (monitoring activé) |
| Décisions individuelles d'évaluation de modèles GPAI | Non publiées formellement au 30/06/2026 | Surveiller AI Office |

---

## Section 2 — Jurisprudence CJUE fondamentale manquante

### 2.1 — Vérification de présence dans le corpus actuel

Corpus CJUE présent (extrait de `RAG_CORPUS_INVENTORY_2026-06-29.md`) :
- ✅ Meta Platforms Ireland (C-252/21)
- ✅ La Quadrature du Net 2 (C-511/18 + C-512/18 + C-520/18)
- ✅ Tele2 Sverige / Watson (C-203/15 + C-698/15)
- ✅ Lindenapotheke (C-21/23)
- ✅ Bara (C-201/14)
- ✅ Lindqvist (C-101/01)

### 2.2 — Arrêts fondamentaux absents

| Arrêt | Affaire | ECLI | Date | URL Curia | Pertinence CompliAI | Chunks estimés |
|-------|---------|------|------|-----------|---------------------|---------------|
| **Schrems II** — Invalidation du Privacy Shield, transferts USA | C-311/18 | ECLI:EU:C:2020:559 | 16 juillet 2020 | https://curia.europa.eu/juris/liste.jsf?num=C-311/18 | **Critique** — Arrêt fondateur sur les transferts de données vers les États-Unis. Complément logique des Recommandations EDPB 01/2020 (déjà présentes). Tout utilisateur CompliAI traitant des données avec des prestataires US (AWS, Google Cloud, Azure) est concerné. | 180–280 |
| **Schrems I** — Invalidation du Safe Harbor | C-362/14 | ECLI:EU:C:2015:650 | 6 octobre 2015 | https://curia.europa.eu/juris/liste.jsf?num=C-362/14 | Important pour contexte historique transferts internationaux. Précède Schrems II. Utile pour comprendre la jurisprudence en cascade. | 100–160 |
| **Costeja González / Google Spain** — Droit à l'oubli / déréférencement | C-131/12 | ECLI:EU:C:2014:317 | 13 mai 2014 | https://curia.europa.eu/juris/liste.jsf?num=C-131/12 | **Critique** — Fondateur du droit à l'oubli (Art. 17 RGPD). Toute question sur le déréférencement, les moteurs de recherche et les données personnelles y renvoie. Très fréquemment cité. | 100–180 |
| **Digital Rights Ireland** — Invalidation directive conservation données | C-293/12 et C-594/12 (jonction) | ECLI:EU:C:2014:238 | 8 avril 2014 | https://curia.europa.eu/juris/liste.jsf?num=C-293/12 | Important — Précède Tele2/Watson (déjà présent). Donne le cadre des conditions de validité pour la conservation de masse de données de trafic. Utile pour NIS2 et ePrivacy. | 80–140 |
| **Breyer** — Adresses IP dynamiques comme données personnelles | C-582/14 | ECLI:EU:C:2016:779 | 19 octobre 2016 | https://curia.europa.eu/juris/liste.jsf?num=C-582/14 | **Très important** — Définit le critère d'identifiabilité raisonnablement probable. Arrêt clé pour IA / logs / trackers / pseudonymisation et identification indirecte. Directement cité dans les Guidelines EDPB sur la pseudonymisation. | 60–100 |
| **Fashion ID** — Responsabilité conjointe des plugins sociaux (boutons "Like") | C-40/17 | ECLI:EU:C:2019:629 | 29 juillet 2019 | https://curia.europa.eu/juris/liste.jsf?num=C-40/17 | Important — Co-responsabilité des sites intégrant des boutons Facebook/traceurs tiers. Complémentaire de Wirtschaftsakademie (absent) et Planet49 (absent). | 60–100 |
| **Planet49** — Consentement précoché, cookies et banner | C-673/17 | ECLI:EU:C:2019:801 | 1er octobre 2019 | https://curia.europa.eu/juris/liste.jsf?num=C-673/17 | **Très important** — Référence jurisprudentielle sur la validité du consentement aux cookies (case précochée = non valide). Directement utile pour cookie banners et conformité ePrivacy. | 60–100 |
| **Wirtschaftsakademie Schleswig-Holstein** — Co-responsabilité pages Facebook | C-210/16 | ECLI:EU:C:2018:388 | 5 juin 2018 | https://curia.europa.eu/juris/liste.jsf?num=C-210/16 | Important — Co-responsabilité des administrateurs de pages Facebook pour les traitements opérés par Meta. Complémentaire de Meta Platforms (déjà présent). | 60–100 |

### 2.3 — Arrêts CJUE à surveiller (publiés après activation monitoring)

Le connecteur Curia (Phase K) est maintenant actif. Les arrêts suivants, rendus ou attendus après le 29/06/2026, seront **détectés automatiquement** via le monitoring Curia dès activation du cron :

| Affaire | Sujet | Statut au 30/06/2026 |
|---------|-------|---------------------|
| C-446/21 (Schrems v Meta — Facebook Timeline) | Base légale personnalisation publicité, données sensibles | Arrêt rendu le 4 octobre 2024 — à intégrer manuellement si non encore détecté |
| C-413/23 P (EDPS v SRB) | Pseudonymisation, identifiabilité, notion de destinataire | Arrêt attendu 2025-2026 — sera capté par monitoring Curia |
| C-394/23 (Mousse c/ CNIL) | Consentement implicite, formulaire en ligne | Arrêt rendu 2024 — à vérifier dans pending_documents |
| C-200/23 (Agentúra / CJUE) | Responsabilité conjointe, registre public | Arrêt attendu | 

> **Note** : ces affaires ont probablement généré des `pending_documents` lors de l'activation du monitoring Curia (Phase K). Elles doivent passer par la validation admin avant ingestion.

---

## Section 3 — Textes numériques complémentaires

### 3.1 — Textes demandés

| Texte | Référence CELEX | URL EUR-Lex | Pertinence CompliAI | Chunks estimés | Priorité |
|-------|----------------|-------------|---------------------|----------------|----------|
| **Directive (UE) 2019/770 — Contrats de fourniture de contenus et services numériques (DCD)** | `32019L0770` | https://eur-lex.europa.eu/eli/dir/2019/770/oj | **Importante** — Droits contractuels pour la fourniture de contenus numériques (streaming, logiciels, SaaS). Utile pour les contrats B2C et les conditions générales de services numériques. Articulation avec DSA et RGPD. | 50–80 | P2 |
| **Directive (UE) 2019/771 — Vente de biens (SVG)** | `32019L0771` | https://eur-lex.europa.eu/eli/dir/2019/771/oj | Utile pour biens avec éléments numériques intégrés (IoT, produits connectés, logiciels embarqués). Lien direct avec CRA et Règlement Machines. | 40–70 | P3 |
| **Règlement (UE) 2019/1150 — Platform-to-Business (P2B)** | `32019R1150` | https://eur-lex.europa.eu/eli/reg/2019/1150/oj | **Important** — Transparence et équité des conditions imposées par les grandes plateformes à leurs partenaires commerciaux (app stores, marketplaces, moteurs de recherche). Complémentaire du DMA. Utile pour les clients utilisant des plateformes tierces. | 50–80 | P2 |
| **Règlement (UE) 2018/302 — Géoblocage injustifié** | `32018R0302` | https://eur-lex.europa.eu/eli/reg/2018/302/oj | Utile pour les services numériques B2B transfrontières et la cible internationale de CompliAI. Interdit la discrimination par la nationalité/résidence pour les achats en ligne. | 25–40 | P3 |
| **Règlement (UE) 2018/1725 — Protection des données par les institutions UE** | `32018R1725` | https://eur-lex.europa.eu/eli/reg/2018/1725/oj | Important pour les clients qui traitent des données pour le compte d'institutions UE, les marchés publics numériques UE, et les contrats avec la Commission. Miroir RGPD pour les institutions. | 80–130 | P2 |
| **Directive (UE) 2016/680 — Police-Justice (LED)** | `32016L0680` | https://eur-lex.europa.eu/eli/dir/2016/680/oj | **Très important** — Régit les traitements de données à des fins pénales (police, justice, prisons). Complémentaire du RGPD mais avec un régime distinct. Très pertinent pour les clients travaillant avec des autorités publiques, les LegalTech pénales, et les IA à destination des forces de l'ordre (Art. 5 AI Act). | 70–110 | P2 |
| **Règlement (UE) 2021/784 — Contenus terroristes en ligne (TCO)** | `32021R0784` | https://eur-lex.europa.eu/eli/reg/2021/784/oj | Utile pour les plateformes (hébergeurs, moteurs de recherche) soumises à des obligations de retrait en 1h de contenus terroristes. Articulation avec DSA Art. 9. | 30–50 | P3 |
| **Directive (UE) 2018/1808 — Services de médias audiovisuels (SMA)** | `32018L1808` | https://eur-lex.europa.eu/eli/dir/2018/1808/oj | Utile pour les clients opérant des plateformes de partage vidéo (VSP), services à la demande, et plateformes avec contenu médiatique. Articulation avec DSA. Obligations spécifiques sur la haine en ligne, accessibilité, protection des mineurs. | 50–80 | P3 |

### 3.2 — Observations sur ce groupe

- La **Directive LED (2016/680)** est la lacune la plus critique de ce groupe : les systèmes IA à destination des autorités répressives sont dans le champ de l'AI Act (Art. 5 et Annexe III) **et** de la LED simultanément. Le corpus actuel manque entièrement de la LED.
- Le **Règlement P2B** est très complémentaire du DMA (déjà présent) pour les relations entre plateformes et entreprises utilisant ces plateformes.
- La **DCD (2019/770)** est sous-représentée dans les corpus de conformité malgré son applicabilité directe aux SaaS B2C.
- Le **Règlement 2018/1725** devient pertinent dès qu'un client contracte avec la Commission ou une agence UE — cas fréquent pour les grandes entreprises.

---

## Section 4 — EDPB Guidelines et documents récents manquants (2023–2025)

### 4.1 — Textes officiels identifiés comme absents du corpus

| Document EDPB | Référence / date adoption | URL officielle | Pertinence CompliAI | Chunks estimés | Priorité |
|---------------|--------------------------|----------------|---------------------|----------------|----------|
| **Guidelines 01/2023 — Certification RGPD (Art. 42-43)** | Adoptées janvier 2023 (version 2.0) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012023-certification-criteria-according-articles_en | Utile pour les clients cherchant à certifier leurs traitements ou produits (Art. 42 RGPD). Lien avec les schémas de certification AI Act. | 50–80 | P3 |
| **Guidelines 02/2023 — Portée technique de l'Art. 5(3) ePrivacy** (cookies et traceurs) | Adoptées mai 2023 | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-022023-technical-scope-art-53-eprivacy_en | **Très important** — Clarifie quels traceurs techniques tombent sous Art. 5(3) ePrivacy (lecture/écriture sur terminal). Couvre les pixels de tracking, fingerprinting, URL uniquement. Très attendu et cité. | 60–100 | P1 |
| **Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD)** | Adoptées juin 2023 | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032023-right-access_en | **Très important** — Opérationnalise le droit d'accès (portée, délais, formes). Complémentaire des Guidelines Art. 17 si elles existent. Très utile pour les DSAR (Data Subject Access Requests). | 60–100 | P1 |
| **Guidelines 04/2022 — Calcul des amendes RGPD** | Adoptées mai 2023 (version finale après consultation) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-042022-calculation-administrative-fines_en | **Important** — Méthodologie de calcul des amendes par les APD. Directement utile pour les clients évaluant leur exposition financière en cas de violation. | 50–80 | P2 |
| **Guidelines 05/2022 — Utilisation des données personnelles pour la campagne politique** | Adoptées mai 2023 (version finale) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052022-use-personal-data-in-context-political_en | Utile pour les clients du secteur politique, médiatique ou publicitaire. Plus niche pour CompliAI B2B tech. | 40–70 | P3 |
| **Guidelines 01/2024 — Intérêt légitime (Art. 6(1)(f) RGPD)** | Adoptées octobre 2024 | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012024-legitimate-interest_en | **Critique** — Remplace le WP29 Opinion 06/2014 (WP217) sur l'intérêt légitime. Base légale la plus utilisée pour l'IA et les traitements analytiques. Clarifie le test en 3 étapes (légitimité, nécessité, balance des intérêts). Impact majeur IA et data analytics. | 80–130 | P1 |
| **Guidelines 02/2024 — Art. 48 RGPD — Transferts non fondés sur une décision d'adéquation** | Adoptées 2024 | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-022024-article-48-gdpr_en | Important pour les clients transférant des données hors UE sans mécanisme standard (accès gouvernemental étranger, injonctions judiciaires). | 40–70 | P2 |
| **Opinion 28/2024 — IA génératives et modèles de fondation** | Adoptée 17 décembre 2024 | https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en | **Critique** — Traite de la base légale pour l'entraînement des modèles IA, du scraping web, de la notion de données personnelles dans les LLM, de l'anonymisation des sorties. Document de référence pour tout client développant ou intégrant un modèle IA génératif. | 80–130 | P1 |
| **Guidelines 01/2025 — Pseudonymisation** | Adoptées janvier 2025 | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012025-pseudonymisation_en | **Très important** — Clarifie les critères techniques de la pseudonymisation conforme au RGPD. Directement lié à la Privacy by Design, à l'IA (Art. 25 RGPD) et à l'EHDS. Remplace les clarifications éparpillées. | 70–110 | P1 |
| **Statement EDPB sur l'IA générative / ChatGPT** | Avril 2023 | https://www.edpb.europa.eu/our-work-tools/our-documents/other-guidance/statement-use-personal-data-training-ai-models_en | Important pour le contexte : premier signal fort des APD sur la licéité du training LLM. Moins normatif qu'une Opinion, mais très cité. | 20–40 | P2 |
| **Statement EDPB sur l'AI Act et RGPD** | 2024 (Statement 03/2024 ou similaire) | https://www.edpb.europa.eu/our-work-tools/our-documents | Important pour l'articulation RGPD ↔ AI Act : qui régule quoi ? Rôles respectifs APD / autorités AI Act. Utile pour les clients soumis aux deux régimes. | 20–40 | P2 |

### 4.2 — Guidelines EDPB en cours d'élaboration au 30/06/2026

Ces textes n'existent pas encore en version adoptée mais sont en consultation ou annoncés. Le monitoring EDPB (Phase J) les captera automatiquement à publication.

| Document attendu | Sujet | État au 30/06/2026 | Suivi recommandé |
|-----------------|-------|-------------------|-----------------|
| Guidelines sur l'IA générative et RGPD | Entraînement, inférence, données d'entraînement | En cours d'élaboration au sein du groupe de travail EDPB | Surveillance via monitoring EDPB (automatique) |
| Guidelines sur les droits des personnes concernées face à l'IA (Art. 13-22 RGPD dans contexte IA) | Information, opposition, décision automatisée | Annoncées, date incertaine | Surveillance via monitoring EDPB |
| Guidelines sur le droit à l'effacement (Art. 17 RGPD) | Conditions, exceptions, délai | En consultation en 2025 | Surveillance via monitoring EDPB |
| Guidelines sur la biométrie et IA (articulation Art. 9 RGPD + Art. 5 AI Act) | Données biométriques pour l'identification | Pas encore publiées | Surveillance via monitoring EDPB |

### 4.3 — Documents WP29 historiques à haute valeur

Ces documents antérieurs au RGPD restent des références pratiques fréquemment citées :

| Document | Référence | Sujet | Pertinence |
|----------|-----------|-------|------------|
| WP251 rev.01 | Guidelines sur le profilage et la prise de décision automatisée (Art. 22 RGPD) | RGPD Art. 22, scoring, IA RH, crédit | **Très important** — article 22 est central pour l'IA de prise de décision |
| WP260 rev.01 | Guidelines sur la transparence (Art. 12-14 RGPD) | Obligations d'information | Important pour conformité des mentions légales et politique de confidentialité |
| WP217 | Opinion 06/2014 sur l'intérêt légitime | Art. 6(1)(f) RGPD | **Remplacé par Guidelines 01/2024** — ne pas ingérer WP217, ingérer les nouvelles Guidelines |
| WP248 rev.01 | Guidelines DPIA (Art. 35 RGPD) | DPIA / AIPD | **Déjà présent** ✓ (158 chunks) |
| WP243 | Guidelines DPO (Art. 37-39 RGPD) | Délégué à la protection des données | **Déjà présent** ✓ (187 chunks) |

---

## Section 5 — Roadmap consolidée

### 5.1 — Tableau consolidé de toutes les lacunes identifiées (audit initial + extension)

| # | Texte | Catégorie | Priorité | Délai cible | Chunks est. | Méthode ingestion |
|---|-------|-----------|----------|-------------|------------|------------------|
| 1 | EDPB Guidelines 01/2024 — Intérêt légitime (Art. 6(1)(f)) | EDPB 2024 | **P1** | Juillet 2026 | 80–130 | Manuel → monitoring futur |
| 2 | EDPB Opinion 28/2024 — Modèles IA et données personnelles | EDPB 2024 | **P1** | Juillet 2026 | 80–130 | Manuel → monitoring futur |
| 3 | EDPB Guidelines 01/2025 — Pseudonymisation | EDPB 2025 | **P1** | Juillet 2026 | 70–110 | Manuel → monitoring futur |
| 4 | EDPB Guidelines 02/2023 — Portée technique Art. 5(3) ePrivacy | EDPB 2023 | **P1** | Juillet 2026 | 60–100 | Manuel |
| 5 | EDPB Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD) | EDPB 2023 | **P1** | Juillet 2026 | 60–100 | Manuel |
| 6 | CJUE Schrems II (C-311/18) | Jurisprudence CJUE | **P1** | Juillet 2026 | 180–280 | Manuel |
| 7 | CJUE Costeja / Google Spain (C-131/12) — Droit à l'oubli | Jurisprudence CJUE | **P1** | Juillet 2026 | 100–180 | Manuel |
| 8 | CJUE Breyer (C-582/14) — IP comme données personnelles | Jurisprudence CJUE | **P1** | Juillet 2026 | 60–100 | Manuel |
| 9 | Commission — Guidelines Art. 5 AI Act (pratiques interdites) | IA spécifique | **P1** | Août 2026 | 80–140 | Manuel (PDF AI Office) |
| 10 | Commission — Guidelines systèmes haut risque Annexe III | IA spécifique | **P1** | Août 2026 | 60–100 | Manuel (PDF AI Office) |
| 11 | DORA (Règlement UE 2022/2554) | Règlement UE | **P1** | Août 2026 | 80–140 | Manuel |
| 12 | CJUE Planet49 (C-673/17) — Consentement cookies | Jurisprudence CJUE | **P2** | Septembre 2026 | 60–100 | Manuel |
| 13 | CJUE Fashion ID (C-40/17) — Co-responsabilité plugins | Jurisprudence CJUE | **P2** | Septembre 2026 | 60–100 | Manuel |
| 14 | CJUE Wirtschaftsakademie (C-210/16) — Pages Facebook | Jurisprudence CJUE | **P2** | Septembre 2026 | 60–100 | Manuel |
| 15 | CJUE Schrems I (C-362/14) | Jurisprudence CJUE | **P2** | Septembre 2026 | 100–160 | Manuel |
| 16 | CJUE Digital Rights Ireland (C-293/12) | Jurisprudence CJUE | **P2** | Septembre 2026 | 80–140 | Manuel |
| 17 | Directive LED (UE 2016/680) — Police-Justice | Directive UE | **P2** | Septembre 2026 | 70–110 | Manuel |
| 18 | Règlement 2018/1725 — Protection données institutions UE | Règlement UE | **P2** | Octobre 2026 | 80–130 | Manuel |
| 19 | EDPB Guidelines 04/2022 — Calcul des amendes RGPD | EDPB 2022 | **P2** | Octobre 2026 | 50–80 | Manuel |
| 20 | EDPB Guidelines 02/2024 — Art. 48 RGPD | EDPB 2024 | **P2** | Octobre 2026 | 40–70 | Manuel |
| 21 | Statement EDPB IA générative / ChatGPT (avril 2023) | EDPB 2023 | **P2** | Octobre 2026 | 20–40 | Manuel |
| 22 | Règlement P2B (UE 2019/1150) | Règlement UE | **P2** | Octobre 2026 | 50–80 | Manuel |
| 23 | Commission — Guidelines GPAI models (Art. 51-56) | IA spécifique | **P2** | Octobre 2026 | 50–90 | Manuel (PDF AI Office) |
| 24 | Product Liability Directive (UE 2024/2853) | Directive UE | **P2** | Novembre 2026 | 50–90 | Manuel |
| 25 | Cybersecurity Act (UE 2019/881) | Règlement UE | **P2** | Novembre 2026 | 80–130 | Manuel |
| 26 | WP251 rev.01 — Profilage et décision automatisée | WP29 historique | **P2** | Novembre 2026 | 70–120 | Manuel |
| 27 | WP260 rev.01 — Transparence (Art. 12-14 RGPD) | WP29 historique | **P2** | Novembre 2026 | 80–130 | Manuel |
| 28 | EHDS (Règlement UE 2025/327) | Règlement UE | **P2** | Novembre 2026 | 100–180 | Manuel |
| 29 | Directive DCD (UE 2019/770) — Contenus numériques | Directive UE | **P2** | Décembre 2026 | 50–80 | Manuel |
| 30 | GPSR (Règlement UE 2023/988) | Règlement UE | **P3** | Janvier 2027 | 70–120 | Manuel |
| 31 | CSDDD (Directive UE 2024/1760) | Directive UE | **P3** | Janvier 2027 | 80–130 | Manuel |
| 32 | MiCA (Règlement UE 2023/1114) | Règlement UE | **P3** | Janvier 2027 | 120–220 | Manuel |
| 33 | CSRD (Directive UE 2022/2464) | Directive UE | **P3** | Février 2027 | 50–90 | Manuel |
| 34 | Directive LED (UE 2019/770) — Vente de biens | Directive UE | **P3** | Février 2027 | 40–70 | Manuel |
| 35 | Règlement géoblocage (UE 2018/302) | Règlement UE | **P3** | Février 2027 | 25–40 | Manuel |
| 36 | Règlement TCO (UE 2021/784) | Règlement UE | **P3** | Mars 2027 | 30–50 | Manuel |
| 37 | Directive SMA (UE 2018/1808) | Directive UE | **P3** | Mars 2027 | 50–80 | Manuel |
| 38 | Directive Accessibilité (UE 2019/882) | Directive UE | **P3** | Mars 2027 | 60–100 | Manuel |
| 39 | Open Data Directive (UE 2019/1024) | Directive UE | **P3** | Mars 2027 | 50–90 | Manuel |
| 40 | Platform Work Directive (UE 2024/2831) | Directive UE | **P3** | T2 2027 | 50–90 | Manuel |
| 41 | Commission — Guidelines transparence Art. 50 AI Act | IA spécifique | **P3** | T2 2027 | 30–50 | Manuel (PDF AI Office) |
| 42 | Actes délégués AI Act (Annexe I, Annexe III) | IA spécifique | **Auto** | Dès publication JO | 10–40 | **Automatique** (EUR-Lex CELLAR) |

### 5.2 — Estimation du coût total pour les textes Priorité 1

**Périmètre P1 : textes #1 à #11** (11 textes, dont 5 EDPB, 3 CJUE, 2 AI Act guidelines, 1 règlement)

| Poste | Détail | Coût estimé |
|-------|--------|-------------|
| Parsing Claude Sonnet 4.6 | ~1 100 chunks × ~3 500 tokens input/chunk en moyenne | ~3,85M tokens input → **~19 USD** |
| Embeddings OpenAI `text-embedding-3-small` | ~1 100 chunks × ~450 tokens | ~495k tokens → **~0,07 USD** |
| Tokens output Claude (parsing structuré) | ~1 100 chunks × ~800 tokens output | ~880k tokens → **~4,50 USD** |
| **Total API** | | **~24 USD** |
| Temps technique (ingestion + pipeline) | 11 textes × ~2h/texte en moyenne | **~22h** |
| Temps validation admin | 11 textes × ~45 min/texte | **~8h** |
| **Total humain** | | **~30h sur 6 semaines** |

> Ces estimations supposent l'utilisation du pipeline `automated_pipeline` avec Claude Sonnet 4.6 exclusivement (règle non négociable CLAUDE.md). Chaque texte passe obligatoirement par le staging → validation admin → indexer.

### 5.3 — Plan d'exécution pratique sur 3 mois

#### Semaine 1-2 (Juillet 2026) — Qualité avant volume

Priorité absolue : résoudre les 4 questions critiques du golden set (Q02, Q04, Q05, Q15) avant d'ajouter de nouveaux textes.

- [ ] Re-chunking AI Act en parent-child (chantier Claude Code dédié, branche séparée)
- [ ] Rejouer golden set après re-chunking AI Act
- [ ] Valider les 158 `pending_documents` existants via `/dashboard/admin/rag-validation`

#### Semaine 3-4 (Juillet 2026) — Batch EDPB 2023-2025

Batch homogène : tous des documents EDPB, même source, même pipeline.

- [ ] **#5** EDPB Guidelines 03/2023 — Droit d'accès (Art. 15)
- [ ] **#4** EDPB Guidelines 02/2023 — Portée technique Art. 5(3) ePrivacy
- [ ] **#2** EDPB Opinion 28/2024 — Modèles IA
- [ ] **#1** EDPB Guidelines 01/2024 — Intérêt légitime
- [ ] **#3** EDPB Guidelines 01/2025 — Pseudonymisation

#### Semaine 5-6 (Août 2026) — Jurisprudence CJUE fondamentale

Batch homogène : tous disponibles sur Curia/EUR-Lex, même pipeline.

- [ ] **#6** CJUE Schrems II (C-311/18) — arrêt très long, valider en priorité
- [ ] **#7** CJUE Costeja González (C-131/12) — droit à l'oubli
- [ ] **#8** CJUE Breyer (C-582/14) — adresses IP

#### Semaine 7-8 (Août 2026) — Textes IA spécifiques + DORA

- [ ] **#9** Commission Guidelines Art. 5 AI Act (pratiques interdites) — format PDF AI Office
- [ ] **#10** Commission Guidelines Annexe III AI Act (systèmes haut risque)
- [ ] **#11** DORA (Règlement UE 2022/2554) — format EUR-Lex

#### Septembre–Décembre 2026 — Batch P2

Exécutable en parallèle ou en séquence selon disponibilité :
- Jurisprudence CJUE P2 : Planet49, Fashion ID, Wirtschaftsakademie, Schrems I, Digital Rights Ireland
- Directive LED, Règlement 2018/1725, P2B
- EDPB Guidelines 04/2022 (amendes), 02/2024 (Art. 48), Statement ChatGPT
- Guidelines GPAI models, WP251, WP260
- EHDS, Product Liability Directive, Cybersecurity Act, DCD

### 5.4 — Textes automatiquement couverts par le monitoring activé

Le pipeline de monitoring (12 sources, toutes `active=false` en attente d'activation cron) couvrira automatiquement **les publications futures** des textes suivants. **Ces textes ne nécessitent pas d'ingestion manuelle pour les versions nouvelles** — uniquement pour les versions historiques antérieures à l'activation.

| Source monitoring | Textes couverts automatiquement (nouvelles publications) |
|------------------|--------------------------------------------------------|
| EUR-Lex JO RSS (FR) + CELLAR SPARQL | Nouveaux règlements, directives, actes délégués AI Act, nouvelles décisions |
| EDPB | Nouvelles Guidelines, Opinions, Statements, Recommendations |
| Curia CJUE | Nouveaux arrêts, ordonnances |
| AI Office RSS | Code GPAI mises à jour, nouvelles guidelines AI Act, désignations GPAI |
| CNIL RSS | Lignes directrices CNIL, délibérations |
| Autorités nationales (AEPD, BfDI, AP, Garante, IP SI, DPC) | Décisions et guidelines nationales |

**Textes P1 qui seront aussi captés à l'avenir** (mais versions existantes à ingérer manuellement) :
- Toutes les nouvelles Guidelines EDPB → monitoring EDPB
- Nouveaux arrêts CJUE → monitoring Curia
- Actes délégués AI Act → monitoring EUR-Lex CELLAR

**Textes nécessitant toujours ingestion manuelle** (source non couverte par monitoring) :
- Guidelines Commission européenne / AI Office publiées en PDF sur digital-strategy.ec.europa.eu (hors JO)
- Documents WP29 historiques (archives EDPB)
- Textes de standardisation CEN/CENELEC, normes ISO

---

## Synthèse exécutive

### Ce qui manque le plus au corpus aujourd'hui (impact retrieval immédiat)

1. **EDPB Guidelines 01/2024 sur l'intérêt légitime** : base légale Art. 6(1)(f) est la plus utilisée pour l'IA et l'analytique — son traitement normatif est actuellement absent du corpus.
2. **EDPB Opinion 28/2024 sur les modèles IA** : document de référence 2024 pour tout système IA génératif — absent alors que CompliAI cible précisément ces cas d'usage.
3. **CJUE Schrems II** : arrêt le plus cité dans toute question de transfert de données vers les USA — le corpus a les Recommandations 01/2020 (qui découlent de Schrems II) mais pas l'arrêt lui-même.
4. **CJUE Costeja González** : fondateur du droit à l'oubli, cité dans chaque question sur l'Art. 17 RGPD — absence anormale dans un corpus de conformité RGPD.
5. **Commission Guidelines Art. 5 AI Act** : pratiques interdites = premier article lu par tout client soumettant un système IA à un contrôle — son absence affaiblit directement les réponses sur l'AI Act.

### Effort minimal pour impact maximal

5 textes, ~3 semaines de travail, ~15 USD de coût API, correction probable des 4 questions critiques du golden set :
1. Re-chunk AI Act parent-child
2. EDPB Guidelines 01/2024 (intérêt légitime)
3. EDPB Opinion 28/2024 (modèles IA)
4. CJUE Schrems II
5. CJUE Costeja González
