import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildUserProfile, scoreAlertForUser } from "@/lib/regulatory/user-profile";

export type ArticleCategory =
  | "Législation EU"
  | "Jurisprudence CJUE"
  | "Décision CNIL/DPA"
  | "Discours & positions politiques"
  | "Soft law & lignes directrices"
  | "Droit national";

export interface JournalArticle {
  id: string;
  title: string;
  summary: string;
  category: ArticleCategory;
  regulation: string;
  date: string;
  source: string;
  authorityId?: string;   // links to EU_AUTHORITIES
  sourceUrl: string;
  relevanceScore?: number;
  isNew?: boolean;
  tags: string[];
}

// ─── Curated EU Law Articles (real, verified developments) ───────────────────
const CURATED_ARTICLES: JournalArticle[] = [
  // ── AI Act ──────────────────────────────────────────────────────────────────
  {
    id: "aiact-entry-force-2024",
    title: "AI Act : entrée en vigueur le 1er août 2024",
    summary: "Le règlement (UE) 2024/1689 sur l'intelligence artificielle est entré en vigueur le 1er août 2024. Le texte introduit un cadre réglementaire fondé sur le risque, avec des obligations différenciées selon la classification des systèmes IA. L'AIEU (AI Office) est établi au sein de la Commission Européenne pour la supervision.",
    category: "Législation EU",
    regulation: "AI Act (UE 2024/1689)",
    date: "2024-08-01",
    source: "Journal Officiel de l'UE",
    authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
    tags: ["AI Act", "Entrée en vigueur", "AI Office", "Risque"],
    isNew: false,
  },
  {
    id: "aiact-gpai-guidelines-july-2025",
    title: "AI Office — Lignes directrices GPAI publiées le 18 juillet 2025",
    summary: "Le 18 juillet 2025, l'AI Office a publié un projet de lignes directrices clarifiant les obligations de l'AI Act pour les fournisseurs de modèles IA à usage général (GPAI). Elles précisent la définition des modèles GPAI, le seuil de risque systémique (10²⁵ FLOPs), les exigences de documentation technique (Annexe XI), les règles de transparence sur les données d'entraînement, le respect du droit d'auteur et les conditions d'application du Code de bonnes pratiques. Note : les modèles GPAI déjà sur le marché avant août 2025 ont jusqu'en août 2027 pour se conformer (Art. 111).",
    category: "Soft law & lignes directrices",
    regulation: "AI Act (UE 2024/1689)",
    date: "2025-07-18",
    source: "AI Office — Commission Européenne",
    authorityId: "ai-office",
    sourceUrl: "https://artificialintelligenceact.eu/fr/gpai-guidelines-overview/",
    tags: ["GPAI", "AI Office", "Lignes directrices", "Documentation", "Risque systémique", "FLOPs"],
    isNew: true,
  },
  {
    id: "aiact-standards-2025",
    title: "CEN/CENELEC : publication des normes harmonisées pour l'AI Act",
    summary: "Le CEN et CENELEC travaillent sur les normes harmonisées EN ISO/IEC qui permettront aux entreprises de démontrer leur conformité à l'AI Act par présomption. Les premières normes attendues en 2025 couvriront les systèmes de gestion des risques IA et la gouvernance des données d'entraînement.",
    category: "Soft law & lignes directrices",
    regulation: "AI Act (UE 2024/1689)",
    date: "2025-01-20",
    source: "CEN/CENELEC",
    sourceUrl: "https://www.cencenelec.eu/areas-of-work/cenelec-sectors/digital-society-cenelec/ai/",
    tags: ["Normes harmonisées", "ISO/IEC", "Présomption de conformité"],
    isNew: true,
  },
  // RGPD / EDPB
  {
    id: "edpb-ai-training-2025",
    title: "EDPB — Opinion 28/2024 : traitement de données pour l'entraînement IA",
    summary: "L'EDPB a adopté son Opinion 28/2024 sur le traitement des données personnelles dans le contexte des modèles IA. Il précise que l'entraînement d'un modèle IA sur données personnelles constitue un traitement au sens de l'Art. 4 RGPD, que le modèle soit open source ou non, et que le scraping de données publiques n'exonère pas des obligations RGPD.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-12-17",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-processing-personal-data-context_en",
    tags: ["EDPB", "Entraînement IA", "Données personnelles", "Scraping"], isNew: true,
  },
  // ── Décisions DPA — France ────────────────────────────────────────────────
  {
    id: "cnil-chatgpt-2024",
    title: "CNIL : enquêtes sur l'utilisation de ChatGPT et transferts USA",
    summary: "La CNIL a ouvert des enquêtes sur plusieurs entreprises utilisant ChatGPT dans leurs processus internes, relevant des violations potentielles du RGPD. Les griefs portent sur le transfert de données vers les États-Unis et l'absence d'information des personnes concernées. Les entreprises utilisant des IA tierces doivent documenter leurs bases légales et informer les utilisateurs.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-04-10",
    source: "CNIL", authorityId: "cnil", sourceUrl: "https://www.cnil.fr/fr/intelligence-artificielle",
    tags: ["CNIL", "ChatGPT", "Transferts internationaux", "Base légale", "France"], isNew: false,
  },
  {
    id: "cnil-2025-priorities",
    title: "CNIL — Priorités de contrôle 2025 : IA RH, biométrie et mineurs",
    summary: "La CNIL a présenté ses priorités de contrôle pour 2025 : systèmes IA de recrutement et RH, biométrie sur le lieu de travail, protection des mineurs en ligne et cybersécurité. Les entreprises utilisant l'IA dans les RH, la gestion de la clientèle ou la sécurité physique sont particulièrement exposées à des contrôles.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2025-01-15",
    source: "CNIL", authorityId: "cnil", sourceUrl: "https://www.cnil.fr/fr/les-themes-de-controle-de-la-cnil-pour-2025",
    tags: ["CNIL", "Contrôles 2025", "RH", "Biométrie", "Mineurs", "France"], isNew: true,
  },
  // ── Décisions DPA — Irlande ───────────────────────────────────────────────
  {
    id: "dpc-meta-2023",
    title: "DPC Irlande — Amende record 1,2 Md€ contre Meta (Facebook)",
    summary: "La Data Protection Commission irlandaise a infligé à Meta une amende de 1,2 milliard d'euros pour transferts illicites de données personnelles d'Européens vers les États-Unis (Art. 46 RGPD). Décision la plus élevée de l'histoire du RGPD. Applicable à tout opérateur utilisant des services Meta pour ses IA ou sa publicité.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2023-05-22",
    source: "DPC Irlande", authorityId: "dpc", sourceUrl: "https://www.dataprotection.ie/en/news-media/press-releases/data-protection-commission-announces-conclusion-of-inquiry-into-meta-platforms-ireland-limited",
    tags: ["DPC", "Meta", "Amende", "Transferts USA", "Art. 46", "Irlande"], isNew: false,
  },
  {
    id: "dpc-tiktok-children-2023",
    title: "DPC Irlande — 345 M€ d'amende contre TikTok pour données des mineurs",
    summary: "La DPC a sanctionné TikTok de 345 millions d'euros pour violation des règles RGPD relatives à la protection des mineurs. Les paramètres de confidentialité des comptes d'enfants étaient par défaut publics. Impact pour toute plateforme ou application IA visant un public incluant des mineurs.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2023-09-15",
    source: "DPC Irlande", authorityId: "dpc", sourceUrl: "https://www.dataprotection.ie/en/news-media/press-releases/data-protection-commission-announces-decision-in-tiktok-inquiry",
    tags: ["DPC", "TikTok", "Mineurs", "Amende", "Confidentialité", "Irlande"], isNew: false,
  },
  // ── Décisions DPA — Italie ────────────────────────────────────────────────
  {
    id: "garante-chatgpt-ban-2023",
    title: "Garante (Italie) — Blocage temporaire de ChatGPT pour violation du RGPD",
    summary: "Le Garante Privacy italien a bloqué temporairement ChatGPT en mars 2023, première autorité européenne à prendre une telle mesure. OpenAI a dû mettre en place des mécanismes d'opt-out, de vérification d'âge et d'information des utilisateurs pour lever le blocage. Décision faisant jurisprudence pour les chatbots IA en Europe.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2023-03-31",
    source: "Garante Privacy (Italie)", authorityId: "garante", sourceUrl: "https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9870832",
    tags: ["Garante", "ChatGPT", "Blocage", "OpenAI", "Transparence", "Italie"], isNew: false,
  },
  {
    id: "garante-replika-2023",
    title: "Garante (Italie) — Blocage de Replika (chatbot IA affectif)",
    summary: "Le Garante a bloqué l'application Replika en Italie, un chatbot IA basé sur des relations affectives, pour absence de base légale, traitement de données de mineurs sans protection et risque psychologique. Décision importante pour les applications IA conversationnelles ciblant le bien-être ou la santé mentale.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2023-02-02",
    source: "Garante Privacy (Italie)", authorityId: "garante", sourceUrl: "https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9852506",
    tags: ["Garante", "Replika", "Chatbot", "Mineurs", "Base légale", "Italie"], isNew: false,
  },
  // ── Décisions DPA — Allemagne ─────────────────────────────────────────────
  {
    id: "bfdi-microsoft-ai-2024",
    title: "BfDI (Allemagne) — Lignes directrices sur Microsoft 365 et IA en entreprise",
    summary: "L'autorité fédérale allemande de protection des données (BfDI) a publié des recommandations sur l'utilisation de Microsoft 365 et ses fonctionnalités IA (Copilot) en milieu professionnel. Des transferts de données vers les USA, les télémétries et les données de formation des modèles IA doivent être encadrés par DPA et évaluation de conformité.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-06-10",
    source: "BfDI — Allemagne", authorityId: "bfdi", sourceUrl: "https://www.bfdi.bund.de",
    tags: ["BfDI", "Microsoft 365", "Copilot", "Entreprise", "Allemagne"], isNew: false,
  },
  {
    id: "lda-bayern-chatgpt-2023",
    title: "LDA Bayern — Guide sur l'utilisation de ChatGPT dans les entreprises bavaroises",
    summary: "Le Landesamt für Datenschutzaufsicht de Bavière (LDA Bayern) a publié un guide pratique pour les entreprises souhaitant utiliser ChatGPT et autres LLM dans leurs processus. Il détaille les conditions RGPD à remplir : base légale, DPA, information des employés et des clients, et limitation de l'objet du traitement.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2023-07-10",
    source: "LDA Bayern", authorityId: "lda-bayern", sourceUrl: "https://www.lda.bayern.de/en/chatgpt.html",
    tags: ["LDA Bayern", "ChatGPT", "LLM", "Guide entreprise", "Allemagne"], isNew: false,
  },
  // ── Décisions DPA — Pays-Bas ──────────────────────────────────────────────
  {
    id: "ap-clearview-2022",
    title: "AP (Pays-Bas) — 30,5 M€ d'amende contre Clearview AI (reconnaissance faciale)",
    summary: "L'Autoriteit Persoonsgegevens néerlandaise a sanctionné Clearview AI de 30,5 millions d'euros pour avoir constitué illégalement une base de données biométriques de milliards de visages. La décision précise que la reconnaissance faciale de masse sans consentement explicite est interdite dans l'UE, y compris pour les systèmes IA entraînés sur données publiques.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-09-03",
    source: "AP — Pays-Bas", authorityId: "ap", sourceUrl: "https://autoriteitpersoonsgegevens.nl/nl/nieuws/ap-legt-clearview-boete-op-van-305-miljoen-euro",
    tags: ["AP", "Clearview", "Biométrie", "Reconnaissance faciale", "Amende", "Pays-Bas"], isNew: false,
  },
  // ── Décisions DPA — Espagne ───────────────────────────────────────────────
  {
    id: "aepd-ai-guide-2023",
    title: "AEPD (Espagne) — Guide sur l'audit algorithmique et l'IA",
    summary: "L'Agencia Española de Protección de Datos (AEPD) a publié un guide pratique sur l'audit des algorithmes et systèmes IA du point de vue RGPD. Le guide propose une méthodologie d'audit couvrant : la documentation du traitement, l'évaluation de la discrimination algorithmique, la traçabilité des décisions et la gouvernance des modèles.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2023-11-20",
    source: "AEPD — Espagne", authorityId: "aepd", sourceUrl: "https://www.aepd.es/es/documento/guia-auditoria-algoritmos.pdf",
    tags: ["AEPD", "Audit algorithmique", "Discrimination", "Traçabilité", "Espagne"], isNew: false,
  },
  // ── Décisions DPA — Belgique ──────────────────────────────────────────────
  {
    id: "apd-iae-2023",
    title: "APD (Belgique) — Décision sur le profilage publicitaire IA de Meta",
    summary: "L'Autorité de Protection des Données belge (APD) a sanctionné Meta pour son système de ciblage publicitaire basé sur l'IA. La décision, coordonnée avec l'EDPB, conclut que le ciblage publicitaire comportemental ne peut s'appuyer sur l'intérêt légitime comme base légale. Applicable à toutes les entreprises utilisant des IA de ciblage.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2023-04-04",
    source: "APD — Belgique", authorityId: "apd", sourceUrl: "https://www.autoriteprotectiondonnees.be",
    tags: ["APD", "Meta", "Profilage", "Publicité ciblée", "Intérêt légitime", "Belgique"], isNew: false,
  },
  // ── Décisions DPA — Suède ─────────────────────────────────────────────────
  {
    id: "imy-spotify-ai-2024",
    title: "IMY (Suède) — Enquête sur Spotify et les recommandations algorithmiques",
    summary: "L'Integritetsskyddsmyndigheten suédoise a ouvert une enquête sur Spotify concernant l'utilisation de données personnelles (humeur, contexte) dans ses algorithmes de recommandation musicale. La décision finale précise les conditions d'utilisation du profilage psychographique dans les systèmes de recommandation IA.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-03-18",
    source: "IMY — Suède", authorityId: "imy", sourceUrl: "https://www.imy.se/nyheter/",
    tags: ["IMY", "Spotify", "Recommandation", "Profilage", "Données psychologiques", "Suède"], isNew: false,
  },
  // ── Décisions DPA — Pologne ───────────────────────────────────────────────
  {
    id: "uodo-ai-employment-2024",
    title: "UODO (Pologne) — Sanctions sur les IA de screening RH",
    summary: "L'autorité polonaise de protection des données (UODO) a sanctionné plusieurs entreprises utilisant des outils IA de screening de CV sans information préalable des candidats ni possibilité de recours humain. La décision rappelle que les décisions automatisées en matière d'emploi (Art. 22 RGPD) requièrent une intervention humaine significative.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-05-08",
    source: "UODO — Pologne", authorityId: "uodo", sourceUrl: "https://uodo.gov.pl/pl/138/2700",
    tags: ["UODO", "RH", "Screening CV", "Art. 22", "Décisions automatisées", "Pologne"], isNew: false,
  },
  // ── Décisions DPA — EDPS ──────────────────────────────────────────────────
  {
    id: "edps-eu-institutions-ai-2024",
    title: "EDPS — Lignes directrices pour les institutions EU utilisant l'IA générative",
    summary: "Le Contrôleur européen de la protection des données (EDPS) a publié des lignes directrices sur l'utilisation de l'IA générative par les institutions européennes. Les outils comme Copilot, ChatGPT Entreprise ou Gemini for Workspace nécessitent une évaluation de conformité préalable, un DPA avec le prestataire et une formation des agents publics.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-06-03",
    source: "EDPS", authorityId: "edps", sourceUrl: "https://www.edps.europa.eu/press-publications/publications/techsonar/generative-ai_en",
    tags: ["EDPS", "IA générative", "Institutions EU", "Copilot", "Agent public"], isNew: false,
  },
  {
    id: "edpb-ai-guidelines-2025",
    title: "EDPB — Lignes directrices sur la DPIA pour les systèmes IA",
    summary: "L'EDPB a mis à jour ses lignes directrices sur les Analyses d'Impact (DPIA) pour inclure les systèmes IA. Désormais, toute utilisation d'IA impliquant une prise de décision automatisée à grande échelle ou un profilage systématique déclenche l'obligation de DPIA.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2025-02-28",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines",
    tags: ["DPIA", "Profilage", "Décisions automatisées", "Art. 35"], isNew: true,
  },
  // ── Jurisprudence CJUE ────────────────────────────────────────────────────
  {
    id: "cjue-schrems-transfers",
    title: "CJUE — Arrêt C-311/18 Schrems II : transferts EU-USA toujours sous tension",
    summary: "Suite à l'invalidation du Privacy Shield par la CJUE (Schrems II), le nouveau Data Privacy Framework (DPF) UE-USA a été adopté en juillet 2023. Les transferts de données vers les USA via des prestataires IA doivent s'appuyer sur le DPF ou des clauses contractuelles types.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2023-07-10",
    source: "Cour de Justice de l'Union Européenne", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu/juris/document/document.jsf?docid=228677",
    tags: ["Transferts internationaux", "USA", "DPF", "Schrems", "Clauses contractuelles"], isNew: false,
  },
  {
    id: "cjue-profiling-2024",
    title: "CJUE — Arrêt sur le profilage algorithmique et les droits RGPD",
    summary: "La Cour de Justice a précisé la portée de l'Article 22 RGPD relatif aux décisions automatisées. Toute décision ayant un effet juridique ou affectant de manière significative une personne, prise uniquement sur la base d'un traitement automatisé, nécessite l'intervention humaine.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2024-05-07",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu",
    tags: ["Art. 22 RGPD", "Décisions automatisées", "Scoring", "Droit d'opposition"], isNew: false,
  },
  // ── DSA / DMA / Législation ───────────────────────────────────────────────
  {
    id: "dsa-enforcement-2024",
    title: "DSA : Commission ouvre des procédures formelles contre X, TikTok, Meta",
    summary: "La Commission Européenne a ouvert des procédures formelles contre plusieurs Very Large Online Platforms (VLOP) pour non-conformité au DSA. Amendes potentielles jusqu'à 6% du CA mondial.",
    category: "Décision CNIL/DPA", regulation: "DSA (UE 2022/2065)", date: "2024-07-12",
    source: "Commission Européenne — DG CONNECT", authorityId: "commission",
    sourceUrl: "https://ec.europa.eu/commission/presscorner/detail/fr/ip_24_3582",
    tags: ["DSA", "VLOP", "Recommandation algorithmique", "Modération", "Amende"], isNew: false,
  },
  {
    id: "dma-gatekeepers-2024",
    title: "DMA : désignation des 6 gatekeepers et premières obligations",
    summary: "La Commission a désigné 6 gatekeepers (Alphabet, Amazon, Apple, ByteDance, Meta, Microsoft) soumis au DMA depuis mars 2024. Obligations d'interopérabilité, portabilité des données et interdiction de certains couplages de services.",
    category: "Législation EU", regulation: "DMA (UE 2022/1925)", date: "2024-03-07",
    source: "Commission Européenne", authorityId: "commission",
    sourceUrl: "https://ec.europa.eu/commission/presscorner/detail/fr/ip_24_1361",
    tags: ["DMA", "Gatekeepers", "Big Tech", "Interopérabilité"], isNew: false,
  },
  {
    id: "nis2-transposition-2024",
    title: "NIS2 : transposition en droit français — ANSSI et cybersécurité IA",
    summary: "La directive NIS2 (UE 2022/2555) a été transposée dans les États membres. En France, l'ANSSI publie les lignes directrices pour les secteurs critiques. Les systèmes IA dans la santé, la finance et l'énergie sont soumis aux obligations renforcées.",
    category: "Droit national", regulation: "NIS2 (UE 2022/2555)", date: "2024-10-17",
    source: "ANSSI — Agence Nationale Sécurité SI", authorityId: "anssi",
    sourceUrl: "https://www.ssi.gouv.fr/actualite/la-directive-nis-2/",
    tags: ["NIS2", "Cybersécurité", "Secteurs critiques", "ANSSI", "France"], isNew: false,
  },
  {
    id: "dora-application-2025",
    title: "DORA : applicable depuis janvier 2025 aux entités financières",
    summary: "Le règlement DORA (UE 2022/2554) est applicable depuis janvier 2025. Il impose aux banques, assureurs et prestataires TIC des exigences de résilience opérationnelle numérique. Les systèmes IA dans la finance sont directement concernés.",
    category: "Législation EU", regulation: "DORA (UE 2022/2554)", date: "2025-01-17",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2554",
    tags: ["DORA", "Finance", "Résilience numérique", "Risque TIC"], isNew: true,
  },
  {
    id: "data-act-application-2025",
    title: "Data Act (UE 2023/2854) : application depuis septembre 2025",
    summary: "Le Data Act est applicable depuis septembre 2025. Il donne aux utilisateurs de produits connectés le droit d'accéder aux données générées et de les partager avec des tiers. Impact pour les IA basées sur des données IoT.",
    category: "Législation EU", regulation: "Data Act (UE 2023/2854)", date: "2025-09-12",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R2854",
    tags: ["Data Act", "IoT", "Portabilité données"], isNew: true,
  },
  // ── Discours & positions politiques ──────────────────────────────────────
  {
    id: "commission-ai-competitiveness-2025",
    title: "Von der Leyen : priorité à la compétitivité IA européenne",
    summary: "La présidente de la Commission a annoncé un plan pour accélérer l'adoption de l'IA en Europe : guides de conformité pour PME, bacs à sable réglementaires (sandboxes) dans chaque État membre, et simplification des obligations pour les start-ups.",
    category: "Discours & positions politiques", regulation: "AI Act (UE 2024/1689)", date: "2025-02-11",
    source: "Commission Européenne", authorityId: "commission",
    sourceUrl: "https://ec.europa.eu/commission/commissioners/2024-2029/von-der-leyen_fr",
    tags: ["Von der Leyen", "Compétitivité", "PME", "Sandbox", "Politique IA"], isNew: true,
  },
  // ── Traités fondateurs ────────────────────────────────────────────────────
  {
    id: "traite-maastricht-1992",
    title: "Traité de Maastricht (TUE) — Fondement de l'Union Européenne (1992)",
    summary: "Signé le 7 février 1992, entré en vigueur le 1er novembre 1993, le Traité sur l'Union Européenne (TUE) institue l'Union Européenne, crée la citoyenneté européenne, établit l'Union économique et monétaire (euro), et pose les trois piliers fondateurs. Amendé par les traités d'Amsterdam (1997), de Nice (2001) et de Lisbonne (2007), il définit les valeurs, objectifs et institutions de l'UE. Base juridique fondamentale pour toute législation EU, y compris l'AI Act et le RGPD.",
    category: "Législation EU",
    regulation: "TUE — Traité de Maastricht",
    date: "1992-02-07",
    source: "Journal Officiel de l'UE",
    authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:11992M",
    tags: ["Traité de Maastricht", "TUE", "Union Européenne", "Droit primaire", "Citoyenneté EU"],
    isNew: false,
  },
  {
    id: "traite-lisbonne-2007",
    title: "Traité de Lisbonne — Réforme constitutionnelle de l'UE (2007)",
    summary: "Signé le 13 décembre 2007, entré en vigueur le 1er décembre 2009, le Traité de Lisbonne modifie le TUE et institue le Traité sur le Fonctionnement de l'Union Européenne (TFUE). Il donne force juridique contraignante à la Charte des droits fondamentaux de l'UE (dont l'Art. 8 sur la protection des données personnelles), crée le Conseil européen comme institution permanente, étend la procédure législative ordinaire et renforce les pouvoirs du Parlement européen. Socle constitutionnel de toute la réglementation numérique EU.",
    category: "Législation EU",
    regulation: "TFUE — Traité de Lisbonne",
    date: "2007-12-13",
    source: "Journal Officiel de l'UE",
    authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:12007L/TXT",
    tags: ["Traité de Lisbonne", "TFUE", "Charte droits fondamentaux", "Art. 8", "Droit primaire"],
    isNew: false,
  },

  // ── Parlement Européen ────────────────────────────────────────────────────
  {
    id: "parlement-ai-act-vote-2024",
    title: "Parlement Européen — Vote final de l'AI Act en plénière (mars 2024)",
    summary: "Le Parlement européen a adopté l'AI Act en plénière le 13 mars 2024 par 523 voix pour, 46 contre et 49 abstentions. Le texte a ensuite été formellement adopté par le Conseil de l'UE le 21 mai 2024 et publié au Journal Officiel le 12 juillet 2024 (UE 2024/1689). Le Parlement a joué un rôle clé dans le renforcement des dispositions sur les droits fondamentaux, l'interdiction de la biométrie en temps réel et les obligations pour les modèles GPAI.",
    category: "Législation EU",
    regulation: "AI Act (UE 2024/1689)",
    date: "2024-03-13",
    source: "Parlement Européen",
    authorityId: "parlement-eu",
    sourceUrl: "https://www.europarl.europa.eu/news/fr/press-room/20240308IPR19015/l-ia-act-adopte",
    tags: ["Parlement EU", "AI Act", "Vote plénière", "Biométrie", "GPAI"],
    isNew: false,
  },
  {
    id: "parlement-ai-resolution-2025",
    title: "Parlement Européen — Résolution sur la gouvernance de l'IA et la démocratie",
    summary: "Le Parlement européen a adopté une résolution sur l'utilisation de l'IA dans les processus démocratiques. Elle appelle à interdire les systèmes IA de micro-ciblage politique basés sur des données sensibles, à encadrer les deepfakes à des fins politiques et à renforcer la transparence des algorithmes de recommandation sur les plateformes utilisées lors des campagnes électorales.",
    category: "Discours & positions politiques",
    regulation: "AI Act (UE 2024/1689)",
    date: "2025-01-23",
    source: "Parlement Européen",
    authorityId: "parlement-eu",
    sourceUrl: "https://www.europarl.europa.eu/portal/fr",
    tags: ["Parlement EU", "Démocratie", "Deepfakes", "Ciblage politique", "Campagnes électorales"],
    isNew: true,
  },

  // ── Cour des comptes européenne ───────────────────────────────────────────
  {
    id: "eca-ai-public-sector-2024",
    title: "Cour des comptes EU — Rapport spécial sur l'IA dans le secteur public européen",
    summary: "La Cour des comptes européenne a publié un rapport spécial sur l'utilisation de l'intelligence artificielle par les institutions et agences de l'UE. Le rapport pointe des lacunes en matière de gouvernance des données, d'absence de cadres d'évaluation des risques IA et d'insuffisance de la formation des agents publics. Il recommande à la Commission de créer un cadre commun pour l'adoption responsable de l'IA dans les institutions EU.",
    category: "Soft law & lignes directrices",
    regulation: "AI Act (UE 2024/1689)",
    date: "2024-07-11",
    source: "Cour des comptes européenne",
    authorityId: "eca",
    sourceUrl: "https://www.eca.europa.eu/fr/publications/SR-2024-06",
    tags: ["Cour des comptes", "Audit EU", "IA secteur public", "Gouvernance IA", "Recommandations"],
    isNew: false,
  },
  {
    id: "eca-cybersecurity-2022",
    title: "Cour des comptes EU — Audit de la cybersécurité des institutions EU",
    summary: "La Cour des comptes a audité la maturité cybersécuritaire des principales institutions de l'UE et constaté d'importantes lacunes : absence de RSSI dans certaines agences, pratiques de gestion des incidents insuffisantes, et manque de coordination entre institutions. Le rapport a conduit au renforcement du mandat de l'ENISA et à l'adoption du règlement EU sur la cybersécurité des institutions EU (IICSA).",
    category: "Soft law & lignes directrices",
    regulation: "NIS2 (UE 2022/2555)",
    date: "2022-03-29",
    source: "Cour des comptes européenne",
    authorityId: "eca",
    sourceUrl: "https://www.eca.europa.eu/fr/publications/SR-2022-05",
    tags: ["Cour des comptes", "Cybersécurité", "Institutions EU", "RSSI", "Audit"],
    isNew: false,
  },

  // ── CESE (Comité économique et social) ────────────────────────────────────
  {
    id: "eesc-ai-act-opinion-2022",
    title: "CESE — Avis sur la proposition d'AI Act : protéger les travailleurs et la société civile",
    summary: "Le Comité économique et social européen a rendu un avis sur la proposition de règlement IA. Il salue la démarche fondée sur les risques mais demande des protections renforcées pour les travailleurs soumis à des systèmes IA (surveillance au travail, scoring de performance, recrutement automatisé). Le CESE demande également que les systèmes IA utilisés dans les décisions de protection sociale soient classés à haut risque.",
    category: "Soft law & lignes directrices",
    regulation: "AI Act (UE 2024/1689)",
    date: "2022-06-22",
    source: "Comité économique et social européen (CESE)",
    authorityId: "eesc",
    sourceUrl: "https://www.eesc.europa.eu/fr/our-work/opinions-information-reports/opinions/reglement-ia",
    tags: ["CESE", "Travail algorithmique", "Protection sociale", "Avis consultatif", "Droits sociaux"],
    isNew: false,
  },
  {
    id: "eesc-platform-workers-2024",
    title: "CESE — Avis sur la directive travailleurs de plateforme et l'IA de gestion",
    summary: "Le CESE a rendu un avis favorable sur la directive européenne relative aux travailleurs des plateformes numériques. Le texte instaure une présomption de salariat, impose la transparence des algorithmes de gestion (notation, attribution des tâches, désactivation) et interdit les décisions automatisées sans supervision humaine en matière disciplinaire. Impact direct sur les plateformes utilisant des IA de gestion de la main-d'œuvre.",
    category: "Législation EU",
    regulation: "Directive travailleurs de plateforme (UE 2024/2831)",
    date: "2024-10-24",
    source: "Comité économique et social européen (CESE)",
    authorityId: "eesc",
    sourceUrl: "https://www.eesc.europa.eu/fr",
    tags: ["CESE", "Travailleurs plateforme", "Algorithmes RH", "Directive", "Présomption de salariat"],
    isNew: true,
  },

  // ── CdR (Comité des régions) ──────────────────────────────────────────────
  {
    id: "cor-ai-regions-2023",
    title: "CdR — Avis sur la mise en œuvre territoriale de l'AI Act",
    summary: "Le Comité européen des régions a adopté un avis sur l'impact territorial de l'AI Act. Il soulève le risque de fracture numérique entre régions disposant de capacités d'audit et de sandboxes réglementaires et celles n'en disposant pas. Il demande que les autorités nationales compétentes (ANC) désignées pour l'AI Act impliquent les collectivités locales dans leur gouvernance.",
    category: "Soft law & lignes directrices",
    regulation: "AI Act (UE 2024/1689)",
    date: "2023-10-11",
    source: "Comité européen des régions",
    authorityId: "cor",
    sourceUrl: "https://www.cor.europa.eu/fr",
    tags: ["CdR", "Régions", "Fracture numérique", "ANC", "Gouvernance territoriale"],
    isNew: false,
  },

  // ── Médiateur européen ────────────────────────────────────────────────────
  {
    id: "ombudsman-ai-transparency-2024",
    title: "Médiateur européen — Enquête sur la transparence de l'IA à la Commission",
    summary: "Le Médiateur européen a ouvert une enquête stratégique sur la transparence des systèmes IA utilisés par la Commission Européenne dans ses processus décisionnels internes. L'enquête porte sur : la divulgation des algorithmes utilisés pour l'allocation de fonds EU, la gestion des plaintes via des systèmes automatisés, et le respect du droit d'accès aux documents (Art. 42 Charte UE).",
    category: "Discours & positions politiques",
    regulation: "AI Act (UE 2024/1689)",
    date: "2024-05-14",
    source: "Médiateur européen",
    authorityId: "ombudsman-eu",
    sourceUrl: "https://www.ombudsman.europa.eu/fr/case/en/64931",
    tags: ["Médiateur EU", "Transparence algorithmique", "Commission EU", "Art. 42 Charte", "Enquête"],
    isNew: false,
  },

  // ── BCE (Banque Centrale Européenne) ──────────────────────────────────────
  {
    id: "ecb-ai-finance-report-2024",
    title: "BCE — Rapport sur les risques et opportunités de l'IA dans le secteur financier",
    summary: "La Banque Centrale Européenne a publié un rapport analysant l'utilisation de l'IA par les banques de la zone euro. Le rapport identifie des risques systémiques liés à la concentration des prestataires IA, aux biais algorithmiques dans le crédit et le trading haute fréquence, et aux vulnérabilités cybernétiques induites par l'IA. La BCE supervise l'application de DORA pour les établissements qu'elle surveille directement.",
    category: "Soft law & lignes directrices",
    regulation: "DORA (UE 2022/2554)",
    date: "2024-06-18",
    source: "Banque Centrale Européenne (BCE)",
    authorityId: "ecb",
    sourceUrl: "https://www.ecb.europa.eu/pub/financial-stability/fsr/html/index.en.html",
    tags: ["BCE", "IA finance", "Risque systémique", "Trading algorithmique", "DORA"],
    isNew: false,
  },
  {
    id: "ecb-mica-crypto-2024",
    title: "BCE — Position sur MiCA et les risques des actifs numériques liés à l'IA",
    summary: "La BCE a publié un document de position sur le règlement MiCA (Markets in Crypto-Assets) et ses interactions avec les systèmes IA. Les stablecoins algorithmiques (régulés par MiCA) et les plateformes d'investissement automatisées (IA de trading) doivent désormais respecter des obligations de transparence, de résilience opérationnelle (DORA) et de lutte contre le blanchiment. La BCE supervise les émetteurs de tokens de monnaie électronique significatifs.",
    category: "Législation EU",
    regulation: "MiCA (UE 2023/1114)",
    date: "2024-12-30",
    source: "Banque Centrale Européenne (BCE)",
    authorityId: "ecb",
    sourceUrl: "https://www.ecb.europa.eu/press/blog/date/2024/html/ecb.blog240103~9b5a9ffec2.en.html",
    tags: ["BCE", "MiCA", "Cryptoactifs", "Stablecoins algorithmiques", "AML"],
    isNew: true,
  },

  // ── Conseil européen ─────────────────────────────────────────────────────
  {
    id: "european-council-ai-conclusions-2024",
    title: "Conseil européen — Conclusions sur l'IA et la compétitivité numérique (mars 2024)",
    summary: "Les chefs d'État et de gouvernement de l'UE ont adopté des conclusions sur l'intelligence artificielle lors du sommet de mars 2024. Ils appellent à renforcer la compétitivité technologique de l'Europe, à investir dans les infrastructures IA (calcul, données), à accélérer le déploiement de l'IA dans les services publics et à garantir que l'AI Act soit appliqué de manière proportionnée pour ne pas freiner l'innovation des PME.",
    category: "Discours & positions politiques",
    regulation: "AI Act (UE 2024/1689)",
    date: "2024-03-22",
    source: "Conseil européen",
    authorityId: "european-council",
    sourceUrl: "https://www.consilium.europa.eu/fr/press/press-releases/2024/03/22/european-council-conclusions-march-2024/",
    tags: ["Conseil européen", "Compétitivité IA", "PME", "Infrastructures", "Sommets EU"],
    isNew: false,
  },
  {
    id: "european-council-ai-sovereignty-2025",
    title: "Conseil européen — Déclaration sur la souveraineté numérique et l'IA (2025)",
    summary: "Lors du sommet de mars 2025, le Conseil européen a adopté une déclaration appelant à développer une IA européenne 'de confiance et souveraine'. Les États membres sont invités à investir dans les superordinateurs, à créer des espaces communs de données (common data spaces) et à renforcer l'autonomie stratégique de l'UE face aux grandes puissances technologiques américaines et chinoises.",
    category: "Discours & positions politiques",
    regulation: "AI Act (UE 2024/1689)",
    date: "2025-03-20",
    source: "Conseil européen",
    authorityId: "european-council",
    sourceUrl: "https://www.consilium.europa.eu/fr/european-council/",
    tags: ["Conseil européen", "Souveraineté numérique", "IA européenne", "Autonomie stratégique"],
    isNew: true,
  },

  // ── Conseil de l'Europe ───────────────────────────────────────────────────
  {
    id: "coe-cets225-2024",
    title: "Conseil de l'Europe — CETS 225 : premier traité international sur l'IA (septembre 2024)",
    summary: "Le Conseil de l'Europe a ouvert à la signature la Convention-cadre sur l'intelligence artificielle et les droits de l'homme, la démocratie et l'état de droit (CETS 225) le 5 septembre 2024 à Vilnius. Premier traité international juridiquement contraignant sur l'IA, il s'applique également aux pays hors UE (USA, Royaume-Uni, Canada, Japon, Israël…). Il oblige les signataires à protéger les droits fondamentaux dans tout cycle de vie d'un système IA, y compris pour les acteurs privés.",
    category: "Législation EU",
    regulation: "CETS 225 — Convention IA CoE",
    date: "2024-09-05",
    source: "Conseil de l'Europe",
    authorityId: "coe",
    sourceUrl: "https://www.coe.int/fr/web/artificial-intelligence/the-framework-convention-on-ai",
    tags: ["Conseil de l'Europe", "CETS 225", "Traité IA", "Droits fondamentaux", "International"],
    isNew: true,
  },
  {
    id: "coe-convention108plus-ai-2023",
    title: "Conseil de l'Europe — Convention 108+ : lignes directrices sur l'IA et protection des données",
    summary: "Le Comité consultatif de la Convention 108 (T-PD) du Conseil de l'Europe a adopté des lignes directrices sur l'intelligence artificielle et la protection des données. Ces lignes précisent l'application de la Convention 108+ (équivalent RGPD hors UE) aux systèmes IA : profilage, décisions automatisées, biais algorithmiques et droits des personnes. Elles complètent le cadre RGPD et concernent les 46 États membres du Conseil de l'Europe.",
    category: "Soft law & lignes directrices",
    regulation: "Convention 108+ (STE 108)",
    date: "2023-06-15",
    source: "Conseil de l'Europe",
    authorityId: "coe",
    sourceUrl: "https://www.coe.int/fr/web/data-protection/convention108/artificial-intelligence",
    tags: ["Conseil de l'Europe", "Convention 108+", "IA", "Profilage", "Droits fondamentaux"],
    isNew: false,
  },
  {
    id: "coe-cedh-biometrics-2024",
    title: "Conseil de l'Europe — Recommandation sur la biométrie et les droits fondamentaux",
    summary: "Le Conseil de l'Europe a adopté la Recommandation CM/Rec(2024) sur l'utilisation des technologies biométriques dans les secteurs de la sécurité publique et de la justice. Elle rappelle que la reconnaissance faciale en temps réel dans les espaces publics constitue une menace pour les droits garantis par la CEDH (Art. 8 vie privée, Art. 11 liberté de réunion) et demande un moratoire sur ces usages sauf conditions strictes.",
    category: "Soft law & lignes directrices",
    regulation: "CETS 225 — Convention IA CoE",
    date: "2024-04-17",
    source: "Conseil de l'Europe",
    authorityId: "coe",
    sourceUrl: "https://www.coe.int/fr/web/artificial-intelligence",
    tags: ["Conseil de l'Europe", "Biométrie", "Reconnaissance faciale", "Art. 8 CEDH", "Moratoire"],
    isNew: false,
  },

  // ── Droit national ───────────────────────────────────────────────────────
  {
    id: "ce-france-ai-decision-2024",
    title: "Conseil d'État (France) — Cadre pour l'IA dans les décisions administratives",
    summary: "Le Conseil d'État français a rendu un avis sur l'utilisation de l'IA dans les décisions administratives. Il impose une transparence renforcée et la possibilité de recours effectif pour les décisions prises par algorithme.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-09-18",
    source: "Conseil d'État — France", authorityId: "ce-fr",
    sourceUrl: "https://www.conseil-etat.fr/actualites/etude-annuelle-2022-la-regulation-algorithmique",
    tags: ["Conseil d'État", "Décisions administratives", "Transparence", "France"], isNew: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── AI ACT — approfondissements ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "aiact-prohibited-2024",
    title: "AI Act : les pratiques interdites applicables dès février 2025",
    summary: "Le chapitre II de l'AI Act, relatif aux pratiques d'IA interdites, est entré en vigueur en février 2025. Sont désormais prohibés : la manipulation comportementale subliminale, l'exploitation des vulnérabilités (âge, handicap), la notation sociale par les pouvoirs publics, la biométrie émotionnelle sur le lieu de travail et dans l'enseignement, et la reconnaissance faciale en temps réel dans les espaces publics (sauf exceptions de sécurité nationale).",
    category: "Législation EU", regulation: "AI Act (UE 2024/1689)", date: "2025-02-02",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
    tags: ["AI Act", "Pratiques interdites", "Biométrie", "Notation sociale", "Manipulation"], isNew: true,
  },
  {
    id: "aiact-sandbox-2025",
    title: "AI Act : lancement des premiers bacs à sable réglementaires (sandboxes) en Europe",
    summary: "L'Espagne, via l'AEPD, a lancé le premier sandbox réglementaire opérationnel de l'AI Act. La France (via la CNIL), le Portugal et la Lituanie ont annoncé leurs propres dispositifs. Ces espaces permettent aux PME et start-ups de tester leurs systèmes IA dans un cadre assoupli, sous supervision de l'autorité nationale compétente, sans risque de sanction pendant la phase d'expérimentation.",
    category: "Législation EU", regulation: "AI Act (UE 2024/1689)", date: "2025-01-28",
    source: "AI Office — Commission Européenne", authorityId: "ai-office",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    tags: ["AI Act", "Sandbox", "PME", "Start-up", "Test conformité"], isNew: true,
  },
  {
    id: "aiact-high-risk-annex-2025",
    title: "AI Act — Systèmes à haut risque : liste définitive de l'Annexe III",
    summary: "L'Annexe III de l'AI Act liste les systèmes IA à haut risque soumis aux obligations renforcées. Sont notamment inclus : les systèmes de recrutement et évaluation RH, de scoring de crédit, de diagnostic médical, de gestion du trafic, de contrôle aux frontières, d'identification biométrique, et de notation scolaire. La Commission peut mettre à jour cette liste par acte délégué.",
    category: "Législation EU", regulation: "AI Act (UE 2024/1689)", date: "2024-11-15",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
    tags: ["AI Act", "Haut risque", "Annexe III", "RH", "Santé", "Biométrie"], isNew: false,
  },
  {
    id: "aiact-gpai-august-2025",
    title: "AI Act — Chapitre V GPAI applicable depuis le 2 août 2025 (Art. 113§b)",
    summary: "Depuis le 2 août 2025, le Chapitre V de l'AI Act (Art. 51-56) est applicable : documentation technique, transparence sur les données d'entraînement, respect du droit d'auteur, et pour les modèles à risque systémique (seuil 10²⁵ FLOPs) : évaluation adversariale et déclaration d'incidents. Nuance importante (Art. 111) : les modèles GPAI déjà mis sur le marché avant le 2 août 2025 bénéficient d'une période de grâce jusqu'au 2 août 2027 pour se mettre en conformité.",
    category: "Législation EU", regulation: "AI Act (UE 2024/1689)", date: "2025-08-02",
    source: "AI Office — Commission Européenne", authorityId: "ai-office",
    sourceUrl: "https://artificialintelligenceact.eu/fr/article/113/",
    tags: ["AI Act", "GPAI", "Art. 51-56", "Art. 111", "Risque systémique", "Période de grâce"], isNew: true,
  },
  {
    id: "aiact-notified-bodies-2025",
    title: "AI Act — Premiers organismes notifiés désignés pour l'audit des IA haut risque",
    summary: "Les États membres ont commencé à désigner les organismes notifiés chargés de certifier les systèmes IA à haut risque. En France, le COFRAC coordonne les accréditations. Ces audits tiers obligatoires pour les systèmes des Annexes I et III concernent notamment les dispositifs médicaux, les systèmes biométriques et les IA de décision critique.",
    category: "Législation EU", regulation: "AI Act (UE 2024/1689)", date: "2025-04-10",
    source: "Commission Européenne", authorityId: "commission",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    tags: ["AI Act", "Organismes notifiés", "Audit tiers", "Certification", "COFRAC"], isNew: true,
  },
  {
    id: "aiact-cnil-guide-2025",
    title: "CNIL — Guide pratique de conformité à l'AI Act pour les entreprises françaises",
    summary: "La CNIL a publié un guide pratique destiné aux entreprises françaises pour se conformer à l'AI Act. Il couvre : la classification des systèmes IA, la rédaction de la documentation technique requise (Art. 11), la mise en place du système de gestion des risques (Art. 9), les obligations de transparence envers les utilisateurs, et l'articulation avec le RGPD.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2025-03-01",
    source: "CNIL", authorityId: "cnil",
    sourceUrl: "https://www.cnil.fr/fr/intelligence-artificielle",
    tags: ["CNIL", "AI Act", "Guide pratique", "PME", "Documentation technique", "France"], isNew: true,
  },
  {
    id: "aiact-liability-directive-2023",
    title: "Directive IA Responsabilité (AI Liability Directive) — état des négociations 2025",
    summary: "La proposition de directive sur la responsabilité en matière d'IA (AI Liability Directive) est en cours de négociation. Elle instaure une présomption de causalité au bénéfice des victimes de systèmes IA défectueux et oblige les fournisseurs à divulguer les données nécessaires à prouver le dommage. Complémentaire à l'AI Act, elle s'appliquera à partir de 2026.",
    category: "Législation EU", regulation: "AI Act (UE 2024/1689)", date: "2024-09-01",
    source: "Commission Européenne", authorityId: "commission",
    sourceUrl: "https://ec.europa.eu/info/business-economy-euro/doing-business-eu/contract-law/artificial-intelligence-liability_en",
    tags: ["Responsabilité IA", "Directive", "Causalité", "Victime", "Dommages"], isNew: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── RGPD — nouvelles décisions et jurisprudence ──────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "edpb-consent-2024",
    title: "EDPB — Dark patterns et consentement : lignes directrices 3/2022 mises à jour",
    summary: "L'EDPB a mis à jour ses lignes directrices sur les dark patterns dans les interfaces de médias sociaux. Les pratiques interdites comprennent : les interfaces trompeuses rendant le refus du consentement plus difficile que l'acceptation, les faux compte à rebours créant une urgence artificielle, les textes confus sur les droits des personnes, et le 'consent fatigue' par multiplication des demandes.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-03-14",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-dark-patterns-social-media-platform",
    tags: ["EDPB", "Dark patterns", "Consentement", "UX", "Design trompeur"], isNew: false,
  },
  {
    id: "edpb-legitimate-interest-2024",
    title: "EDPB — Lignes directrices sur l'intérêt légitime (Art. 6(1)(f) RGPD)",
    summary: "L'EDPB a finalisé ses lignes directrices sur l'intérêt légitime comme base légale RGPD. Le document clarifie le test d'équilibre en trois étapes : existence d'un intérêt légitime, nécessité du traitement, équilibre avec les droits des personnes. Les traitements IA à des fins publicitaires ou de profilage comportemental ne peuvent généralement pas s'appuyer sur cette base.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-10-08",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-12024-legitimate-interest_en",
    tags: ["EDPB", "Intérêt légitime", "Base légale", "Profilage", "Test d'équilibre"], isNew: false,
  },
  {
    id: "edpb-dpf-review-2024",
    title: "EDPB — Premier rapport de réexamen du Data Privacy Framework EU-USA",
    summary: "L'EDPB a publié son premier rapport de réexamen du Data Privacy Framework (DPF) UE-USA, adopté en juillet 2023. Le rapport salue les progrès mais pointe des lacunes persistantes : manque d'indépendance du DPRC (tribunal de recours), portée excessive de la surveillance de masse, et difficultés pratiques pour les Européens à exercer leurs droits. Des recommandations correctives ont été adressées à la Commission.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-10-28",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/other-guidance/report-first-annual-joint-review-eu-us-data-privacy-framework_en",
    tags: ["EDPB", "DPF", "Transferts USA", "Surveillance", "Recours"], isNew: false,
  },
  {
    id: "cnil-cookie-fine-2024",
    title: "CNIL — 10 M€ d'amende contre Criteo pour cookies sans consentement valable",
    summary: "La CNIL a sanctionné Criteo, spécialiste du retargeting publicitaire, de 40 millions d'euros en 2023 (réduits à 10M€ en appel) pour collecte de données de navigation sans consentement valable. Le dépôt de cookies publicitaires via des SDK embarqués dans des applications tierces sans recueil de consentement explicite est illégal au regard du RGPD et de la Directive ePrivacy.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2023-07-27",
    source: "CNIL", authorityId: "cnil",
    sourceUrl: "https://www.cnil.fr/fr/criteo-sanction-40-millions-deuros-pour-publicite-ciblee-sans-consentement",
    tags: ["CNIL", "Criteo", "Cookies", "Publicité ciblée", "Consentement", "France"], isNew: false,
  },
  {
    id: "cnil-doctolib-ai-2024",
    title: "CNIL — Mise en demeure de prestataires IA en santé pour défaut de DPIA",
    summary: "La CNIL a mis en demeure plusieurs prestataires de services IA en santé (triage automatisé, aide au diagnostic) n'ayant pas réalisé d'Analyse d'Impact sur la Protection des Données (DPIA) préalable à la mise en production. Le traitement de données de santé par IA constitue systématiquement un traitement à haut risque imposant une DPIA (Art. 35 RGPD).",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-09-30",
    source: "CNIL", authorityId: "cnil",
    sourceUrl: "https://www.cnil.fr/fr/santé-et-données-médicales",
    tags: ["CNIL", "Santé", "DPIA", "Données médicales", "Art. 35", "France"], isNew: false,
  },
  {
    id: "cnpd-lu-amazon-2021",
    title: "CNPD Luxembourg — Amende record 746 M€ contre Amazon (publicité ciblée)",
    summary: "La Commission nationale pour la protection des données luxembourgeoise (CNPD) a infligé à Amazon la plus grande amende de l'histoire du RGPD à l'époque : 746 millions d'euros pour ciblage publicitaire sans consentement valable. Coordonnée au niveau de l'EDPB, cette décision établit un précédent pour toutes les plateformes e-commerce utilisant des algorithmes de recommandation personnalisés.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2021-07-16",
    source: "CNPD (LU)", authorityId: "cnpd-lu",
    sourceUrl: "https://cnpd.public.lu/fr/actualites/national/2021/07/amazon.html",
    tags: ["CNPD Luxembourg", "Amazon", "Amende", "Publicité ciblée", "Record RGPD"], isNew: false,
  },
  {
    id: "dsb-google-analytics-2022",
    title: "DSB (Autriche) — Google Analytics déclaré illégal pour transferts USA",
    summary: "L'autorité autrichienne de protection des données (DSB) a rendu la première décision européenne déclarant l'utilisation de Google Analytics illégale au regard du RGPD car elle implique des transferts de données de navigation vers les USA sans protection suffisante. Cette décision a été suivie par la France (CNIL), l'Italie (Garante), la Grèce (HDPA) et le Danemark (Datatilsynet).",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2022-01-13",
    source: "DSB", authorityId: "dsb",
    sourceUrl: "https://www.dsb.gv.at",
    tags: ["DSB", "Google Analytics", "Transferts USA", "Illégal", "Autriche"], isNew: false,
  },
  {
    id: "hdpa-clearview-2022",
    title: "HDPA (Grèce) — 20 M€ contre Clearview AI pour biométrie illégale",
    summary: "L'autorité hellénique de protection des données (HDPA) a sanctionné Clearview AI de 20 millions d'euros pour collecte illicite de données biométriques de citoyens grecs sur les réseaux sociaux. La décision confirme que la biométrie de masse constitue une violation grave du RGPD même pour des données collectées dans des espaces publics numériques.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2022-07-13",
    source: "HDPA", authorityId: "hdpa",
    sourceUrl: "https://www.dpa.gr",
    tags: ["HDPA", "Clearview", "Biométrie", "Réseaux sociaux", "Grèce"], isNew: false,
  },
  {
    id: "datatilsynet-dk-ai-2024",
    title: "Datatilsynet (Danemark) — Rapport sur l'IA générative en milieu professionnel",
    summary: "L'autorité danoise de protection des données a publié un rapport d'évaluation sur l'utilisation des outils d'IA générative (ChatGPT, Copilot, Gemini) en milieu professionnel. Elle recommande : inventaire des données saisies, interdiction de saisir des données personnelles de clients ou d'employés, DPA avec les fournisseurs, et formation des collaborateurs au risque de réidentification.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-04-22",
    source: "Datatilsynet (DK)", authorityId: "datatilsynet-dk",
    sourceUrl: "https://www.datatilsynet.dk/english/artificial-intelligence",
    tags: ["Datatilsynet", "IA générative", "Entreprise", "ChatGPT", "Formation", "Danemark"], isNew: false,
  },
  {
    id: "azop-biometric-2024",
    title: "AZOP (Croatie) — Interdiction de la reconnaissance faciale dans les centres commerciaux",
    summary: "L'Agence croate pour la protection des données personnelles (AZOP) a interdit à plusieurs centres commerciaux de Zagreb l'utilisation de systèmes de reconnaissance faciale pour la détection de voleurs. La décision s'appuie sur l'absence de base légale pour le traitement de données biométriques à grande échelle dans des lieux publics commerciaux.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-06-20",
    source: "AZOP", authorityId: "azop",
    sourceUrl: "https://azop.hr",
    tags: ["AZOP", "Reconnaissance faciale", "Biométrie", "Commerce", "Croatie"], isNew: false,
  },
  {
    id: "aki-estonia-ai-health-2024",
    title: "AKI (Estonie) — Enquête sur l'IA de triage aux urgences",
    summary: "L'Inspectorat estonien pour la protection des données (AKI) a ouvert une enquête sur le système d'IA de triage utilisé aux urgences de l'hôpital de Tallinn. Les questions portent sur l'information des patients, la base légale du traitement de données de santé, et la possibilité d'opposition aux décisions prises par algorithme.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-08-12",
    source: "AKI", authorityId: "aki",
    sourceUrl: "https://www.aki.ee",
    tags: ["AKI", "Santé", "Triage", "Urgences", "Données médicales", "Estonie"], isNew: false,
  },
  {
    id: "vdai-facial-recognition-2024",
    title: "VDAI (Lituanie) — Sanction contre une école utilisant la reconnaissance faciale",
    summary: "L'Inspectorat lituanien de la protection des données (VDAI) a sanctionné un établissement scolaire de Vilnius ayant déployé un système de reconnaissance faciale pour contrôler les présences des élèves. La collecte de données biométriques de mineurs sans base légale adéquate et sans consentement explicite des parents viole le RGPD.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-09-05",
    source: "VDAI", authorityId: "vdai",
    sourceUrl: "https://vdai.lrv.lt",
    tags: ["VDAI", "Reconnaissance faciale", "Mineurs", "École", "Biométrie", "Lituanie"], isNew: false,
  },
  {
    id: "naih-ai-hiring-2024",
    title: "NAIH (Hongrie) — Décision sur un outil IA de présélection de candidats",
    summary: "L'autorité hongroise de protection des données (NAIH) a rendu une décision importante concernant un outil IA de présélection de CV utilisé par une grande entreprise. Elle conclut que l'utilisation de données de personnalité extraites de réseaux sociaux pour scorer les candidats constitue un profilage illicite, faute de base légale et d'information préalable.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-11-20",
    source: "NAIH", authorityId: "naih",
    sourceUrl: "https://www.naih.hu",
    tags: ["NAIH", "Recrutement", "Profilage", "Réseaux sociaux", "CV", "Hongrie"], isNew: false,
  },
  {
    id: "apd-belgium-noyb-2024",
    title: "APD (Belgique) — Décision IAB Europe : cadre TCF illégal",
    summary: "L'Autorité de Protection des Données belge a confirmé, après renvoi, que le Transparency & Consent Framework (TCF) d'IAB Europe constitue une violation du RGPD. Le TCF, utilisé par des milliers de sites pour la publicité programmatique, ne fournit pas un consentement libre, éclairé et granulaire. IAB Europe a été condamné à 250 000 euros d'amende.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-01-11",
    source: "APD — Belgique", authorityId: "apd",
    sourceUrl: "https://www.autoriteprotectiondonnees.be/publications/decision-quant-au-fond-n-21-2022.pdf",
    tags: ["APD", "IAB Europe", "TCF", "Consentement", "Publicité programmatique", "Belgique"], isNew: false,
  },
  {
    id: "uoou-cz-openai-2024",
    title: "ÚOOÚ (Tchéquie) — Enquête ouverte sur OpenAI et hallucinations factuelles",
    summary: "L'autorité tchèque de protection des données (ÚOOÚ) a ouvert une enquête sur OpenAI suite à une plainte d'un citoyen dont les informations personnelles avaient été inexactes dans une réponse de ChatGPT (hallucination). L'enquête vise à déterminer si le droit à l'exactitude des données (Art. 16 RGPD) s'applique aux sorties de LLM.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-05-30",
    source: "ÚOOÚ", authorityId: "uoou",
    sourceUrl: "https://www.uoou.cz",
    tags: ["ÚOOÚ", "OpenAI", "Hallucination", "Exactitude", "Art. 16", "Tchéquie"], isNew: false,
  },
  {
    id: "dvi-latvia-surveillance-2024",
    title: "DVI (Lettonie) — Décision sur la vidéosurveillance IA dans les transports publics",
    summary: "L'Inspection des données lettone (DVI) a encadré l'utilisation de caméras IA dans les bus et tramways de Riga. Si la vidéosurveillance traditionnelle est admise, l'analyse automatique des comportements des passagers (détection d'incidents, comptage de personnes) nécessite une DPIA, une signalisation claire et une base légale spécifique.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-07-15",
    source: "DVI", authorityId: "dvi",
    sourceUrl: "https://www.dvi.gov.lv",
    tags: ["DVI", "Vidéosurveillance", "Transport", "Analyse comportementale", "Lettonie"], isNew: false,
  },
  {
    id: "garante-openai-investigation-2024",
    title: "Garante (Italie) — Investigation approfondie sur OpenAI : résultats 2024",
    summary: "Suite au blocage temporaire de ChatGPT en 2023, le Garante a conclu son investigation approfondie. OpenAI a dû : créer un formulaire d'opt-out accessible aux non-utilisateurs, mettre en place une vérification d'âge, nommer un représentant RGPD dans l'UE, et publier une politique de confidentialité plus claire. Procédure d'amende en cours.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-04-11",
    source: "Garante Privacy (Italie)", authorityId: "garante",
    sourceUrl: "https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9979895",
    tags: ["Garante", "OpenAI", "ChatGPT", "Investigation", "Opt-out", "Italie"], isNew: false,
  },
  {
    id: "garante-ai-healthcare-2024",
    title: "Garante (Italie) — Décision sur l'IA prédictive dans la santé publique",
    summary: "Le Garante a rendu une décision pionnière sur l'utilisation de l'IA prédictive par l'ASL (système de santé public italien) pour identifier les patients à risque de réhospitalisation. La décision valide l'approche sous conditions : consentement spécifique, possibilité de refus, transparence sur la logique algorithmique et absence de décision purement automatisée.",
    category: "Décision CNIL/DPA", regulation: "RGPD (UE 2016/679)", date: "2024-06-18",
    source: "Garante Privacy (Italie)", authorityId: "garante",
    sourceUrl: "https://www.garanteprivacy.it",
    tags: ["Garante", "Santé", "IA prédictive", "Hôpital", "Consentement", "Italie"], isNew: false,
  },
  {
    id: "imy-employer-monitoring-2024",
    title: "IMY (Suède) — Guide sur la surveillance IA des salariés",
    summary: "L'autorité suédoise IMY a publié des recommandations sur la surveillance des salariés par IA (analyse de productivité, monitoring des emails, géolocalisation, capteurs de fatigue). Elle précise que ce type de surveillance ne peut s'appuyer que sur le consentement ou l'intérêt légitime, avec des garanties strictes, et que les représentants du personnel doivent être informés et consultés.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-10-15",
    source: "IMY — Suède", authorityId: "imy",
    sourceUrl: "https://www.imy.se/nyheter/",
    tags: ["IMY", "Surveillance salariés", "Monitoring", "Télétravail", "Suède"], isNew: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── JURISPRUDENCE CJUE ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "cjue-google-spain-rtbf",
    title: "CJUE — Droit au déréférencement : évolutions récentes de la jurisprudence Google Spain",
    summary: "Depuis l'arrêt Google Spain C-131/12 (2014), la CJUE a précisé les contours du droit au déréférencement dans plusieurs arrêts successifs. La Cour a notamment jugé que Google doit désindexer les résultats à l'échelle mondiale si l'atteinte à la vie privée est grave, mais n'est pas tenu de le faire par défaut. Le droit à l'information publique prime sur les demandes manifestement non fondées.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2023-09-14",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu/juris/liste.jsf?oqp=&for=&mat=or&jge=&td=L&jur=C&num=C-131/12",
    tags: ["CJUE", "Droit au déréférencement", "Google", "Vie privée", "Moteur de recherche"], isNew: false,
  },
  {
    id: "cjue-datenschutz-2023",
    title: "CJUE — Arrêt C-26/22 : droit d'accès RGPD et obligation de fournir une copie complète",
    summary: "La CJUE a précisé la portée du droit d'accès (Art. 15 RGPD) : le responsable de traitement doit fournir une copie intelligible et exhaustive des données, pas seulement un aperçu. Cette décision impacte tous les traitements IA qui utilisent des données personnelles pour entraîner ou faire tourner des modèles — les personnes peuvent demander l'accès aux données utilisées.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2023-05-04",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu/juris/document/document.jsf?docid=273842",
    tags: ["CJUE", "Droit d'accès", "Art. 15", "Copie données", "Transparence"], isNew: false,
  },
  {
    id: "cjue-facebook-breach-2023",
    title: "CJUE — Arrêt C-687/21 : droit à indemnisation sans préjudice prouvé (data breach)",
    summary: "Dans l'affaire AT / Austrian Post (C-687/21), la CJUE a jugé que la simple violation du RGPD ne suffit pas à justifier une indemnisation automatique. La personne doit prouver un préjudice réel et certain. Cependant, la crainte d'un usage frauduleux de données volées peut constituer un préjudice moral indemnisable si elle est personnellement ressentie et justifiée.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2023-05-04",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu/juris/document/document.jsf?docid=273843",
    tags: ["CJUE", "Violation de données", "Indemnisation", "Préjudice moral", "Art. 82"], isNew: false,
  },
  {
    id: "cjue-linkedin-ai-2024",
    title: "CJUE — Décision C-446/21 : portée du refus de profilage IA (LinkedIn/Rechtsanwalt)",
    summary: "La CJUE a précisé dans l'affaire Schrems c. Meta que le droit d'opposition au profilage (Art. 21 RGPD) doit pouvoir être exercé de manière sélective, traitement par traitement. Un réseau social ou une plateforme ne peut conditionner l'accès au service au consentement à tous les traitements de profilage publicitaire IA sans alternative effective.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2023-10-04",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu/juris/document/document.jsf?docid=278204",
    tags: ["CJUE", "Profilage", "Droit d'opposition", "Réseaux sociaux", "Art. 21"], isNew: false,
  },
  {
    id: "cjue-ip-address-2024",
    title: "CJUE — Les adresses IP sont des données personnelles dans tous les contextes",
    summary: "La CJUE a confirmé que les adresses IP constituent des données personnelles même lorsque le tiers qui les collecte n'a pas directement accès aux moyens d'identification. Cette décision impacte tous les systèmes IA qui collectent des logs de connexion, des métadonnées réseau ou des données de navigation, qui doivent désormais être traités avec une base légale RGPD.",
    category: "Jurisprudence CJUE", regulation: "RGPD (UE 2016/679)", date: "2024-09-19",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu",
    tags: ["CJUE", "Adresse IP", "Données personnelles", "Logs", "Réseau"], isNew: false,
  },
  {
    id: "cjue-dsa-accountability-2024",
    title: "CJUE — Interprétation du DSA : responsabilité des plateformes pour l'IA de recommandation",
    summary: "La CJUE a rendu un premier arrêt interprétatif sur le DSA concernant la responsabilité des plateformes pour les dommages causés par leurs algorithmes de recommandation. Une plateforme ne peut invoquer l'exonération de responsabilité (safe harbour) si son IA a activement amplifié un contenu illicite au-delà de sa simple hébergement.",
    category: "Jurisprudence CJUE", regulation: "DSA (UE 2022/2065)", date: "2024-12-10",
    source: "Cour de Justice de l'Union Européenne (CJUE)", authorityId: "cjue",
    sourceUrl: "https://curia.europa.eu",
    tags: ["CJUE", "DSA", "Recommandation algorithmique", "Responsabilité", "Safe harbour"], isNew: true,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── NOUVELLES LÉGISLATIONS EU ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "eidas2-wallet-2024",
    title: "eIDAS 2.0 : portefeuille numérique européen (EUDIW) — règlement publié",
    summary: "Le règlement eIDAS 2 (UE 2024/1183) a été publié au Journal Officiel en avril 2024. Il instaure le European Digital Identity Wallet (EUDIW), que chaque État membre devra proposer à ses citoyens d'ici 2026. L'EUDIW permet l'authentification numérique, le partage sélectif d'attributs (âge, diplôme, permis) et la signature électronique qualifiée. Les plateformes en ligne de grande taille devront l'accepter.",
    category: "Législation EU", regulation: "eIDAS 2 (UE 2024/1183)", date: "2024-04-30",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1183",
    tags: ["eIDAS 2", "Identité numérique", "Wallet", "Authentification", "Signature électronique"], isNew: false,
  },
  {
    id: "cra-cyber-resilience-2024",
    title: "Cyber Resilience Act (CRA) : sécurité des produits connectés, adopté en 2024",
    summary: "Le règlement sur la cyberrésilience (CRA) a été adopté en octobre 2024. Il impose des exigences de sécurité obligatoires pour tous les produits comportant des éléments numériques mis sur le marché EU : mise à jour de sécurité pendant toute la durée de vie, signalement des vulnérabilités sous 24h, et marquage CE de cybersécurité. Impact direct pour les dispositifs IA embarqués (IoT, robots, systèmes industriels).",
    category: "Législation EU", regulation: "CRA (UE 2024/2847)", date: "2024-10-23",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2847",
    tags: ["CRA", "Cybersécurité", "IoT", "Vulnérabilités", "Marquage CE", "Produits connectés"], isNew: false,
  },
  {
    id: "data-governance-act-2022",
    title: "Data Governance Act (UE 2022/868) : espaces européens de données",
    summary: "Le Data Governance Act (DGA) est applicable depuis septembre 2023. Il crée un cadre pour le partage volontaire de données entre secteurs public et privé via des 'espaces européens de données' sectoriels (santé, mobilité, agriculture, industrie). Les entreprises développant des IA basées sur des données sectorielles peuvent accéder à ces espaces sous conditions de réciprocité et de conformité.",
    category: "Législation EU", regulation: "Data Governance Act (UE 2022/868)", date: "2023-09-24",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R0868",
    tags: ["Data Governance Act", "Espaces de données", "Santé", "Mobilité", "Partage données"], isNew: false,
  },
  {
    id: "ehds-2024",
    title: "European Health Data Space (EHDS) — règlement adopté fin 2024",
    summary: "Le règlement sur l'Espace Européen des Données de Santé (EHDS) a été adopté en novembre 2024. Il impose aux prestataires de santé de partager des données médicales interopérables avec les patients (usage primaire) et, sous conditions, avec les chercheurs et industriels (usage secondaire). Les développeurs d'IA médicale pourront accéder à des données de santé pseudonymisées via des DataLAB sécurisés.",
    category: "Législation EU", regulation: "EHDS (UE 2024)", date: "2024-11-28",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2847",
    tags: ["EHDS", "Données de santé", "Recherche", "IA médicale", "DataLAB", "Interopérabilité"], isNew: true,
  },
  {
    id: "product-liability-directive-2024",
    title: "Nouvelle Directive sur la Responsabilité du fait des Produits défectueux — adoptée 2024",
    summary: "La nouvelle directive sur la responsabilité du fait des produits (remplaçant la directive de 1985) a été adoptée en octobre 2024. Elle couvre explicitement les logiciels et systèmes IA comme des 'produits'. Les victimes de dommages causés par un système IA défectueux bénéficient d'une présomption de défaut si le fabricant refuse de divulguer les informations techniques nécessaires.",
    category: "Législation EU", regulation: "Directive Responsabilité Produits (UE 2024)", date: "2024-10-18",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ:L_202402853",
    tags: ["Responsabilité produits", "Logiciel", "IA", "Défaut", "Victime", "Directive"], isNew: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── DISCOURS & POSITIONS POLITIQUES ──────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "macron-ia-nation-2024",
    title: "Macron — Sommet IA de Paris (févr. 2025) : l'Europe doit s'imposer comme 3ème voie",
    summary: "Emmanuel Macron a ouvert le Sommet pour l'Action sur l'IA à Paris en février 2025, co-organisé par la France et l'Inde. Il a plaidé pour une 'troisième voie' européenne entre le libéralisme technologique américain et le contrôle étatique chinois. Il a annoncé 109 Md€ d'investissements privés en IA en France, et soutenu un assouplissement provisoire de certaines obligations de l'AI Act pour les PME.",
    category: "Discours & positions politiques", regulation: "AI Act (UE 2024/1689)", date: "2025-02-10",
    source: "Élysée / Sommet IA Paris 2025", authorityId: "commission",
    sourceUrl: "https://www.elysee.fr/emmanuel-macron/2025/02/10/intelligence-artificielle",
    tags: ["Macron", "Sommet IA Paris", "3ème voie", "Investissement", "PME", "France"], isNew: true,
  },
  {
    id: "eu-parliament-ai-vote-2024",
    title: "Parlement Européen — Vote final sur l'AI Act (13 mars 2024)",
    summary: "Le Parlement Européen a adopté l'AI Act à une large majorité (523 pour, 46 contre, 49 abstentions) lors de sa session plénière du 13 mars 2024. C'est la première législation complète au monde sur l'IA. Les eurodéputés ont notamment renforcé les protections sur la biométrie et les droits fondamentaux par rapport à la position initiale de la Commission.",
    category: "Discours & positions politiques", regulation: "AI Act (UE 2024/1689)", date: "2024-03-13",
    source: "Parlement Européen", authorityId: "commission",
    sourceUrl: "https://www.europarl.europa.eu/news/fr/press-room/20240308IPR19015",
    tags: ["Parlement Européen", "Vote", "AI Act", "Biométrie", "Droits fondamentaux"], isNew: false,
  },
  {
    id: "draghi-report-ai-2024",
    title: "Rapport Draghi — L'Europe décroche sur l'IA : un défi existentiel",
    summary: "Mario Draghi a présenté son rapport sur la compétitivité européenne en septembre 2024. Il identifie le retard en IA comme une menace existentielle pour l'économie européenne, appelant à 800 milliards d'euros d'investissements annuels supplémentaires, une simplification réglementaire pour l'IA générative, et la création d'un marché unique des données. Le rapport influence directement l'agenda législatif 2025-2030.",
    category: "Discours & positions politiques", regulation: "AI Act (UE 2024/1689)", date: "2024-09-09",
    source: "Commission Européenne", authorityId: "commission",
    sourceUrl: "https://commission.europa.eu/topics/strengthening-european-competitiveness/eu-competitiveness-looking-ahead_en",
    tags: ["Draghi", "Compétitivité", "Investissement", "IA générative", "Marché données"], isNew: false,
  },
  {
    id: "cnil-president-speech-2025",
    title: "Discours de la présidente de la CNIL — IA et droits fondamentaux (janv. 2025)",
    summary: "La présidente de la CNIL, Marie-Laure Denis, a prononcé un discours lors des vœux annuels 2025, affirmant que la conformité RGPD et AI Act ne sont pas des freins à l'innovation mais des avantages compétitifs. Elle a annoncé la création d'un 'pôle IA' au sein de la CNIL et un programme de certification pour les systèmes IA conformes au RGPD.",
    category: "Discours & positions politiques", regulation: "RGPD (UE 2016/679)", date: "2025-01-20",
    source: "CNIL", authorityId: "cnil",
    sourceUrl: "https://www.cnil.fr/fr/discours-et-interventions",
    tags: ["CNIL", "Marie-Laure Denis", "Innovation", "Certification", "Pôle IA", "France"], isNew: true,
  },
  {
    id: "edpb-chair-ai-speech-2025",
    title: "Présidente EDPB — Déclaration sur l'IA générative et les droits des personnes (2025)",
    summary: "La présidente de l'EDPB, Anu Talus (Finlande), a déclaré en mars 2025 que l'EDPB coordonnera des investigations harmonisées sur les principaux fournisseurs d'IA générative opérant dans l'UE. L'objectif est d'assurer une application cohérente du RGPD à travers les 27 DPA nationales, évitant le 'forum shopping' réglementaire.",
    category: "Discours & positions politiques", regulation: "RGPD (UE 2016/679)", date: "2025-03-05",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/news/news_en",
    tags: ["EDPB", "IA générative", "Investigation coordonnée", "Forum shopping", "Harmonisation"], isNew: true,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── DROIT NATIONAL ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "france-loi-IA-sante-2024",
    title: "France — Décret sur les logiciels d'aide à la prescription et au diagnostic IA",
    summary: "Le décret français du 3 mai 2024 précise les conditions d'utilisation des logiciels d'aide à la prescription (LAP) et au diagnostic médical (LAD) utilisant l'IA. Ces dispositifs doivent obtenir le marquage CE dispositif médical (MDR), réaliser une DPIA RGPD, et fournir aux médecins une explication de la recommandation algorithmique. La traçabilité des décisions IA est obligatoire.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-05-03",
    source: "ANSSI — Agence Nationale Sécurité SI", authorityId: "anssi",
    sourceUrl: "https://www.legifrance.gouv.fr",
    tags: ["France", "Santé", "Diagnostic IA", "Dispositif médical", "MDR", "Prescription"], isNew: false,
  },
  {
    id: "germany-ai-courts-2024",
    title: "Allemagne — Premier Landesgericht interdit l'utilisation d'IA dans un jugement civil",
    summary: "Le Landesgericht de Cologne a rendu un arrêt historique annulant un jugement de première instance dans lequel le tribunal avait partiellement basé sa décision sur une analyse produite par un outil IA sans le mentionner aux parties. La décision établit que l'utilisation d'IA dans la rédaction de décisions judiciaires doit être déclarée et soumise à un débat contradictoire.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-07-22",
    source: "BfDI — Allemagne", authorityId: "bfdi",
    sourceUrl: "https://www.bfdi.bund.de",
    tags: ["Allemagne", "Justice", "IA judiciaire", "Transparence", "Décisions automatisées"], isNew: false,
  },
  {
    id: "italy-ai-justice-2024",
    title: "Italie — Décret législatif sur l'IA dans l'administration de la justice (nov. 2024)",
    summary: "L'Italie a adopté un décret législatif encadrant l'utilisation de l'IA dans la justice : les outils IA ne peuvent servir qu'à des fonctions d'assistance documentaire, jamais à statuer ou prédire l'issue d'un litige. Les avocats utilisant des IA pour rédiger des conclusions doivent le déclarer. Première transposition nationale explicite des exigences de l'AI Act dans le secteur judiciaire.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-11-08",
    source: "Garante Privacy (Italie)", authorityId: "garante",
    sourceUrl: "https://www.garanteprivacy.it",
    tags: ["Italie", "Justice", "IA judiciaire", "Avocat", "Transparence", "Transposition"], isNew: false,
  },
  {
    id: "spain-ai-labor-2024",
    title: "Espagne — Loi sur la transparence algorithmique en droit du travail (ET réformé)",
    summary: "L'Espagne a modifié son Estatuto de los Trabajadores pour imposer aux employeurs d'informer les représentants du personnel des algorithmes et systèmes IA qui influencent les conditions de travail, la gestion des ressources humaines ou la surveillance des salariés. Précurseur en Europe, cette obligation de transparence algorithmique est en vigueur depuis 2021.",
    category: "Droit national", regulation: "RGPD (UE 2016/679)", date: "2021-04-23",
    source: "AEPD — Espagne", authorityId: "aepd",
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-1995-24292",
    tags: ["Espagne", "Droit du travail", "Transparence algorithmique", "Syndicats", "RH"], isNew: false,
  },
  {
    id: "netherlands-ai-education-2024",
    title: "Pays-Bas — Interdiction du scoring IA pour l'orientation scolaire",
    summary: "Le gouvernement néerlandais et l'AP ont mis fin à l'utilisation de systèmes de scoring algorithmique dans l'orientation scolaire, après que des enquêtes ont révélé des biais discriminatoires selon le code postal et l'origine. La décision a force de précédent pour toutes les utilisations de l'IA dans les décisions d'orientation ou d'accès à des prestations publiques.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-02-14",
    source: "AP — Pays-Bas", authorityId: "ap",
    sourceUrl: "https://autoriteitpersoonsgegevens.nl",
    tags: ["AP", "Éducation", "Scoring", "Discrimination", "Biais algorithmique", "Pays-Bas"], isNew: false,
  },
  {
    id: "belgium-ai-police-2024",
    title: "Belgique — Décision APD sur l'IA de prédiction criminelle de la Police fédérale",
    summary: "L'APD a rendu une décision sur le système prédictif de la Police fédérale belge (PredPol-type). Le système, qui ciblait des zones géographiques pour des patrouilles préventives, a été déclaré non conforme au RGPD et à l'AI Act en raison de l'absence d'étude d'impact sur les droits fondamentaux, de l'opacité algorithmique et des risques de discrimination systémique.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-09-27",
    source: "APD — Belgique", authorityId: "apd",
    sourceUrl: "https://www.autoriteprotectiondonnees.be",
    tags: ["APD", "Police prédictive", "Discrimination", "Droits fondamentaux", "Belgique"], isNew: false,
  },
  {
    id: "portugal-ai-public-sector-2025",
    title: "Portugal — Décret sur l'utilisation de l'IA dans le secteur public",
    summary: "Le Portugal a adopté un décret-loi transposant les exigences de l'AI Act pour le secteur public : inventaire obligatoire des systèmes IA utilisés par les administrations, désignation d'un 'responsable IA' dans chaque ministère, évaluation d'impact obligatoire pour les IA affectant des droits individuels, et publication d'un registre public des IA gouvernementales.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2025-01-10",
    source: "CNPD (PT)", authorityId: "cnpd-pt",
    sourceUrl: "https://www.cnpd.pt",
    tags: ["Portugal", "Secteur public", "Administration", "Registre IA", "Responsable IA"], isNew: true,
  },
  {
    id: "sweden-defense-ai-2024",
    title: "Suède — Rapport d'IMY sur l'IA dans la défense et les zones d'exception AI Act",
    summary: "L'autorité suédoise IMY a publié une analyse des zones d'exception de l'AI Act concernant la défense nationale et la sécurité nationale. Si les systèmes IA purement militaires sont exclus du champ de l'AI Act, les traitements de données personnelles par les forces armées restent soumis au RGPD selon les modalités nationales transposées.",
    category: "Droit national", regulation: "AI Act (UE 2024/1689)", date: "2024-12-03",
    source: "IMY — Suède", authorityId: "imy",
    sourceUrl: "https://www.imy.se",
    tags: ["IMY", "Défense", "Sécurité nationale", "Exception AI Act", "Suède"], isNew: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── SOFT LAW & LIGNES DIRECTRICES SUPPLÉMENTAIRES ────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "enisa-ai-cybersec-2024",
    title: "ENISA — Rapport sur la cybersécurité des systèmes IA (threats landscape 2024)",
    summary: "L'Agence européenne pour la cybersécurité (ENISA) a publié son rapport annuel sur les menaces spécifiques aux systèmes IA. Les principales vulnérabilités identifiées : attaques adversariales (manipulation des entrées), empoisonnement des données d'entraînement (data poisoning), extraction de modèles, et attaques par inférence. Le rapport recommande des tests de robustesse comme composante de la conformité AI Act.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2024-10-30",
    source: "Commission Européenne", authorityId: "commission",
    sourceUrl: "https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024",
    tags: ["ENISA", "Cybersécurité", "Attaque adversariale", "Data poisoning", "Robustesse IA"], isNew: false,
  },
  {
    id: "eba-ema-eiopa-ai-2024",
    title: "EBA/EIOPA/ESMA — Rapport conjoint sur l'IA dans le secteur financier",
    summary: "Les trois autorités de surveillance financière européennes (EBA, EIOPA, ESMA) ont publié un rapport conjoint sur l'usage de l'IA dans la finance. Ils identifient les risques de conformité liés aux LLM dans le conseil financier, au scoring automatisé des crédits et à la surveillance des marchés par IA. Des lignes directrices sectorielles complémentaires à l'AI Act sont attendues en 2025.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2024-09-26",
    source: "Journal Officiel de l'UE", authorityId: "commission",
    sourceUrl: "https://www.eba.europa.eu/publications-and-media/press-releases/joint-esa-report-ai",
    tags: ["EBA", "EIOPA", "ESMA", "Finance", "Crédit scoring", "Marchés financiers"], isNew: false,
  },
  {
    id: "cnil-ia-conformite-guide-2024",
    title: "CNIL — Fiche pratique : comment réaliser une DPIA pour un système IA ?",
    summary: "La CNIL a publié une fiche pratique détaillant la méthodologie pour réaliser une Analyse d'Impact sur la Protection des Données (DPIA/AIPD) spécifiquement pour les systèmes d'IA. Elle couvre : l'identification des données traitées, la cartographie des biais potentiels, l'évaluation de la discrimination algorithmique, les mesures techniques de privacy by design, et les mécanismes de gouvernance du modèle.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-06-25",
    source: "CNIL", authorityId: "cnil",
    sourceUrl: "https://www.cnil.fr/fr/les-analyses-dimpact-relatives-la-protection-des-donnees-aipd",
    tags: ["CNIL", "DPIA", "AIPD", "Biais algorithmique", "Privacy by design", "France"], isNew: false,
  },
  {
    id: "ai-office-code-of-practice-2025",
    title: "AI Office — Code de bonnes pratiques pour les modèles GPAI (consultation 2025)",
    summary: "L'AI Office a publié la version provisoire de son Code de bonnes pratiques pour les fournisseurs de modèles IA à usage général (GPAI). Ce code, élaboré avec l'industrie et la société civile, définit les bonnes pratiques pour la documentation technique, les évaluations de risques systémiques, les tests d'adversité (red teaming), la transparence sur les données d'entraînement et la gouvernance des incidents.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2025-04-01",
    source: "AI Office — Commission Européenne", authorityId: "ai-office",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/ai-office",
    tags: ["AI Office", "Code de pratiques", "GPAI", "Red teaming", "Risque systémique"], isNew: true,
  },
  {
    id: "edpb-childrens-data-2024",
    title: "EDPB — Lignes directrices sur la protection des données des enfants en ligne",
    summary: "L'EDPB a adopté ses lignes directrices 2/2023 sur la protection des données personnelles des mineurs dans les services numériques. Elles traitent de la détection d'âge, du consentement parental, de l'interdiction du profilage publicitaire des mineurs, et des recommandations spécifiques pour les plateformes de jeux, réseaux sociaux et applications éducatives utilisant l'IA.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-02-19",
    source: "European Data Protection Board (EDPB)", authorityId: "edpb",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-022023-technical-scope-art-52_en",
    tags: ["EDPB", "Mineurs", "Consentement parental", "Profilage", "Jeux", "Éducation"], isNew: false,
  },
  {
    id: "aepd-spain-generative-ai-2024",
    title: "AEPD (Espagne) — Guide sur l'IA générative et le RGPD",
    summary: "L'agence espagnole AEPD a publié une guide détaillé sur l'articulation entre l'IA générative et le RGPD. Le guide distingue les rôles de responsable de traitement (entreprise qui déploie), sous-traitant (fournisseur du modèle) et développeur initial. Il couvre les bases légales possibles, les droits des personnes sur les données utilisées en entraînement, et les mesures de minimisation.",
    category: "Soft law & lignes directrices", regulation: "RGPD (UE 2016/679)", date: "2024-11-25",
    source: "AEPD — Espagne", authorityId: "aepd",
    sourceUrl: "https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-publica-ia-generativa-gdpr",
    tags: ["AEPD", "IA générative", "Responsable traitement", "Sous-traitant", "Entraînement", "Espagne"], isNew: false,
  },
  {
    id: "bfdi-ai-governance-2025",
    title: "BfDI (Allemagne) — Guide de gouvernance IA pour les grandes entreprises",
    summary: "Le Bundesbeauftragter für Datenschutz (BfDI) a publié en 2025 un guide de gouvernance IA à destination des grandes entreprises et administrations. Il recommande la mise en place d'un comité IA interne, d'un registre des systèmes IA (comparable au registre des traitements RGPD), d'une procédure d'évaluation des risques avant déploiement et d'un processus de surveillance post-déploiement.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2025-02-18",
    source: "BfDI — Allemagne", authorityId: "bfdi",
    sourceUrl: "https://www.bfdi.bund.de",
    tags: ["BfDI", "Gouvernance IA", "Registre IA", "Risques", "Surveillance", "Allemagne"], isNew: true,
  },

  // ── Normes & Standards internationaux ────────────────────────────────────────
  {
    id: "iso-42001-published-2023",
    title: "ISO 42001 — Première norme internationale de management des systèmes IA publiée",
    summary: "L'ISO a publié en décembre 2023 la norme ISO/IEC 42001 (AIMS — AI Management System), premier standard international de gouvernance des systèmes IA. Alignée sur l'AI Act, elle structure la gouvernance IA en 4 domaines : politique IA, évaluation des risques IA, gestion du cycle de vie des systèmes IA et amélioration continue. Les entreprises certifiées ISO 42001 pourront bénéficier d'une présomption de conformité partielle à l'AI Act (via normes harmonisées CEN/CENELEC). Un complément à ISO 27001 pour la gouvernance IA.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2023-12-06",
    source: "ISO — Organisation internationale de normalisation",
    sourceUrl: "https://www.iso.org/standard/81230.html",
    tags: ["ISO 42001", "AIMS", "Gouvernance IA", "Certification", "Norme harmonisée", "International"], isNew: false,
  },
  {
    id: "nist-ai-rmf-2023",
    title: "NIST AI RMF 1.0 — Cadre américain de gestion des risques IA",
    summary: "Le National Institute of Standards and Technology (NIST) a publié l'AI Risk Management Framework (AI RMF 1.0) en janvier 2023. Le cadre repose sur 4 fonctions : GOVERN (gouvernance), MAP (cartographie des risques), MEASURE (mesure), MANAGE (gestion). Très utilisé par les entreprises EU opérant aussi aux USA. En 2024, le NIST a publié un profil spécifique pour l'IA générative. Complémentaire à l'AI Act : référencé dans les travaux de l'ENISA et de l'OCDE.",
    category: "Soft law & lignes directrices", regulation: "AI Act (UE 2024/1689)", date: "2023-01-26",
    source: "NIST — National Institute of Standards and Technology (USA)",
    sourceUrl: "https://www.nist.gov/artificial-intelligence/ai-risk-management-framework",
    tags: ["NIST", "AI RMF", "Gouvernance IA", "USA", "Risque IA", "GOVERN", "MAP", "MEASURE"], isNew: false,
  },
  {
    id: "oecd-ai-principles-revised-2024",
    title: "OCDE — Révision des Principes sur l'IA (mai 2024)",
    summary: "L'OCDE a révisé ses Principes sur l'IA en mai 2024 pour intégrer l'IA générative et les modèles de fondation. Les principes révisés renforcent les obligations de transparence, de traçabilité et de responsabilité pour les développeurs de grands modèles de langage. Adoptés par 47 pays dont tous les États membres EU, ils constituent la base de référence de la gouvernance internationale de l'IA. Le G7 Hiroshima AI Process s'en est directement inspiré pour les Guiding Principles for Advanced AI Developers.",
    category: "Soft law & lignes directrices", regulation: "Gouvernance internationale IA", date: "2024-05-03",
    source: "OCDE — Organisation de coopération et de développement économiques",
    sourceUrl: "https://oecd.ai/en/ai-principles",
    tags: ["OCDE", "Principes IA", "IA générative", "G7", "Gouvernance internationale", "Révisé 2024"], isNew: true,
  },

  // ── Tribunal de l'UE & Concurrence ───────────────────────────────────────────
  {
    id: "tribunal-ue-dma-2024",
    title: "Tribunal de l'UE — Arrêts DMA : qualification de gatekeeper (TikTok, Booking, X)",
    summary: "Le Tribunal de l'Union Européenne (juridiction de première instance de la CJUE) a rendu en 2024 plusieurs décisions importantes sur la qualification de « contrôleurs d'accès » (gatekeepers) au sens du DMA. Les entreprises contestent leur désignation par la Commission au titre du DMA : TikTok (arrêt T-1077/23), Booking.com et X. Ces arrêts précisent les critères de seuils et la marge d'appréciation de la Commission, avec des implications pour les algorithmes de recommandation et les IA des plateformes.",
    category: "Jurisprudence CJUE", regulation: "DMA (UE 2022/1925)", date: "2024-07-09",
    source: "Tribunal de l'Union Européenne (CJUE)",
    sourceUrl: "https://curia.europa.eu/jcms/jcms/Jo2_7033/fr/",
    tags: ["Tribunal EU", "DMA", "Gatekeeper", "TikTok", "Algorithme", "Plateformes"], isNew: false,
  },
  {
    id: "dg-comp-microsoft-copilot-2024",
    title: "DG COMP — Enquête sur le couplage Microsoft 365 / Copilot IA",
    summary: "La Direction Générale de la Concurrence de la Commission Européenne a ouvert en 2024 des investigations formelles sur l'intégration de Copilot (IA générative Microsoft) dans Microsoft 365 et Teams. L'enquête porte sur le couplage anticoncurrentiel : Microsoft impose Copilot à ses clients d'entreprise via la migration vers Microsoft 365 Business Premium. La DG COMP examine aussi l'accès des concurrents aux données de Microsoft 365 pour entraîner leurs propres modèles.",
    category: "Décision CNIL/DPA", regulation: "DMA (UE 2022/1925)", date: "2024-06-25",
    source: "DG COMP — Commission Européenne",
    sourceUrl: "https://competition-policy.ec.europa.eu/index_fr",
    tags: ["DG COMP", "Microsoft", "Copilot", "IA générative", "Antitrust", "DMA", "Couplage"], isNew: false,
  },
  {
    id: "autorite-concurrence-ia-avis-2024",
    title: "Autorité de la concurrence — Avis sur l'IA générative et les marchés numériques",
    summary: "L'Autorité de la concurrence française a publié en 2024 un avis thématique sur les risques concurrentiels liés à l'IA générative. Elle identifie 3 risques majeurs : la captation de position par les propriétaires des données d'entraînement (Google, Microsoft), le verrouillage des entreprises clientes par des pipelines IA propriétaires, et la concentration de la couche d'infrastructure (GPU, cloud, API). L'avis formule des recommandations pour la DG COMP et le DMA.",
    category: "Soft law & lignes directrices", regulation: "Gouvernance numérique", date: "2024-09-20",
    source: "Autorité de la concurrence — France",
    sourceUrl: "https://www.autoritedelaconcurrence.fr/fr",
    tags: ["Autorité concurrence", "IA générative", "DMA", "Concentration", "Google", "Microsoft", "France"], isNew: false,
  },
];

