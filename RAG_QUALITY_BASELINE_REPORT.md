# RAG Quality Baseline Report

> Généré le 7 juillet 2026
> **Rapport initial** : capture l'état actuel du RAG production comme référence.
> Les exécutions futures seront comparées à ce baseline.

## Résumé exécutif

| Mécanisme | Statut | Détails |
|-----------|--------|---------|
| Golden Set (16 questions) | ⚠️ WARNING | ✅ 14 / ⚠️ 2 / 🔴 0 |
| Couverture articles | 🔴 CRITICAL | 53.4% (34 échecs critiques) |

---
## Mécanisme 1 — Golden Set (16 questions de référence)

**Exécuté le** : 07/07/2026 10:04:37
**Résultats** : 14 OK / 2 warning / 0 critique

### Détail par question

#### ✅ Q01 — Notre entreprise développe un outil qui analyse des données financières de PME e…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act):*`, `AI Act (UE 2024/1689):considérant 58`, `AI Act (UE 2024/1689):6`, `AI Act (UE 2024/1689):considérant 61`, `AI Act (UE 2024/1689):74`, `AI Act (UE 2024/1689):considérant 53`

<details><summary>Top-5 chunks retournés</summary>

**#1** `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act) · Art. N/A` (sim: 37.9%)
> Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)

The conditions that an AI system must fulfil to be classified as high-risk pursuant to point 5(b) of Annex III and related concepts are analysed in more detail in the following subsections. ii. The relationship between ‘

**#2** `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act) · Art. N/A` (sim: 38.2%)
> Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)

(323) The statement in Recital 58 AI Act that AI systems provided for by Union law for prudential purposes to calculate credit institutions’ and insurance undertakings’ capital requirements should not be considered to be

**#3** `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act) · Art. N/A` (sim: 37.9%)
> Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)

The score produced by the system may take various forms, such as a number, a ranking, or a label. A credit score may be established for several purposes. Where an AI system is intended to be used to establish such a scor

**#4** `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act) · Art. N/A` (sim: 37.5%)
> Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)

Such an evaluation may be based e.g. on demographic data (such as age, the level of education or the place of residence) and/or on financial data including payment behaviour, credit history and income and financial varia

**#5** `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act) · Art. N/A` (sim: 37.4%)
> Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)

intended solely for monitoring credit exposures for internal prudential purposes (to track and analyse credit-related activity, assess borrower risk and detect early warning signs of default or financial distress) after 

</details>

#### ✅ Q02 — Peut-on déployer un système d'IA dans un centre d'appels pour inférer les émotio…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):considérant 44`, `AI Act (UE 2024/1689):considérant 18`, `AI Act (UE 2024/1689):considérant 57`, `AI Act (UE 2024/1689):considérant 58`, `AI Act (UE 2024/1689):50`, `AI Act (UE 2024/1689):considérant 4`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. considérant 44` (sim: 34.8%)
> (44)

La base scientifique des systèmes d’IA visant à identifier ou à inférer les émotions suscite de vives inquiétudes, d’autant plus que l’expression des émotions varie considérablement d’une culture et d’une situation à l’autre, comme d’ailleurs chez un même individu. Les principaux défauts de ce

**#2** `AI Act (UE 2024/1689) · Art. considérant 18` (sim: 31.3%)
> (18)

La notion de «système de reconnaissance des émotions» visée dans le présent règlement devrait être définie comme un système d’IA servant à identifier les émotions ou les intentions de personnes physiques ou à faire des déductions quant à leurs émotions ou intentions, sur la base de leurs donné

**#3** `AI Act (UE 2024/1689) · Art. considérant 57` (sim: 29.7%)
> (57)

Les systèmes d’IA utilisés pour des questions liées à l’emploi, à la gestion de la main-d’œuvre et à l’accès à l’emploi indépendant, en particulier pour le recrutement et la sélection de personnes, pour la prise de décisions affectant les conditions des relations professionnelles, ainsi que la

**#4** `AI Act (UE 2024/1689) · Art. considérant 58` (sim: 28.5%)
> (58)

Un autre domaine dans lequel l’utilisation des systèmes d’IA mérite une attention particulière est l’accès et le droit à certains services et prestations essentiels, publics et privés, devant permettre aux personnes de participer pleinement à la société ou d’améliorer leur niveau de vie. En pa

**#5** `AI Act (UE 2024/1689) · Art. 50` (sim: 28.7%)
> Article 50 — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA

2. Les fournisseurs de systèmes d'IA, y compris de systèmes d'IA à usage général, qui génèrent des contenus de synthèse de type audio, image, vidéo ou texte, veillent à ce que les sorties des 

</details>

