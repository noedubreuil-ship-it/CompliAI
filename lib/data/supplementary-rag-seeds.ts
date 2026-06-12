/**
 * Corpus complémentaire RAG (hors UE-27 strict) : ICO, normes IA internationales, renfort AEPD.
 * Synthèses pédagogiques — à remplacer progressivement par extraits officiels indexés.
 */

import {
  CORPUS_COUNTRY_CODE_EU,
  CORPUS_COUNTRY_NAME_EU,
  CORPUS_COUNTRY_CODE_GB,
  CORPUS_COUNTRY_NAME_GB,
  CORPUS_DOMAIN_INTL_STANDARDS,
  CORPUS_DOMAIN_NATIONAL_CASE_LAW,
  CORPUS_DOMAIN_UK_REGULATOR,
} from "@/lib/ai/legal-corpus-domains";

export interface SupplementaryRagSeed {
  country_code: string;
  country_name: string;
  domain: string;
  text_type: string;
  title: string;
  reference_line: string;
  source_url: string;
  language: string;
  body: string;
  court?: string | null;
}

export const SUPPLEMENTARY_RAG_SEEDS: SupplementaryRagSeed[] = [
  {
    country_code: CORPUS_COUNTRY_CODE_GB,
    country_name: CORPUS_COUNTRY_NAME_GB,
    domain: CORPUS_DOMAIN_UK_REGULATOR,
    text_type: "uk_regulator_guidance",
    title: "ICO — thèmes d’application UK GDPR & PECR",
    reference_line: "Synthèse doctrine publique ICO (enforcement & guidance)",
    source_url: "urn:complai:uk_regulator:ico:uk-gdpr-enforcement-themes",
    language: "fr",
    court: "Information Commissioner’s Office",
    body: `L’ICO (Royaume-Uni) applique le UK GDPR et le PECR après le retrait du Royaume-Uni de l’Union. Les décisions publiques et lignes directrices récurrentes portent sur : transparence des notices (art. 13/14 équivalents), bases légales documentées pour le marketing direct, durées de conservation proportionnées, sécurité technique et organisationnelle (chiffrement, accès restreints, journalisation), et réponse aux droits des personnes dans les délais (souvent un mois, extensible si complexité).

Pour les transferts internationaux post-Brexit, l’ICO rappelle l’évaluation du régime du pays tiers, les clauses contractuelles types UK et le recours au mécanisme d’adéquation ou aux dérogations encadrées. Les amendes publiques soulignent souvent l’absence de DPIA pour profilage à risque, les cookies non essentiels sans consentement valide, et les violations de notification de breach sous 72 h lorsque le risque pour les personnes est élevé.

En pratique produit : privacy notice lisible, registre des activités, DPO ou point de contact documenté, procédure DSAR testée, et preuve de consentement granulaire pour traceurs publicitaires.`,
  },
  {
    country_code: CORPUS_COUNTRY_CODE_GB,
    country_name: CORPUS_COUNTRY_NAME_GB,
    domain: CORPUS_DOMAIN_UK_REGULATOR,
    text_type: "uk_regulator_guidance",
    title: "ICO — IA, profilage et décisions automatisées",
    reference_line: "Guidance ICO AI & data protection (synthèse)",
    source_url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/",
    language: "fr",
    court: "ICO",
    body: `L’ICO encadre l’usage de l’IA sous l’angle protection des données : finalité claire, minimisation, exactitude des données d’entraînement et d’inférence, limitation de la conservation, et information sur la logique significative lorsque des décisions automatisées produisent des effets juridiques ou similaires (art. 22 UK GDPR).

Les organisations doivent réaliser des DPIA lorsque le traitement est susceptible d’engendrer un risque élevé (scoring, surveillance, données sensibles, profilage systématique). L’ICO recommande des revues d’impact IA distinctes croisant éthique, discrimination et transparence algorithmique. Pour les modèles génératifs : ne pas réutiliser des données personnelles sans base légale, filtrer les sorties, et documenter les fournisseurs cloud (sous-traitants) avec clauses art. 28.

Points de contrôle : human-in-the-loop pour décisions sensibles, tests de biais, registre des versions de modèle, et communication claire aux personnes concernées sur les limites du système.`,
  },
  {
    country_code: "ES",
    country_name: "Espagne",
    domain: CORPUS_DOMAIN_NATIONAL_CASE_LAW,
    text_type: "national_judgment_seed",
    title: "AEPD — IA générative, bases légales et DPIA (renfort)",
    reference_line: "Thématiques publiques Agencia Española de Protección de Datos",
    source_url: "urn:complai:national_case_law:ES:aepd-ai-generative-themes",
    language: "fr",
    court: "AEPD",
    body: `L’AEPD a publié des orientations sur l’IA générative et les grands modèles : interdiction de traiter des données personnelles dans les prompts sans base légale, vigilance sur les données sensibles et sur les mineurs, et nécessité d’informer sur l’usage de systèmes automatisés lorsque les personnes interagissent avec un chatbot ou un assistant.

Les sanctions récentes rappellent le défaut de DPIA pour campagnes de vidéosurveillance analytique, l’usage de cookies tiers sans consentement valide, et les transferts vers prestataires américains sans analyse complémentaire post-Schrems II. Pour les employeurs : bases légales spécifiques pour contrôle du temps de travail et géolocalisation, accords avec les représentants du personnel selon le droit du travail espagnol.

Checklist conformité Espagne : registre RoPA à jour, délégué ou contact DPO identifié, procédures d’exercice des droits en castillan (et langues co-officielles si pertinent), et documentation des mesures techniques pour l’IA à haut risque en anticipation de l’AI Act.`,
  },
  {
    country_code: CORPUS_COUNTRY_CODE_EU,
    country_name: CORPUS_COUNTRY_NAME_EU,
    domain: CORPUS_DOMAIN_INTL_STANDARDS,
    text_type: "intl_standard_summary",
    title: "ISO/IEC 42001:2023 — Système de management de l’IA",
    reference_line: "Norme ISO management IA (synthèse non officielle)",
    source_url: "https://www.iso.org/standard/81230.html",
    language: "fr",
    body: `ISO/IEC 42001:2023 définit les exigences d’un système de management de l’intelligence artificielle (AIMS) pour les organisations qui conçoivent, développent, fournissent ou utilisent des systèmes d’IA. Elle s’articule autour du cycle PDCA (Plan-Do-Check-Act) et complète l’AI Act européen sur le plan opérationnel (gouvernance, risques, amélioration continue).

Domaines clés : politique IA alignée sur la stratégie ; identification des parties intéressées ; évaluation des impacts (éthique, sécurité, droits fondamentaux) ; objectifs mesurables ; gestion des données pour l’IA (qualité, provenance, biais) ; cycle de vie du système (conception, validation, déploiement, retrait) ; surveillance post-déploiement et gestion des incidents ; compétences et sensibilisation ; audit interne et revue de direction.

La certification ISO 42001 est souvent demandée par les acheteurs enterprise et les appels d’offres publics. Elle ne remplace pas les obligations légales RGPD/AI Act mais fournit une structure auditable. Articulation typique : AI Act pour conformité réglementaire, ISO 42001 pour management système, ISO 27001 pour sécurité de l’information.`,
  },
  {
    country_code: CORPUS_COUNTRY_CODE_EU,
    country_name: CORPUS_COUNTRY_NAME_EU,
    domain: CORPUS_DOMAIN_INTL_STANDARDS,
    text_type: "intl_standard_summary",
    title: "NIST AI Risk Management Framework (AI RMF 1.0)",
    reference_line: "NIST AI RMF — GOVERN, MAP, MEASURE, MANAGE",
    source_url: "https://www.nist.gov/itl/ai-risk-management-framework",
    language: "fr",
    body: `Le NIST AI Risk Management Framework (janvier 2023) propose un cadre volontaire pour gérer les risques liés aux systèmes d’IA tout au long de leur cycle de vie. Quatre fonctions : GOVERN (culture, politiques, responsabilités), MAP (contexte, catégorisation des risques, impacts), MEASURE (métriques, tests, évaluation continue), MANAGE (priorisation, atténuation, réponse aux incidents).

Le profil « Generative AI » (NIST, 2024) complète le RMF pour les LLM : contenu toxique ou trompeur, fuite de données d’entraînement, propriété intellectuelle, et confiance des utilisateurs. Les entreprises européennes l’utilisent souvent pour les filiales US ou les audits fournisseurs cloud américains.

Alignement AI Act : GOVERN ↔ gouvernance et documentation ; MAP ↔ classification des risques et DPIA ; MEASURE ↔ évaluation et surveillance post-marché pour systèmes à haut risque ; MANAGE ↔ mesures correctives et retrait. Le RMF n’est pas une loi mais un référentiel très cité dans les chartes IA internes et les due diligence investisseurs.`,
  },
  {
    country_code: CORPUS_COUNTRY_CODE_EU,
    country_name: CORPUS_COUNTRY_NAME_EU,
    domain: CORPUS_DOMAIN_INTL_STANDARDS,
    text_type: "intl_standard_summary",
    title: "OCDE — Principes sur l’IA (2019, mise à jour)",
    reference_line: "Recommandation du Conseil OCDE sur l’IA",
    source_url: "https://www.oecd.org/digital/artificial-intelligence/",
    language: "fr",
    body: `Les Principes de l’OCDE sur l’IA (adoptés par plus de 40 juridictions) structurent une politique publique et une gouvernance d’entreprise cohérente : croissance inclusive, bien-être humain, valeurs démocratiques, équité et diversité, transparence et explicabilité, robustesse et sécurité, et responsabilité des acteurs.

Ils insistent sur l’investissement en recherche, l’infrastructure de données de confiance, la formation des compétences, et la coopération internationale. Pour les entreprises, ils servent de base aux chartes éthiques IA et aux clauses contractuelles avec les fournisseurs de modèles.

Lien avec l’AI Act : les principes OCDE préfigurent les exigences de transparence, supervision humaine et gestion des risques systémiques. En conformité produit, documenter comment chaque principe est traduit en contrôles techniques (logs, revue humaine, tests de biais) facilite les dialogues avec les autorités et les clients enterprise.`,
  },
  {
    country_code: CORPUS_COUNTRY_CODE_EU,
    country_name: CORPUS_COUNTRY_NAME_EU,
    domain: CORPUS_DOMAIN_INTL_STANDARDS,
    text_type: "intl_standard_summary",
    title: "CURIA — recherche jurisprudence UE (guide d’usage)",
    reference_line: "Portail CURIA — Cour de justice et tribunaux UE",
    source_url: "https://curia.europa.eu/",
    language: "fr",
    body: `CURIA est le portail public de jurisprudence de l’Union : arrêts de la Cour de justice (CJUE), du Tribunal (TJUE) et du Tribunal de la fonction publique, avec recherche par numéro d’affaire, ECLI, parties, et mots-clés. Les décisions en matière de protection des données (Google Spain, Schrems, Fashion ID, Meta publicité) fixent l’interprétation du RGPD et des transferts internationaux.

Pour le RAG consultant : privilégier les citations ECLI et les liens EUR-Lex CELEX ; distinguer arrêt de principe et ordonnance ; vérifier la langue de procédure (FR/EN/DE). Les questions « droit à l’oubli », « transferts USA », « consentement cookies », « responsable conjoint » s’appuient sur cette jurisprudence avant la transposition nationale.

Bonnes pratiques recherche : combiner thème (données personnelles, IA, commerce électronique) et institution ; croiser avec le registre EDPB pour les lignes directrices post-arrêt ; ne pas confondre avis de l’Avocat général et arrêt définitif tant que la Cour n’a pas statué.`,
  },
];