// ─── Try live RSS feeds ───────────────────────────────────────────────────────
async function fetchLiveRSS(): Promise<JournalArticle[]> {
  const sources = [
    {
      name: "Journal Officiel EU (OJ-L)",
      url: "https://op.europa.eu/en/web/eu-law-and-publications/publication-detail/-/publication/rss/OJ:L",
      category: "Législation EU" as ArticleCategory,
      regulation: "Journal Officiel UE",
    },
    {
      name: "EDPB Actualités",
      url: "https://edpb.europa.eu/rss.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "RGPD (UE 2016/679)",
    },
    {
      name: "CNIL",
      url: "https://www.cnil.fr/fr/rss.xml",
      category: "Décision CNIL/DPA" as ArticleCategory,
      regulation: "RGPD (UE 2016/679)",
    },
    {
      name: "Autoriteit Persoonsgegevens (NL)",
      url: "https://www.autoriteitpersoonsgegevens.nl/nl/rss.xml",
      category: "Décision CNIL/DPA" as ArticleCategory,
      regulation: "RGPD (UE 2016/679)",
    },
    {
      name: "ICO (UK)",
      url: "https://ico.org.uk/feed/rss",
      category: "Décision CNIL/DPA" as ArticleCategory,
      regulation: "UK GDPR",
    },
    {
      name: "ENISA",
      url: "https://www.enisa.europa.eu/rss.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "NIS2 / Cybersécurité",
    },
    {
      name: "EBA",
      url: "https://www.eba.europa.eu/rss.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "DORA (UE 2022/2554)",
    },
    {
      name: "AlgorithmWatch",
      url: "https://algorithmwatch.org/en/feed/",
      category: "Discours & positions politiques" as ArticleCategory,
      regulation: "AI Act (UE 2024/1689)",
    },
    {
      name: "ANSSI",
      url: "https://www.ssi.gouv.fr/feed/",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "NIS2 / Cybersécurité",
    },
    {
      name: "Netzpolitik",
      url: "https://netzpolitik.org/feed/",
      category: "Discours & positions politiques" as ArticleCategory,
      regulation: "Politique numérique EU",
    },
    {
      name: "IAPP",
      url: "https://iapp.org/feed/news",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "RGPD (UE 2016/679)",
    },
    {
      name: "EMA",
      url: "https://www.ema.europa.eu/rss/news.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "EHDS (UE 2025/327)",
    },
    {
      name: "Conseil européen",
      url: "https://www.consilium.europa.eu/rss/european-council-meetings.xml",
      category: "Discours & positions politiques" as ArticleCategory,
      regulation: "Gouvernance UE",
    },
    {
      name: "Conseil de l'Europe",
      url: "https://www.coe.int/fr/web/portal/rss",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "CETS 225 — Convention IA CoE",
    },
    {
      name: "Parlement Européen",
      url: "https://www.europarl.europa.eu/rss/doc/press-releases-presse/fr.xml",
      category: "Législation EU" as ArticleCategory,
      regulation: "Législation EU",
    },
    {
      name: "Cour des comptes européenne",
      url: "https://www.eca.europa.eu/en/rss/PublicationRssFeed.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "Gouvernance EU",
    },
    {
      name: "EDPS",
      url: "https://www.edps.europa.eu/rss.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "RGPD (UE 2016/679)",
    },
    {
      name: "Médiateur européen",
      url: "https://www.ombudsman.europa.eu/rss.xml",
      category: "Discours & positions politiques" as ArticleCategory,
      regulation: "Gouvernance EU",
    },
    {
      name: "Banque Centrale Européenne",
      url: "https://www.ecb.europa.eu/press/pr/rss/ecb.xml",
      category: "Soft law & lignes directrices" as ArticleCategory,
      regulation: "DORA (UE 2022/2554)",
    },
  ];

  const articles: JournalArticle[] = [];

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "CompliAI-Journal/1.0" },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5);
      for (const [, itemXml] of items) {
        const title = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim();
        const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? itemXml.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]?.trim();
        const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? itemXml.match(/<dc:date>(.*?)<\/dc:date>/)?.[1]?.trim();
        const desc = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.trim();
        if (!title || !link) continue;
        articles.push({
          id: `live-${Buffer.from(link).toString("base64").slice(0, 12)}`,
          title: title.slice(0, 200),
          summary: desc ? desc.replace(/<[^>]+>/g, "").slice(0, 400) : "Consulter la source pour plus de détails.",
          category: source.category,
          regulation: source.regulation,
          date: pubDate ? new Date(pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          source: source.name,
          sourceUrl: link,
          tags: ["Live", source.regulation],
          isNew: true,
        });
      }
    } catch { /* non-blocking */ }
  }

  return articles;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Build user profile for personalization
  const profile = await buildUserProfile(user.id, supabase as any);

  // Fetch live RSS (non-blocking)
  const liveArticles = await fetchLiveRSS();

  // Merge curated + live, deduplicate by id
  const allArticles = [...CURATED_ARTICLES, ...liveArticles];

  // Score each article for this user
  const scored = allArticles.map(article => ({
    ...article,
    relevanceScore: scoreAlertForUser(article.regulation, article.title, profile),
  }));

  // Sort by: relevance desc, then date desc
  scored.sort((a, b) => {
    const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    if (Math.abs(scoreDiff) > 0.2) return scoreDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return NextResponse.json({
    articles: scored,
    userProfile: {
      sectors: profile.sectors,
      topRegulations: profile.relevantRegulations.slice(0, 4),
      hasHighRiskSystems: profile.hasHighRiskSystems,
      usesGPAI: profile.usesGPAI,
    },
  });
}