#### ✅ Q03 — À partir de quel seuil de puissance de calcul un modèle d'IA à usage général est…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):51`, `AI Act (UE 2024/1689):ANNEXE XIII`, `AI Act (UE 2024/1689):considérant 111`, `AI Act (UE 2024/1689):considérant 112`, `AI Act (UE 2024/1689):considérant 97`, `AI Act (UE 2024/1689):55`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 51` (sim: 48.1%)
> Article 51

Classification de modèles d’IA à usage général en tant que modèles d’IA à usage général présentant un risque systémique

1.   Un modèle d’IA à usage général est classé comme modèle d’IA à usage général présentant un risque systémique s’il remplit l’une des conditions suivantes:

a)

il d

**#2** `AI Act (UE 2024/1689) · Art. ANNEXE XIII` (sim: 44.5%)
> ANNEXE XIII

Critères de désignation des modèles d'IA à usage général présentant un risque systémique visés à l'article 51

Aux fins de déterminer si un modèle d'IA à usage général a des capacités ou un impact équivalents à ceux énoncés à l'article 51, paragraphe 1, point a), la Commission tient com

**#3** `AI Act (UE 2024/1689) · Art. considérant 111` (sim: 46.2%)
> (111)

Il convient d’établir une méthode de classification des modèles d’IA à usage général en tant que modèle d’IA à usage général présentant des risques systémiques. Étant donné que les risques systémiques résultent de capacités particulièrement élevées, un modèle d’IA à usage général devrait être

**#4** `AI Act (UE 2024/1689) · Art. 51` (sim: 48.2%)
> Article 51 — Classification de modèles d'IA à usage général en tant que modèles d'IA à usage général présentant un risque systémique

2. Un modèle d'IA à usage général est présumé avoir des capacités à fort impact conformément au paragraphe 1, point a), lorsque la quantité cumulée de calcul utilisée

**#5** `AI Act (UE 2024/1689) · Art. considérant 112` (sim: 44.9%)
> (112)

Il convient également d’établir de façon précise une procédure de classification d’un modèle d’IA à usage général présentant un risque systémique. Il convient de présumer qu’un modèle d’IA à usage général qui atteint le seuil applicable pour les capacités à fort impact est un modèle d’IA à us

</details>

#### ✅ Q04 — Quelles sont les obligations qui s'imposent aux fournisseurs de modèles d'IA à u…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):54`, `AI Act (UE 2024/1689):55`, `AI Act (UE 2024/1689):53`, `AI Act (UE 2024/1689):considérant 114`, `AI Act (UE 2024/1689):52`, `AI Act (UE 2024/1689):considérant 164`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 54` (sim: 46.7%)
> Article 54

Mandataires des fournisseurs de modèles d’IA à usage général

1.   Avant de mettre un modèle d’IA à usage général sur le marché de l’Union, les fournisseurs établis dans des pays tiers désignent, par mandat écrit, un mandataire établi dans l’Union.

2.   Le fournisseur autorise son manda

**#2** `AI Act (UE 2024/1689) · Art. 55` (sim: 49.0%)
> Article 55 §1(b) — Obligations incombant aux fournisseurs de modèles d'IA à usage général présentant un risque systémique

b) évaluent et atténuent les risques systémiques éventuels au niveau de l'Union, y compris leurs origines, qui peuvent découler du développement, de la mise sur le marché ou de 

**#3** `AI Act (UE 2024/1689) · Art. 55` (sim: 48.7%)
> Article 55 §1(d) — Obligations incombant aux fournisseurs de modèles d'IA à usage général présentant un risque systémique

d) garantissent un niveau approprié de protection en matière de cybersécurité pour le modèle d'IA à usage général présentant un risque systémique et l'infrastructure physique du

**#4** `AI Act (UE 2024/1689) · Art. 55` (sim: 47.3%)
> Article 55

Obligations incombant aux fournisseurs de modèles d’IA à usage général présentant un risque systémique

1.   Outre les obligations énumérées aux articles 53 et 54, les fournisseurs de modèles d’IA à usage général présentant un risque systémique:

a)

effectuent une évaluation des modèles

**#5** `AI Act (UE 2024/1689) · Art. 53` (sim: 47.1%)
> Article 53 — Obligations incombant aux fournisseurs de modèles d'IA à usage général

2. Les obligations énoncées au paragraphe 1, points a) et b), ne s'appliquent pas aux fournisseurs de modèles d'IA qui sont publiés dans le cadre d'une licence libre et ouverte permettant de consulter, d'utiliser, d

</details>

#### ⚠️ Q05 — Un fournisseur qui publie les poids de son modèle d'IA à usage général en open s…

**Articles manquants :**
- 🔴 `AI Act Art. 51` [important] — Art. 51 — risque systémique non exemptable même open source

