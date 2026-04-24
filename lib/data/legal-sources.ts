export type SourceCategory =
  | "Institutions EU officielles"
  | "Suivi AI Act"
  | "Autorités de protection des données"
  | "Juridictions & droit"
  | "Cabinets & académique"
  | "Régulateurs sectoriels"
  | "Cybersécurité & numérique";

export interface LegalSource {
  id: string;
  name: string;
  category: SourceCategory;
  description: string;
  url: string;
  rssUrl?: string;
  country?: string;
  type: "officiel" | "tracker" | "académique" | "cabinet" | "régulateur" | "juridiction";
  tags: string[];
}

export const LEGAL_SOURCES: LegalSource[] = [
  // ── Institutions EU officielles ─────────────────────────────────────────────
  {
    id: "eur-lex",
    name: "EUR-Lex",
    category: "Institutions EU officielles",
    description: "Base de données officielle du droit de l'Union européenne — textes législatifs, JO, jurisprudence CJUE et documents préparatoires.",
    url: "https://eur-lex.europa.eu",
    rssUrl: "https://eur-lex.europa.eu/rss/RSSrecent.xml",
    type: "officiel",
    tags: ["Législation EU", "Journal Officiel", "CJUE", "Droit primaire"],
  },
  {
    id: "european-parliament",
    name: "Parlement Européen",
    category: "Institutions EU officielles",
    description: "Actualité législative du Parlement européen : votes, rapports de commission, positions en trilogue.",
    url: "https://www.europarl.europa.eu/news/fr",
    rssUrl: "https://www.europarl.europa.eu/rss/doc/press-releases-presse/fr.xml",
    type: "officiel",
    tags: ["Parlement EU", "Législation", "Votes", "Trilogue"],
  },
  {
    id: "european-commission",
    name: "Commission Européenne",
    category: "Institutions EU officielles",
    description: "Communiqués de presse, propositions législatives, consultations publiques et rapports de la Commission.",
    url: "https://ec.europa.eu/commission/presscorner",
    rssUrl: "https://ec.europa.eu/commission/presscorner/api/rss",
    type: "officiel",
    tags: ["Commission EU", "Propositions", "Consultations", "Régulation"],
  },
  {
    id: "council-eu",
    name: "Conseil de l'Union Européenne",
    category: "Institutions EU officielles",
    description: "Positions du Conseil, ordres du jour des réunions et adoptions de textes législatifs.",
    url: "https://www.consilium.europa.eu/fr/press/press-releases/",
    rssUrl: "https://www.consilium.europa.eu/rss/press-releases.xml",
    type: "officiel",
    tags: ["Conseil EU", "Législation", "Positions", "Trilogue"],
  },
  {
    id: "ai-office",
    name: "AI Office — Commission Européenne",
    category: "Institutions EU officielles",
    description: "Bureau de l'IA de la Commission : lignes directrices GPAI, codes de bonnes pratiques, supervision des modèles à risque systémique.",
    url: "https://digital-strategy.ec.europa.eu/en/policies/ai-office",
    type: "officiel",
    tags: ["AI Office", "GPAI", "AI Act", "Supervision"],
  },
  {
    id: "edpb",
    name: "European Data Protection Board (EDPB)",
    category: "Institutions EU officielles",
    description: "Avis, lignes directrices et décisions contraignantes de l'EDPB sur l'application du RGPD.",
    url: "https://edpb.europa.eu/our-work-tools/our-documents_fr",
    rssUrl: "https://edpb.europa.eu/rss.xml",
    type: "officiel",
    tags: ["EDPB", "RGPD", "Lignes directrices", "Décisions contraignantes"],
  },
  {
    id: "enisa",
    name: "ENISA — Agence EU Cybersécurité",
    category: "Institutions EU officielles",
    description: "Rapports techniques, recommandations et publications de l'ENISA sur NIS2, CRA, cybersécurité de l'IA.",
    url: "https://www.enisa.europa.eu/publications",
    rssUrl: "https://www.enisa.europa.eu/rss.xml",
    type: "officiel",
    tags: ["ENISA", "NIS2", "CRA", "Cybersécurité"],
  },

  // ── Suivi AI Act ─────────────────────────────────────────────────────────────
  {
    id: "ai-act-eu",
    name: "ArtificialIntelligenceAct.eu",
    category: "Suivi AI Act",
    description: "Site de référence pour le suivi article par article de l'AI Act, calendrier d'application, FAQ et analyse des obligations.",
    url: "https://artificialintelligenceact.eu/fr/",
    type: "tracker",
    tags: ["AI Act", "Calendrier", "Obligations", "Article par article"],
  },
  {
    id: "future-of-life",
    name: "Future of Life Institute — AI Policy",
    category: "Suivi AI Act",
    description: "Analyses de politique IA et suivi de la mise en œuvre de l'AI Act par le Future of Life Institute.",
    url: "https://futureoflife.org/cause-area/artificial-intelligence/",
    type: "tracker",
    tags: ["AI Act", "Politique IA", "Analyse", "Risque"],
  },
  {
    id: "algo-watch",
    name: "AlgorithmWatch",
    category: "Suivi AI Act",
    description: "Observatoire journalistique et de recherche sur l'impact des systèmes algorithmiques et de l'IA en Europe.",
    url: "https://algorithmwatch.org/en/",
    rssUrl: "https://algorithmwatch.org/en/feed/",
    type: "tracker",
    tags: ["Algorithmes", "AI Act", "Droits fondamentaux", "Journalisme d'investigation"],
  },
  {
    id: "access-now",
    name: "Access Now — AI Policy",
    category: "Suivi AI Act",
    description: "ONG de défense des droits numériques, suivi de l'AI Act du point de vue des droits fondamentaux.",
    url: "https://www.accessnow.org/issues/ai-policy/",
    type: "tracker",
    tags: ["Droits fondamentaux", "AI Act", "Société civile", "Surveillance"],
  },

  // ── Autorités de protection des données ─────────────────────────────────────
  {
    id: "cnil",
    name: "CNIL — France",
    category: "Autorités de protection des données",
    description: "Commission Nationale de l'Informatique et des Libertés : délibérations, mises en demeure, sanctions et recommandations RGPD & IA.",
    url: "https://www.cnil.fr/fr/actualites",
    rssUrl: "https://www.cnil.fr/fr/rss.xml",
    country: "FR",
    type: "régulateur",
    tags: ["CNIL", "RGPD", "Sanctions", "IA", "France"],
  },
  {
    id: "dpc",
    name: "Data Protection Commission — Irlande",
    category: "Autorités de protection des données",
    description: "DPC irlandaise, principale autorité de contrôle des GAFAM établis en Irlande sous guichet unique RGPD.",
    url: "https://www.dataprotection.ie/en/news-media",
    rssUrl: "https://www.dataprotection.ie/en/rss.xml",
    country: "IE",
    type: "régulateur",
    tags: ["DPC", "RGPD", "Irlande", "Big Tech", "Guichet unique"],
  },
  {
    id: "garante",
    name: "Garante — Italie",
    category: "Autorités de protection des données",
    description: "Autorité italienne de protection des données. Première à bloquer ChatGPT en 2023 (puis levée), active sur l'IA générative.",
    url: "https://www.garanteprivacy.it/home/docweb",
    country: "IT",
    type: "régulateur",
    tags: ["Garante", "RGPD", "Italie", "IA générative", "ChatGPT"],
  },
  {
    id: "bfdi",
    name: "BfDI — Allemagne",
    category: "Autorités de protection des données",
    description: "Préposé fédéral allemand à la protection des données et à la liberté d'information.",
    url: "https://www.bfdi.bund.de/DE/Home/home_node.html",
    country: "DE",
    type: "régulateur",
    tags: ["BfDI", "RGPD", "Allemagne", "Fédéral"],
  },
  {
    id: "aepd",
    name: "AEPD — Espagne",
    category: "Autorités de protection des données",
    description: "Agencia Española de Protección de Datos — décisions et sanctions RGPD en Espagne, active sur les LLM et l'IA.",
    url: "https://www.aepd.es/es/prensa-y-comunicacion/notas-de-prensa",
    country: "ES",
    type: "régulateur",
    tags: ["AEPD", "RGPD", "Espagne", "IA"],
  },
  {
    id: "ap-nl",
    name: "Autoriteit Persoonsgegevens — Pays-Bas",
    category: "Autorités de protection des données",
    description: "AP néerlandaise : délibérations, amendes RGPD et recommandations sur les systèmes IA dans le secteur public.",
    url: "https://www.autoriteitpersoonsgegevens.nl/nl/nieuws",
    rssUrl: "https://www.autoriteitpersoonsgegevens.nl/nl/rss.xml",
    country: "NL",
    type: "régulateur",
    tags: ["AP", "RGPD", "Pays-Bas", "Secteur public"],
  },
  {
    id: "ico",
    name: "ICO — Royaume-Uni",
    category: "Autorités de protection des données",
    description: "Information Commissioner's Office britannique. Hors UE post-Brexit mais très influent sur l'IA et la protection des données.",
    url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/",
    rssUrl: "https://ico.org.uk/feed/rss",
    country: "GB",
    type: "régulateur",
    tags: ["ICO", "UK GDPR", "Royaume-Uni", "IA", "Post-Brexit"],
  },

  // ── Juridictions & droit ─────────────────────────────────────────────────────
  {
    id: "cjue",
    name: "Cour de Justice de l'UE (CJUE)",
    category: "Juridictions & droit",
    description: "Communiqués de presse et arrêts de la Cour de Justice de l'Union Européenne — droit fondamental de l'UE.",
    url: "https://curia.europa.eu/jcms/jcms/Jo2_7052/fr/",
    rssUrl: "https://curia.europa.eu/rss.xml",
    type: "juridiction",
    tags: ["CJUE", "Arrêts", "Droit EU", "Droits fondamentaux", "Renvoi préjudiciel"],
  },
  {
    id: "cedh",
    name: "Cour Européenne des Droits de l'Homme (CEDH)",
    category: "Juridictions & droit",
    description: "Arrêts et décisions de la CEDH — droits fondamentaux, vie privée (Art. 8 CSDH), surveillance et IA.",
    url: "https://www.echr.coe.int/Pages/home.aspx?p=press/pressreleases",
    rssUrl: "https://www.echr.coe.int/Pages/home.aspx?p=rss",
    type: "juridiction",
    tags: ["CEDH", "Droits fondamentaux", "Art. 8 CSDH", "Vie privée", "Surveillance"],
  },
  {
    id: "conseil-etat",
    name: "Conseil d'État — France",
    category: "Juridictions & droit",
    description: "Décisions, avis et études du Conseil d'État sur l'IA, les algorithmes dans la décision publique et le RGPD.",
    url: "https://www.conseil-etat.fr/actualites/communiques-de-presse",
    country: "FR",
    type: "juridiction",
    tags: ["Conseil d'État", "Droit administratif", "Algorithmes", "Service public", "France"],
  },

  // ── Cabinets & académique ────────────────────────────────────────────────────
  {
    id: "linklaters-ai",
    name: "Linklaters — AI Tracker",
    category: "Cabinets & académique",
    description: "Suivi mondial de la réglementation IA par Linklaters, couvrant l'AI Act, le RGPD et les réglementations nationales d'implémentation.",
    url: "https://www.linklaters.com/en/insights/publications/ai-regulation-tracker",
    type: "cabinet",
    tags: ["Linklaters", "AI Act", "Tracker", "Droit comparé", "Cabinet international"],
  },
  {
    id: "bird-bird-tech",
    name: "Bird & Bird — Technology Law",
    category: "Cabinets & académique",
    description: "Alertes juridiques de Bird & Bird sur l'AI Act, RGPD, DMA/DSA et autres réglementations tech européennes.",
    url: "https://www.twobirds.com/en/insights?tags=artificial-intelligence",
    type: "cabinet",
    tags: ["Bird & Bird", "AI Act", "RGPD", "DMA", "Tech Law"],
  },
  {
    id: "fieldfisher-ai",
    name: "Fieldfisher — AI & Data Law",
    category: "Cabinets & académique",
    description: "Publications et newsletters du cabinet Fieldfisher sur le droit des données et de l'intelligence artificielle.",
    url: "https://www.fieldfisher.com/en/insights?practice=privacy-security-information",
    type: "cabinet",
    tags: ["Fieldfisher", "Data Law", "IA", "RGPD", "Cabinet européen"],
  },
  {
    id: "iapp",
    name: "IAPP — International Association of Privacy Professionals",
    category: "Cabinets & académique",
    description: "Association internationale des professionnels de la confidentialité — actualités RGPD, AI Act, certifications DPO.",
    url: "https://iapp.org/news/",
    rssUrl: "https://iapp.org/feed/news",
    type: "académique",
    tags: ["IAPP", "RGPD", "DPO", "AI Act", "Formation", "Certification"],
  },
  {
    id: "future-eu-law",
    name: "Future of EU Law (Blog)",
    category: "Cabinets & académique",
    description: "Blog académique sur le droit européen de l'IA, du numérique et de la régulation technologique.",
    url: "https://www.futureofeulaw.com/",
    type: "académique",
    tags: ["Académique", "Droit EU", "IA", "Régulation", "Blog"],
  },

  // ── Régulateurs sectoriels ───────────────────────────────────────────────────
  {
    id: "eba",
    name: "Autorité Bancaire Européenne (EBA)",
    category: "Régulateurs sectoriels",
    description: "Publications de l'EBA sur DORA, l'utilisation de l'IA dans les services financiers et la gestion des risques technologiques.",
    url: "https://www.eba.europa.eu/news-press/calendar",
    rssUrl: "https://www.eba.europa.eu/rss.xml",
    type: "régulateur",
    tags: ["EBA", "DORA", "Finance", "Risque technologique", "IA finance"],
  },
  {
    id: "esma",
    name: "ESMA — Autorité Européenne des Marchés Financiers",
    category: "Régulateurs sectoriels",
    description: "ESMA : publications sur l'IA dans les marchés financiers, MiCA, et la protection des investisseurs.",
    url: "https://www.esma.europa.eu/press-news/esma-news",
    rssUrl: "https://www.esma.europa.eu/sites/default/files/rss.xml",
    type: "régulateur",
    tags: ["ESMA", "Marchés financiers", "MiCA", "IA", "Investisseurs"],
  },
  {
    id: "eiopa",
    name: "EIOPA — Assurances & Pensions",
    category: "Régulateurs sectoriels",
    description: "Autorité européenne des assurances : recommandations sur l'utilisation de l'IA dans la souscription, la tarification et les sinistres.",
    url: "https://www.eiopa.europa.eu/media/news",
    type: "régulateur",
    tags: ["EIOPA", "Assurances", "IA", "Tarification", "Souscription"],
  },
  {
    id: "ema",
    name: "EMA — Agence Européenne des Médicaments",
    category: "Régulateurs sectoriels",
    description: "EMA : lignes directrices sur l'IA dans le développement clinique, la pharmacovigilance et la réglementation des dispositifs médicaux.",
    url: "https://www.ema.europa.eu/en/news",
    rssUrl: "https://www.ema.europa.eu/rss/news.xml",
    type: "régulateur",
    tags: ["EMA", "Santé", "IA médicale", "Dispositifs médicaux", "Pharmacovigilance"],
  },

  // ── Cybersécurité & numérique ────────────────────────────────────────────────
  {
    id: "anssi",
    name: "ANSSI — France",
    category: "Cybersécurité & numérique",
    description: "Agence Nationale de la Sécurité des Systèmes d'Information : publications sur NIS2, CRA, sécurité de l'IA et des infrastructures critiques.",
    url: "https://www.ssi.gouv.fr/actualite/",
    rssUrl: "https://www.ssi.gouv.fr/feed/",
    country: "FR",
    type: "régulateur",
    tags: ["ANSSI", "NIS2", "CRA", "Cybersécurité", "France"],
  },
  {
    id: "bsi",
    name: "BSI — Allemagne",
    category: "Cybersécurité & numérique",
    description: "Office fédéral allemand de la sécurité des technologies de l'information — recommandations NIS2, CRA, sécurité IA.",
    url: "https://www.bsi.bund.de/DE/Service-Navi/Presse/Pressemitteilungen/pressemitteilungen_node.html",
    country: "DE",
    type: "régulateur",
    tags: ["BSI", "NIS2", "CRA", "Cybersécurité", "Allemagne"],
  },
  {
    id: "digital-europe",
    name: "DigitalEurope — Association industrielle",
    category: "Cybersécurité & numérique",
    description: "Association industrielle européenne (IBM, Microsoft, SAP…) : positions sur l'AI Act, DMA, CRA et NIS2.",
    url: "https://www.digitaleurope.org/news/",
    type: "cabinet",
    tags: ["DigitalEurope", "Industrie", "Lobbying", "AI Act", "DMA", "CRA"],
  },
  {
    id: "netzpolitik",
    name: "Netzpolitik.org",
    category: "Cybersécurité & numérique",
    description: "Média indépendant de référence sur la politique numérique européenne : surveillance, droits fondamentaux, IA Act, RGPD.",
    url: "https://netzpolitik.org/",
    rssUrl: "https://netzpolitik.org/feed/",
    country: "DE",
    type: "tracker",
    tags: ["Netzpolitik", "Politique numérique", "Surveillance", "IA", "RGPD"],
  },
];

export function getSourcesByCategory(): Record<SourceCategory, LegalSource[]> {
  return LEGAL_SOURCES.reduce((acc, source) => {
    if (!acc[source.category]) acc[source.category] = [];
    acc[source.category].push(source);
    return acc;
  }, {} as Record<SourceCategory, LegalSource[]>);
}

export function getSourcesWithRSS(): LegalSource[] {
  return LEGAL_SOURCES.filter((s) => !!s.rssUrl);
}

export const CATEGORY_ORDER: SourceCategory[] = [
  "Institutions EU officielles",
  "Suivi AI Act",
  "Autorités de protection des données",
  "Juridictions & droit",
  "Cabinets & académique",
  "Régulateurs sectoriels",
  "Cybersécurité & numérique",
];
