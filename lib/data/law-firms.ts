export type Specialization =
  | "AI Act"
  | "RGPD / Data Protection"
  | "DSA / DMA"
  | "Droit des contrats IA"
  | "Propriété intellectuelle IA"
  | "Cybersécurité"
  | "Droit du travail numérique"
  | "Due diligence IA";

export type Country =
  | "France"
  | "Belgique"
  | "Allemagne"
  | "Pays-Bas"
  | "Espagne"
  | "Italie"
  | "Suisse"
  | "Luxembourg"
  | "Royaume-Uni"
  | "International";

export interface LawFirm {
  id: string;
  name: string;
  countries: Country[];
  specializations: Specialization[];
  description: string;
  languages: string[];
  website: string;
  email?: string;
  phone?: string;
  tier: "top" | "recommended" | "specialist";
  highlights: string[];
  city?: string;
}

export const LAW_FIRMS: LawFirm[] = [
  // ─── France ───────────────────────────────────────────────────────────────
  {
    id: "bird-bird-fr",
    name: "Bird & Bird",
    countries: ["France", "Allemagne", "Pays-Bas", "Espagne", "Italie", "Belgique", "International"],
    specializations: ["AI Act", "RGPD / Data Protection", "DSA / DMA", "Droit des contrats IA", "Propriété intellectuelle IA"],
    description: "Cabinet international de référence en droit des technologies. Parmi les premiers à avoir publié des guides pratiques sur l'AI Act dès 2023. Equipe dédiée AI Act en Europe.",
    languages: ["Français", "Anglais", "Allemand", "Néerlandais", "Espagnol"],
    website: "https://www.twobirds.com/fr",
    tier: "top",
    city: "Paris (+ 30 bureaux EU)",
    highlights: [
      "Équipe AI Act dédiée de 50+ avocats en Europe",
      "Guide AI Act de référence (200 pages, gratuit)",
      "Clients : grandes entreprises tech, scale-ups",
    ],
  },
  {
    id: "gide-fr",
    name: "Gide Loyrette Nouel",
    countries: ["France", "International"],
    specializations: ["AI Act", "RGPD / Data Protection", "DSA / DMA", "Droit des contrats IA"],
    description: "Premier cabinet français indépendant. Pratique numérique & données reconnue, avec une forte présence institutionnelle auprès de la CNIL et du régulateur européen.",
    languages: ["Français", "Anglais"],
    website: "https://www.gide.com",
    tier: "top",
    city: "Paris",
    highlights: [
      "Relations privilégiées avec la CNIL",
      "Conseil auprès de la Commission Européenne",
      "Expertise réglementaire sectorielle (santé, finance)",
    ],
  },
  {
    id: "fieldfisher-fr",
    name: "Fieldfisher",
    countries: ["France", "Belgique", "Allemagne", "Pays-Bas", "International"],
    specializations: ["RGPD / Data Protection", "AI Act", "Cybersécurité", "DSA / DMA"],
    description: "Cabinet européen reconnu pour sa pratique data & privacy. L'un des premiers à avoir constitué une équipe dédiée conformité AI Act en France et en Belgique.",
    languages: ["Français", "Anglais", "Néerlandais"],
    website: "https://www.fieldfisher.com/fr-fr",
    tier: "top",
    city: "Paris, Bruxelles, Amsterdam",
    highlights: [
      "Top 3 data privacy en France (Legal 500)",
      "Équipe de 30+ avocats spécialisés données",
      "Forte présence auprès des start-ups et PME",
    ],
  },
  {
    id: "august-debouzy-fr",
    name: "August Debouzy",
    countries: ["France"],
    specializations: ["AI Act", "RGPD / Data Protection", "Droit des contrats IA", "Propriété intellectuelle IA"],
    description: "Cabinet d'affaires français indépendant avec une practice tech & IA reconnue. Publie régulièrement des analyses sur l'AI Act et conseille des acteurs de la French Tech.",
    languages: ["Français", "Anglais"],
    website: "https://www.august-debouzy.com",
    tier: "recommended",
    city: "Paris",
    highlights: [
      "Conseil de nombreuses licornes françaises",
      "Veille réglementaire AI Act très active",
      "Tarifs adaptés aux start-ups et PME",
    ],
  },
  {
    id: "de-gaulle-fleurance-fr",
    name: "De Gaulle Fleurance & Associés",
    countries: ["France"],
    specializations: ["RGPD / Data Protection", "AI Act", "Droit du travail numérique", "Propriété intellectuelle IA"],
    description: "Cabinet parisien reconnu pour son expertise en droit des nouvelles technologies et propriété intellectuelle. Accompagne depuis 20+ ans des entreprises dans leur transformation digitale.",
    languages: ["Français", "Anglais"],
    website: "https://www.de-gaulle-fleurance.com",
    tier: "recommended",
    city: "Paris",
    highlights: [
      "Expertise CNIL depuis 2002",
      "Spécialistes données RH et IA en recrutement",
      "Réseau européen via EALP",
    ],
  },
  {
    id: "hogan-lovells-fr",
    name: "Hogan Lovells",
    countries: ["France", "Allemagne", "Pays-Bas", "Belgique", "International"],
    specializations: ["AI Act", "RGPD / Data Protection", "Cybersécurité", "Due diligence IA", "DSA / DMA"],
    description: "Géant mondial du droit avec une practice IA & data parmi les plus importantes d'Europe. Conseil privilégié des multinationales et des fonds d'investissement.",
    languages: ["Français", "Anglais", "Allemand"],
    website: "https://www.hoganlovells.com/fr",
    tier: "top",
    city: "Paris (+ 40 bureaux EU)",
    highlights: [
      "Practice AI dédiée avec 100+ avocats mondiaux",
      "Spécialistes due diligence IA pour M&A",
      "Conseil des grands fonds PE/VC sur l'IA",
    ],
  },

  // ─── Belgique ─────────────────────────────────────────────────────────────
  {
    id: "time-lex-be",
    name: "time.lex",
    countries: ["Belgique", "International"],
    specializations: ["AI Act", "RGPD / Data Protection", "DSA / DMA", "Droit des contrats IA"],
    description: "Cabinet bruxellois de niche, entièrement dédié au droit des technologies et de l'IA. Très proche des institutions européennes. Référence académique en droit de l'IA.",
    languages: ["Français", "Anglais", "Néerlandais"],
    website: "https://timelex.eu",
    tier: "top",
    city: "Bruxelles",
    highlights: [
      "Cabinet 100% tech & IA",
      "Professeurs universitaires parmi les associés",
      "Conseil de la Commission Européenne sur l'AI Act",
    ],
  },
  {
    id: "eubelius-be",
    name: "Eubelius",
    countries: ["Belgique"],
    specializations: ["RGPD / Data Protection", "AI Act", "Cybersécurité"],
    description: "Un des plus grands cabinets indépendants belges, avec une forte pratique regulatory et data. Accompagne les entreprises face à l'APD (CNIL belge).",
    languages: ["Français", "Néerlandais", "Anglais"],
    website: "https://www.eubelius.be",
    tier: "recommended",
    city: "Bruxelles",
    highlights: [
      "Top cabinet indépendant belge",
      "Expertise APD (autorité protection données belge)",
      "Réseau paneuropéen solide",
    ],
  },

  // ─── Allemagne ────────────────────────────────────────────────────────────
  {
    id: "linklaters-de",
    name: "Linklaters",
    countries: ["Allemagne", "France", "Pays-Bas", "International"],
    specializations: ["AI Act", "RGPD / Data Protection", "Due diligence IA", "Droit des contrats IA"],
    description: "Magic circle firm avec une practice data & technology de premier plan en Europe. Référence pour les transactions M&A impliquant des actifs IA.",
    languages: ["Anglais", "Allemand", "Français"],
    website: "https://www.linklaters.com",
    tier: "top",
    city: "Francfort, Paris, Amsterdam",
    highlights: [
      "Magic Circle — top 5 mondial",
      "Spécialistes M&A et due diligence IA",
      "Conseil des banques centrales et régulateurs",
    ],
  },
  {
    id: "noerr-de",
    name: "Noerr",
    countries: ["Allemagne"],
    specializations: ["AI Act", "RGPD / Data Protection", "Droit des contrats IA", "Cybersécurité"],
    description: "Premier cabinet allemand indépendant avec une practice digitale reconnue. Publie des guides pratiques sur l'AI Act en allemand, très actif auprès du BfDI (CNIL allemande).",
    languages: ["Allemand", "Anglais"],
    website: "https://www.noerr.com",
    tier: "recommended",
    city: "Munich, Berlin, Francfort",
    highlights: [
      "Top 3 droit numérique en Allemagne",
      "Guide AI Act en allemand",
      "Forte expertise industrie (Mittelstand + DAX)",
    ],
  },

  // ─── Pays-Bas ─────────────────────────────────────────────────────────────
  {
    id: "debrauw-nl",
    name: "De Brauw Blackstone Westbroek",
    countries: ["Pays-Bas"],
    specializations: ["AI Act", "RGPD / Data Protection", "Due diligence IA", "DSA / DMA"],
    description: "Meilleur cabinet néerlandais selon les classements internationaux. Practice tech & data très active, avec une expertise unique sur le DSA et DMA depuis Bruxelles.",
    languages: ["Néerlandais", "Anglais"],
    website: "https://www.debrauw.com",
    tier: "top",
    city: "Amsterdam, Bruxelles",
    highlights: [
      "#1 cabinet néerlandais (Legal 500, Chambers)",
      "Équipe dédiée DSA/DMA unique en Europe",
      "Conseil des plateformes Very Large Online",
    ],
  },

  // ─── Espagne ──────────────────────────────────────────────────────────────
  {
    id: "garrigues-es",
    name: "Garrigues",
    countries: ["Espagne", "Portugal", "International"],
    specializations: ["RGPD / Data Protection", "AI Act", "Droit des contrats IA"],
    description: "Premier cabinet ibérique indépendant avec une practice digital & data en forte croissance. Accompagne les entreprises face à l'AEPD (CNIL espagnole).",
    languages: ["Espagnol", "Portugais", "Anglais"],
    website: "https://www.garrigues.com",
    tier: "recommended",
    city: "Madrid, Barcelone, Lisbonne",
    highlights: [
      "#1 cabinet ibérique",
      "Experts AEPD (autorité protection données ESP)",
      "Forte présence en Amérique Latine",
    ],
  },

  // ─── Suisse ───────────────────────────────────────────────────────────────
  {
    id: "homburger-ch",
    name: "Homburger",
    countries: ["Suisse"],
    specializations: ["RGPD / Data Protection", "AI Act", "Droit des contrats IA", "Due diligence IA"],
    description: "Référence suisse pour le droit des technologies et des données. Expertise unique sur la LPD suisse (loi fédérale protection données) combinée à l'AI Act européen.",
    languages: ["Allemand", "Français", "Anglais"],
    website: "https://www.homburger.ch",
    tier: "recommended",
    city: "Zurich",
    highlights: [
      "Top cabinet suisse — Chambers Band 1",
      "Double expertise LPD + RGPD + AI Act",
      "Conseil des grandes banques et fintechs suisses",
    ],
  },

  // ─── Luxembourg ───────────────────────────────────────────────────────────
  {
    id: "loyens-loeff-lu",
    name: "Loyens & Loeff",
    countries: ["Luxembourg", "Pays-Bas", "Belgique"],
    specializations: ["RGPD / Data Protection", "AI Act", "Due diligence IA"],
    description: "Cabinet de référence pour les fonds d'investissement et les structures luxembourgeoises. Très actif sur les aspects data protection et AI compliance pour les fonds PE/VC.",
    languages: ["Français", "Néerlandais", "Anglais", "Allemand"],
    website: "https://www.loyensloeff.com",
    tier: "recommended",
    city: "Luxembourg, Amsterdam, Bruxelles",
    highlights: [
      "Référence fonds PE/VC Luxembourg",
      "Due diligence IA pour transactions M&A",
      "Expertise réglementaire financière + IA",
    ],
  },

  // ─── Spécialistes start-up / PME ──────────────────────────────────────────
  {
    id: "lexing-fr",
    name: "Lexing Alain Bensoussan Avocats",
    countries: ["France", "International"],
    specializations: ["RGPD / Data Protection", "AI Act", "Droit des contrats IA", "Propriété intellectuelle IA", "Droit du travail numérique"],
    description: "Cabinet pionnier du droit des technologies en France depuis 1978. Fondé par Alain Bensoussan, précurseur du droit de l'IA. Réseau Lexing de 30 cabinets en Europe.",
    languages: ["Français", "Anglais"],
    website: "https://www.alain-bensoussan.com",
    tier: "specialist",
    city: "Paris",
    highlights: [
      "Pioneer droit IA depuis 1978",
      "Réseau Lexing — 30 cabinets en Europe",
      "Auteur des premières lois IA en France",
    ],
  },
  {
    id: "mathias-fr",
    name: "Mathias Avocats",
    countries: ["France"],
    specializations: ["RGPD / Data Protection", "AI Act", "Cybersécurité", "Droit des contrats IA"],
    description: "Cabinet boutique parisien entièrement dédié au droit des données et de la vie privée. Accompagne start-ups et PME avec des tarifs adaptés. Très actif sur la veille réglementaire.",
    languages: ["Français", "Anglais"],
    website: "https://www.mathias-avocats.fr",
    tier: "specialist",
    city: "Paris",
    highlights: [
      "Cabinet 100% données & vie privée",
      "Tarifs adaptés PME et start-ups",
      "Blog réglementaire de référence en France",
    ],
  },
];

export const ALL_COUNTRIES: Country[] = [
  "France", "Belgique", "Allemagne", "Pays-Bas", "Espagne",
  "Italie", "Suisse", "Luxembourg", "Royaume-Uni", "International",
];

export const ALL_SPECIALIZATIONS: Specialization[] = [
  "AI Act",
  "RGPD / Data Protection",
  "DSA / DMA",
  "Droit des contrats IA",
  "Propriété intellectuelle IA",
  "Cybersécurité",
  "Droit du travail numérique",
  "Due diligence IA",
];
