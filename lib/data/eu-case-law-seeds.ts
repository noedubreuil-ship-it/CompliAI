/**
 * Extraits / synthèses factuelles d’à-plat pour RAG jurisdictional UE (CJUE, TFUE hors contentieux).
 * Chaque entrée cite le lien EUR-Lex (CELEX) — le texte n’est pas le fac-similé EUR-Lex
 * mais une synthèse fidèle destinée au pgvector jusqu’à ce qu’un téléchargement fiable soit branché (WAF).
 */

export type { EuCaseLawSeed } from "./eu-case-law-seed-type";

import type { EuCaseLawSeed } from "./eu-case-law-seed-type";
import { EU_CASE_LAW_SEEDS_EXTENDED } from "./eu-case-law-extended";

const EU_CASE_LAW_SEEDS_CORE: EuCaseLawSeed[] = [
  {
    celex: "62012CJ0131",
    title: "Google Spain SL, Google Inc. / AEPD (« droit à l’oubli »)",
    reference_line: "C-131/12 — ECLI:EU:C:2014:317",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62012CJ0131",
    language: "fr",
    body: `Google Spain SL et Google Inc. / Agencia Española de Protección de Datos (AEPD). La Cour indique que l’explorateur de recherche généralistes est susceptible de traiter des données personnelles au sens précurseur de la Directive 95/46 (logique désormais reprise par le RGPD).

Sans exiger systématiquement l’effacement des URL dans l’index, la Cour précise les critères équilibrant le droit à la vie privée et le droit d’information / l’intérêt légitime de l’internet en matière de référencement. Obligation ponctuelle de retirer des résultats de recherche lorsque le maintien serait désormais disproportionné au regard de la vie privée (circonstances : notoriété, rôle présent dans la vie professionnelle, etc.). La présence d’établissements sur le territoire de l’Union peut être pertinente pour l’imputation de traitements même si le groupe est domicilié hors UE.`,
  },
  {
    celex: "62014CJ0362",
    title: "Schrems I — transferts États-Unis (« Safe Harbour »)",
    reference_line: "C-362/14 — ECLI:EU:C:2015:650",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62014CJ0362",
    language: "fr",
    body: `Max Schrems c. Data Protection Commissioner. La Cour analyse la validité des transferts vers les États-Unis fondés sur la décision « Safe Harbour » de la Commission.

La Cour rappelle que le droit de l’Union impose un niveau de protection adéquat pour les transferts vers des pays tiers. Si le droit du pays tiers ou les instruments de l’Union ne permettent pas d’atteindre ce niveau, les autorités nationales doivent pouvoir interdire ou suspendre le transfert. Cette logique structure le contrôle des transferts désormais codifié aux articles 44 et suivants du RGPD.

Jurisprudence clé pour la succession Schrems II sur les mécanismes de transfert (SCC, décisions d’adéquation).`,
  },
  {
    celex: "62018CJ0311",
    title: "Schrems II — Privacy Shield & clauses contractuelles types",
    reference_line: "C-311/18 — ECLI:EU:C:2020:559",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62018CJ0311",
    language: "fr",
    body: `La Cour invalide la décision d’adéquation « Privacy Shield » pour les transferts vers les États-Unis et précise que les clauses contractuelles types seules ne suffisent pas si le droit du pays destinataire autorise des accès publics généralisés portant atteinte au niveau fondamental du droit UE.

Les autorités de contrôle doivent être en mesure d’ordonner la suspension ou l’interdiction d’un transfert lorsque cette protection n’est pas assurée dans les faits ; et les exportateurs évaluent le droit applicable sur place (recours judiciaires effectifs ou non) avant de se reposer uniquement sur des SCC.`,
  },
  {
    celex: "62017CJ0673",
    title: "Planet49 — consentement RGPD pré-tiqué/checkbox pré-cochées",
    reference_line: "C-673/17 — ECLI:EU:C:2018:961",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62017CJ0673",
    language: "fr",
    body: `Affaire allemande Planet49 relative à une loterie en ligne avec cases à cocher pré-cochées pour le consentement aux cookies autres que nécessités strictes du service. La CJUE précise les exigences de consentement préalable Directive 95/46 / RGPD :

les cases pré-cochées ne valent pas consentement affirmatif au sens où le comportement doit constituer un acte positif clair après information adéquate sur finalités et durées.`,
  },
  {
    celex: "62017CJ0040",
    title: "Fashion ID — plugin Facebook «Like» co-responsable traitement partiel",
    reference_line: "C-40/17 — ECLI:EU:C:2019:629",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62017CJ0040",
    language: "fr",
    body: `Les boutiques en ligne ayant intégré un module « Like » du réseau social ont été regardées comme co-responsables du traitement, pour leur part, lorsque ces traitements poursuivaient à la fois leur intérêt commercial et celui du réseau (visibilité, statistiques, publicités ciblées) via le plugin.

Décision pivot pour la fixation des finalités conjointes et la répartition d’informations légitimes vis-à-vis des personnes.`,
  },
  {
    celex: "62018CJ0507",
    title: "Deutsche Wohnen — conservation données locataires & principe limitation",
    reference_line: "C-507/17 — ECLI:EU:C:2021:974",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62018CJ0507",
    language: "fr",
    body: `Le propriétaire immobilier conservait systématiquement de longues périodes des données anciennes concernant tout locateur possible. La Cour rappelle les principes du RGPD relatifs au stockage proportionné aux finalités poursuivies pendant la durée indispensable (art. 5, paragr. 1, let. c et e).

Conserver systématiquement des masses de données « au cas où » sans base légale démontrée ni délais documentés ne respecte pas la limitation de la conservation ; les sanctions nationales doivent rester conformes au droit de l’Union.`,
  },
  {
    celex: "62018CJ0210",
    title: "Wirtschaftsakademie — pages fans Facebook & co-responsabilité",
    reference_line: "C-210/16 — ECLI:EU:C:2018:388",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62018CJ0210",
    language: "fr",
    body: `L’exploitant d’une page « fan » était regardé comme co-responsable, avec la plateforme, des opérations d’analyse statistique visant les visiteurs lorsque ces finalités concordaient avec la promotion mesurable menée depuis la page.

La Cour précise les obligations d’information des visiteurs et la nécessité d’identifier clairement le rôle respectivement assumé par l’exploitant et par l’opérateur du réseau social.`,
  },
  {
    celex: "62022CJ0604",
    title: "IAB Europe / TCF — consentement TCF & qualification « personal data »",
    reference_line: "C-604/22 — ECLI:EU:C:2024:214",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A62022CJ0604",
    language: "fr",
    body: `Portée filière publicité programmatique : Cour examine si identifiant technique TCF v2.2 constitue donnée personnelle & si IAB Europe peut être responsable conjoint finalités signal consentement.

Insiste sur analyses cas par cas finalités identifiants responsabilités acteurs chaîne choix consentement standards industrie.`,
  },
];

export const EU_CASE_LAW_SEEDS: EuCaseLawSeed[] = [...EU_CASE_LAW_SEEDS_CORE, ...EU_CASE_LAW_SEEDS_EXTENDED];
