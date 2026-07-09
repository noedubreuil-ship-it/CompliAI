# RAG Quality Baseline Report

> Généré le 9 juillet 2026
> **Rapport initial** : capture l'état actuel du RAG production comme référence.
> Les exécutions futures seront comparées à ce baseline.

## Résumé exécutif

| Mécanisme | Statut | Détails |
|-----------|--------|---------|
| Golden Set (16 questions) | ✅ OK | ✅ 16 / ⚠️ 0 / 🔴 0 |
| Couverture articles | 🔴 CRITICAL | 54.8% (33 échecs critiques) |

---
## Mécanisme 1 — Golden Set (16 questions de référence)

**Exécuté le** : 09/07/2026 14:47:36
**Résultats** : 16 OK / 0 warning / 0 critique

### Détail par question

#### ✅ Q01 — Notre entreprise développe un outil qui analyse des données financières de PME e…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):considérant 58`, `AI Act (UE 2024/1689):6`, `AI Act (UE 2024/1689):27`, `AI Act (UE 2024/1689):9`, `AI Act (UE 2024/1689):51`, `Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act):*`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. considérant 58` (sim: 37.9%)
> (58)

Un autre domaine dans lequel l’utilisation des systèmes d’IA mérite une attention particulière est l’accès et le droit à certains services et prestations essentiels, publics et privés, devant permettre aux personnes de participer pleinement à la société ou d’améliorer leur niveau de vie. En pa

**#2** `AI Act (UE 2024/1689) · Art. 6` (sim: 38.9%)
> Article 6 §3(c) — Règles relatives à la classification de systèmes d'IA comme systèmes à haut risque

c) le système d'IA est destiné à détecter les constantes en matière de prise de décision ou les écarts par rapport aux constantes habituelles antérieures et n'est pas destiné à se substituer à l'éva

**#3** `AI Act (UE 2024/1689) · Art. 27` (sim: 37.3%)
> Article 27 — Analyse d'impact des systèmes d'IA à haut risque sur les droits fondamentaux

5. Le Bureau de l'IA élabore un modèle de questionnaire, y compris au moyen d'un outil automatisé, afin d'aider les déployeurs à se conformer de manière simplifiée aux obligations qui leur incombent en vertu d

**#4** `AI Act (UE 2024/1689) · Art. 9` (sim: 38.1%)
> Article 9 §8 — Système de gestion des risques

8. Les tests des systèmes d'IA à haut risque sont effectués, selon les besoins, à tout moment pendant le processus de développement et, en tout état de cause, avant leur mise sur le marché ou leur mise en service. Les tests sont effectués sur la base d'

**#5** `AI Act (UE 2024/1689) · Art. 6` (sim: 38.5%)
> Article 6 §3(b) — Règles relatives à la classification de systèmes d'IA comme systèmes à haut risque

b) le système d'IA est destiné à améliorer le résultat d'une activité humaine préalablement réalisée;

</details>

#### ✅ Q02 — Peut-on déployer un système d'IA dans un centre d'appels pour inférer les émotio…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):considérant 44`, `AI Act (UE 2024/1689):considérant 18`, `AI Act (UE 2024/1689):considérant 57`, `AI Act (UE 2024/1689):5`, `AI Act (UE 2024/1689):3`, `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act):*`

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

**#4** `AI Act (UE 2024/1689) · Art. 5` (sim: 30.2%)
> Article 5 §1(f) — Pratiques interdites en matière d'IA

f) la mise sur le marché, la mise en service à cette fin spécifique ou l'utilisation de systèmes d'IA pour inférer les émotions d'une personne physique sur le lieu de travail et dans les établissements d'enseignement, sauf lorsque l'utilisation

**#5** `AI Act (UE 2024/1689) · Art. 3` (sim: 29.3%)
> Article 3 — Définitions

39) «système de reconnaissance des émotions», un système d'IA permettant la reconnaissance ou la déduction des émotions ou des intentions de personnes physiques sur la base de leurs données biométriques;

</details>

