/**
 * Décisions CNIL indexées pour le RAG (domaine national_case_law).
 * URLs cnil.fr — vérifier numéros SAN sur l’acte officiel avant citation client.
 */

import type { NationalCaseLawSeed } from "./national-case-law-seed-type";

export const CNIL_CASE_LAW_SEEDS: NationalCaseLawSeed[] = [
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — Dedalus Biologie (sous-traitant santé, sécurité et art. 28 RGPD)",
    reference_line:
      "Formation restreinte, avril 2022 — amende 1,5 M€ ; vérifier SAN et libellé sur cnil.fr",
    source_url:
      "https://www.cnil.fr/fr/la-cnil-sanctionne-dedalus-biologie-dune-amende-de-15-million-deuros",
    language: "fr",
    court: "CNIL — formation restreinte",
    judgment_date: "2022-04-15",
    body: `La CNIL a sanctionné Dedalus Biologie, éditeur de logiciels de biologie médicale agissant comme sous-traitant pour des laboratoires, d'une amende de 1,5 million d'euros.

Manquements reprochés (synthèse pour conformité SaaS santé) : défaut de mesures techniques et organisationnelles appropriées au sens de l'article 32 du RGPD (exposition de données de santé via une interface non sécurisée, absence de contrôle d'accès robuste) ; insuffisances dans l'encadrement contractuel de la sous-traitance (article 28 du RGPD) — clauses et garanties attendues entre responsable de traitement laboratoire et éditeur.

Enseignements opérationnels pour un éditeur SaaS B2B : DPA aligné art. 28 § 3 ; registre des sous-traitants ultérieurs ; procédure de notification de violation vers le responsable ; tests de sécurité et gestion des identifiants ; segmentation des environnements ; journalisation des accès aux données de santé.

Citer l'acte officiel CNIL pour tout numéro de délibération SAN et le détail des articles sanctionnés.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — Discord Inc. (sécurité des comptes, art. 32 RGPD)",
    reference_line: "Formation restreinte, décembre 2022 — vérifier montant sur cnil.fr",
    source_url: "https://www.cnil.fr/fr/discord-la-cnil-sanctionne-la-plateforme-dune-amende-de-800000-euros",
    language: "fr",
    court: "CNIL — formation restreinte",
    judgment_date: "2022-12-31",
    body: `La CNIL a sanctionné Discord Inc. pour manquement à l'article 32 du RGPD relatif à la sécurité des données à caractère personnel.

Faits retenus (synthèse) : absence de politique de mots de passe suffisamment robuste ; absence de verrouillage de compte après tentatives de connexion infructueuses répétées ; exposition à des risques d'accès non autorisé aux comptes utilisateurs.

Transposition pour éditeurs SaaS et plateformes : exiger MFA lorsque approprié, politique de complexité des mots de passe, limitation des tentatives, alertes sur activités suspectes, documentation des mesures TOM dans le registre et les contrats sous-traitants.

Ne pas attribuer de numéro SAN sans consultation de la délibération publiée.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — Criteo (publicité programmatique, licéité et transparence)",
    reference_line: "Formation restreinte, juin 2023 — amende 40 M€ ; vérifier acte officiel",
    source_url: "https://www.cnil.fr/fr/cnil-sanctionne-criteo-dune-amende-de-40-millions-deuros",
    language: "fr",
    court: "CNIL — formation restreinte",
    judgment_date: "2023-06-15",
    body: `La CNIL a prononcé une amende de 40 millions d'euros à l'encontre de Criteo pour des manquements au RGPD dans le cadre de la publicité ciblée et du profilage.

Thèmes utiles pour le consultant (sans préjuger du dispositif exact de la décision) : base légale et consentement pour le profilage publicitaire ; information des personnes sur la logique de traitement ; exercice du droit d'opposition ; conservation des données ; coopération avec l'autorité.

Illustration de l'ampleur des sanctions pour acteurs numériques à grande échelle. Toujours vérifier les articles RGPD précisément retenus sur cnil.fr avant citation en dossier.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — mise en demeure registre des traitements (art. 30 RGPD)",
    reference_line: "MED-2022-111, novembre 2022 — registre obligatoire sous-traitant/responsable",
    source_url: "https://www.cnil.fr/fr/registre-des-activites-de-traitement-la-cnil-rappelle-lobligation-de-tenir",
    language: "fr",
    court: "CNIL",
    judgment_date: "2022-11-15",
    body: `La CNIL a rappelé par mise en demeure le caractère obligatoire du registre des activités de traitement prévu à l'article 30 du RGPD, tant pour les responsables de traitement que pour les sous-traitants (registre des catégories de traitements effectués pour le compte des clients).

Contenu attendu : nom et coordonnées du responsable et du DPO le cas échéant ; finalités ; catégories de personnes et de données ; destinataires ; transferts hors UE ; délais de conservation ; mesures de sécurité générales.

Pour un éditeur SaaS B2B : tenir un registre sous-traitant distinct du registre « propres finalités » (facturation, RH, marketing).`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — Google (contrats sous-traitance et chaîne cloud, art. 28)",
    reference_line: "Formation restreinte, janvier 2021 — vérifier SAN-2021-003 sur cnil.fr",
    source_url:
      "https://www.cnil.fr/fr/cookies-la-cnil-sanctionne-google-llc-et-google-ireland-limited-dune-amende-totale-de-150-millions",
    language: "fr",
    court: "CNIL — formation restreinte",
    judgment_date: "2021-01-12",
    body: `La CNIL a sanctionné Google LLC et Google Ireland Limited notamment pour des manquements relatifs aux cookies et à l'information préalable (ePrivacy / RGPD). La formation restreinte a également souligné, dans le contexte des relations avec les sous-traitants et la chaîne d'approvisionnement cloud, l'importance des clauses contractuelles conformes à l'article 28 du RGPD.

Pour les éditeurs SaaS : ne pas confondre cette décision (cookies / information) avec une jurisprudence générale sur tous les aspects de l'art. 28 ; mobiliser cette référence uniquement pour les enjeux effectivement tranchés (information traceurs, bases légales publicitaires, gouvernance groupe).

Toujours croiser avec la délibération publiée pour les motifs exacts et le numéro SAN.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — Sergic (sous-traitant immobilier, sécurité art. 32)",
    reference_line:
      "Formation restreinte, mai 2019 — vérifier numéro SAN et montant sur cnil.fr",
    source_url: "https://www.cnil.fr/fr/sergic-sanctionne-dune-amende-de-400000-euros",
    language: "fr",
    court: "CNIL — formation restreinte",
    judgment_date: "2019-05-28",
    body: `La CNIL a sanctionné Sergic, prestataire traitant des données pour le compte d'acteurs immobiliers, pour manquements à la sécurité des données (article 32 du RGPD).

Enseignement clé pour la qualification sous-traitant : l'entité qui traite pour le compte de responsables de traitement sans déterminer les finalités reste soumise aux obligations propres du sous-traitant, notamment des mesures techniques et organisationnelles adaptées au risque. La responsabilité propre du sous-traitant en matière de sécurité est distincte des obligations contractuelles envers le responsable.

Pour un éditeur SaaS B2B : ne pas se limiter aux clauses DPA — mettre en œuvre effectivement chiffrement, contrôle d'accès, journalisation et tests. Citer l'acte officiel pour le numéro SAN exact.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — délibération 2019-001 (règlement type biométrie au travail)",
    reference_line: "Délibération n° 2019-001 du 10 janvier 2019 — norme, pas sanction",
    source_url:
      "https://www.cnil.fr/fr/authentification-par-reconnaissance-biometrique-la-cnil-adopte-un-reglement-type",
    language: "fr",
    court: "CNIL — délibération normative",
    judgment_date: "2019-01-10",
    body: `La CNIL a adopté le 10 janvier 2019 un règlement type relatif aux dispositifs de contrôle d'accès par authentification biométrique aux locaux, appareils et applications informatiques sur les lieux de travail (délibération n° 2019-001).

Obligations types pour responsables et sous-traitants déployant la solution : finalité encadrée (sécurité accès, pointage si prévu) ; proportionnalité ; information des salariés ; durée de conservation des templates biométriques ; sécurité renforcée ; clauses contractuelles avec le fournisseur biométrique.

Distinction essentielle : délibération normative (règlement type), distincte des sanctions SAN prononcées par la formation restreinte.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — guide sous-traitance et contrats art. 28 RGPD (synthèse)",
    reference_line: "Lignes directrices CNIL — relations responsable / sous-traitant",
    source_url: "urn:complai:national_case_law:FR:cnil-guide-sous-traitance-art28",
    language: "fr",
    court: "CNIL",
    body: `Guide CNIL sur la sous-traitance au sens de l'article 28 du RGPD — synthèse pour éditeurs SaaS B2B.

Qualification : le sous-traitant traite des données pour le compte du responsable, sur instruction documentée. L'éditeur SaaS est en principe sous-traitant lorsque le client entreprise fixe les finalités (CRM, RH, comptabilité). Il devient responsable pour ses propres finalités (facturation, prospection, analytics).

Contrat écrit obligatoire (art. 28 § 3) : objet et durée ; nature et finalité ; types de données et catégories de personnes ; obligations et droits du responsable ; instructions documentées ; confidentialité ; mesures art. 32 ; sous-traitance ultérieure avec autorisation préalable générale ou spécifique ; assistance droits des personnes et DPIA ; suppression ou restitution en fin de contrat ; audits et informations.

Registre sous-traitant (art. 30 § 2) : catégories de traitements effectués pour le compte de chaque responsable — distinct du registre « propres finalités ».

Notification violation (art. 33 § 2) : informer le responsable sans retard indu pour permettre notification CNIL sous 72 h si requis.

Sous-traitants ultérieurs : liste contractuelle, droit d'opposition du responsable, flux documenté (chaîne cloud US : SCC + analyse Schrems II).

Points de contrôle CNIL récurrents : clauses copiées sans adaptation ; absence de preuve d'instructions ; mesures de sécurité insuffisantes pour le risque ; défaut de traçabilité des accès. Ne pas citer de numéro SAN dans ce guide — il s'agit de doctrine, pas d'une sanction.`,
  },
];
