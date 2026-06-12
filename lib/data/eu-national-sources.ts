/**
 * Sources publiques par État membre de l’UE — DPA / marché IA / télécom / numérique.
 * À utiliser avec getSourcesByCountry() pour contextualiser RGPD et AI Act par pays de déploiement.
 */
import type { LegalSource } from "./legal-source-types";

/** Tag commun pour filtres ingestion / recherche métier par pays */
const MS = ["État membre UE"];

export const EU_MEMBER_NATIONAL_SOURCES: LegalSource[] = [
  // — Allemagne (BfDI et BSI déjà dans legal-sources.ts) —
  {
    id: "de-bnetza",
    name: "Bundesnetzagentur (BNetzA) — Allemagne",
    category: "Régulateurs sectoriels",
    description:
      "Autorité fédérale des réseaux : télécommunications et aspects de marché liés aux services numériques et à la régulation sectorielle pertinent pour l’écosystème IA.",
    url: "https://www.bundesnetzagentur.de/",
    country: "DE",
    type: "régulateur",
    tags: [...MS, "DE", "BNetzA", "Télécoms", "Marché numérique"],
  },

  // — Autriche —
  {
    id: "at-dsb",
    name: "DSB — Autriche",
    category: "Autorités de protection des données",
    description: "Autorité autrichienne de protection des données personnelles.",
    url: "https://www.dsb.gv.at/",
    country: "AT",
    type: "dpa",
    tags: [...MS, "AT", "DSB", "RGPD", "Protection des données"],
  },
  {
    id: "at-rtr",
    name: "RTR — Autriche",
    category: "Régulateurs sectoriels",
    description:
      "Régulateur autrichien dans les domaines des télécommunications, des médias audiovisuels et des services postaux ; point d’attention pour régulation du numérique et AI Act lorsque pertinent.",
    url: "https://www.rtr.at/",
    country: "AT",
    type: "régulateur",
    tags: [...MS, "AT", "RTR", "Télécommunications", "IA Act contexte marché"],
  },

  // — Belgique —
  {
    id: "be-apd",
    name: "APD / GBA — Belgique",
    category: "Autorités de protection des données",
    description: "Autorité belge de protection des données.",
    url: "https://www.autoriteprotectiondonnees.be/",
    country: "BE",
    type: "dpa",
    tags: [...MS, "BE", "APD", "GBA", "RGPD"],
  },
  {
    id: "be-economie",
    name: "SPF Économie — Belgique",
    category: "Régulateurs sectoriels",
    description:
      "Administration fédérale belge avec compétences en matière de marché ; utile pour la conformité concurrentielle et la surveillance des pratiques commerciales liées aux produits IA.",
    url: "https://economie.fgov.be/",
    country: "BE",
    type: "régulateur",
    tags: [...MS, "BE", "Marché IA", "Conformité marché"],
  },
  {
    id: "be-ibpt",
    name: "BIPT / IBPT — Belgique",
    category: "Régulateurs sectoriels",
    description: "Institut belge des services postaux et des télécommunications.",
    url: "https://www.bipt.be/",
    country: "BE",
    type: "régulateur",
    tags: [...MS, "BE", "BIPT", "Télécommunications", "IBPT"],
  },

  // — Bulgarie —
  {
    id: "bg-cpdp",
    name: "CPDP — Bulgarie",
    category: "Autorités de protection des données",
    description: "Commission pour la protection des données personnelles (Bulgarie).",
    url: "https://www.cpdp.bg/",
    country: "BG",
    type: "dpa",
    tags: [...MS, "BG", "CPDP", "RGPD"],
  },
  {
    id: "bg-egov",
    name: "eGovernment Bulgarie — Ministère",
    category: "Régulateurs sectoriels",
    description:
      "Portail ministériel dédié à l’administration électronique et au développement numérique national — contexte politique publique IA.",
    url: "https://egov.government.bg/",
    country: "BG",
    type: "régulateur",
    tags: [...MS, "BG", "eGovernment", "Numérique", "Politique IA"],
  },

  // — Chypre —
  {
    id: "cy-dataprotection",
    name: "Commissioner for Personal Data Protection — Chypre",
    category: "Autorités de protection des données",
    description: "Commissaire chypriote à la protection des données.",
    url: "https://www.dataprotection.gov.cy/",
    country: "CY",
    type: "dpa",
    tags: [...MS, "CY", "RGPD", "Protection des données"],
  },
  {
    id: "cy-ocec",
    name: "Commissioner of Communications — Chypre",
    category: "Régulateurs sectoriels",
    description:
      "Régulateur des communications électroniques et postales ; périmètre souvent relié aux obligations de mise sur le marché des systèmes d’IA (AI Act).",
    url: "https://www.ocec.org.cy/",
    country: "CY",
    type: "régulateur",
    tags: [...MS, "CY", "Communications électroniques", "AI Act mise sur le marché"],
  },

  // — Croatie —
  {
    id: "hr-azop",
    name: "AZOP — Croatie",
    category: "Autorités de protection des données",
    description: "Agence croate pour la protection des données personnelles.",
    url: "https://azop.hr/",
    country: "HR",
    type: "dpa",
    tags: [...MS, "HR", "AZOP", "RGPD"],
  },
  {
    id: "hr-hakom",
    name: "HAKOM — Croatie",
    category: "Régulateurs sectoriels",
    description:
      "Autorité croate régulant les marchés électroniques des communications.",
    url: "https://www.hakom.hr/",
    country: "HR",
    type: "régulateur",
    tags: [...MS, "HR", "HAKOM", "Réseaux", "IA régulation sectorielle"],
  },

  // — Danemark (Datatilsynet déjà présent comme datatilsynet-dk) —
  {
    id: "dk-digst",
    name: "Digitaliseringsstyrelsen — Danemark",
    category: "Régulateurs sectoriels",
    description:
      "Agence danoise pour la transformation numérique du secteur public — bonnes références pour politique nationale IA et services numériques.",
    url: "https://digst.dk/",
    country: "DK",
    type: "régulateur",
    tags: [...MS, "DK", "Numérique", "Politique IA", "eGovernment"],
  },

  // — Espagne (AEPD déjà présent) —
  {
    id: "es-aesia",
    name: "AESIA — Agence Espagnole de Supervision de l’IA",
    category: "Régulateurs sectoriels",
    description:
      "Agence nationale pour la supervision conformément au Règlement européen sur l’IA (rôle national en développement).",
    url: "https://www.aesia.gob.es/",
    country: "ES",
    type: "régulateur",
    tags: [...MS, "ES", "AESIA", "AI Act", "Supervision IA", "Espagne"],
  },

  // — Estonie —
  {
    id: "ee-aki",
    name: "AKI — Estonie",
    category: "Autorités de protection des données",
    description: "Institut estonien de protection des données et de la liberté d’information.",
    url: "https://www.aki.ee/",
    country: "EE",
    type: "dpa",
    tags: [...MS, "EE", "AKI", "RGPD"],
  },
  {
    id: "ee-ttja",
    name: "TTJA — Estonie",
    category: "Régulateurs sectoriels",
    description:
      "Autorité estonienne de la communication et du numérique (régulation sectorielle télécom / médias).",
    url: "https://www.ttja.ee/",
    country: "EE",
    type: "régulateur",
    tags: [...MS, "EE", "TTJA", "Communications"],
  },

  // — Finlande —
  {
    id: "fi-tietosuoja",
    name: "Tietosuojavaltuutetun toimisto — Finlande",
    category: "Autorités de protection des données",
    description: "Bureau du délégué finlandais à la protection des données.",
    url: "https://tietosuoja.fi/",
    country: "FI",
    type: "dpa",
    tags: [...MS, "FI", "Protection des données", "RGPD"],
  },
  {
    id: "fi-traficom",
    name: "Traficom — Finlande",
    category: "Régulateurs sectoriels",
    description:
      "Agence finlandaise des transports et des communications.",
    url: "https://www.traficom.fi/",
    country: "FI",
    type: "régulateur",
    tags: [...MS, "FI", "Traficom", "Communications", "AI Act périmètre marché"],
  },

  // — France (DGCCRF, ARCOM ; CNIL & ANSSI déjà présents) —
  {
    id: "fr-dgccrf",
    name: "DGCCRF — France",
    category: "Régulateurs sectoriels",
    description:
      "Direction générale de la concurrence, de la consommation et de la répression des fraudes ; surveillance du marché, pratiques commerciales, et produits trompeurs liés aux offres IA.",
    url: "https://economie.gouv.fr/dgccrf",
    country: "FR",
    type: "régulateur",
    tags: [...MS, "FR", "DGCCRF", "Surveillance marché", "Algorithmes trompeurs"],
  },
  {
    id: "fr-arcom",
    name: "ARCOM — France",
    category: "Régulateurs sectoriels",
    description:
      "Régulate de l’audiovisuel et du numérique : transparence, recommandations, secteur des contenus.",
    url: "https://www.arcom.fr/",
    country: "FR",
    type: "régulateur",
    tags: [...MS, "FR", "ARCOM", "Médias", "Transparence"],
  },

  // — Grèce —
  {
    id: "gr-hdpa",
    name: "HDPA (DPA Greece) — Grèce",
    category: "Autorités de protection des données",
    description: "Autorité hellénique pour la protection des données personnelles.",
    url: "https://www.dpa.gr/",
    country: "GR",
    type: "dpa",
    tags: [...MS, "GR", "HDPA", "RGPD"],
  },
  {
    id: "gr-mindigital",
    name: "Ministère numérique (mindigital.gr) — Grèce",
    category: "Régulateurs sectoriels",
    description:
      "Politique nationale en matière de gouvernance numérique et cadre ministériel lié à l’innovation / IA.",
    url: "https://mindigital.gr/",
    country: "GR",
    type: "régulateur",
    tags: [...MS, "GR", "Gouvernance numérique", "Politique IA"],
  },

  // — Hongrie —
  {
    id: "hu-naih",
    name: "NAIH — Hongrie",
    category: "Autorités de protection des données",
    description: "Autorité nationale pour la protection des données et la liberté d’information (Hongrie).",
    url: "https://naih.hu/",
    country: "HU",
    type: "dpa",
    tags: [...MS, "HU", "NAIH", "RGPD"],
  },
  {
    id: "hu-nmhh",
    name: "NMHH — Hongrie",
    category: "Régulateurs sectoriels",
    description:
      "Autorité hongroise nationale des médias et des télécommunications.",
    url: "https://www.nmhh.hu/",
    country: "HU",
    type: "régulateur",
    tags: [...MS, "HU", "NMHH", "Infocommunications"],
  },

  // — Irlande (DPC présent sous id dpc) —
  {
    id: "ie-enterprise",
    name: "enterprise.gov.ie — Point de contact national IA (Irlande)",
    category: "Régulateurs sectoriels",
    description:
      "Ministère Enterprise, Trade and Employment ; référencé comme porte nationale pour informations sectorielles liées aux industries et accompagnements publics sous AI Act lorsque désignée.",
    url: "https://enterprise.gov.ie/",
    country: "IE",
    type: "régulateur",
    tags: [...MS, "IE", "Point de contact", "Industry", "Politique nationale IA"],
  },

  // — Italie (Garante présent) —
  {
    id: "it-acn",
    name: "ACN — Agence nationale cybersécurité Italie",
    category: "Cybersécurité & numérique",
    description: "Cybersecurity nationale italienne.",
    url: "https://www.acn.gov.it/",
    country: "IT",
    type: "régulateur",
    tags: [...MS, "IT", "ACN", "Cybersécurité"],
  },
  {
    id: "it-agid",
    name: "AGID — Italie",
    category: "Régulateurs sectoriels",
    description:
      "Agence pour l’Italie digitale ; cadre ministériel des services et souvent des politiques d’algorithmes dans le secteur public.",
    url: "https://www.agid.gov.it/",
    country: "IT",
    type: "régulateur",
    tags: [...MS, "IT", "AGID", "Numérique", "Services publics numériques"],
  },

  // — Lettonie —
  {
    id: "lv-dvi",
    name: "DVI — Lettonie",
    category: "Autorités de protection des données",
    description:
      "Autorité lettone de surveillance des données (Data State Inspectorate).",
    url: "https://www.dvi.gov.lv/lv",
    country: "LV",
    type: "dpa",
    tags: [...MS, "LV", "DVI", "RGPD"],
  },
  {
    id: "lv-ptac",
    name: "PTAC — Lettonie",
    category: "Régulateurs sectoriels",
    description:
      "Commission lettone de protection de la concurrence — droits consommateurs et pratiques liées aux produits / services IA sur le marché.",
    url: "https://www.ptac.gov.lv/",
    country: "LV",
    type: "régulateur",
    tags: [...MS, "LV", "PTAC", "Consommation", "AI Act droits utilisateurs"],
  },

  // — Lituanie —
  {
    id: "lt-vdai",
    name: "VDAI — Lituanie",
    category: "Autorités de protection des données",
    description: "Inspection lituanienne de la protection des données.",
    url: "https://vdai.lrv.lt/",
    country: "LT",
    type: "dpa",
    tags: [...MS, "LT", "VDAI", "RGPD"],
  },
  {
    id: "lt-rrt",
    name: "RRT — Lituanie",
    category: "Régulateurs sectoriels",
    description:
      "Autorité lituanienne des communications — régulateur sectoriel télécom / médias.",
    url: "https://www.rrt.lt/",
    country: "LT",
    type: "régulateur",
    tags: [...MS, "LT", "RRT", "Communications"],
  },

  // — Luxembourg —
  {
    id: "lu-cnpd",
    name: "CNPD — Luxembourg",
    category: "Autorités de protection des données",
    description:
      "Commission nationale pour la protection des données au Luxembourg.",
    url: "https://cnpd.public.lu/",
    country: "LU",
    type: "dpa",
    tags: [...MS, "LU", "CNPD", "RGPD", "AI Act accompagnement national"],
  },

  // — Malte —
  {
    id: "mt-idpc",
    name: "IDPC — Malte",
    category: "Autorités de protection des données",
    description:
      "Office maltais du commissaire à la protection des données.",
    url: "https://idpc.org.mt/",
    country: "MT",
    type: "dpa",
    tags: [...MS, "MT", "IDPC", "RGPD"],
  },
  {
    id: "mt-mdia",
    name: "MDIA — Malte",
    category: "Régulateurs sectoriels",
    description:
      "Autorité maltaise pour l’Agence nationale des technologies (innovation numérique ; écosystème IA).",
    url: "https://www.mdia.gov.mt/",
    country: "MT",
    type: "régulateur",
    tags: [...MS, "MT", "MDIA", "Innovation IA"],
  },

  // — Pays-Bas (AP présent sous ap-nl) —
  {
    id: "nl-rdi",
    name: "RDI Nederland — Pays-Bas",
    category: "Régulateurs sectoriels",
    description:
      "Rijksinspectie Digitale Infrastructuur — inspection de l’infrastructure numérique nationale.",
    url: "https://www.rdi.nl/",
    country: "NL",
    type: "régulateur",
    tags: [...MS, "NL", "RDI", "Infrastructure numérique"],
  },

  // — Pologne —
  {
    id: "pl-uodo",
    name: "UODO — Pologne",
    category: "Autorités de protection des données",
    description: "Autorité polonaise de protection des données.",
    url: "https://uodo.gov.pl/",
    country: "PL",
    type: "dpa",
    tags: [...MS, "PL", "UODO", "RGPD"],
  },
  {
    id: "pl-cyfryzacja",
    name: "Ministère Digitalisation — Pologne",
    category: "Régulateurs sectoriels",
    description:
      "Ministère de la Transformation numérique / cyfryzacja — ligne politique nationale sur l’IA et les services digitaux.",
    url: "https://www.gov.pl/web/cyfryzacja",
    country: "PL",
    type: "régulateur",
    tags: [...MS, "PL", "Digitalisation", "Politique nationale IA"],
  },

  // — Portugal —
  {
    id: "pt-cnpd",
    name: "CNPD — Portugal",
    category: "Autorités de protection des données",
    description: "Commission nationale de protection des données (Portugal).",
    url: "https://www.cnpd.pt/",
    country: "PT",
    type: "dpa",
    tags: [...MS, "PT", "CNPD", "RGPD"],
  },
  {
    id: "pt-anacom",
    name: "ANACOM — Portugal",
    category: "Régulateurs sectoriels",
    description:
      "Autorité nationale des communications.",
    url: "https://www.anacom.pt/",
    country: "PT",
    type: "régulateur",
    tags: [...MS, "PT", "ANACOM", "Communications"],
  },

  // — République tchèque —
  {
    id: "cz-uoou",
    name: "ÚOOÚ — République tchèque",
    category: "Autorités de protection des données",
    description: "Autorité tchèque pour la protection des données personnelles.",
    url: "https://uoou.gov.cz/",
    country: "CZ",
    type: "dpa",
    tags: [...MS, "CZ", "ÚOOÚ", "RGPD"],
  },
  {
    id: "cz-ctu",
    name: "CTU — République tchèque",
    category: "Régulateurs sectoriels",
    description:
      "Office tchèque des télécommunications et postal.",
    url: "https://www.ctu.gov.cz/",
    country: "CZ",
    type: "régulateur",
    tags: [...MS, "CZ", "CTU", "Télécommunications"],
  },

  // — Roumanie —
  {
    id: "ro-anspdcp",
    name: "ANSPDCP — Roumanie",
    category: "Autorités de protection des données",
    description:
      "Autorité roumaine nationale de surveillance du traitement des données à caractère personnel.",
    url: "https://www.dataprotection.ro/",
    country: "RO",
    type: "dpa",
    tags: [...MS, "RO", "ANSPDCP", "RGPD"],
  },
  {
    id: "ro-mcid",
    name: "MCID — Roumanie (Recherche, Innovation et Numérisation)",
    category: "Régulateurs sectoriels",
    description:
      "Ministère compétent en politiques de recherche, innovation et numérisation — cadre ministériel lié aux stratégies nationales IA.",
    url: "https://mcid.gov.ro/",
    country: "RO",
    type: "régulateur",
    tags: [...MS, "RO", "MCID", "Innovation IA"],
  },

  // — Slovaquie —
  {
    id: "sk-dataprotection",
    name: "ÚOOÚ SR — Slovaquie",
    category: "Autorités de protection des données",
    description: "Office pour la protection des données personnelles (Slovaquie).",
    url: "https://dataprotection.gov.sk/",
    country: "SK",
    type: "dpa",
    tags: [...MS, "SK", "ÚOOÚ", "RGPD"],
  },
  {
    id: "sk-mmir",
    name: "MIRRI / Ministère investissements informatisation — Slovaquie",
    category: "Régulateurs sectoriels",
    description:
      "Portefeuille national relatif aux investissements et à la transformation num/informatisation ; contexte ministériel pour politiques IA.",
    url: "https://www.mirri.gov.sk/",
    country: "SK",
    type: "régulateur",
    tags: [...MS, "SK", "MIRRI", "Numérique", "IA"],
  },

  // — Slovénie —
  {
    id: "si-ip-rs",
    name: "IP RS — Slovénie",
    category: "Autorités de protection des données",
    description:
      "Inspecteur slovène pour la protection des données personnelles.",
    url: "https://www.ip-rs.si/",
    country: "SI",
    type: "dpa",
    tags: [...MS, "SI", "IP", "RGPD"],
  },
  {
    id: "si-akos",
    name: "AKOS — Slovénie",
    category: "Régulateurs sectoriels",
    description:
      "Agence slovène pour la communication des réseaux et des services.",
    url: "https://www.akos-rs.si/",
    country: "SI",
    type: "régulateur",
    tags: [...MS, "SI", "AKOS", "Réseaux", "Communications"],
  },

  // — Suède —
  {
    id: "se-imy",
    name: "IMY — Suède",
    category: "Autorités de protection des données",
    description: "Inspection suédoise pour la protection de la vie privée (anciennement DI).",
    url: "https://www.imy.se/",
    country: "SE",
    type: "dpa",
    tags: [...MS, "SE", "IMY", "RGPD"],
  },
  {
    id: "se-pts",
    name: "PTS — Suède",
    category: "Régulateurs sectoriels",
    description:
      "Agence nationale suédoise des postes et télécommunications.",
    url: "https://www.pts.se/",
    country: "SE",
    type: "régulateur",
    tags: [...MS, "SE", "PTS", "Communications IA"],
  },
];