#### ✅ Q03 — À partir de quel seuil de puissance de calcul un modèle d'IA à usage général est…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):51`, `AI Act (UE 2024/1689):considérant 111`, `AI Act (UE 2024/1689):ANNEXE XIII`, `AI Act (UE 2024/1689):considérant 112`, `AI Act (UE 2024/1689):considérant 97`, `AI Act (UE 2024/1689):55`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 51` (sim: 48.1%)
> Article 51

Classification de modèles d’IA à usage général en tant que modèles d’IA à usage général présentant un risque systémique

1.   Un modèle d’IA à usage général est classé comme modèle d’IA à usage général présentant un risque systémique s’il remplit l’une des conditions suivantes:

a)

il d

**#2** `AI Act (UE 2024/1689) · Art. 51` (sim: 48.2%)
> Article 51 — Classification de modèles d'IA à usage général en tant que modèles d'IA à usage général présentant un risque systémique

2. Un modèle d'IA à usage général est présumé avoir des capacités à fort impact conformément au paragraphe 1, point a), lorsque la quantité cumulée de calcul utilisée

**#3** `AI Act (UE 2024/1689) · Art. considérant 111` (sim: 46.2%)
> (111)

Il convient d’établir une méthode de classification des modèles d’IA à usage général en tant que modèle d’IA à usage général présentant des risques systémiques. Étant donné que les risques systémiques résultent de capacités particulièrement élevées, un modèle d’IA à usage général devrait être

**#4** `AI Act (UE 2024/1689) · Art. ANNEXE XIII` (sim: 44.5%)
> ANNEXE XIII

Critères de désignation des modèles d'IA à usage général présentant un risque systémique visés à l'article 51

Aux fins de déterminer si un modèle d'IA à usage général a des capacités ou un impact équivalents à ceux énoncés à l'article 51, paragraphe 1, point a), la Commission tient com

**#5** `AI Act (UE 2024/1689) · Art. considérant 112` (sim: 44.9%)
> (112)

Il convient également d’établir de façon précise une procédure de classification d’un modèle d’IA à usage général présentant un risque systémique. Il convient de présumer qu’un modèle d’IA à usage général qui atteint le seuil applicable pour les capacités à fort impact est un modèle d’IA à us

</details>

#### ✅ Q04 — Quelles sont les obligations qui s'imposent aux fournisseurs de modèles d'IA à u…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):55`, `AI Act (UE 2024/1689):54`, `AI Act (UE 2024/1689):53`, `AI Act (UE 2024/1689):considérant 114`, `AI Act (UE 2024/1689):52`, `AI Act (UE 2024/1689):considérant 164`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 55` (sim: 49.0%)
> Article 55 §1(b) — Obligations incombant aux fournisseurs de modèles d'IA à usage général présentant un risque systémique

b) évaluent et atténuent les risques systémiques éventuels au niveau de l'Union, y compris leurs origines, qui peuvent découler du développement, de la mise sur le marché ou de 

**#2** `AI Act (UE 2024/1689) · Art. 54` (sim: 46.7%)
> Article 54

Mandataires des fournisseurs de modèles d’IA à usage général

1.   Avant de mettre un modèle d’IA à usage général sur le marché de l’Union, les fournisseurs établis dans des pays tiers désignent, par mandat écrit, un mandataire établi dans l’Union.

2.   Le fournisseur autorise son manda

**#3** `AI Act (UE 2024/1689) · Art. 55` (sim: 48.7%)
> Article 55 §1(d) — Obligations incombant aux fournisseurs de modèles d'IA à usage général présentant un risque systémique

d) garantissent un niveau approprié de protection en matière de cybersécurité pour le modèle d'IA à usage général présentant un risque systémique et l'infrastructure physique du

**#4** `AI Act (UE 2024/1689) · Art. 55` (sim: 50.3%)
> Article 55 — Obligations incombant aux fournisseurs de modèles d'IA à usage général présentant un risque systémique

