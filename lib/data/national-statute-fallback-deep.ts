/**
 * Synthèses nationales « profondes » (4–8 segments RAG) — structure par articles
 * pour un découpage stable (chunkLegalText sur « Article N — »).
 */

export interface NationalDeepSynthesisProfile {
  country_code: string;
  law_title: string;
  reference: string;
  authority: string;
  portal: string;
  /** Spécificités nationales (emploi, vidéosurveillance, etc.) */
  national_specifics: string;
}

const SHARED_SAAS_B2B = `Dans le modèle SaaS B2B classique, l'éditeur met à disposition une infrastructure logicielle ; le client entreprise détermine les finalités (RH, CRM, comptabilité, gestion de projet) et les moyens essentiels du traitement. L'éditeur est en principe sous-traitant au sens de l'article 4 point 8 du RGPD. Il devient responsable de traitement pour ses propres finalités (facturation, prospection, analytics non anonymisées, RH internes) ou responsable conjoint si les finalités sont déterminées conjointement avec le client.`;

const SHARED_ART28 = `Le contrat de sous-traitance (DPA) doit comporter les clauses obligatoires de l'article 28 paragraphe 3 du RGPD : objet et durée ; nature et finalité ; types de données et catégories de personnes ; obligations et droits du responsable ; instructions documentées ; confidentialité des personnes autorisées ; mesures de sécurité (article 32) ; sous-traitance ultérieure avec autorisation préalable ; assistance pour droits des personnes et obligations articles 32 à 36 ; suppression ou restitution en fin de contrat ; audits et mise à disposition d'informations.`;

const SHARED_SUBPROCESSOR_OPS = `Obligations opérationnelles du sous-traitant : registre des catégories d'activités de traitement effectuées pour le compte des clients (article 30 paragraphe 2) ; notification au responsable en cas de violation de données dans les meilleurs délais (article 33 paragraphe 2) ; désignation d'un DPO si critères article 37 remplis ; encadrement des transferts hors Union (chapitre V : adéquation, clauses contractuelles types, BCR, analyse Schrems II).`;

const PROFILES: NationalDeepSynthesisProfile[] = [
  {
    country_code: "DE",
    law_title: "Bundesdatenschutzgesetz (BDSG)",
    reference: "BGBl. I S. 2097 (2017, modifié 2018)",
    authority: "BfDI / autorités Länder",
    portal: "https://www.gesetze-im-internet.de/bdsg_2018/",
    national_specifics:
      "§ 26 BDSG : données employés (finalités RH, proportionnalité, information des salariés). § 22 : données sensibles avec garanties nationales. § 38 : DPO. § 85 : sanctions pénales complémentaires. Droit du travail et Betriebsrat selon cas.",
  },
  {
    country_code: "CY",
    law_title: "Processing of Personal Data (Protection of Individuals) Law of 2018",
    reference: "L. 125(I)/2018",
    authority: "CPDP CY",
    portal: "https://www.dataprotection.gov.cy",
    national_specifics:
      "Loi bilingue (grec / turc) ; hub financier et services : transferts hors EEE documentés. Vidéosurveillance et marketing : proportionnalité. Texte consolidé souvent difficile à fetch (cylaw.org) — vérifier fac-similé officiel.",
  },
  {
    country_code: "DK",
    law_title: "Databeskyttelsesloven (LOV nr 502/2018)",
    reference: "LOV nr 502 af 23/05/2018",
    authority: "Datatilsynet",
    portal: "https://www.retsinformation.dk/",
    national_specifics:
      "Doctrine danoise stricte sur cookies et marketing : consentement préalable. Emploi et vidéosurveillance : proportionnalité et information des salariés. Âge du consentement et traitements secteur public fréquemment contrôlés.",
  },
  {
    country_code: "EE",
    law_title: "Isikuandmete kaitse seadus (IKS)",
    reference: "RT I, 04.01.2019, 11",
    authority: "AKI (Andmekaitse Inspektsioon)",
    portal: "https://www.riigiteataja.ee/",
    national_specifics:
      "Administration numérique (X-Road, e-Residency) : journalisation des accès inter-institutionnels, minimisation, séparation des rôles. DPIA pour grands registres publics et biométrie.",
  },
  {
    country_code: "FI",
    law_title: "Tietosuojalaki (1050/2018)",
    reference: "1050/2018",
    authority: "Tietosuojavaltuutettu (TSV)",
    portal: "https://www.finlex.fi/",
    national_specifics:
      "Secteur public numérique développé. Orientations TSV sur cloud, cookies et IA. Notification violations au TSV sous 72 h lorsque requis.",
  },
  {
    country_code: "GR",
    law_title: "Loi 4624/2019",
    reference: "L. 4624/2019",
    authority: "HDPA",
    portal: "https://www.et.gr/",
    national_specifics:
      "Contrôles fréquents santé, employeurs, vidéosurveillance. Sanctions administratives et pénales selon gravité.",
  },
  {
    country_code: "HU",
    law_title: "Loi CXII/2011 (Info Act)",
    reference: "2011. évi CXII. törvény",
    authority: "NAIH",
    portal: "https://njt.hu/",
    national_specifics:
      "Employeurs : caméras, pointage, fichiers RH — proportionnalité. Marketing et cookies : consentement explicite.",
  },
  {
    country_code: "LT",
    law_title: "BDAR įgyvendinimo įstatymas",
    reference: "TAR 2018-06-30, Nr. 10932",
    authority: "VDAI",
    portal: "https://www.e-tar.lt/",
    national_specifics:
      "Âge du consentement, secteur public, vidéosurveillance. Recommandations VDAI sur cookies et IA.",
  },
  {
    country_code: "LU",
    law_title: "Loi du 1er août 2018 (CNPD)",
    reference: "Mémorial A n°724",
    authority: "CNPD",
    portal: "https://legilux.public.lu/",
    national_specifics:
      "Hub financier : cumul CNPD et exigences CSSF si applicable. Information transparente FR/DE/LU selon public visé.",
  },
  {
    country_code: "PT",
    law_title: "Lei n.º 58/2019",
    reference: "Lei n.º 58/2019 de 8 de agosto",
    authority: "CNPD",
    portal: "https://dre.pt/",
    national_specifics:
      "Article 28 emploi : vidéosurveillance, biométrie employés, géolocalisation véhicules — proportionnalité. Article 19 vidéosurveillance : finalité sécurité, information préalable, conservation 30 jours, interdiction vestiaires et sanitaires. Marketing électronique : consentement préalable (doctrine CNPD stricte).",
  },
  {
    country_code: "RO",
    law_title: "Lege nr. 190/2018",
    reference: "Lege nr. 190/2018",
    authority: "ANSPDCP",
    portal: "http://legislatie.just.ro/",
    national_specifics:
      "Contrôles banques, télécoms, e-commerce. Vidéosurveillance et marketing encadrés nationalement.",
  },
  {
    country_code: "SI",
    law_title: "ZVOP-2",
    reference: "Ur. l. RS št. 163/22",
    authority: "IP (Informacijski pooblaščenec)",
    portal: "https://www.pisrs.si/",
    national_specifics: "e-Santé, emploi, vidéosurveillance municipale : vigilance proportionnalité.",
  },
  {
    country_code: "SK",
    law_title: "Zákon č. 18/2018 Z. z.",
    reference: "Zákon č. 18/2018",
    authority: "ÚOOÚ",
    portal: "https://www.slov-lex.sk/",
    national_specifics:
      "Secteur public, recherche, santé, emploi : dispositions nationales. Marketing, cookies, profilage : consentement.",
  },
  {
    country_code: "LV",
    law_title: "Loi lettone sur la protection des données",
    reference: "Likumi.lv — transposition RGPD",
    authority: "DVI",
    portal: "https://likumi.lv/",
    national_specifics: "Contrôles proportionnalité RH et transferts hors EEE.",
  },
  {
    country_code: "MT",
    law_title: "Data Protection Act (Cap. 586)",
    reference: "Cap. 586",
    authority: "IDPC",
    portal: "https://legislation.mt/",
    national_specifics:
      "Hub financier et iGaming : vigilance transferts et sous-traitants US. Site legislation.mt parfois JS-only.",
  },
  {
    country_code: "PL",
    law_title: "Ustawa z dnia 10 maja 2018 r.",
    reference: "Dz.U. 2018 poz. 1000",
    authority: "UODO",
    portal: "https://isap.sejm.gov.pl/",
    national_specifics:
      "Sanctions UODO significatives. ISAP peut bloquer les robots — vérifier texte polonais officiel.",
  },
];