Articles retournés : `AI Act (UE 2024/1689):53`, `AI Act (UE 2024/1689):54`, `AI Act (UE 2024/1689):considérant 104`, `AI Act (UE 2024/1689):55`, `AI Act (UE 2024/1689):92`, `AI Act (UE 2024/1689):50`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 53` (sim: 46.3%)
> Article 53 — Obligations incombant aux fournisseurs de modèles d'IA à usage général

2. Les obligations énoncées au paragraphe 1, points a) et b), ne s'appliquent pas aux fournisseurs de modèles d'IA qui sont publiés dans le cadre d'une licence libre et ouverte permettant de consulter, d'utiliser, d

**#2** `AI Act (UE 2024/1689) · Art. 54` (sim: 42.2%)
> Article 54

Mandataires des fournisseurs de modèles d’IA à usage général

1.   Avant de mettre un modèle d’IA à usage général sur le marché de l’Union, les fournisseurs établis dans des pays tiers désignent, par mandat écrit, un mandataire établi dans l’Union.

2.   Le fournisseur autorise son manda

**#3** `AI Act (UE 2024/1689) · Art. considérant 104` (sim: 41.5%)
> (104)

Les fournisseurs de modèles d’IA à usage général qui sont publiés sous licence libre et ouverte et dont les paramètres, y compris les poids, les informations sur l’architecture des modèles et les informations sur l’utilisation des modèles, sont rendus publics devraient faire l’objet d’excepti

**#4** `AI Act (UE 2024/1689) · Art. 54` (sim: 46.7%)
> Article 54 — Mandataires des fournisseurs de modèles d'IA à usage général

6. L'obligation énoncée au présent article ne s'applique pas aux fournisseurs de modèles d'IA à usage général qui sont publiés dans le cadre d'une licence libre et ouverte permettant de consulter, d'utiliser, de modifier et d

**#5** `AI Act (UE 2024/1689) · Art. 53` (sim: 41.6%)
> Article 53

Obligations incombant aux fournisseurs de modèles d’IA à usage général

1.   Les fournisseurs de modèles d’IA à usage général:

a)

élaborent et tiennent à jour la documentation technique du modèle, y compris son processus d’entraînement et d’essai et les résultats de son évaluation, qui

</details>

#### ✅ Q06 — Une banque refuse un prêt immobilier en se fondant quasi-exclusivement sur un sc…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P23`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P18`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P45`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P9`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P18`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P8`

<details><summary>Top-5 chunks retournés</summary>

**#1** `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait · Art. P23` (sim: 38.0%)
> Exemple: Un citoyen de l’Union, M. Schrems, a introduit une réclamation en juin 2013 auprès de la 
Data Protection Commission (DPC) irlandaise et a demandé à cette autorité de contrôle d’interdire ou 
de suspendre le transfert de ses données à caractère personnel détenues par Facebook Ireland vers 


**#2** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P18` (sim: 37.9%)
> Instruments de transfert visés à l’article 46 du RGPD 
21. L’article 46 du RGPD énumère une série d’instruments de transfert contenant des «garanties 
appropriées» auxquels les exportateurs peuvent recourir pour transférer des données à caractère 
personnel vers des pays tiers en l’absence de décisi

**#3** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P45` (sim: 37.1%)
> 65. La Cour a souligné qu’il incombe à l’exportateur et à l’importateur de données d’apprécier si le 
niveau de protection requis par le droit de l’Union est respecté dans le pays tiers concerné afin 
de déterminer si les garanties établies par les clauses contractuelles types ou par les règles 
d’e

**#4** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P9` (sim: 38.0%)
> considérant ce qui suit: 
(1) La Cour de justice de l’Union européenne (CJUE) conclut, dans son arrêt du 16 juillet 2020, Data 
Protection Commissioner c/ Facebook Ireland LTD, Maximillian Schrems, C-311/18, que l’article 46, 
paragraphe 1, et l’article 46, paragraphe 2, point d), du RGPD doivent êt

**#5** `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait · Art. P18` (sim: 37.2%)
> 1 RESPONSABILITÉ EN MATIÈRE DE TRANSFERTS DE DONNÉES 
1. Le droit primaire de l’Union considère le droit à la protection des données comme un droit 
fondamental 8. Par conséquent, le droit à la protection des données bénéficie d’un niveau de protection 
élevé et des limitations ne peuvent être appor

</details>

#### ✅ Q07 — Dans quels cas précis l'article 22 du RGPD s'applique-t-il à une décision automa…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `RGPD (UE 2016/679):22`, `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités:P57`, `EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : nécessité d'exécution du contrat (services en ligne):P13`, `RGPD (UE 2016/679):considérant 71`, `EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux:P299`, `EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : nécessité d'exécution du contrat (services en ligne):P5`