1. Outre les obligations énumérées aux articles 53 et 54, les fournisseurs de modèles d'IA à usage général présentant un risque systémique:

**#5** `AI Act (UE 2024/1689) · Art. 55` (sim: 47.3%)
> Article 55

Obligations incombant aux fournisseurs de modèles d’IA à usage général présentant un risque systémique

1.   Outre les obligations énumérées aux articles 53 et 54, les fournisseurs de modèles d’IA à usage général présentant un risque systémique:

a)

effectuent une évaluation des modèles

</details>

#### ✅ Q05 — Un fournisseur qui publie les poids de son modèle d'IA à usage général en open s…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):53`, `AI Act (UE 2024/1689):54`, `AI Act (UE 2024/1689):considérant 104`, `AI Act (UE 2024/1689):55`, `AI Act (UE 2024/1689):92`, `AI Act (UE 2024/1689):50`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 53` (sim: 46.3%)
> Article 53 — Obligations incombant aux fournisseurs de modèles d'IA à usage général

2. Les obligations énoncées au paragraphe 1, points a) et b), ne s'appliquent pas aux fournisseurs de modèles d'IA qui sont publiés dans le cadre d'une licence libre et ouverte permettant de consulter, d'utiliser, d

**#2** `AI Act (UE 2024/1689) · Art. 54` (sim: 46.7%)
> Article 54 — Mandataires des fournisseurs de modèles d'IA à usage général

6. L'obligation énoncée au présent article ne s'applique pas aux fournisseurs de modèles d'IA à usage général qui sont publiés dans le cadre d'une licence libre et ouverte permettant de consulter, d'utiliser, de modifier et d

**#3** `AI Act (UE 2024/1689) · Art. 54` (sim: 42.2%)
> Article 54

Mandataires des fournisseurs de modèles d’IA à usage général

1.   Avant de mettre un modèle d’IA à usage général sur le marché de l’Union, les fournisseurs établis dans des pays tiers désignent, par mandat écrit, un mandataire établi dans l’Union.

2.   Le fournisseur autorise son manda

**#4** `AI Act (UE 2024/1689) · Art. considérant 104` (sim: 41.5%)
> (104)

Les fournisseurs de modèles d’IA à usage général qui sont publiés sous licence libre et ouverte et dont les paramètres, y compris les poids, les informations sur l’architecture des modèles et les informations sur l’utilisation des modèles, sont rendus publics devraient faire l’objet d’excepti

**#5** `AI Act (UE 2024/1689) · Art. 53` (sim: 44.2%)
> Article 53 — Obligations incombant aux fournisseurs de modèles d'IA à usage général

1. Les fournisseurs de modèles d'IA à usage général:

</details>

#### ✅ Q06 — Une banque refuse un prêt immobilier en se fondant quasi-exclusivement sur un sc…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P23`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P18`, `EDPB Lignes directrices 04/2019 — Article 25 RGPD : protection des données dès la conception et par défaut (Privacy by Design):P38`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P45`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P9`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P18`

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

**#3** `EDPB Lignes directrices 04/2019 — Article 25 RGPD : protection des données dès la conception et par défaut (Privacy by Design) · Art. P38` (sim: 38.3%)
> Une banque envisage de proposer un service pour améliorer l’efficacité de la gestion des demandes 
de prêts. L’idée qui sous -tend le service est que la banque, en demandant l’autorisation du client, 
puisse récupérer des données concernant le client directement auprès des autorités fiscales publiqu

**#4** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P45` (sim: 37.1%)
> 65. La Cour a souligné qu’il incombe à l’exportateur et à l’importateur de données d’apprécier si le 
niveau de protection requis par le droit de l’Union est respecté dans le pays tiers concerné afin 
de déterminer si les garanties établies par les clauses contractuelles types ou par les règles 
d’e

**#5** `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires) · Art. P9` (sim: 38.0%)
> considérant ce qui suit: 
(1) La Cour de justice de l’Union européenne (CJUE) conclut, dans son arrêt du 16 juillet 2020, Data 
Protection Commissioner c/ Facebook Ireland LTD, Maximillian Schrems, C-311/18, que l’article 46, 
paragraphe 1, et l’article 46, paragraphe 2, point d), du RGPD doivent êt

