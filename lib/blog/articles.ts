export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMinutes: number;
  tags: string[];
  author: string;
  content: string; // HTML/markdown string
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "checklist-ai-act-2025",
    title: "Checklist AI Act 2025 : les 12 étapes pour être conforme",
    description:
      "Le règlement européen sur l'IA (UE 2024/1689) est entré en vigueur. Voici les 12 étapes concrètes pour préparer votre conformité selon le type de système IA que vous développez ou déployez.",
    date: "2025-06-01",
    readMinutes: 8,
    tags: ["AI Act", "Conformité", "Checklist", "DPO"],
    author: "CompliAI",
    content: `
## Pourquoi une checklist AI Act ?

L'**AI Act (règlement (UE) 2024/1689)** s'applique progressivement depuis le 2 août 2024. Selon votre rôle (fournisseur, déployeur, importateur) et le niveau de risque de votre système IA, vos obligations diffèrent radicalement.

Cette checklist couvre les 12 étapes essentielles pour les entreprises qui développent ou utilisent de l'IA dans l'UE.

---

## Étape 1 — Classifier votre système IA

Avant toute chose, déterminez dans quelle catégorie entre votre système :

- **Risque inacceptable** (Art. 5) : interdits depuis le 2 février 2025 — score social, manipulation subliminale, identification biométrique en temps réel dans les espaces publics.
- **Haut risque** (Annexe III et I) : obligations lourdes à partir d'août 2026.
- **GPAI** (Art. 51-56) : modèles à usage général comme les LLM — obligations depuis août 2025.
- **Risque limité** : obligations de transparence uniquement.
- **Risque minimal** : pas d'obligations spécifiques AI Act.

> **Outil** : utilisez le [classificateur IA de CompliAI](/dashboard/tools/classifier) pour déterminer votre catégorie en 5 minutes.

---

## Étape 2 — Identifier votre rôle dans la chaîne de valeur

L'AI Act distingue :
- **Fournisseur** (provider) : celui qui développe et met sur le marché le système IA.
- **Déployeur** (deployer) : celui qui utilise le système IA dans un contexte professionnel.
- **Importateur / distributeur** : chaîne d'approvisionnement.

Les obligations diffèrent selon le rôle. Un déployeur qui modifie substantiellement un système IA devient fournisseur.

---

## Étape 3 — Établir la documentation technique (Art. 11, Annexe IV)

Pour les systèmes à **haut risque**, la documentation technique est obligatoire avant la mise sur le marché. Elle comprend :
- Description générale et finalités
- Données d'entraînement, de validation et de test
- Architecture du modèle
- Mesures de contrôle humain
- Résultats d'évaluation et benchmarks

> **Outil** : [générateur de documentation Art. 11](/dashboard/tools/art11) — produit un document structuré conforme à l'Annexe IV.

---

## Étape 4 — Réaliser la FRIA pour les déployeurs publics (Art. 27)

Si vous êtes un **organisme de droit public** ou un opérateur d'infrastructure critique qui déploie un système IA à haut risque (Annexe III), vous devez réaliser une **FRIA** (évaluation d'impact sur les droits fondamentaux) avant le déploiement.

Cette évaluation couvre : description du déploiement, droits fondamentaux concernés, mesures de surveillance, mécanisme de recours.

---

## Étape 5 — Mettre en place la gouvernance de l'IA

Désignez un référent AI Act dans votre organisation (souvent le DPO). Documentez :
- Les politiques internes d'usage de l'IA (Art. 4 — culture de l'IA)
- Les procédures de surveillance humaine (human oversight)
- Les registres de systèmes IA déployés

> **Outil** : [politique IA employés](/dashboard/tools/policy) — politique interne conforme Art. 4.

---

## Étape 6 — Vérifier la conformité RGPD pour les systèmes IA

L'AI Act ne remplace pas le RGPD. Si votre système IA traite des données personnelles, les deux règlements s'appliquent simultanément. Points de vigilance :
- **DPIA/AIPD** requise si traitement à grande échelle ou profilage (Art. 35 RGPD + critères WP248).
- **Base légale** pour chaque traitement.
- **Droits des personnes** : explication des décisions automatisées (Art. 22 RGPD).

---

## Étape 7 — Obligations GPAI (modèles à usage général)

Si vous développez un **modèle GPAI** (LLM, modèle multimodal) et le mettez sur le marché UE :
- Documentation technique (Annexe XI AI Act).
- Résumé des données d'entraînement.
- Politique de respect du droit d'auteur.
- Si > 10²⁵ FLOPs : évaluation adversariale (red teaming), suivi des incidents.

---

## Étape 8 — Informer les utilisateurs (Art. 13 — transparence)

Les systèmes IA à haut risque doivent afficher des informations claires aux utilisateurs :
- Qu'ils interagissent avec une IA.
- Les capacités et limitations du système.
- La possibilité de contester les décisions.

Pour les chatbots et agents conversationnels : obligation de divulguer la nature IA (Art. 52).

---

## Étape 9 — Mettre en place la surveillance post-déploiement (Art. 72)

Les fournisseurs de systèmes à haut risque doivent :
- Surveiller les performances en conditions réelles.
- Déclarer les incidents graves à l'autorité de surveillance nationale.
- Établir un plan de surveillance proactif.

---

## Étape 10 — Enregistrement dans la base de données UE (Art. 71)

Avant de mettre sur le marché un système IA à haut risque (Annexe III), les fournisseurs doivent s'enregistrer dans la base de données UE administrée par la Commission.

---

## Étape 11 — Marquage CE et déclaration de conformité (Art. 48)

Pour les systèmes à haut risque, le marquage CE est obligatoire avant mise sur le marché. Il suppose la réalisation d'une évaluation de conformité (auto-évaluation ou organisme notifié selon la catégorie).

---

## Étape 12 — Préparer la relation contractuelle avec les sous-traitants IA

Si vous intégrez des composants IA tiers (API OpenAI, Microsoft Copilot, etc.) :
- Vérifiez que le contrat alloue clairement les responsabilités AI Act.
- Exigez la documentation technique nécessaire.
- Incluez des clauses de conformité AI Act dans vos contrats avec des tiers IA.

> **Outil** : [analyseur de contrats IA](/dashboard/tools/contract) — identifie les clauses manquantes.

---

## Récapitulatif des délais

| Obligation | Deadline |
|---|---|
| Pratiques interdites | 2 février 2025 |
| Obligations GPAI | 2 août 2025 |
| Systèmes haut risque (Annexe III) | 2 août 2026 |
| Systèmes haut risque (Annexe I) | 2 août 2027 |

---

*Besoin d'une analyse personnalisée ? [Essayez CompliAI gratuitement](/dashboard/tools/checklist) — votre checklist AI Act en 5 minutes.*
    `,
  },
  {
    slug: "dpia-obligatoire-quand-comment",
    title: "DPIA obligatoire : dans quels cas et comment la réaliser en 2025 ?",
    description:
      "L'analyse d'impact (AIPD/DPIA) est exigée par le RGPD pour les traitements à risque élevé. Guide complet : 9 critères WP248, processus étape par étape et outils pour DPO.",
    date: "2025-06-10",
    readMinutes: 7,
    tags: ["RGPD", "DPIA", "AIPD", "DPO", "Conformité"],
    author: "CompliAI",
    content: `
## Qu'est-ce qu'une DPIA / AIPD ?

La **DPIA** (Data Protection Impact Assessment), ou **AIPD** en français (Analyse d'Impact relative à la Protection des Données), est un processus exigé par l'**article 35 du RGPD** pour certains traitements présentant un risque élevé pour les droits et libertés des personnes.

Elle n'est pas une simple formalité : c'est un outil de gestion des risques qui vous permet d'évaluer, documenter et réduire les risques *avant* de démarrer le traitement.

---

## Quand la DPIA est-elle obligatoire ?

### Critère général (Art. 35 §1 RGPD)

Une DPIA est requise lorsqu'un traitement est **susceptible d'engendrer un risque élevé** pour les droits et libertés. Le RGPD cite trois cas explicites (Art. 35 §3) mais le seuil général couvre beaucoup plus.

### Les 9 critères du WP248 (EDPB)

Le Comité européen de protection des données (EDPB), dans ses lignes directrices WP248, identifie **9 critères**. **Deux critères ou plus = DPIA obligatoire** :

1. **Évaluation ou scoring** — profilage, scoring de solvabilité, ciblage comportemental.
2. **Décision automatisée avec effet juridique significatif** — refus automatique de crédit, sélection automatique de CV.
3. **Surveillance systématique** — monitoring réseau, vidéosurveillance, tracking GPS.
4. **Données sensibles** — catégories Art. 9 (santé, religion, origines, biométrie) ou données pénales.
5. **Traitement à grande échelle** — millions d'utilisateurs ou traitement intensif.
6. **Croisement de jeux de données** — combinaison de sources distinctes dépassant les attentes raisonnables.
7. **Personnes vulnérables** — enfants, salades, salariés.
8. **Technologie innovante** — reconnaissance faciale, IoT, IA générative.
9. **Traitement bloquant l'accès à un service** — notation influençant l'accès à un crédit, à l'emploi.

### Les listes CNIL

La CNIL a publié une **liste positive** (traitements nécessitant obligatoirement une DPIA) et une **liste négative** (traitements exemptés). Consultez-les sur cnil.fr.

---

## Exemples concrets

| Traitement | DPIA requise ? |
|---|---|
| Chatbot IA de service client gérant données de santé | ✅ Oui (catégories spéciales + IA innovante) |
| Système de scoring RH automatisé | ✅ Oui (décision automatisée + scoring) |
| Analyse comportementale pour ciblage publicitaire à grande échelle | ✅ Oui (profilage + grande échelle) |
| Annuaire d'entreprise (noms, emails pros) | ❌ Non |
| Gestion RH standard PME | ❌ Non (sauf syndicats, données de santé) |
| Vidéosurveillance commerce de détail (accès public) | ✅ Oui (surveillance systématique espace public) |

---

## Le processus DPIA en 5 étapes

### Étape 1 — Description du traitement

Documentez : quelles données, collectées comment, finalités, durée de conservation, qui y a accès, sous-traitants, transferts hors UE.

### Étape 2 — Évaluation nécessité / proportionnalité

Le traitement est-il nécessaire à la finalité ? Peut-on atteindre l'objectif avec moins de données ? La durée de conservation est-elle justifiée ?

### Étape 3 — Identification et évaluation des risques

Pour chaque risque potentiel (accès non autorisé, perte, modification non désirée) : évaluer la **vraisemblance** et la **gravité** avant mesures.

### Étape 4 — Mesures de traitement des risques

Définir les mesures organisationnelles et techniques pour réduire chaque risque. Réévaluer le risque **résiduel**.

### Étape 5 — Consultation préalable si risque résiduel élevé

Si le risque résiduel reste élevé après mesures → **consultation obligatoire de l'autorité de contrôle** (Art. 36 RGPD) avant de démarrer le traitement.

---

## Rôle du DPO dans la DPIA

Le DPO doit être **consulté dès le début** de toute DPIA (Art. 35 §2 RGPD). Son rôle est consultatif : il donne un avis mais la responsabilité de la décision finale appartient au responsable du traitement.

Si le responsable choisit de ne pas suivre l'avis du DPO, cela doit être **documenté**.

---

## Durée et révision

La DPIA n'est pas un exercice ponctuel. L'EDPB recommande une révision au moins tous les **3 ans** et à chaque modification substantielle du traitement.

---

## DPIA et AI Act

Depuis 2025, les systèmes IA à haut risque peuvent déclencher à la fois une DPIA (RGPD) *et* une évaluation de conformité AI Act. Les deux processus sont complémentaires mais distincts.

> **Outil** : [générateur DPIA de CompliAI](/dashboard/tools/dpia) — produit une analyse d'impact structurée et conforme en 10 minutes.
    `,
  },
  {
    slug: "dpo-quel-outil-2025",
    title: "DPO : quel outil choisir en 2025 pour gérer sa conformité RGPD ?",
    description:
      "Guide comparatif pour les Délégués à la Protection des Données : quels outils numériques choisir pour gérer audits, ROPA, DPIA et documentation de conformité en 2025 ?",
    date: "2025-06-18",
    readMinutes: 6,
    tags: ["DPO", "RGPD", "Outils", "Conformité"],
    author: "CompliAI",
    content: `
## Le défi quotidien du DPO

Le Délégué à la Protection des Données (DPO) est une fonction centrale depuis le RGPD (Art. 37-39). Mais en 2025, les obligations se multiplient : AI Act, NIS2, DSA, DSM, Data Act... Le DPO moderne gère simultanément des registres de traitements, des DPIA, des audits de conformité, des demandes d'exercice de droits, des incidents de sécurité et maintenant des évaluations AI Act.

La bonne nouvelle : des outils dédiés permettent d'automatiser une grande partie de ce travail.

---

## Ce qu'un DPO doit gérer en 2025

### Obligations RGPD

- **Registre de traitement (ROPA, Art. 30)** : liste exhaustive de tous les traitements avec données, finalités, bases légales, durées de conservation, sous-traitants.
- **DPIA/AIPD (Art. 35)** : pour les traitements à risque élevé.
- **Gestion des incidents** : notification CNIL sous 72h, communication aux personnes concernées.
- **Droits des personnes** : accès, effacement, portabilité, opposition — délai d'un mois.
- **Contrats sous-traitants (Art. 28)** : clauses obligatoires dans tous les contrats avec prestataires traitant des données personnelles.

### Nouvelles obligations AI Act

Depuis 2025, si votre organisation déploie des systèmes IA :
- Documentation technique pour les systèmes à haut risque.
- FRIA pour les organismes publics (Art. 27).
- Registre des systèmes IA déployés.
- Politique IA interne pour les salariés (Art. 4).

---

## Les critères de choix d'un outil DPO

### 1. Gestion du ROPA

L'outil doit permettre de créer, modifier et maintenir le registre Article 30 facilement. La génération automatique assistée par IA est un vrai gain de temps : vous décrivez votre traitement, l'IA produit une fiche structurée conforme.

### 2. Module DPIA intégré

Idéalement, l'outil inclut un générateur de DPIA qui pose les bonnes questions, évalue automatiquement si la DPIA est obligatoire (critères WP248), et produit un document exploitable.

### 3. Suivi des demandes de droits

Un workflow structuré pour tracer et répondre dans les délais aux demandes d'accès, d'effacement, de portabilité.

### 4. Gestion des sous-traitants

Liste des sous-traitants, état des contrats Art. 28, alertes sur les contrats manquants ou expirés.

### 5. Audit trail

Journal immuable de toutes les actions de conformité — utile en cas de contrôle de la CNIL.

### 6. Support multi-réglementation

En 2025, un bon outil DPO doit couvrir : RGPD, AI Act, NIS2 (pour les opérateurs essentiels et importants), et idéalement DSA et Data Act.

---

## CompliAI : conçu pour le DPO moderne

CompliAI a été conçu autour des besoins concrets des DPO et juristes spécialisés :

- **Registre ROPA automatisé** : générez une fiche Art. 30 complète en décrivant votre traitement en langage naturel.
- **DPIA guidée** : vérification automatique des 9 critères WP248 + génération du document d'analyse.
- **Checklist de conformité personnalisée** : audit de votre situation avec roadmap prioritaire.
- **Jurisprudence CJUE intégrée** : accès aux arrêts clés (Schrems I/II, SCHUFA, Meta...) directement dans votre analyse.
- **Chat consultant** : posez vos questions juridiques complexes en français (ou dans votre langue) et obtenez des réponses sourcées et référencées.
- **Audit trail** : journal exportable CSV de toutes vos actions de conformité.

---

## Réglementation applicable au DPO

Les lignes directrices **WP243** (EDPB, adoptées 2018) clarifient :
- Désignation obligatoire pour les autorités publiques, les traitements à grande échelle de données sensibles, et la surveillance systématique à grande échelle.
- Protection contre les sanctions pour l'exercice des fonctions.
- Obligation d'absence de conflit d'intérêts (le DPO ne peut être responsable du traitement).
- Accès direct à la direction générale.

> **Essayez CompliAI gratuitement** — [créez votre premier ROPA ou DPIA](/dashboard/tools/ropa) en moins de 10 minutes.
    `,
  },
  {
    slug: "ai-act-open-source-obligations",
    title: "AI Act et open source : quelles obligations pour un modèle LLM publié en open source ?",
    description:
      "Publier un LLM en open source sur Hugging Face vous exempte-t-il de l'AI Act ? Analyse complète des obligations pour les fournisseurs de modèles GPAI open source en 2025.",
    date: "2025-07-01",
    readMinutes: 9,
    tags: ["AI Act", "Open Source", "GPAI", "LLM", "Conformité"],
    author: "CompliAI",
    content: `
## L'idée reçue la plus dangereuse de l'AI Act

Beaucoup de développeurs pensent qu'en publiant leur modèle sous licence MIT ou Apache sur Hugging Face, ils s'exemptent automatiquement de l'AI Act. **C'est faux — et partiellement vrai.**

L'AI Act (règlement (UE) 2024/1689) prévoit effectivement un régime allégé pour les modèles open source, mais avec des conditions précises et des obligations qui subsistent.

---

## Cadre juridique : qui est fournisseur GPAI ?

L'article 3, point 63 de l'AI Act définit un **modèle GPAI** comme un modèle entraîné sur de grandes quantités de données, présentant une généralité significative, capable d'effectuer un large éventail de tâches. Les LLM de type Llama, Mistral, Falcon, GPT entrent dans cette catégorie.

L'article 53 §1 impose aux fournisseurs de modèles GPAI :
- Documentation technique (Annexe XI).
- Informations aux intégrateurs en aval.
- Politique de respect du droit d'auteur.
- Publication d'un résumé des données d'entraînement.

---

## L'exemption open source : conditions strictes

L'article 53 §2 prévoit une exemption partielle pour les modèles GPAI open source. **Les conditions sont cumulatives** :

1. Les **poids du modèle** doivent être publiés sous une **licence ouverte permettant l'accès, l'usage, la modification et la distribution**.
2. La publication doit être **publique et accessible à tous** (pas de liste blanche ou de restriction à des partenaires sélectionnés).
3. La documentation doit être **suffisamment détaillée** pour permettre l'utilisation.

### Ce que l'exemption couvre

Si ces conditions sont réunies, les obligations d'information aux intégrateurs en aval (Art. 53 §1 b)) et la documentation technique détaillée (Art. 53 §1 c)) sont **allégées**.

### Ce que l'exemption ne couvre PAS

Même pour un modèle 100% open source, subsistent :

1. **La politique de respect du droit d'auteur** (Art. 53 §1 d)) — obligatoire même en open source.
2. **Le résumé des données d'entraînement** (Art. 53 §1 d)) — divulgation publique requise.
3. **Toutes les obligations des modèles à risque systémique** (Art. 55) si le modèle dépasse 10²⁵ FLOPs — **aucune exemption open source pour les modèles à risque systémique**.

---

## Seuil de risque systémique : 10²⁵ FLOPs

L'article 51 de l'AI Act fixe le seuil de **risque systémique** à **10²⁵ opérations en virgule flottante** (FLOPs) pour l'entraînement.

À titre de référence :
- **GPT-3** (175B paramètres) : ~3,14 × 10²³ FLOPs → **sous le seuil**.
- **GPT-4** (estimation) : probablement au-dessus du seuil.
- **Llama 3 70B** : ~1-2 × 10²⁴ FLOPs → **sous le seuil**.
- Un modèle de **70 milliards de paramètres entraîné sur 5 × 10²⁴ FLOPs** → **sous le seuil** (mais proche).

**Dès que vous dépassez 10²⁵ FLOPs**, même open source, vous entrez dans les obligations renforcées :
- Évaluation adversariale (red teaming) par des experts indépendants.
- Suivi et déclaration des incidents graves à l'AI Office.
- Protection de la cybersécurité du modèle et de l'infrastructure.

---

## Cas pratique : un LLM de 70B publié sur Hugging Face

Imaginons votre situation : vous développez un modèle de 70 milliards de paramètres, entraîné avec environ 5 × 10²⁴ FLOPs, et vous prévoyez de le publier en open source (poids + code).

### Analyse

| Question | Réponse |
|---|---|
| Est-ce un modèle GPAI ? | ✅ Oui — généralité significative, multitâche |
| Dépasse-t-il 10²⁵ FLOPs ? | ❌ Non (5 × 10²⁴ < 10²⁵) |
| Risque systémique ? | ❌ Non |
| Exemption open source applicable ? | ✅ Partiellement |

### Obligations qui subsistent

Même avec l'exemption open source et en dessous du seuil de risque systémique :

1. **Politique de respect du droit d'auteur** : documentez votre approche (robots.txt lors du crawl, opt-out honoré, etc.).
2. **Résumé des données d'entraînement** : publiez les catégories de données, sources, filtres appliqués — pas nécessairement un inventaire exhaustif, mais suffisamment détaillé.
3. **Model card** : bonne pratique documentaire fortement recommandée (capacités, limites, cas d'usage déconseillés).

### Ce que vous n'avez pas à faire

- Pas de documentation technique détaillée Annexe XI complète (exemption open source).
- Pas de red teaming obligatoire (sous le seuil systémique).
- Pas d'enregistrement obligatoire dans la base UE (pas haut risque).

---

## Récapitulatif des obligations selon le cas

| Scénario | Documentation Annexe XI | Résumé données | Droit d'auteur | Red teaming |
|---|---|---|---|---|
| GPAI open source < 10²⁵ FLOPs | Allégée | ✅ Obligatoire | ✅ Obligatoire | ❌ Non |
| GPAI propriétaire < 10²⁵ FLOPs | ✅ Complète | ✅ Obligatoire | ✅ Obligatoire | ❌ Non |
| GPAI open source > 10²⁵ FLOPs | ✅ Complète | ✅ Obligatoire | ✅ Obligatoire | ✅ Obligatoire |

---

## Calendrier d'application

Les obligations GPAI (chapitre V, Art. 51-56) sont applicables depuis le **2 août 2025**. Les modèles déjà sur le marché avant cette date bénéficient d'une période de grâce jusqu'au **2 août 2027** (Art. 111 §3).

---

> Besoin d'une analyse précise de votre situation ? [Posez votre question au consultant CompliAI](/dashboard/chat) — réponses sourcées sur l'AI Act en moins de 30 secondes.
    `,
  },
  {
    slug: "nis2-directive-obligations-entreprises",
    title: "NIS2 : quelles obligations pour votre entreprise en 2025 ?",
    description:
      "La directive NIS2 (UE 2022/2555) impose de nouvelles obligations de cybersécurité aux entités essentielles et importantes. Guide complet : qui est concerné, quelles mesures, quelles sanctions ?",
    date: "2025-07-15",
    readMinutes: 8,
    tags: ["NIS2", "Cybersécurité", "Conformité", "RGPD"],
    author: "CompliAI",
    content: `
## Qu'est-ce que NIS2 ?

La **directive NIS2** (directive (UE) 2022/2555), qui a remplacé la directive NIS originale de 2016, est le cadre juridique européen de référence pour la cybersécurité des réseaux et systèmes d'information.

En France, elle a été transposée par la loi n° 2024-449 du 21 mai 2024. L'ANSSI est l'autorité compétente.

---

## Qui est concerné ? Les deux catégories

NIS2 distingue deux catégories d'entités soumises à des obligations différentes :

### Entités essentielles (EE)

Secteurs : énergie, transport, secteur bancaire, infrastructure des marchés financiers, santé, eau potable et eaux usées, infrastructure numérique (DNS, IXP, TLD, fournisseurs de cloud, CDN, data centers), gestion des services TIC, espace, administration publique centrale.

Critères de taille : **grande entreprise** (≥ 250 employés OU ≥ 50 M€ de CA OU ≥ 43 M€ de bilan).

### Entités importantes (EI)

Mêmes secteurs que les EE mais de taille moyenne (50-249 employés, 10-50 M€ de CA), **plus** : services postaux, gestion des déchets, fabrication (médical, pharma, aéronautique, défense, automobile, dispositifs médicaux), chimie, alimentation, fournisseurs numériques (places de marché en ligne, moteurs de recherche, réseaux sociaux).

### Qui peut être inclus par les États membres

Les États peuvent étendre NIS2 à des entités critiques plus petites (critère de criticité indépendant de la taille).

---

## Les 10 mesures minimales de cybersécurité (Art. 21 NIS2)

Toutes les entités soumises à NIS2 doivent mettre en œuvre des mesures proportionnées au niveau de risque :

1. **Politique de sécurité des systèmes d'information** — politique documentée et approuvée par la direction.
2. **Gestion des incidents** — procédure de détection, classification, réponse et reporting des incidents.
3. **Continuité d'activité** — plans de continuité et de reprise après sinistre (PCA/PRA).
4. **Sécurité de la chaîne d'approvisionnement** — évaluation des risques liés aux fournisseurs et prestataires.
5. **Sécurité dans le développement et la maintenance** — sécurité by design, gestion des vulnérabilités.
6. **Politiques et procédures d'évaluation de l'efficacité** — audit et mesure de l'efficacité des mesures.
7. **Pratiques d'hygiène numérique et formation** — sensibilisation des salariés, formations régulières.
8. **Politiques en matière de cryptographie** — utilisation adéquate du chiffrement.
9. **Sécurité des ressources humaines** — vérification des accès, processus de départ.
10. **Authentification multi-facteur (MFA)** — déploiement obligatoire pour les accès aux systèmes critiques.

---

## Obligations de notification des incidents (Art. 23 NIS2)

La notification des incidents significatifs suit un schéma en trois temps :

| Étape | Délai | Contenu |
|---|---|---|
| Alerte précoce | **24h** après détection | Nature de l'incident, soupçon d'acte illicite |
| Notification d'incident | **72h** après détection | Évaluation initiale, indicateurs de compromission |
| Rapport final | **1 mois** après notification | Analyse complète, mesures prises, impact |

---

## Gouvernance : responsabilité de la direction (Art. 20 NIS2)

NIS2 innove en imposant une **responsabilité personnelle des dirigeants** :
- Les organes de direction doivent approuver les mesures de gestion des risques.
- Ils peuvent être tenus **personnellement responsables** en cas de manquement.
- Obligation de formation régulière des dirigeants en cybersécurité.

C'est un changement majeur par rapport à NIS1 : la cybersécurité n'est plus uniquement une question technique mais une responsabilité de gouvernance.

---

## Sanctions NIS2

Les sanctions maximales diffèrent selon la catégorie :

- **Entités essentielles** : jusqu'à **10 000 000 EUR** ou **2% du chiffre d'affaires mondial** (le montant le plus élevé).
- **Entités importantes** : jusqu'à **7 000 000 EUR** ou **1,4% du chiffre d'affaires mondial**.

En cas d'incident grave, les autorités peuvent imposer des mesures temporaires (suspension de certifications, restrictions d'activité).

---

## NIS2 et RGPD : articulation

NIS2 et le RGPD se renforcent mutuellement sur la protection des données :
- Un incident de sécurité affectant des données personnelles déclenche **à la fois** une notification NIS2 (ANSSI, 24h) et une notification RGPD (CNIL, 72h).
- La politique de sécurité NIS2 doit intégrer les exigences RGPD (Art. 32).
- Le DPO doit être impliqué dans la gestion des incidents cyber.

---

## Comment se préparer ?

### Étape 1 — Vérifier si vous êtes concerné

Identifiez si votre organisation entre dans les secteurs et critères de taille NIS2. Les PME du secteur numérique sont souvent surprises d'être dans le périmètre.

### Étape 2 — Réaliser un audit de gap NIS2

Évaluez votre maturité cybersécurité par rapport aux 10 mesures Art. 21. Identifiez les lacunes prioritaires.

### Étape 3 — Mettre en place la gouvernance

Impliquez la direction dès maintenant — NIS2 impose leur engagement personnel. Désignez un responsable NIS2 (souvent le RSSI).

### Étape 4 — Documenter et tester

Rédigez les politiques de sécurité, les plans de continuité, les procédures d'incident. Testez-les avec des exercices réguliers.

> **Outil** : [checklist NIS2 + RGPD de CompliAI](/dashboard/tools/checklist) — évaluez votre conformité NIS2 et RGPD en une seule analyse.
    `,
  },
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
