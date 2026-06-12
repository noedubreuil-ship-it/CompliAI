/**
 * Synthèses nationales lorsque le fetch HTTPS échoue (Cloudflare, JS-only, etc.).
 * Domaine rgpd_nat — à remplacer par texte officiel dès qu'un miroir fetchable existe.
 */

import { applyEnrichedFallbackBodies } from "./national-statute-fallback-enriched-bodies";

export interface NationalStatuteFallbackSeed {
  country_code: string;
  country_name: string;
  title: string;
  reference_line: string;
  source_url: string;
  language: string;
  body: string;
}

const NATIONAL_STATUTE_FALLBACK_SEEDS_CORE: NationalStatuteFallbackSeed[] = [
  {
    country_code: "FR",
    country_name: "France",
    title: "Loi Informatique et Libertés (LIL) — synthèse transposition RGPD",
    reference_line: "Loi n° 78-17 modifiée par loi n° 2018-493 du 20 juin 2018",
    source_url: "urn:complai:rgpd_nat:FR:lil-synthesis",
    language: "fr",
    body: `La loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés (LIL), modifiée notamment par la loi n° 2018-493 du 20 juin 2018, assure la mise en œuvre nationale du RGPD et comporte des dispositions complémentaires là où le règlement renvoie au droit national.

Champ d'application : la LIL s'applique aux traitements effectués dans le cadre d'une activité d'établissement sur le territoire français ou visant des personnes situées en France, en complément de l'article 3 du RGPD. L'article 3 de la LIL reprend les critères territoriaux.

Principes fondamentaux : finalité déterminée, licéité, loyauté, transparence, minimisation, exactitude, limitation de conservation, intégrité et confidentialité. Le responsable de traitement doit pouvoir démontrer le respect de ces principes (accountability).

Qualification SaaS B2B : dans le modèle classique, l'éditeur SaaS agit en qualité de sous-traitant au sens de l'article 4 point 8 du RGPD et de l'article 35 de la LIL lorsqu'il traite des données pour le compte de clients entreprises qui déterminent les finalités et les moyens essentiels du traitement (gestion RH, CRM, comptabilité, etc.). L'éditeur devient responsable de traitement pour ses propres finalités (prospection, facturation, analytics non anonymisées, RH internes) ou responsable conjoint si les finalités sont déterminées conjointement avec le client.

Article 35 LIL — sous-traitant : définit le sous-traitant comme toute personne traitant des données pour le compte du responsable et renvoie aux obligations de l'article 28 du RGPD. Le contrat de sous-traitance (DPA) doit comporter : objet et durée ; nature et finalité ; types de données et catégories de personnes ; obligations et droits du responsable ; instructions documentées ; confidentialité ; mesures de sécurité (art. 32) ; sous-traitance ultérieure avec autorisation préalable ; assistance pour droits des personnes et obligations art. 32 à 36 ; suppression ou restitution en fin de contrat ; audits.

Article 34 LIL — sécurité : le responsable et le sous-traitant mettent en œuvre des mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque, notamment pseudonymisation, chiffrement, confidentialité, intégrité, disponibilité, résilience et procédures de test régulier.

Obligations opérationnelles sous-traitant SaaS : notification au responsable en cas de violation de données dans les meilleurs délais (art. 33 RGPD) ; registre des catégories d'activités de traitement effectuées pour le compte des clients (art. 30 § 2 RGPD) ; désignation d'un DPO si critères art. 37 remplis (art. 57 LIL reprend le cadre DPO).

Article 57 LIL — délégué à la protection des données : reprend les hypothèses de désignation obligatoire du RGPD (suivi régulier et systématique à grande échelle, ou traitement à grande échelle de données sensibles ou relatives aux condamnations). Un éditeur SaaS traitant de gros volumes pour de nombreux clients entre souvent dans ces critères.

Article 66 LIL — données de santé : lorsque le SaaS traite des données de santé pour le compte de clients (établissements de santé, professionnels, assureurs), dispositions spécifiques et, le cas échéant, certification hébergeur de données de santé (HDS) prévue par l'article L. 1111-8 du Code de la santé publique pour l'hébergement de données de santé recueillies à l'occasion de soins.

Article 46 LIL — condamnations et infractions : encadrement strict du traitement des données relatives aux condamnations pénales, infractions ou mesures de sûreté ; contrôle de l'autorité publique ou autorisation légale requise pour solutions de vérification d'antécédents.

Article 30 LIL — NIR : traitement du numéro de sécurité sociale soumis à des conditions restrictives (décret n° 2019-341) ; cas limitativement énumérés.

Article 69 LIL — transferts hors Union : complète le chapitre V RGPD ; garanties appropriées (adéquation, clauses contractuelles types, BCR) ; évaluation au cas par cas post-Schrems II pour pays tiers sans adéquation.

Responsable de traitement pour finalités propres de l'éditeur : bases légales art. 6 RGPD — exécution du contrat SaaS (6-1-b), facturation (6-1-c obligation légale), prospection B2B (6-1-f intérêt légitime documenté), newsletter (consentement 6-1-a). Information des personnes art. 13-14 ; AIPD art. 35 RGPD si risque élevé (liste CNIL délibération 2018-326).

Sanctions : amendes administratives CNIL — plafonds art. 83 RGPD (10 M€ ou 2 % CA pour obligations sous-traitant ; 20 M€ ou 4 % pour principes et droits) ; article 20 LIL ; injonctions et astreintes ; sanctions pénales Code pénal art. 226-16 à 226-24 (jusqu'à 5 ans et 300 000 €, quintuplées pour personnes morales).

Articulation avec textes connexes : AI Act (UE 2024/1689) cumulatif si IA intégrée ; NIS2 pour fournisseurs de services à entités essentielles ; CRA à terme pour produits numériques.

Synthèse CompliAI pour RAG consultant — vérifier toute citation officielle sur Légifrance (JORFTEXT000000886460).`,
  },
  {
    country_code: "DE",
    country_name: "Allemagne",
    title: "Bundesdatenschutzgesetz (BDSG) — synthèse RGPD",
    reference_line: "BGBl. I S. 2097 (2017, modifié 2018)",
    source_url: "urn:complai:rgpd_nat:DE:bdsg-synthesis",
    language: "de",
    body: `Placeholder — remplacé par corps enrichi deep.`,
  },
  {
    country_code: "CY",
    country_name: "Chypre",
    title: "Processing of Personal Data Law 125(I)/2018 — synthèse",
    reference_line: "L. 125(I)/2018",
    source_url: "urn:complai:rgpd_nat:CY:law-125-synthesis",
    language: "el",
    body: `Placeholder — remplacé par corps enrichi deep.`,
  },
  {
    country_code: "FI",
    country_name: "Finlande",
    title: "Tietosuojalaki (1050/2018) — synthèse protection des données",
    reference_line: "1050/2018",
    source_url: "urn:complai:rgpd_nat:FI:tietosuojalaki-synthesis",
    language: "fi",
    body: `La loi finlandaise sur la protection des données (Tietosuojalaki, 1050/2018) transpose le RGPD en droit finlandais et complète le cadre national sous contrôle du médiateur finlandais pour la protection des données (Tietosuojavaltuutettu / TSV).

Principes : licéité, loyauté, transparence, limitation des finalités, minimisation, exactitude, limitation de conservation, intégrité et confidentialité. Bases légales alignées sur l'article 6 RGPD.

Droits des personnes : information claire, accès, rectification, effacement, limitation, opposition, portabilité, et droit de ne pas faire l'objet d'une décision automatisée produisant des effets significatifs sans intervention humaine. Délai de réponse en principe un mois.

Responsable et sous-traitant : registre des activités de traitement, contrats art. 28 RGPD, DPIA pour risques élevés, notification de violation sous 72 h au TSV lorsque requis. Le sous-traitant SaaS B2B traite pour le compte du client entreprise qui détermine les finalités.

Sécurité : mesures techniques et organisationnelles adaptées au risque. Transferts hors EEE : mécanismes RGPD (adéquation, SCC, BCR) avec analyse pays tiers post-Schrems II.

Spécificités finlandaises : secteur public numérique développé, lignes du TSV sur cookies, cloud et IA. Sanctions administratives alignées sur plafonds RGPD.

Source officielle : Finlex (https://www.finlex.fi/fi/laki/ajantasa/2018/20181050). Synthèse CompliAI — le texte finlandais authentique prévaut pour citation en justice.`,
  },
  {
    country_code: "DK",
    country_name: "Danemark",
    title: "Databeskyttelsesloven (LOV nr 502/2018) — synthèse",
    reference_line: "LOV nr 502 af 23/05/2018",
    source_url: "urn:complai:rgpd_nat:DK:databeskyttelsesloven-synthesis",
    language: "da",
    body: `La loi danoise sur la protection des données (Databeskyttelsesloven, LOV nr 502 af 23/05/2018) transpose le RGPD au Danemark et complète le cadre national géré par le Datatilsynet.

Principes : licéité, loyauté, transparence, limitation des finalités, minimisation, exactitude, limitation de conservation, intégrité et confidentialité. Base légale requise pour tout traitement (consentement, contrat, obligation légale, intérêts vitaux, mission d'intérêt public, intérêt légitime documenté).

Droits des personnes : information claire, accès, rectification, effacement, limitation, opposition, portabilité, et droit de ne pas faire l'objet d'une décision automatisée produisant des effets significatifs sans intervention humaine. Délai de réponse en principe un mois.

Responsable et sous-traitant : registre des traitements, contrats art. 28, DPIA pour risques élevés, notification de violation sous 72 h au Datatilsynet lorsque requis. Transferts hors EEE : mécanismes RGPD (adéquation, SCC, BCR).

Spécificités danoises : cadre emploi et secteur public souvent contrôlés ; importance des lignes directrices du Datatilsynet sur cookies, IA et cloud. Sanctions administratives alignées sur plafonds RGPD.

Source officielle : Retsinformation.dk (ELI lta/2018/502). Synthèse CompliAI — non substitut au texte consolidé.`,
  },
  {
    country_code: "EE",
    country_name: "Estonie",
    title: "Isikuandmete kaitse seadus (IKS) — synthèse",
    reference_line: "RT I, 04.01.2019, 11",
    source_url: "urn:complai:rgpd_nat:EE:iks-synthesis",
    language: "et",
    body: `L'Isikuandmete kaitse seadus (IKS, loi estonienne sur la protection des données personnelles, RT I 04.01.2019, 11) transpose le RGPD et organise le contrôle par l'AKI (Andmekaitse Inspektsioon).

Le texte reprend les principes fondamentaux du RGPD : finalités déterminées, bases légales, minimisation, exactitude, limitation de conservation, sécurité. Les responsables de traitement doivent documenter les activités et assurer la transparence envers les personnes concernées.

Droits : accès, rectification, effacement, limitation, opposition, portabilité, et information sur la logique des décisions automatisées. L'administration estonienne numérique (X-Road, e-Residency) impose une vigilance accrue sur les accès inter-administrations et la journalisation.

Sous-traitance cloud et prestataires US : analyses de transfert post-Schrems II. DPIA pour grands registres publics et biométrie. Violations : notification à l'AKI et aux personnes si risque élevé.

Sanctions : pouvoirs de l'AKI conformes au RGPD. Pour le texte officiel : Riigi Teataja. Cette synthèse ne remplace pas la version authentique en estonien.`,
  },
  {
    country_code: "GR",
    country_name: "Grèce",
    title: "Loi 4624/2019 (HDPA) — synthèse protection des données",
    reference_line: "L. 4624/2019",
    source_url: "urn:complai:rgpd_nat:GR:law-4624-synthesis",
    language: "el",
    body: `La loi grecque 4624/2019 porte organisation de l'Autorité hellénique de protection des données (HDPA) et transpose le RGPD en droit interne.

Elle consacre les principes RGPD, les droits des personnes (accès, rectification, effacement, limitation, opposition, portabilité), les obligations des responsables et sous-traitants, les registres, les DPIA et la notification des violations. L'HDPA publie des lignes sur vidéosurveillance, santé, secteur public et employeurs.

Transferts internationaux : application des chapitres III et V RGPD ; vigilance pour prestataires cloud et support US. Traitements secteur public grec : coordination avec l'administration numérique et finalités statutaires.

Sanctions administratives et pénales selon gravité. Les entreprises actives en Grèce doivent désigner un point de contact, tenir un registre RoPA et documenter les bases légales marketing et RH.

Texte officiel sur e-nomothesia.gr et Journal officiel grec. Synthèse pédagogique CompliAI — consulter le fac-similé grec pour citation exacte.`,
  },
  {
    country_code: "HU",
    country_name: "Hongrie",
    title: "Loi CXII/2011 (Info Act) — synthèse RGPD",
    reference_line: "2011. évi CXII. törvény",
    source_url: "urn:complai:rgpd_nat:HU:info-act-synthesis",
    language: "hu",
    body: `La loi hongroise CXII de 2011 sur le droit à l'autodétermination en matière d'information et la liberté d'information (Info Act), amendée pour alignement RGPD, structure la protection des données personnelles sous contrôle de la NAIH.

Principes : finalité, licéité, proportionnalité, exactitude, sécurité. Bases légales incluant consentement, contrat, obligation légale et intérêt légitime. Droits d'accès, rectification, effacement, limitation et opposition avec délais encadrés.

Employeurs et secteur public : contrôles fréquents sur caméras, pointage et fichiers RH. Marketing et cookies : exigence de consentement explicite. Transferts hors EEE documentés.

NAIH peut imposer des mesures correctives et des amendes. Registre des traitements et DPIA pour profilage et données sensibles. Coordination avec le droit de l'Union via le RGPD directement applicable pour nombreuses dispositions.

Source : NJT.hu et textes consolidés. Synthèse CompliAI en français pour le RAG consultant.`,
  },
  {
    country_code: "LT",
    country_name: "Lituanie",
    title: "Loi de transposition BDAR — synthèse",
    reference_line: "TAR 2018-06-30, Nr. 10932",
    source_url: "urn:complai:rgpd_nat:LT:bdar-synthesis",
    language: "lt",
    body: `La loi lituanienne de mise en œuvre du RGPD (BDAR įgyvendinimo įstatymas, TAR 2018-06-30, Nr. 10932) complète le règlement européen et confie le contrôle au VDAI (Valstybinė duomenų apsaugos inspekcija).

Dispositions nationales sur l'âge du consentement, le traitement des données dans le secteur public, la vidéosurveillance et certaines dérogations sectorielles. Reprise des droits des personnes, registres, DPIA, violation notification et sanctions.

Les entreprises lituaniennes et celles ciblant le marché lituanien doivent documenter les transferts, les sous-traitants et les bases légales marketing. Le VDAI publie des recommandations sur cookies et IA.

Transferts internationaux : SCC et analyse pays tiers. Sanctions alignées RGPD. Pour citation : registre e-TAR. Cette synthèse CompliAI facilite le RAG ; le texte lituanien officiel prévaut.`,
  },
  {
    country_code: "LU",
    country_name: "Luxembourg",
    title: "Cadre national RGPD / CNPD — synthèse",
    reference_line: "Loi du 1er août 2018 (Mémorial A n°724) et droit d'Union",
    source_url: "urn:complai:rgpd_nat:LU:rgpd-synthesis",
    language: "fr",
    body: `Au Luxembourg, le RGPD s'applique directement, complété par la loi du 1er août 2018 portant organisation de la CNPD (Commission nationale pour la protection des données, Mémorial A n°724) et par des textes sectoriels (emploi, crédit, santé).

La CNPD contrôle les responsables établis au Luxembourg, hub financier et institutions UE. Obligations : registre RoPA, DPIA, contrats sous-traitants, notification violations, DPO lorsque requis.

Droits des personnes : information transparente en français, allemand ou luxembourgeois selon public visé. Transferts vers pays tiers : documentation Schrems II. Secteur financier (CSSF) : exigences prudentielles cumulées.

Sanctions CNPD jusqu'aux plafonds RGPD. Place financière : attention aux flux transfrontaliers et aux registres clients. Sources : legilux.public.lu et cnpd.public.lu. Synthèse CompliAI — vérifier le Mémorial pour citation officielle.`,
  },
  {
    country_code: "PT",
    country_name: "Portugal",
    title: "Lei n.º 58/2019 — synthèse exécution RGPD",
    reference_line: "Lei n.º 58/2019 de 8 de agosto",
    source_url: "urn:complai:rgpd_nat:PT:lei-58-2019-synthesis",
    language: "pt",
    body: `La loi portugaise n.º 58/2019 du 8 août 2019 exécute le RGPD et adapte le cadre national (loi 67/98 révisée). La CNPD (Comissão Nacional de Protecção de Dados) est l'autorité de contrôle.

Principes et droits RGPD repris : licéité, transparence, minimisation, limitation conservation, sécurité. Droits d'accès, rectification, effacement, limitation, opposition, portabilité. Registre des activités, DPIA, notification violations sous 72 h si risque.

Dispositions spécifiques : traitement données des employés, santé, recherche, vidéosurveillance et marketing digital. Consentement cookies et profilage : doctrine CNPD stricte.

Transferts internationaux : clauses types et analyses complémentaires. Sanctions administratives significatives (ex. affaires Uber chauffeurs). Texte consolidé sur dre.pt. Synthèse CompliAI — consulter la version portugaise officielle pour les citations juridiques.`,
  },
  {
    country_code: "RO",
    country_name: "Roumanie",
    title: "Loi n° 190/2018 — synthèse application RGPD",
    reference_line: "Lege nr. 190/2018",
    source_url: "urn:complai:rgpd_nat:RO:lege-190-2018-synthesis",
    language: "ro",
    body: `La loi roumaine n° 190/2018 met en œuvre le RGPD et définit des adaptations nationales sous supervision de l'ANSPDCP (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal).

Elle précise notamment certaines bases légales sectorielles, le traitement dans le secteur public, la vidéosurveillance, le marketing et les sanctions. Les droits des personnes et obligations des responsables suivent le RGPD : registre, DPIA, DPO, contrats sous-traitants, notification des violations.

Contrôles fréquents sur banques, télécoms et e-commerce. Transferts hors UE documentés post-Schrems II. Les entreprises doivent répondre aux demandes d'exercice des droits dans les délais RGPD.

Sanctions ANSPDCP alignées sur le règlement. Texte officiel sur legislatie.just.ro. Le portail peut charger le contenu en JavaScript : cette synthèse CompliAI assure une couverture RAG jusqu'à indexation du fac-similé.`,
  },
  {
    country_code: "SI",
    country_name: "Slovénie",
    title: "ZVOP-2 — synthèse loi protection des données",
    reference_line: "Zakon o varstvu osebnih podatkov (ZVOP-2), Ur. l. RS št. 163/22",
    source_url: "urn:complai:rgpd_nat:SI:zvop-2-synthesis",
    language: "sl",
    body: `Le ZVOP-2 (Zakon o varstvu osebnih podatkov, version 2022) est la loi slovène sur la protection des données personnelles, remplaçant l'ancien ZVOP-1 et alignée sur le RGPD. L'autorité IP (Informacijski pooblaščenec) supervise la conformité.

Principes : licéité, loyauté, transparence, limitation des finalités, minimisation, exactitude, limitation conservation, intégrité et confidentialité. Droits des personnes : information, accès, rectification, effacement, limitation, opposition, portabilité.

Registre des traitements, DPIA pour risques élevés, DPO si requis, contrats sous-traitants et notification violations. Secteurs sensibles : e-santé, emploi, vidéosurveillance municipale.

Transferts internationaux selon chapitre V RGPD. Sanctions administratives. Texte sur PISRS (portail législatif slovène). Synthèse CompliAI pour le consultant — référer au texte slovène officiel pour citation.`,
  },
  {
    country_code: "SK",
    country_name: "Slovaquie",
    title: "Zákon č. 18/2018 — synthèse protection des données",
    reference_line: "Zákon č. 18/2018 Z. z.",
    source_url: "urn:complai:rgpd_nat:SK:zakon-18-2018-synthesis",
    language: "sk",
    body: `La loi slovaque n° 18/2018 Z. z. sur la protection des données personnelles transpose le RGPD et organise le contrôle par l'ÚOOÚ (Úrad na ochranu osobných údajov SR).

Le texte reprend les principes fondamentaux, les droits des personnes, les obligations des responsables et sous-traitants, les registres, les DPIA, la notification des violations et les sanctions. Dispositions sur le secteur public, la recherche, la santé et l'emploi.

Marketing, cookies et profilage : consentement et information claire. Transferts vers pays tiers avec SCC et analyse de risque. L'ÚOOÚ publie des guidelines et prononce des sanctions.

Entreprises : désignation DPO si applicable, registre RoPA, contrats art. 28. Source officielle : Slov-Lex.sk. Synthèse CompliAI — le texte slovaque authentique prévaut pour les citations en justice.`,
  },
  {
    country_code: "LV",
    country_name: "Lettonie",
    title: "Loi sur la protection des données — synthèse RGPD",
    reference_line: "Likumi.lv — transposition RGPD",
    source_url: "urn:complai:rgpd_nat:LV:bdar-synthesis",
    language: "lv",
    body: `Placeholder — remplacé par corps enrichi.`,
  },
  {
    country_code: "MT",
    country_name: "Malte",
    title: "Data Protection Act (Cap. 586) — synthèse RGPD",
    reference_line: "Cap. 586 — legislation.mt",
    source_url: "urn:complai:rgpd_nat:MT:dpa-synthesis",
    language: "en",
    body: `Placeholder — remplacé par corps enrichi.`,
  },
  {
    country_code: "PL",
    country_name: "Pologne",
    title: "Ustawa z dnia 10 maja 2018 r. — synthèse RGPD",
    reference_line: "Dz.U. 2018 poz. 1000",
    source_url: "urn:complai:rgpd_nat:PL:ustawa-2018-synthesis",
    language: "pl",
    body: `Placeholder — remplacé par corps enrichi.`,
  },
];

export const NATIONAL_STATUTE_FALLBACK_SEEDS: NationalStatuteFallbackSeed[] =
  applyEnrichedFallbackBodies(NATIONAL_STATUTE_FALLBACK_SEEDS_CORE);

export function getNationalStatuteFallbackSeed(
  countryCode: string
): NationalStatuteFallbackSeed | undefined {
  const code = countryCode.trim().toUpperCase();
  return NATIONAL_STATUTE_FALLBACK_SEEDS.find((s) => s.country_code === code);
}