</details>

#### ✅ Q07 — Dans quels cas précis l'article 22 du RGPD s'applique-t-il à une décision automa…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `RGPD (UE 2016/679):22`, `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités:P57`, `EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : nécessité d'exécution du contrat (services en ligne):P13`, `RGPD (UE 2016/679):considérant 71`, `EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux:P299`, `EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : nécessité d'exécution du contrat (services en ligne):P5`

<details><summary>Top-5 chunks retournés</summary>

**#1** `RGPD (UE 2016/679) · Art. 22` (sim: 45.3%)
> Article 22

Décision individuelle automatisée, y compris le profilage

1.   La personne concernée a le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé, y compris le profilage, produisant des effets juridiques la concernant ou l'affectant de manière sign

**#2** `RGPD (UE 2016/679) · Art. 22` (sim: 43.7%)
> Article 22 — §2 — Exceptions au droit de ne pas faire l'objet d'une décision automatisée

2. Le paragraphe 1 ne s'applique pas lorsque la décision :

**#3** `RGPD (UE 2016/679) · Art. 22` (sim: 44.2%)
> Article 22 — Décision individuelle automatisée, y compris le profilage

1. La personne concernée a le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé, y compris le profilage, produisant des effets juridiques la concernant ou l'affectant de manière signi

**#4** `RGPD (UE 2016/679) · Art. 22` (sim: 41.7%)
> Article 22 — §3 — Garanties en cas de décision automatisée

3. Dans les cas visés au paragraphe 2, points a) et c), le responsable du traitement met en œuvre des mesures appropriées pour la sauvegarde des droits et libertés et des intérêts légitimes de la personne concernée, au moins du droit de la 

**#5** `RGPD (UE 2016/679) · Art. 22` (sim: 43.4%)
> Article 22 — §4 — Données sensibles et décisions automatisées

4. Les décisions visées au paragraphe 2 ne peuvent être fondées sur les catégories particulières de données à caractère personnel visées à l'article 9, paragraphe 1, à moins que l'article 9, paragraphe 2, point a) ou g), ne s'applique et

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

#### ✅ Q09 — Une PME française souhaite confier le traitement de données RH à un sous-traitan…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `RGPD (UE 2016/679):considérant 108`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P53`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P78`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P23`, `EDPB Recommandations 01/2020 — Transferts internationaux post-Schrems II (mesures complémentaires):P74`, `EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait:P26`

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

Articles cités : `RGPD (UE 2016/679):35`, `RGPD (UE 2016/679):considérant 91`, `RGPD (UE 2016/679):considérant 94`, `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA):P39`, `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA):P43`, `RGPD (UE 2016/679):considérant 84`

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

**#4** `RGPD (UE 2016/679) · Art. considérant 94` (sim: 47.2%)
> (94)

Lorsqu'il ressort d'une analyse d'impact relative à la protection des données que, en l'absence des garanties, de mesures de sécurité et de mécanismes pour atténuer le risque, le traitement engendrerait un risque élevé pour les droits et libertés des personnes physiques et que le responsable d

**#5** `EDPB Lignes directrices WP248 — Analyse d'Impact relative à la Protection des Données (AIPD/DPIA) · Art. P39` (sim: 44.1%)
> a) Quand une AIPD est-elle obligatoire? Lorsque le traitement est «susceptible d’engendrer un risque élevé».

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

Articles cités : `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités:P38`, `EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux:P73`, `RGPD (UE 2016/679):considérant 54`, `Data Act — Règlement sur les données (UE 2023/2854):considérant 34`, `RGPD (UE 2016/679):considérant 63`, `RGPD (UE 2016/679):considérant 35`

<details><summary>Top-5 chunks retournés</summary>