<details><summary>Top-5 chunks retournés</summary>

**#1** `RGPD (UE 2016/679) · Art. 22` (sim: 45.3%)
> Article 22

Décision individuelle automatisée, y compris le profilage

1.   La personne concernée a le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé, y compris le profilage, produisant des effets juridiques la concernant ou l'affectant de manière sign

**#2** `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités · Art. P57` (sim: 40.6%)
> L’analyse juridique suivante porte sur différentes situations dans lesquelles un tel traitement peut 
avoir lieu et sur leurs conséquences juridiques. 
8.1.1 Catégories particulières explicites de données 
Il arrive que des données à caractère personnel traitées relèvent clairement de la définition 

**#3** `EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : nécessité d'exécution du contrat (services en ligne) · Art. P13` (sim: 41.1%)
> 18. Il est possible qu’une autre base juridique que l’article 6, paragraphe 1, point b), corresponde mieux à 
l’objectif et au contexte du traitement en question. La détermination de la base juridique appropriée 
est liée aux principes de loyauté et de limitation de la finalité. 13 
19. Les lignes d

**#4** `RGPD (UE 2016/679) · Art. 22` (sim: 43.7%)
> Article 22 — §2 — Exceptions au droit de ne pas faire l'objet d'une décision automatisée

2. Le paragraphe 1 ne s'applique pas lorsque la décision :

**#5** `RGPD (UE 2016/679) · Art. 22` (sim: 41.7%)
> Article 22 — §3 — Garanties en cas de décision automatisée

3. Dans les cas visés au paragraphe 2, points a) et c), le responsable du traitement met en œuvre des mesures appropriées pour la sauvegarde des droits et libertés et des intérêts légitimes de la personne concernée, au moins du droit de la 

</details>

#### ✅ Q08 — Peut-on transférer des données personnelles vers un prestataire américain certif…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P23`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P16`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P34`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P27`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P58`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P74`

<details><summary>Top-5 chunks retournés</summary>

**#1** `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait · Art. P23` (sim: 40.8%)
> Exemple: Un citoyen de l’Union, M. Schrems, a introduit une réclamation en juin 2013 auprès de la 
Data Protection Commission (DPC) irlandaise et a demandé à cette autorité de contrôle d’interdire ou 
de suspendre le transfert de ses données à caractère personnel détenues par Facebook Ireland vers 


**#2** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P16` (sim: 40.0%)
> savoir où les données à caractère personnel qu’il a exportées peuvent être localisées ou traitées 
par les importateurs (carte des destinations). 
13. Il y a lieu de garder à l’esprit que l’accès à distance depuis un pays tiers (par exemple, dans des 
situations de soutien) et/ou le stockage dans un

**#3** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P34` (sim: 40.9%)
> l’importateur de données) afin de préciser le champ d’application pratique de l’article 702 de la FISA 
pour le transfert concerné. Ces informations devraient apporter des réponses à certaines questions 
pertinentes, telles que: 
- les informations accessibles au public indiquent-elles qu’il existe 

**#4** `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait · Art. P27` (sim: 40.1%)
> dans une société démocratique 42, ils ne peuvent empiéter sur les engagements contenus dans 
l’instrument de transfert visé à l’article 46 du RGPD auquel l’exportateur a recours. 
37. Les normes de l’Union, comme les articles 47 et 52 de la Charte des droits fondamentaux de l’Union 
européenne, doiv

**#5** `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait · Art. P58` (sim: 39.9%)
> Cas nº 7: Accès à distance aux données à des fins professionnelles 
90. Un exportateur de données met des données à caractère personnel à la disposition d’entités dans un 
pays tiers en vue de leur utilisation à des fins professionnelles communes. Une configuration typique 
peut consister en un resp

</details>

#### ⚠️ Q09 — Une PME française souhaite confier le traitement de données RH à un sous-traitan…

**Articles manquants :**
- 🔴 `RGPD Art. 44` [important] — Art. 44 — principe d'interdiction sans base légale

Articles retournés : `RGPD (UE 2016/679):considérant 108`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P53`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P78`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P23`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P74`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P26`

<details><summary>Top-5 chunks retournés</summary>

**#1** `RGPD (UE 2016/679) · Art. considérant 108` (sim: 36.3%)
> (108)

En l'absence de décision d'adéquation, le responsable du traitement ou le sous-traitant devrait prendre des mesures pour compenser l'insuffisance de la protection des données dans le pays tiers par des garanties appropriées en faveur de la personne concernée. Ces garanties peuvent consister à

**#2** `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait · Art. P53` (sim: 35.6%)
> Cas nº 5: traitement fractionné ou multipartite 86. L’exportateur de données souhaite que les données à caractère personnel soient traitées conjointement par deux ou plusieurs sous-traitants indépendants situés dans des territoires différents, sans leur divulguer le contenu des données. Avant la tra

**#3** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P78` (sim: 35.5%)
> 121. Un sous-traitant peut traiter des données autrement que sur instruction documentée du responsable 
du traitement lorsque le sous-traitant est tenu de traiter et/ou de transférer des données à caractère 
personnel conformément au droit de l’Union ou au droit de l’État membre auquel le sous-trait

