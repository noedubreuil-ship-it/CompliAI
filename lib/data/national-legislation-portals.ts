/**
 * Portails nationaux pour consulter les textes de loi (bases consolidées ou journaux officiels).
 * Répertoire statique injecté au consultant quand un État membre est détecté (hors RAG vectoriel).
 */

export interface NationalLawPortalRow {
  institution: string;
  url: string;
  coverageFr: string;
}

export interface NationalLegislativeHub {
  paysFr: string;
  portals: NationalLawPortalRow[];
}

/** ISO 3166-1 alpha-2 UE-27, majuscules. Compléter ou ajuster les URL au fil des changements nationaux. */
export const UE_LEGISLATION_HUB_BY_COUNTRY: Record<string, NationalLegislativeHub> = {
  AT: {
    paysFr: "Autriche",
    portals: [
      {
        institution: "RIS — Rechtsinformationssystem des Bundes",
        url: "https://www.ris.bka.gv.at/",
        coverageFr: "Lois et règlements fédéraux autrichiens consultables et recherchables.",
      },
    ],
  },
  BE: {
    paysFr: "Belgique",
    portals: [
      {
        institution: "Portail Justice fédérale — droit belge",
        url: "https://justice.belgium.be/fr/themes_et_dossiers/droit_belge",
        coverageFr: "Entrée officielle fédérale ; le droit belge est réparti entre ordres et entités fédérées/régionales.",
      },
      {
        institution: "Justel / Moniteur belge (via eJustice)",
        url: "https://justice.belgium.be/fr/justiceelectronique/moniteur_belge",
        coverageFr: "Accès aux séries de publication relatives au Moniteur belge lorsque la question l’exige.",
      },
    ],
  },
  BG: {
    paysFr: "Bulgarie",
    portals: [
      {
        institution: "Parlement — rubrique legislation",
        url: "https://www.parliament.bg/en/legislation",
        coverageFr: "Textes parlementaires et référence pour le niveau central bulgare.",
      },
    ],
  },
  CY: {
    paysFr: "Chypre",
    portals: [
      {
        institution: "Portail officiel du gouvernement",
        url: "https://www.cyprus.gov.cy/",
        coverageFr: "Répartition des textes par ministère ; journal officiel / collections nationales à viser pour la version authentique.",
      },
    ],
  },
  CZ: {
    paysFr: "République tchèque",
    portals: [
      {
        institution: "Portail public tchèque (agrégation services publics)",
        url: "https://www.portal.gov.cz/",
        coverageFr: "Point d’entrée ; la collection législative officielle (Sbírka zákonů) est consultable via les canaux nationaux qu’il référence.",
      },
    ],
  },
  DE: {
    paysFr: "Allemagne",
    portals: [
      {
        institution: "Gesetze im Internet (édition fédérale)",
        url: "https://www.gesetze-im-internet.de/",
        coverageFr: "Lois fédérales allemandes en version électronique de référence (édition BMJ).",
      },
    ],
  },
  DK: {
    paysFr: "Danemark",
    portals: [
      {
        institution: "Retsinformation — lois et règlements danois",
        url: "https://www.retsinformation.dk/",
        coverageFr: "Base officielle de textes juridiques danois.",
      },
    ],
  },
  EE: {
    paysFr: "Estonie",
    portals: [
      {
        institution: "Riigi Teataja — journal officiel numérique",
        url: "https://www.riigiteataja.ee/",
        coverageFr: "Publication et consolidation des actes estoniens.",
      },
    ],
  },
  ES: {
    paysFr: "Espagne",
    portals: [
      {
        institution: "BOE — Boletín Oficial del Estado",
        url: "https://www.boe.es/",
        coverageFr: "Journal officiel et lois consolidées espagnoles.",
      },
    ],
  },
  FI: {
    paysFr: "Finlande",
    portals: [
      {
        institution: "Finlex — base de données juridique finlandaise",
        url: "https://www.finlex.fi/",
        coverageFr: "Lois, décrets et jurisprudence sélectionnée ; textes officiels finlandais.",
      },
    ],
  },
  FR: {
    paysFr: "France",
    portals: [
      {
        institution: "Légifrance — service public de la diffusion du droit",
        url: "https://www.legifrance.gouv.fr/",
        coverageFr: "Codes, lois et règlements consolidés sur le territoire français.",
      },
    ],
  },
  GR: {
    paysFr: "Grèce",
    portals: [
      {
        institution: "Efimerida tis Kyverniseos — journal officiel grec (ET)",
        url: "https://www.et.gr/",
        coverageFr: "Publication officielle des actes normatifs grecs.",
      },
    ],
  },
  HR: {
    paysFr: "Croatie",
    portals: [
      {
        institution: "Narodne novine — journal officiel",
        url: "https://narodne-novine.nn.hr/",
        coverageFr: "Publication officielle des lois et règlements croates.",
      },
    ],
  },
  HU: {
    paysFr: "Hongrie",
    portals: [
      {
        institution: "Nemzeti Jogszabálytár (NJT)",
        url: "https://njt.hu/",
        coverageFr: "Base nationale de textes juridiques hongrois.",
      },
    ],
  },
  IE: {
    paysFr: "Irlande",
    portals: [
      {
        institution: "Irish Statute Book",
        url: "https://www.irishstatutebook.ie/",
        coverageFr: "Lois et délégations législatives irlandaises en texte consolidé ou authentique selon les actes.",
      },
    ],
  },
  IT: {
    paysFr: "Italie",
    portals: [
      {
        institution: "Normattiva — normes en vigueur",
        url: "https://www.normattiva.it/",
        coverageFr: "Consultation des actes législatifs italiens publiés par le casier officiel numérique.",
      },
    ],
  },
  LT: {
    paysFr: "Lituanie",
    portals: [
      {
        institution: "TAR — Teisės aktų registras",
        url: "https://www.e-tar.lt/portal/",
        coverageFr: "Registre national des actes juridiques lituaniens.",
      },
    ],
  },
  LU: {
    paysFr: "Luxembourg",
    portals: [
      {
        institution: "Legilux — Journal officiel du Grand-Duché",
        url: "https://legilux.public.lu/",
        coverageFr: "Lois, règlements et textes officiels luxembourgeois.",
      },
    ],
  },
  LV: {
    paysFr: "Lettonie",
    portals: [
      {
        institution: "Likumi.lv — lois lettones",
        url: "https://likumi.lv/",
        coverageFr: "Base consolidée officielle lettone des normes juridiques.",
      },
    ],
  },
  MT: {
    paysFr: "Malte",
    portals: [
      {
        institution: "Legislation.gov.mt — services légaux du gouvernement",
        url: "https://legislation.mt/",
        coverageFr: "Lois consolidées maltaises mises à disposition par le ministère compétent.",
      },
    ],
  },
  NL: {
    paysFr: "Pays-Bas",
    portals: [
      {
        institution: "Wetten.nl — bases des lois et règlements",
        url: "https://wetten.overheid.nl/",
        coverageFr: "Textes officiels néerlandais et travaux officiels étatiques liés aux actes juridiques.",
      },
    ],
  },
  PL: {
    paysFr: "Pologne",
    portals: [
      {
        institution: "Internetowy System Aktów Prawnych (ISAP)",
        url: "https://isap.sejm.gov.pl/",
        coverageFr: "Journal des lois — point d’accès officiel depuis le Parlement polonais (Sejm).",
      },
    ],
  },
  PT: {
    paysFr: "Portugal",
    portals: [
      {
        institution: "DRE — Diário da República Eletrónico",
        url: "https://dre.pt/",
        coverageFr: "Journal officiel portugais pour lois et décrets consolidés lorsque disponible.",
      },
    ],
  },
  RO: {
    paysFr: "Roumanie",
    portals: [
      {
        institution: "Portal legislativ al României (Ministry of Justice aggregator)",
        url: "http://legislatie.just.ro/",
        coverageFr: "Accès officiel ministériel aux bases de données législatives roumaines.",
      },
    ],
  },
  SE: {
    paysFr: "Suède",
    portals: [
      {
        institution: "Riksdagen — documents et informations sur les lois adoptées au Parlement",
        url: "https://www.riksdagen.se/",
        coverageFr: "Publication parlementaire suédoise pour les projets et actes adoptés suivant procédures nationales.",
      },
      {
        institution: "Government offices of Sweden (Regeringskansliet)",
        url: "https://www.government.se/",
        coverageFr: "Règlements du gouvernement central et documents exécutifs associés.",
      },
      {
        institution: "Lagrummet — portail public de recherche juridique entre institutions suédoises",
        url: "https://lagrummet.se/",
        coverageFr: "Moteur officiel agrégé reliant bases nationales (orienter l’utilisateur vers la base primaire citée).",
      },
    ],
  },
  SI: {
    paysFr: "Slovénie",
    portals: [
      {
        institution: "PISRS — Pravno-informacijski sistem Republike Slovenije",
        url: "https://www.pisrs.si/",
        coverageFr: "Système d’informations légales de la République de Slovénie.",
      },
    ],
  },
  SK: {
    paysFr: "Slovaquie",
    portals: [
      {
        institution: "Slov-Lex — portail officiel des textes juridiques slovaques",
        url: "https://www.slov-lex.sk/",
        coverageFr: "Base centrale des actes législatifs et réglementaires slovaques.",
      },
    ],
  },
};