**#1** `EDPB Lignes directrices 08/2020 — Ciblage des utilisateurs de médias sociaux : rôles et responsabilités · Art. P38` (sim: 33.2%)
> consentement accordé est éclairé 73 . Dès lors, le responsable du traitement devra informer les 
personnes concernées de toutes les finalités pertinentes du traitement, notamment tout traitement 
ultérieur des données à caractère personnel obtenues en accédant aux informations se trouvant dans 
l’éq

**#2** `EDPB Lignes directrices 03/2022 — Dark patterns / interfaces trompeuses sur les plateformes de médias sociaux · Art. P73` (sim: 33.6%)
> L’utilisateur est invité à donner son consentement pour différents types de finalités (par exemple, un traitement ultérieur des données à caractère personnel). Le consentement n’étant pas spécifique, il n’est donc pas valable lorsque l’utilisateur ne reçoit pas également des informations claires sur

**#3** `RGPD (UE 2016/679) · Art. considérant 54` (sim: 34.2%)
> (54)

Le traitement des catégories particulières de données à caractère personnel peut être nécessaire pour des motifs d'intérêt public dans les domaines de la santé publique, sans le consentement de la personne concernée. Un tel traitement devrait faire l'objet de mesures appropriées et spécifiques

**#4** `Data Act — Règlement sur les données (UE 2023/2854) · Art. considérant 34` (sim: 32.7%)
> (34) L'utilisation d'un produit connecté ou d'un service connexe peut, en particulier lorsque l'utilisateur est une personne physique, générer des données se rapportant à la personne concernée. Le traitement de ces données est soumis aux règles établies par le règlement (UE) 2016/679, y compris lors

**#5** `RGPD (UE 2016/679) · Art. considérant 63` (sim: 33.5%)
> (63)

Une personne concernée devrait avoir le droit d'accéder aux données à caractère personnel qui ont été collectées à son sujet et d'exercer ce droit facilement et à des intervalles raisonnables, afin de prendre connaissance du traitement et d'en vérifier la licéité. Cela inclut le droit des pers

</details>

#### ✅ Q14 — Quels sont les montants maximaux des sanctions prévus par le RGPD et l'AI Act, e…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `Data Act — Règlement sur les données (UE 2023/2854):40`, `AI Act (UE 2024/1689):99`, `RGPD (UE 2016/679):83`, `AI Act (UE 2024/1689):100`, `Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847):64_§1`, `Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868):34`

<details><summary>Top-5 chunks retournés</summary>

**#1** `Data Act — Règlement sur les données (UE 2023/2854) · Art. 40` (sim: 41.2%)
> Article 40 — Sanctions

Article 40

Sanctions

1.   Les États membres déterminent le régime des sanctions applicables aux violations du présent règlement et prennent toutes les mesures nécessaires pour assurer la mise en œuvre de ces sanctions. Ces sanctions doivent être effectives, proportionnées e

**#2** `AI Act (UE 2024/1689) · Art. 99` (sim: 36.2%)
> Article 99

Sanctions

1.   Conformément aux conditions établies dans le présent règlement, les États membres déterminent le régime des sanctions et autres mesures d’exécution, qui peuvent également comprendre des avertissements et des mesures non monétaires, applicables aux violations du présent rè

**#3** `RGPD (UE 2016/679) · Art. 83` (sim: 37.5%)
> Article 83

Conditions générales pour imposer des amendes administratives

1.   Chaque autorité de contrôle veille à ce que les amendes administratives imposées en vertu du présent article pour des violations du présent règlement visées aux paragraphes 4, 5 et 6 soient, dans chaque cas, effectives, 

**#4** `AI Act (UE 2024/1689) · Art. 100` (sim: 38.9%)
> Article 100

Amendes administratives imposées aux institutions, organes et organismes de l’Union

1.   Le Contrôleur européen de la protection des données peut imposer des amendes administratives aux institutions, organes et organismes de l’Union relevant du champ d’application du présent règlement.