**#4** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P23` (sim: 35.7%)
> générales et à large portée que réalise la Commission européenne en application de l’article 45 
du RGPD. 
33. Le cadre juridique applicable et/ou les pratiques en vigueur dépendront des circonstances 
spécifiques du transfert et notamment: 
- les finalités pour lesquelles les données sont transféré

**#5** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P74` (sim: 36.8%)
> 1. un responsable du traitement transfère des données à caractère personnel à un fournisseur 
de services informatiques en nuage ou à un autre sous-traitant, 
2. le fournisseur de services informatiques en nuage ou un autre sous-traitant doit accéder aux 
données en clair afin d’exécuter la tâche qu

</details>

#### ✅ Q10 — Une collectivité locale emploie 800 agents et traite à la fois des données de vi…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `RGPD (UE 2016/679):37`, `EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO):P84`, `EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO):P46`, `RGPD (UE 2016/679):considérant 97`, `EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO):P166`, `EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO):P154`

<details><summary>Top-5 chunks retournés</summary>

**#1** `RGPD (UE 2016/679) · Art. 37` (sim: 38.6%)
> Article 37

Désignation du délégué à la protection des données

1.   Le responsable du traitement et le sous-traitant désignent en tout état de cause un délégué à la protection des données lorsque:

a)

le traitement est effectué par une autorité publique ou un organisme public, à l'exception des ju

**#2** `RGPD (UE 2016/679) · Art. 37` (sim: 36.9%)
> Article 37 — §3

3. Lorsque le responsable du traitement ou le sous-traitant est une autorité publique ou un organisme public, un seul délégué à la protection des données peut être désigné pour plusieurs autorités ou organismes de ce type, compte tenu de leur structure organisationnelle et de leur t

**#3** `EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO) · Art. P84` (sim: 36.8%)
> En vertu de l’article 37, paragraphe 3, un seul délégué à la protection des données peut être désigné pour plusieurs autorités publiques ou organismes publics, compte tenu de leur structure organisationnelle et de leur taille. Les mêmes considérations en matière de ressources et de communication s’a

**#4** `EDPB Lignes directrices WP243 — Délégué à la Protection des Données (DPO) · Art. P46` (sim: 36.2%)
> On peut aussi citer l’exemple d’une société de sécurité privée qui assure la surveillance d’un certain nombre de centres commerciaux privés et d’espaces publics. L’activité de base de la société est la surveillance, qui est elle-même indissociablement liée au traitement de données à caractère person

**#5** `RGPD (UE 2016/679) · Art. considérant 97` (sim: 36.0%)
> (97)

Lorsque le traitement est réalisé par une autorité publique, à l'exception des juridictions ou des autorités judiciaires indépendantes agissant dans l'exercice de leur fonction juridictionnelle, lorsque, dans le secteur privé, il est effectué par un responsable du traitement dont les activités

</details>

#### ✅ Q11 — Quand une analyse d'impact relative à la protection des données est-elle obligat…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `RGPD (UE 2016/679):35`, `RGPD (UE 2016/679):considérant 91`, `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA):P39`, `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA):P43`, `RGPD (UE 2016/679):considérant 94`, `RGPD (UE 2016/679):considérant 84`

<details><summary>Top-5 chunks retournés</summary>

**#1** `RGPD (UE 2016/679) · Art. 35` (sim: 44.8%)
> Article 35

Analyse d'impact relative à la protection des données

1.   Lorsqu'un type de traitement, en particulier par le recours à de nouvelles technologies, et compte tenu de la nature, de la portée, du contexte et des finalités du traitement, est susceptible d'engendrer un risque élevé pour les

**#2** `RGPD (UE 2016/679) · Art. considérant 91` (sim: 46.0%)
> (91)

Cela devrait s'appliquer en particulier aux opérations de traitement à grande échelle qui visent à traiter un volume considérable de données à caractère personnel au niveau régional, national ou supranational, qui peuvent affecter un nombre important de personnes concernées et qui sont suscept

**#3** `RGPD (UE 2016/679) · Art. 35` (sim: 46.0%)
> Article 35 — Analyse d'impact relative à la protection des données

1. Lorsqu'un type de traitement, en particulier par le recours à de nouvelles technologies, et compte tenu de la nature, de la portée, du contexte et des finalités du traitement, est susceptible d'engendrer un risque élevé pour les 