function buildDeepBody(profile: NationalDeepSynthesisProfile): string {
  return [
    `${profile.law_title} — ${profile.reference}. Autorité de contrôle : ${profile.authority}. Cette synthèse CompliAI complète le RGPD (règlement d'application directe) pour le consultant ; seule la version publiée sur le portail officiel fait foi.`,
    `Article 1 — Champ d'application et articulation avec le RGPD\nLe RGPD s'applique directement. La loi nationale ${profile.reference} exécute les marges nationales (emploi, santé, vidéosurveillance, âge du consentement selon les cas). Territorialité : article 3 RGPD — établissement sur le territoire ou personnes situées dans l'État membre.`,
    `Article 2 — Principes et bases légales\nPrincipes : licéité, loyauté, transparence, limitation des finalités, minimisation, exactitude, limitation de conservation, intégrité et confidentialité, responsabilité (accountability). Bases légales article 6 RGPD. Droits des personnes : accès, rectification, effacement, limitation, opposition, portabilité, décisions automatisées — délai de réponse en principe un mois.`,
    `Article 3 — Qualification éditeur SaaS B2B\n${SHARED_SAAS_B2B}`,
    `Article 4 — Contrat de sous-traitance et article 28 RGPD\n${SHARED_ART28}`,
    `Article 5 — Obligations du sous-traitant\n${SHARED_SUBPROCESSOR_OPS}`,
    `Article 6 — Sécurité et violations\nMesures techniques et organisationnelles appropriées (article 32) : pseudonymisation, chiffrement, confidentialité, intégrité, disponibilité, résilience, tests réguliers. Notification des violations au responsable de traitement dans les meilleurs délais pour permettre la notification CNIL/autorité sous 72 h si requis.`,
    `Article 7 — Dispositions nationales complémentaires\n${profile.national_specifics}`,
    `Article 8 — Sanctions\nAmendes administratives selon article 83 RGPD : jusqu'à 10 M€ ou 2 % du chiffre d'affaires mondial pour obligations du sous-traitant (articles 28, 30 § 2, 32, 33 § 2) ; jusqu'à 20 M€ ou 4 % pour principes, droits des personnes et transferts illicites. ${profile.authority} peut prononcer injonctions et mesures correctives.`,
    `Article 9 — Source officielle\nConsulter ${profile.portal} pour le fac-similé authentique de ${profile.law_title}. Cette synthèse ne remplace pas le texte consolidé en langue nationale.`,
  ].join("\n\n");
}

export const NATIONAL_STATUTE_FALLBACK_DEEP_BODIES: Record<string, string> = Object.fromEntries(
  PROFILES.map((p) => [p.country_code, buildDeepBody(p)])
);
