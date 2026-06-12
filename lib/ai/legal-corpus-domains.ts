/**
 * Valeurs du champ `national_legal_texts.domain` pour router le RAG consultant.
 *
 * Ingestion : utiliser ingestPlainNationalDocument({ domain: …, … }) depuis un script
 * ou pipeline (EUR-Lex / CURIA, portails nationaux, etc.).
 */
export const CORPUS_DOMAIN_NATURAL_STATUTE = "rgpd_nat";

/** CJUE / TJUE / tribunal général — textes officiels téléchargés / citables. */
export const CORPUS_DOMAIN_EU_CASE_LAW = "eu_case_law";

/** Jugements cours suprêmes, administratif, constitutionnel selon État membre. */
export const CORPUS_DOMAIN_NATIONAL_CASE_LAW = "national_case_law";

/** Cadres ISO, NIST AI RMF, principes OCDE, etc. (country_code = EU). */
export const CORPUS_DOMAIN_INTL_STANDARDS = "intl_standards";

/** ICO et doctrine UK GDPR post-Brexit (country_code = GB). */
export const CORPUS_DOMAIN_UK_REGULATOR = "uk_regulator";

/** Code pays synthétique pour les lignes d’indices « Union européenne » dans la même table (ISO-style 2 lettres). */
export const CORPUS_COUNTRY_CODE_EU = "EU";

export const CORPUS_COUNTRY_NAME_EU = "Union européenne";

export const CORPUS_COUNTRY_CODE_GB = "GB";

export const CORPUS_COUNTRY_NAME_GB = "Royaume-Uni";