**#4** `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA) · Art. P39` (sim: 44.1%)
> a) Quand une AIPD est-elle obligatoire? Lorsque le traitement est «susceptible d’engendrer un risque élevé».

**#5** `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA) · Art. P43` (sim: 43.7%)
> Même si une AIPD peut également être requise dans d’autres situations, l’article 35, paragraphe 3, 
considère que le traitement est «susceptible d’engendrer un risque élevé» en particulier dans les cas 
suivants: 
- «a) l’évaluation systématique et approfondie d’aspects personnels concernant des per

</details>

#### ✅ Q12 — Un utilisateur demande la suppression immédiate de l'ensemble de ses données per…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `Data Act — Règlement sur les données (UE 2023/2854):4`, `Data Act — Règlement sur les données (UE 2023/2854):4_§2`, `Data Act — Règlement sur les données (UE 2023/2854):5`, `Data Act — Règlement sur les données (UE 2023/2854):5_§2`, `Data Act — Règlement sur les données (UE 2023/2854):considérant 57`, `Data Act — Règlement sur les données (UE 2023/2854):6`

<details><summary>Top-5 chunks retournés</summary>

**#1** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 4` (sim: 37.2%)
> Article 4 — Droits et obligations des utilisateurs et des détenteurs de données concernant l'accès aux données relatives au produit et aux données relatives au service connexe, leur utilisation et leur mise à disposition

8. Dans des circonstances exceptionnelles, lorsque le détenteur de données qui

**#2** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 4` (sim: 37.2%)
> Article 4 — Droits et obligations des utilisateurs et des détenteurs de données concernant l'accès aux données relatives au produit et aux données relatives au service connexe, leur utilisation et leur mise à disposition

9. Sans préjudice du droit d'un utilisateur de demander réparation à tout mome

**#3** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 4_§2` (sim: 36.7%)
> 7.   En l'absence d'accord sur les mesures nécessaires visées au paragraphe 6, ou si l'utilisateur ne met pas en œuvre les mesures convenues en vertu du paragraphe 6 ou compromet la confidentialité des secrets d'affaires, le détenteur de données peut bloquer ou, selon le cas, suspendre le partage de

**#4** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 5` (sim: 36.7%)
> Article 5 — Droit de l'utilisateur de partager des données avec des tiers

12. Sans préjudice du droit du tiers de demander réparation à tout moment devant une juridiction d'un État membre, un tiers souhaitant contester la décision du détenteur de données de refuser ou de bloquer ou suspendre le par

**#5** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 5_§2` (sim: 36.6%)
> 8.   L'absence d'accord entre le détenteur de données et le tiers concernant les modalités de transmission des données ne doit pas entraver, empêcher ou interférer avec l'exercice des droits de la personne concernée au titre du règlement (UE) 2016/679 et, en particulier, du droit à la portabilité de

</details>

#### ✅ Q13 — Une application mobile de suivi de santé collecte des informations sur les patho…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités:P38`, `CJUE — Arrêt Lindenapotheke (C-21/23) — Qualification de données de santé en vente en ligne:P15`, `EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux:P73`, `Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868):considérant 19`, `Data Act — Règlement sur les données (UE 2023/2854):considérant 34`, `RGPD (UE 2016/679):considérant 54`

<details><summary>Top-5 chunks retournés</summary>

**#1** `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités · Art. P38` (sim: 33.2%)
> consentement accordé est éclairé 73 . Dès lors, le responsable du traitement devra informer les 
personnes concernées de toutes les finalités pertinentes du traitement, notamment tout traitement 
ultérieur des données à caractère personnel obtenues en accédant aux informations se trouvant dans 
l’éq

**#2** `CJUE — Arrêt Lindenapotheke (C-21/23) — Qualification de données de santé en vente en ligne · Art. P15` (sim: 32.6%)
> Les données à caractère personnel qui sont, par nature, particulièrement sensibles du point de vue des libertés et des droits fondamentaux méritent une protection spécifique, car le contexte dans lequel elles sont traitées pourrait engendrer des risques importants pour ces libertés et droits. [...] 

**#3** `EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux · Art. P73` (sim: 33.6%)
> L’utilisateur est invité à donner son consentement pour différents types de finalités (par exemple, un traitement ultérieur des données à caractère personnel). Le consentement n’étant pas spécifique, il n’est donc pas valable lorsque l’utilisateur ne reçoit pas également des informations claires sur

**#4** `Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868) · Art. considérant 19` (sim: 32.3%)
> (19) Les entreprises et les personnes concernées devraient pouvoir avoir la certitude que la réutilisation de certaines catégories de données protégées qui sont détenues par les organismes du secteur public se fera dans le respect de leurs droits et intérêts. Des garanties supplémentaires devraient 

