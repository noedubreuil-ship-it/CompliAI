/**
 * Synthèses courtes pour le domaine `national_case_law` dans `national_legal_texts`.
 * Les URLs préférées : domaines allowlist ; sinon `urn:complai:…` jusqu’à branchement d’extraits officiels.
 */

export type { NationalCaseLawSeed } from "./national-case-law-seed-type";

import type { NationalCaseLawSeed } from "./national-case-law-seed-type";
import { NATIONAL_CASE_LAW_SEEDS_EXTRA } from "./national-case-law-extended";
import { CNIL_CASE_LAW_SEEDS } from "./national-case-law-cnil";

const NATIONAL_CASE_LAW_SEEDS_CORE: NationalCaseLawSeed[] = [
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — sanctions Amazon Europe Core (cookies / information)",
    reference_line: "Décision de sanction publiée par la CNIL juillet 2021 (montants et numéro dans l’acte officiel)",
    source_url: "https://www.cnil.fr/fr/amazon-europe-core-la-cnil-met-une-amende-de-35-millions-deuros",
    language: "fr",
    court: "CNIL",
    body: `La CNIL a sanctionné AMAZON EUROPE CORE au motif d’insuffisances information et de mise en œuvre consentement / refus concernant le dépôt de cookies et traceurs publicitaires sur amazon.fr lorsque ceux-ci excédaient les seuls besoins strictement nécessaires au service sollicité au sens du droit européen applicable (ePrivacy / lecture croisée RGPD sur l’information préalable et le caractère facultatif des traceurs non indispensables).

Synthèse exploitable en conformité produit : granularité des choix, bouton de refus aussi simple que l’acceptation, informations sur finalités et destinataires avant dépôt, traçabilité des preuves de consentement.`,
  },
  {
    country_code: "FR",
    country_name: "France",
    title: "CNIL — Google LLC (transparence informations et consentement hors application mobile)",
    reference_line: "Décision de sanction publiée par la CNIL 2019 ; vérifier citations chiffrées sur le texte officiel",
    source_url: "https://www.cnil.fr/fr/cnil-impose-google-une-amende-de-50-millions-deuros-au-titre-du-rgpd",
    language: "fr",
    court: "CNIL",
    judgment_date: "2019-01-21",
    body: `Synthèse (ne pas invoquer hors base sans relecture de l’acte) :

La CNIL a reproché notamment défaut caractère transparent aisément accessible informations obligations information art.13/14 RGPD et absence base légale valable pour traitements annonces personnalisées impliquant combinaisons données géolocalisations multi-services.

Principes transposables : cohérence interfaces mobile / web, information couche par couche, documentation base légale marketing personnalisé.`,
  },
  {
    country_code: "DE",
    country_name: "Allemagne",
    title: "ULD Hambourg — 1&1 Telecommunications (authentification service client)",
    reference_line: "Communiqué ULD Hambourg 2020 — amende et obligations correctrices (se référer au texte allemand)",
    source_url:
      "https://www.datenschutz-hamburg.de/pressemitteilungen/2020/03/uld-verhaengt-bussgeld-in-hoehe-von-eine-million-euro",
    language: "fr",
    court: "ULD Hamburg",
    body: `L’autorité de Hambourg a sanctionné 1&1 pour avoir permis à des tiers d’obtenir des données d’abonnés via le service client téléphonique sans mécanismes d’authentification suffisants.

Enseignement conformité : procédures téléphoniques proportionnées, vérification identité renforcée avant divulgation coordonnées ou profils, documentation risques accès abusifs.`,
  },
  {
    country_code: "NL",
    country_name: "Pays-Bas",
    title: "AP — Uber B.V. (droits des personnes & transparence traitements chauffeurs)",
    reference_line: "Sanction Dutch DPA contre Uber ; se référer au dossier officiel AP",
    source_url: "https://www.autoriteitpersoonsgegevens.nl/actueel/uber-moet-boete-betalen-voor-gebrekkige-duiding-van-gegevensverwerking-en-niet-geven-van-ingezien-gegevens",
    language: "fr",
    court: "Autoriteit Persoonsgegevens",
    body: `Synthèse : l’Autorité néerlandaise a reproché des retards répétés et des réponses lacunaires lors de l’exercice des droits d’accès par des chauffeurs, ainsi qu’une information insuffisante sur les transferts et la durée de conservation des dossiers liés aux comptes.

Principes : délais RGPD arts 12–15, qualité réponse dossiers drivers plateformes, documentation transferts hors UE.`,
  },
];

export const NATIONAL_CASE_LAW_SEEDS: NationalCaseLawSeed[] = [
  ...NATIONAL_CASE_LAW_SEEDS_CORE,
  ...CNIL_CASE_LAW_SEEDS,
  ...NATIONAL_CASE_LAW_SEEDS_EXTRA,
];