**#5** `Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847) · Art. 64_§1` (sim: 37.6%)
> 1.   Les États membres déterminent le régime des sanctions applicables aux violations du présent règlement et prennent toutes les mesures nécessaires pour assurer la mise en œuvre de ces sanctions. Ces sanctions doivent être effectives, proportionnées et dissuasives. Les États membres informent la C

</details>

#### ✅ Q15 — Une entreprise déploie un chatbot de service client alimenté par un LLM. Quelles…
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `AI Act (UE 2024/1689):50`, `AI Act (UE 2024/1689):considérant 132`, `AI Act (UE 2024/1689):considérant 164`, `AI Act (UE 2024/1689):13`, `Commission Guidelines — Prohibited AI practices (Art. 5 AI Act):*`, `AI Act (UE 2024/1689):considérant 134`

<details><summary>Top-5 chunks retournés</summary>

**#1** `AI Act (UE 2024/1689) · Art. 50` (sim: 38.5%)
> Article 50 — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA

1. Les fournisseurs veillent à ce que les systèmes d'IA destinés à interagir directement avec des personnes physiques soient conçus et développés de manière que les personnes physiques concern

**#2** `AI Act (UE 2024/1689) · Art. 50` (sim: 37.5%)
> Article 50 — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA

2. Les fournisseurs de systèmes d'IA, y compris de systèmes d'IA à usage général, qui génèrent des contenus de synthèse de type audio, image, vidéo ou texte, veillent à ce que les sorties des 

**#3** `AI Act (UE 2024/1689) · Art. 50` (sim: 35.3%)
> Article 50

Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d’IA

1.   Les fournisseurs veillent à ce que les systèmes d’IA destinés à interagir directement avec des personnes physiques soient conçus et développés de manière que les personnes physiques concer

**#4** `AI Act (UE 2024/1689) · Art. 50` (sim: 36.9%)
> Article 50 — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA

4 (alinéa 2). Les déployeurs d'un système d'IA qui génère ou manipule des textes publiés dans le but d'informer le public sur des questions d'intérêt public indiquent que le texte a été généré

**#5** `AI Act (UE 2024/1689) · Art. 50` (sim: 36.9%)
> Article 50 — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA

5. Les informations visées aux paragraphes 1 à 4 sont fournies aux personnes physiques concernées de manière claire et reconnaissable au plus tard au moment de la première interaction ou de la

</details>

#### ✅ Q16 — Quelles sont les clauses qui doivent obligatoirement figurer dans un contrat de …
Résultat : conforme. Articles attendus présents, aucun article blacklisté.

Articles cités : `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P78`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P75`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P71`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P70`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P76`, `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD:P82`

<details><summary>Top-5 chunks retournés</summary>

**#1** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P78` (sim: 43.0%)
> 121. Un sous-traitant peut traiter des données autrement que sur instruction documentée du responsable 
du traitement lorsque le sous-traitant est tenu de traiter et/ou de transférer des données à caractère 
personnel conformément au droit de l’Union ou au droit de l’État membre auquel le sous-trait

**#2** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P75` (sim: 43.6%)
> personne concernée» 51. D’une manière générale, le contrat entre les parties devrait être rédigé en tenant compte de l’activité de traitement des données spécifique. Par exemple, il n’est pas nécessaire d’imposer des protections et des procédures particulièrement strictes à un sous-traitant chargé d

**#3** `EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD · Art. P71` (sim: 41.8%)
> 105. À titre subsidiaire, un ensemble de clauses contractuelles types peut être adopté par la Commission 45 
ou par une autorité de contrôle, conformément au mécanisme de contrôle de la cohérence 46. Ces 
clauses pourraient faire partie d’une certification délivrée au responsable du traitement ou au

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

**Score** : 54.8% (73 articles indexés vérifiés)
**Articles non encore indexés** : 0 (monitoring désactivé)

### 🔴 Échecs critiques (33)

| Article | Règlement | Rang trouvé |
|---------|-----------|-------------|
| 101 | AI Act | absent |
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

🔴 **33 article(s) critique(s) non retrouvés** : déclencher une ré-ingestion ou vérifier les embeddings.

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