**#5** `Data Act — Règlement sur les données (UE 2023/2854) · Art. considérant 34` (sim: 32.7%)
> (34) L'utilisation d'un produit connecté ou d'un service connexe peut, en particulier lorsque l'utilisateur est une personne physique, générer des données se rapportant à la personne concernée. Le traitement de ces données est soumis aux règles établies par le règlement (UE) 2016/679, y compris lors

</details>

#### ✅ Q14 — Quels sont les montants maximaux des sanctions prévus par le RGPD et l'AI Act, e…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):99`, `RGPD (UE 2016/679):83`, `AI Act (UE 2024/1689):100`, `Data Act — Règlement sur les données (UE 2023/2854):40`, `Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847):64_§1`, `Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868):34`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 99` (sim: 36.2%)
> Article 99

Sanctions

1.   Conformément aux conditions établies dans le présent règlement, les États membres déterminent le régime des sanctions et autres mesures d’exécution, qui peuvent également comprendre des avertissements et des mesures non monétaires, applicables aux violations du présent rè

**#2** `RGPD (UE 2016/679) · Art. 83` (sim: 37.5%)
> Article 83

Conditions générales pour imposer des amendes administratives

1.   Chaque autorité de contrôle veille à ce que les amendes administratives imposées en vertu du présent article pour des violations du présent règlement visées aux paragraphes 4, 5 et 6 soient, dans chaque cas, effectives, 

**#3** `AI Act (UE 2024/1689) · Art. 100` (sim: 38.9%)
> Article 100

Amendes administratives imposées aux institutions, organes et organismes de l’Union

1.   Le Contrôleur européen de la protection des données peut imposer des amendes administratives aux institutions, organes et organismes de l’Union relevant du champ d’application du présent règlement.

**#4** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 40` (sim: 41.2%)
> Article 40 — Sanctions

Article 40

Sanctions

1.   Les États membres déterminent le régime des sanctions applicables aux violations du présent règlement et prennent toutes les mesures nécessaires pour assurer la mise en œuvre de ces sanctions. Ces sanctions doivent être effectives, proportionnées e

**#5** `Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847) · Art. 64_§1` (sim: 37.6%)
> 1.   Les États membres déterminent le régime des sanctions applicables aux violations du présent règlement et prennent toutes les mesures nécessaires pour assurer la mise en œuvre de ces sanctions. Ces sanctions doivent être effectives, proportionnées et dissuasives. Les États membres informent la C

</details>

#### ✅ Q15 — Une entreprise déploie un chatbot de service client alimenté par un LLM. Quelles…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act):*`, `Code de bonnes pratiques GPAI — IA à usage général (AI Office, 2025):P10`, `Code de bonnes pratiques GPAI — IA à usage général (AI Office, 2025):P7`, `AI Act (UE 2024/1689):50`, `AI Act (UE 2024/1689):considérant 72`, `AI Act (UE 2024/1689):considérant 9`

<details><summary>Top-5 chunks retournés</summary>

**#1** `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act) · Art. N/A` (sim: 33.8%)
> Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)

(48) Furthermore, the AI Act applies in conjunction with relevant obligations for providers of intermediary services that embed AI systems or models into their services regulated by Regulation (EU) 2022/2065 (‘the Digital Services Act’

**#2** `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act) · Art. N/A` (sim: 33.7%)
> Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)

Another example is an AI system that learns to identify when it is under evaluation and temporarily halts any undesired behaviour, only to resume such behaviour once the evaluation period is over. 65 Such deceptive behaviour is particu

**#3** `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act) · Art. N/A` (sim: 33.6%)
> Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)

Any use by natural persons where they are acting on behalf or under the authority of a deployer acting in a professional capacity will also fall within the scope of the AI Act. Furthermore, criminal activities cannot be considered pure

**#4** `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act) · Art. N/A` (sim: 33.2%)
> Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)

likely to manipulate, 33 Defined in Article 3(12) AI Act as the use for which an AI system is intended by the provider, including the specific context and conditions of use, as specified in the information supplied by the provider in t

**#5** `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act) · Art. N/A` (sim: 32.6%)
> Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)

For example, an emotion recognition system, if intended to be used by natural persons for purely personal non-professional activities, remains a high-risk AI system as classified in Article 6 AI Act and must be fully in compliance with

</details>

#### ✅ Q16 — Quelles sont les clauses qui doivent obligatoirement figurer dans un contrat de …
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P78`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P71`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P75`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P70`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P76`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P82`

<details><summary>Top-5 chunks retournés</summary>

**#1** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P78` (sim: 43.0%)
> 121. Un sous-traitant peut traiter des données autrement que sur instruction documentée du responsable 
du traitement lorsque le sous-traitant est tenu de traiter et/ou de transférer des données à caractère 
personnel conformément au droit de l’Union ou au droit de l’État membre auquel le sous-trait

**#2** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P71` (sim: 41.8%)
> 105. À titre subsidiaire, un ensemble de clauses contractuelles types peut être adopté par la Commission 45 
ou par une autorité de contrôle, conformément au mécanisme de contrôle de la cohérence 46. Ces 
clauses pourraient faire partie d’une certification délivrée au responsable du traitement ou au

**#3** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P75` (sim: 43.6%)
> personne concernée» 51. D’une manière générale, le contrat entre les parties devrait être rédigé en tenant compte de l’activité de traitement des données spécifique. Par exemple, il n’est pas nécessaire d’imposer des protections et des procédures particulièrement strictes à un sous-traitant chargé d

**#4** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P70` (sim: 42.9%)
> en vigueur, le comité européen de la protection des données recommande de s’assurer que les 
signatures nécessaires y figurent, conformément au droit applicable (par exemple, le droit des 
contrats). 
102. En outre, le contrat ou un autre acte juridique au titre du droit de l’Union ou du droit d’un 

**#5** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P76` (sim: 41.5%)
> dans le contrat, de fournir et de documenter toute instruction relative au traitement de données 
par le sous-traitant, de veiller, avant et pendant le traitement, au respect des obligations 
énoncées dans le RGPD par le sous-traitant, de superviser le traitement, y compris en menant 
des audits et 

</details>

---
## Mécanisme 3 — Couverture des articles principaux

**Score** : 53.4% (73 articles indexés vérifiés)
**Articles non encore indexés** : 0 (monitoring désactivé)

### 🔴 Échecs critiques (34)

| Article | Règlement | Rang trouvé |
|---------|-----------|-------------|
| 101 | AI Act | absent |
| 13 | RGPD | #4 |
| 14 | RGPD | absent |
| 25 | RGPD | absent |
| 35 | RGPD | absent |
| 36 | RGPD | absent |
| 37 | RGPD | absent |
| 45 | RGPD | absent |
| 58 | RGPD | absent |
| 99 | RGPD | absent |
| ECLI:EU:C:2015:650 | CJUE | absent |
| ECLI:EU:C:2020:559 | CJUE | absent |
| ECLI:EU:C:2023:634 | CJUE | absent |
| ECLI:EU:C:2019:801 | CJUE | absent |
| ECLI:EU:C:2018:388 | CJUE | absent |
| ECLI:EU:C:2019:629 | CJUE | absent |
| ECLI:EU:C:2014:317 | CJUE | absent |
| ECLI:EU:C:2023:252 | CJUE | absent |
| ECLI:EU:C:2023:604 | CJUE | absent |
| ECLI:EU:C:2020:901 | CJUE | absent |
| ECLI:EU:C:2022:859 | CJUE | absent |
| ECLI:EU:C:2023:741 | CJUE | absent |
| ECLI:EU:C:2024:119 | CJUE | absent |
| ECLI:EU:C:2024:305 | CJUE | absent |
| WP260 | EDPB | absent |
| 01/2020 | EDPB | absent |
| 05/2020 | EDPB | absent |
| 06/2018 | EDPB | absent |
| 07/2020 | EDPB | absent |
| 02/2022 | EDPB | absent |
| 04/2022 | EDPB | absent |
| 05/2023 | EDPB | absent |
| 02/2024 | EDPB | absent |
| Opinion 28/2024 | EDPB | absent |

---
## Recommandations

🔴 **34 article(s) critique(s) non retrouvés** : déclencher une ré-ingestion ou vérifier les embeddings.

---
## Périmètre de surveillance

| Règlement | Articles surveillés | Indexé |
|-----------|---------------------|--------|
| AI Act | 113 | ✅ |
| RGPD | 99 | ✅ |
| DSA | 25 principaux | ❌ (à indexer) |
| DMA | 18 principaux | ❌ (à indexer) |
| Data Act | 14 principaux | ❌ (à indexer) |
| Data Governance Act | 11 principaux | ❌ (à indexer) |
| NIS2 | 14 principaux | ❌ (à indexer) |
| Directive DSM | 12 principaux | ❌ (à indexer) |
| ePrivacy | 12 principaux | ❌ (à indexer) |
| CRA | 16 principaux | ❌ (à indexer) |
| Règlement Machines | 12 principaux | ❌ (à indexer) |
| eIDAS 2 | 18 principaux | ❌ (à indexer) |
| CJUE (arrêts) | 25 | ✅ |
| EDPB (lignes directrices) | 15 principales | ✅ |

_Périmètre total : 407 entrées dont 252 indexées_

---
*Rapport généré automatiquement par `lib/rag-quality/reporter.ts`*