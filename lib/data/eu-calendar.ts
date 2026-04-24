export type EventType =
  | "Arrêt CJUE"
  | "Vote Parlement EU"
  | "Délai réglementaire"
  | "Audience CJUE"
  | "Consultation publique"
  | "Sommet / Conférence"
  | "Décision DPA attendue"
  | "Discours / Audition"
  | "Entrée en vigueur"
  | "Publication officielle";

export type EventImportance = "critique" | "haute" | "moyenne" | "info";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;           // ISO date YYYY-MM-DD (date exacte ou estimée)
  dateLabel?: string;     // e.g. "T2 2025", "avant le 2 août 2025"
  isEstimated?: boolean;  // true si la date est approximative
  type: EventType;
  importance: EventImportance;
  regulation: string;
  authorityId?: string;
  tags: string[];
  sourceUrl?: string;
}

const EVENTS: CalendarEvent[] = [
  // ══════════════════════════════════════════════════════════
  // DÉLAIS RÉGLEMENTAIRES AI ACT
  // ══════════════════════════════════════════════════════════
  {
    id: "aiact-prohibited-feb-2025",
    title: "AI Act — Fin du délai de grâce : pratiques interdites",
    description: "Depuis le 2 février 2025, les pratiques d'IA interdites sont pleinement applicables et sanctionnables : manipulation subliminale, exploitation des vulnérabilités, notation sociale, reconnaissance faciale en temps réel dans l'espace public, biométrie émotionnelle au travail et dans l'éducation.",
    date: "2025-02-02",
    type: "Entrée en vigueur",
    importance: "critique",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "Pratiques interdites", "Biométrie", "Notation sociale"],
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
  },
  {
    id: "aiact-gpai-aug-2025",
    title: "AI Act — Chapitre V GPAI applicable (Art. 51-56) : 2 août 2025",
    description: "Le Chapitre V de l'AI Act (Art. 51-56) sur les modèles IA à usage général (GPAI) est applicable depuis le 2 août 2025 (12 mois après l'entrée en vigueur, Art. 113§b). Les obligations couvrent : documentation technique (Annexe XI), transparence sur les données d'entraînement, respect du droit d'auteur, et pour les modèles à risque systémique (seuil 10²⁵ FLOPs) : évaluation adversariale, red teaming et signalement des incidents. Attention : les modèles GPAI déjà sur le marché avant le 2 août 2025 disposent d'une période de grâce jusqu'au 2 août 2027 (Art. 111).",
    date: "2025-08-02",
    type: "Délai réglementaire",
    importance: "critique",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "GPAI", "Date limite", "Documentation", "Risque systémique"],
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/ai-office",
  },
  {
    id: "aiact-high-risk-aug-2026",
    title: "AI Act — Application générale + Systèmes haut risque Annexe III nouveaux systèmes",
    description: "Le 2 août 2026 est la date d'application générale de l'AI Act (Art. 113, 24 mois après l'entrée en vigueur). Les systèmes IA haut risque de l'Annexe III mis sur le marché APRÈS cette date doivent être pleinement conformes dès le départ. Pour les systèmes DÉJÀ déployés avant le 2 août 2026 : ils deviennent soumis à l'AI Act uniquement lors d'une modification significative de leur conception — sauf s'ils sont exploités par une autorité publique, auquel cas la conformité est requise au plus tard le 2 août 2030 (Art. 111). Secteurs concernés : recrutement RH, scoring crédit, diagnostic médical, contrôle aux frontières, éducation, justice, infrastructures critiques.",
    date: "2026-08-02",
    type: "Délai réglementaire",
    importance: "critique",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "Haut risque", "Annexe III", "RH", "Santé", "Crédit"],
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
  },
  {
    id: "aiact-annexe1-aug-2027",
    title: "AI Act — Systèmes haut risque Annexe I (produits réglementés) : application",
    description: "Le 2 août 2027 est la date limite pour les systèmes IA constituant des composants de sécurité de produits déjà réglementés (Annexe I) : dispositifs médicaux, véhicules, machines, équipements de protection, jouets. Ces systèmes sont soumis au double régime AI Act + réglementation sectorielle (MDR, type-approval…).",
    date: "2027-08-02",
    type: "Délai réglementaire",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "Annexe I", "Dispositif médical", "Véhicule", "Machines"],
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
  },
  {
    id: "aiact-notified-bodies-2025",
    title: "AI Act — Organismes notifiés : les États membres peuvent commencer les notifications (Art. 30)",
    description: "À partir du 2 août 2025 (Art. 113§b), le régime de notification des organismes d'évaluation de conformité entre en application (Chapitre III, Art. 28-39). Les États membres transmettent à la Commission leurs organismes accrédités via l'outil de notification européen. Il n'y a pas de délai fixe pour compléter les désignations, mais sans organismes notifiés les entreprises ne peuvent pas obtenir la certification tierce partie pour les systèmes IA haut risque. La Commission publie une liste officielle des organismes notifiés.",
    date: "2025-08-02",
    type: "Délai réglementaire",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["AI Act", "Organismes notifiés", "Certification", "États membres"],
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
  },
  {
    id: "aiact-sandboxes-deadline-2026",
    title: "AI Act — Sandboxes réglementaires : délai légal Art. 57 pour chaque État membre",
    description: "L'Article 57 de l'AI Act impose à chaque État membre de mettre en place au moins un bac à sable réglementaire (sandbox) d'IA au niveau national au plus tard le 2 août 2026 (24 mois après l'entrée en vigueur). La Commission fournit une assistance technique et maintient une liste publique des sandboxes. Ces espaces permettent aux PME et start-ups de tester leurs IA sous supervision, avec allègements réglementaires temporaires.",
    date: "2026-08-02",
    type: "Délai réglementaire",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["AI Act", "Sandbox", "PME", "Art. 57", "États membres", "2026"],
    sourceUrl: "https://artificialintelligenceact.eu/fr/article/57/",
  },
  {
    id: "aiact-codes-practice-final-2025",
    title: "AI Act — Code de bonnes pratiques GPAI : délai légal 2 mai 2025 (Art. 56§9)",
    description: "L'Article 56§9 et le Considérant 179 de l'AI Act fixent la préparation du Code de bonnes pratiques GPAI au plus tard le 2 mai 2025 (9 mois après entrée en vigueur). En pratique, l'AI Office a publié un projet de lignes directrices le 22 avril 2025 et les lignes directrices officielles complémentaires le 18 juillet 2025. Ce code sert de référence pour évaluer la conformité des LLM comme GPT, Claude, Gemini, Mistral, Llama. Les fournisseurs peuvent y adhérer ou démontrer leur conformité par d'autres moyens.",
    date: "2025-05-02",
    type: "Publication officielle",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "GPAI", "Code de pratiques", "LLM", "Art. 56", "AI Office"],
    sourceUrl: "https://artificialintelligenceact.eu/fr/article/56/",
  },
  {
    id: "aiact-gpai-guidelines-july-2025",
    title: "AI Act — Lignes directrices GPAI publiées par la Commission (18 juillet 2025)",
    description: "Le 18 juillet 2025, la Commission européenne (AI Office) a publié un projet de lignes directrices clarifiant les principales dispositions de l'AI Act applicables aux modèles GPAI. Ces lignes directrices précisent la définition et le champ d'application des modèles GPAI, le cycle de vie, les obligations de documentation (Annexe XI), les exigences de transparence sur les données d'entraînement, le respect du droit d'auteur, et les critères de désignation des modèles à risque systémique (seuil de 10^25 FLOPs).",
    date: "2025-07-18",
    type: "Publication officielle",
    importance: "critique",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "GPAI", "Lignes directrices", "Risque systémique", "Documentation", "FLOPs"],
    sourceUrl: "https://artificialintelligenceact.eu/fr/gpai-guidelines-overview/",
  },

  // ══════════════════════════════════════════════════════════
  // DÉLAIS RGPD / EDPB
  // ══════════════════════════════════════════════════════════
  {
    id: "edpb-coordinated-ai-2025",
    title: "EDPB — Lancement de l'action coordonnée sur l'IA générative",
    description: "L'EDPB a annoncé en mars 2025 une action coordonnée (Coordinated Enforcement Framework — CEF 2025) sur les principaux fournisseurs d'IA générative. Les 27 DPA nationales ouvriront simultanément des investigations. Les résultats préliminaires sont attendus pour fin 2025, avec des décisions potentielles en 2026.",
    date: "2025-09-30",
    isEstimated: true,
    dateLabel: "Fin T3 2025 (résultats préliminaires)",
    type: "Décision DPA attendue",
    importance: "critique",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "edpb",
    tags: ["EDPB", "IA générative", "Investigation coordonnée", "DPA", "OpenAI", "Google"],
    sourceUrl: "https://edpb.europa.eu",
  },
  {
    id: "edpb-dpf-review-2025",
    title: "EDPB — 2ème rapport de réexamen du Data Privacy Framework EU-USA",
    description: "L'EDPB doit publier son deuxième rapport annuel de réexamen du DPF UE-USA (Data Privacy Framework) à l'automne 2025. Ce rapport évaluera si les États-Unis ont corrigé les lacunes identifiées en 2024 (indépendance du DPRC, portée de la surveillance). En cas de rapport négatif, la Commission européenne pourrait suspendre le DPF.",
    date: "2025-10-15",
    isEstimated: true,
    dateLabel: "Automne 2025 (estimé)",
    type: "Publication officielle",
    importance: "haute",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "edpb",
    tags: ["EDPB", "DPF", "Transferts USA", "Surveillance", "Schrems"],
  },
  {
    id: "cnil-ai-fine-openai-2025",
    title: "CNIL — Décision finale sur OpenAI (enquête ChatGPT coordonnée EDPB)",
    description: "La CNIL, chef de file de l'enquête coordonnée EDPB sur OpenAI/ChatGPT, doit rendre sa décision finale courant 2025. Les griefs portent sur : base légale du traitement pour l'entraînement, droit à l'effacement, exactitude des données, transferts vers les USA et information des personnes. Une amende significative est possible.",
    date: "2025-12-31",
    isEstimated: true,
    dateLabel: "2025 (date non officielle)",
    type: "Décision DPA attendue",
    importance: "critique",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "cnil",
    tags: ["CNIL", "OpenAI", "ChatGPT", "Amende", "Enquête", "Entraînement IA"],
  },
  {
    id: "garante-openai-fine-2025",
    title: "Garante (Italie) — Décision d'amende attendue contre OpenAI",
    description: "Le Garante Privacy italien a annoncé qu'il rendrait une décision formelle d'amende contre OpenAI dans le courant de 2025, suite à son investigation approfondie (2023-2024). OpenAI conteste la compétence territoriale du Garante. La décision fera jurisprudence sur la territorialité du RGPD pour les modèles IA développés hors UE mais utilisés en Europe.",
    date: "2025-09-30",
    isEstimated: true,
    dateLabel: "T3-T4 2025 (estimé)",
    type: "Décision DPA attendue",
    importance: "haute",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "garante",
    tags: ["Garante", "OpenAI", "Amende", "Territorialité", "Italie"],
  },

  // ══════════════════════════════════════════════════════════
  // CJUE — Arrêts et audiences programmés
  // ══════════════════════════════════════════════════════════
  {
    id: "cjue-meta-ireland-2025",
    title: "CJUE — Audience C-446/21 : légalité des publicités personnalisées Meta",
    description: "La Grande Chambre de la CJUE examinera la légalité du ciblage publicitaire comportemental de Meta fondé sur des données collectées hors plateforme. L'affaire, portée par Max Schrems/NOYB, questionnera si l'intérêt légitime et le 'Pay or OK' peuvent justifier le traitement de données pour la publicité ciblée IA. Décision attendue en 2025.",
    date: "2025-06-15",
    isEstimated: true,
    dateLabel: "T2 2025 (estimé)",
    type: "Arrêt CJUE",
    importance: "critique",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "cjue",
    tags: ["CJUE", "Meta", "Publicité ciblée", "Pay or OK", "Schrems", "Intérêt légitime"],
    sourceUrl: "https://curia.europa.eu",
  },
  {
    id: "cjue-dsa-tiktok-2025",
    title: "CJUE — Recours TikTok contre sa désignation VLOP (DSA)",
    description: "TikTok a introduit un recours devant le Tribunal de l'UE (première instance de la CJUE) contre sa désignation comme Very Large Online Platform (VLOP) au titre du DSA. Le litige porte sur le calcul du nombre d'utilisateurs actifs mensuels et les obligations qui en découlent. L'audience est programmée pour 2025.",
    date: "2025-10-01",
    isEstimated: true,
    dateLabel: "T3-T4 2025 (estimé)",
    type: "Audience CJUE",
    importance: "haute",
    regulation: "DSA (UE 2022/2065)",
    authorityId: "cjue",
    tags: ["CJUE", "TikTok", "DSA", "VLOP", "Recours"],
    sourceUrl: "https://curia.europa.eu",
  },
  {
    id: "cjue-google-ai-copyright-2025",
    title: "CJUE — Question préjudicielle sur l'entraînement IA et le droit d'auteur",
    description: "Plusieurs juridictions nationales ont soumis des questions préjudicielles à la CJUE sur la compatibilité de l'entraînement des LLM sur des corpus protégés avec la Directive sur le droit d'auteur dans le marché unique numérique (DSM). La CJUE devra préciser les conditions de l'exception de fouille de textes et de données (Text and Data Mining — TDM).",
    date: "2026-03-01",
    isEstimated: true,
    dateLabel: "2026 (estimé)",
    type: "Arrêt CJUE",
    importance: "critique",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "cjue",
    tags: ["CJUE", "Droit d'auteur", "Entraînement IA", "TDM", "LLM", "Copyright"],
    sourceUrl: "https://curia.europa.eu",
  },
  {
    id: "cjue-dpf-validity-2026",
    title: "CJUE — Possible recours en annulation du DPF EU-USA (Schrems III)",
    description: "NOYB (Max Schrems) a annoncé son intention d'attaquer en annulation le Data Privacy Framework devant la CJUE, reproduisant la stratégie ayant abouti à Schrems I (Safe Harbor, 2015) et Schrems II (Privacy Shield, 2020). Si la CJUE invalide à nouveau le DPF, tous les transferts de données d'IA vers les USA via ce cadre seraient illégaux.",
    date: "2026-06-01",
    isEstimated: true,
    dateLabel: "2026 (procédure en cours)",
    type: "Audience CJUE",
    importance: "critique",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "cjue",
    tags: ["CJUE", "DPF", "Schrems III", "Transferts USA", "Annulation"],
    sourceUrl: "https://noyb.eu",
  },

  // ══════════════════════════════════════════════════════════
  // VOTES PARLEMENT EUROPÉEN & COMMISSION
  // ══════════════════════════════════════════════════════════
  {
    id: "aiact-delegated-acts-2025",
    title: "Commission — Publication des actes délégués AI Act (annexes techniques)",
    description: "La Commission Européenne doit adopter plusieurs actes délégués et d'exécution pour compléter l'AI Act : mise à jour de l'Annexe III (haut risque), définition des exigences techniques de journalisation, spécifications pour les systèmes biométriques et les évaluations de conformité. Ces textes préciseront les obligations concrètes pour les entreprises.",
    date: "2025-08-02",
    type: "Publication officielle",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["Commission", "Actes délégués", "Annexe III", "Biométrie", "Journalisation"],
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
  },
  {
    id: "ai-liability-directive-vote-2025",
    title: "Parlement EU — Vote sur la Directive Responsabilité IA",
    description: "Le Parlement Européen devrait voter sur la directive sur la responsabilité en matière d'IA (AI Liability Directive) courant 2025-2026, après les trilogues Commission-Conseil-Parlement. Le texte établira les règles de causalité et d'indemnisation pour les victimes de systèmes IA défectueux, complémentant l'AI Act sur le plan civil.",
    date: "2025-12-31",
    isEstimated: true,
    dateLabel: "2025-2026 (trilogues en cours)",
    type: "Vote Parlement EU",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["Parlement EU", "Responsabilité IA", "Trilogue", "Vote", "Directive"],
  },
  {
    id: "eidas2-wallet-deployment-2026",
    title: "eIDAS 2.0 — Date limite déploiement wallet numérique européen",
    description: "Les États membres devront proposer le portefeuille d'identité numérique européen (EUDIW) à leurs citoyens avant le 12 avril 2026, soit 24 mois après la publication du règlement eIDAS 2. La Commission publiera les actes d'exécution techniques courant 2025.",
    date: "2026-04-12",
    type: "Délai réglementaire",
    importance: "haute",
    regulation: "eIDAS 2 (UE 2024/1183)",
    authorityId: "commission",
    tags: ["eIDAS 2", "Wallet", "Identité numérique", "États membres", "Date limite"],
    sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1183",
  },
  {
    id: "dora-rts-2025",
    title: "DORA — Publication des normes techniques réglementaires (RTS) finales",
    description: "L'EBA, EIOPA et ESMA doivent finaliser les normes techniques réglementaires (RTS) et d'exécution (ITS) complétant DORA pour les entités financières. Ces textes préciseront les exigences de tests de résilience, de gestion des risques TIC tiers (dont l'IA) et de signalement des incidents majeurs.",
    date: "2025-07-17",
    type: "Publication officielle",
    importance: "haute",
    regulation: "DORA (UE 2022/2554)",
    authorityId: "commission",
    tags: ["DORA", "Finance", "EBA", "RTS", "Résilience", "TIC"],
  },
  {
    id: "cra-first-standards-2026",
    title: "CRA — Premières normes harmonisées cybersécurité publiées",
    description: "Le Cyber Resilience Act impose la publication de normes harmonisées permettant aux fabricants de démontrer la conformité de leurs produits connectés. Les premières normes (ETSI, ISO/IEC) couvrant les exigences de base sont attendues pour 2026. D'ici là, les fabricants devront auto-évaluer leur conformité.",
    date: "2026-06-01",
    isEstimated: true,
    dateLabel: "2026 (estimé)",
    type: "Publication officielle",
    importance: "moyenne",
    regulation: "CRA (UE 2024/2847)",
    authorityId: "commission",
    tags: ["CRA", "Normes harmonisées", "ETSI", "ISO", "Produits connectés", "Cybersécurité"],
  },

  // ══════════════════════════════════════════════════════════
  // SOMMETS & CONFÉRENCES
  // ══════════════════════════════════════════════════════════
  {
    id: "ai-action-summit-paris-2025",
    title: "Sommet pour l'Action sur l'IA — Paris (10-11 février 2025)",
    description: "Le Sommet pour l'Action sur l'IA s'est tenu à Paris les 10 et 11 février 2025, co-présidé par la France et l'Inde. Réunissant 100+ pays et les grands acteurs de l'IA mondiale, il a abouti à la Déclaration de Paris sur l'IA — incluant des engagements sur l'IA sûre, inclusive et durable, et sur la gouvernance mondiale de l'IA. Suite de la déclaration de Bletchley Park (2023) et de Séoul (2024).",
    date: "2025-02-11",
    type: "Sommet / Conférence",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["Sommet IA", "Paris", "Gouvernance mondiale", "Macron", "Déclaration Paris"],
    sourceUrl: "https://www.elysee.fr/en/sommet-ia",
  },
  {
    id: "edpb-plenary-june-2025",
    title: "EDPB — Session plénière de juin 2025 (décisions RGPD majeures attendues)",
    description: "La session plénière de l'EDPB prévue en juin 2025 devrait adopter plusieurs décisions importantes : lignes directrices sur l'IA générative et le RGPD, décision sur la coordination des enquêtes sur les LLM, et éventuellement une prise de position sur le 'Pay or OK' des plateformes. Les entreprises développant des IA doivent suivre cette session de près.",
    date: "2025-06-10",
    isEstimated: true,
    dateLabel: "Juin 2025 (date indicative)",
    type: "Publication officielle",
    importance: "haute",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "edpb",
    tags: ["EDPB", "Plénière", "IA générative", "RGPD", "Pay or OK"],
    sourceUrl: "https://edpb.europa.eu",
  },
  {
    id: "oecd-ai-summit-2025",
    title: "OCDE — Forum mondial sur l'IA responsable (Seoul AI Summit suivi)",
    description: "L'OCDE organise son Forum mondial sur l'IA responsable 2025. Ces sommets influencent directement la position de l'UE dans les négociations sur la gouvernance internationale de l'IA au sein du G7, G20 et à l'ONU. Les conclusions orienteront potentiellement les révisions futures de l'AI Act.",
    date: "2025-10-15",
    isEstimated: true,
    dateLabel: "Automne 2025 (date à confirmer)",
    type: "Sommet / Conférence",
    importance: "moyenne",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["OCDE", "Gouvernance mondiale", "IA responsable", "G7", "G20"],
  },
  {
    id: "iapp-europe-data-protection-congress-2025",
    title: "IAPP Europe Data Protection Congress — Bruxelles 2025",
    description: "Le principal congrès européen sur la protection des données et la conformité IA se tient à Bruxelles en novembre 2025. Représentants des DPA nationales, juridistes, DPO et professionnels de la conformité y présentent les évolutions réglementaires et jurisprudentielles de l'année. Événement de référence pour le secteur.",
    date: "2025-11-19",
    isEstimated: true,
    dateLabel: "Novembre 2025 (date indicative)",
    type: "Sommet / Conférence",
    importance: "info",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "edpb",
    tags: ["IAPP", "DPO", "Conformité", "Bruxelles", "Congrès"],
  },

  // ══════════════════════════════════════════════════════════
  // CONSULTATIONS PUBLIQUES
  // ══════════════════════════════════════════════════════════
  {
    id: "aiact-annual-review-art112-2025",
    title: "AI Act — Première évaluation annuelle Art. 112§1 (Annexe III + pratiques interdites)",
    description: "À partir du 2 août 2025, l'AI Office effectue des évaluations annuelles (Art. 112§1) pour déterminer si la liste Annexe III (haut risque) et les pratiques interdites (Art. 5) doivent être mises à jour. Résultats soumis chaque année au Parlement et au Conseil. Ce mécanisme permet d'ajouter de nouveaux systèmes IA à la liste des systèmes haut risque au fil du temps.",
    date: "2025-08-02",
    type: "Publication officielle",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Act", "Évaluation annuelle", "Annexe III", "Art. 5", "Révision liste"],
    sourceUrl: "https://artificialintelligenceact.eu/fr/article/112/",
  },
  {
    id: "aiact-commission-review-2028",
    title: "Commission — Premier grand rapport de révision de l'AI Act (Art. 112§2-4)",
    description: "L'Article 112§2-4 impose à la Commission de soumettre un rapport de réexamen approfondi avant le 2 août 2028 (puis tous les 4 ans). Ce rapport évalue : ressources des autorités nationales, sanctions appliquées, normes harmonisées, nombre de PME concernées, efficacité du système de gouvernance. Il peut s'accompagner d'une proposition de modification du règlement.",
    date: "2028-08-02",
    dateLabel: "Au plus tard le 2 août 2028 (Art. 112§2-4)",
    type: "Publication officielle",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["AI Act", "Révision", "Commission", "Art. 112", "Rapport", "2028"],
    sourceUrl: "https://artificialintelligenceact.eu/fr/article/112/",
  },
  {
    id: "rgpd-review-commission-2024",
    title: "Commission — Rapport de révision du RGPD (Art. 97) en cours",
    description: "La Commission Européenne a lancé son rapport d'évaluation du RGPD 6 ans après son application (Art. 97). Le rapport analyse la cohérence de l'application entre États membres, l'impact sur les PME, l'articulation avec le DSA/DMA/AI Act, et la pertinence des transferts internationaux. Des propositions d'amendement sont attendues en 2025-2026.",
    date: "2025-06-01",
    isEstimated: true,
    dateLabel: "T2 2025 (rapport attendu)",
    type: "Publication officielle",
    importance: "haute",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "commission",
    tags: ["RGPD", "Révision", "Commission", "Art. 97", "PME", "Évaluation"],
    sourceUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/reform/what-does-general-data-protection-regulation-gdpr-govern_fr",
  },
  {
    id: "ehds-implementation-2025",
    title: "EHDS — Consultation sur les actes d'exécution (espaces de données de santé)",
    description: "La Commission consulte les parties prenantes sur les actes d'exécution du règlement EHDS définissant les formats d'échange de données de santé et les spécifications techniques des DataLAB. Les développeurs d'IA médicale doivent participer à cette consultation pour influencer les standards qui conditionneront l'accès aux données de santé.",
    date: "2025-09-01",
    isEstimated: true,
    dateLabel: "T3 2025 (consultation ouverte)",
    type: "Consultation publique",
    importance: "haute",
    regulation: "EHDS (UE 2024)",
    authorityId: "commission",
    tags: ["EHDS", "Santé", "DataLAB", "Consultation", "Formats données", "IA médicale"],
  },

  // ══════════════════════════════════════════════════════════
  // DISCOURS & AUDITIONS
  // ══════════════════════════════════════════════════════════
  {
    id: "eu-parliament-ai-committee-2025",
    title: "PE — Auditions du Comité AIDA sur l'application de l'AI Act",
    description: "Le Comité spécial sur l'Intelligence Artificielle, la Démocratie et l'État de droit du Parlement Européen (AIDA) organise des auditions régulières sur l'application de l'AI Act. Les commissaires IA, les représentants de l'AI Office et les grandes entreprises tech sont régulièrement convoqués. Ces auditions influencent les priorités de contrôle.",
    date: "2025-05-20",
    isEstimated: true,
    dateLabel: "Régulières (prochaine : T2 2025)",
    type: "Discours / Audition",
    importance: "moyenne",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "commission",
    tags: ["Parlement EU", "AIDA", "Audition", "AI Office", "Application"],
    sourceUrl: "https://www.europarl.europa.eu/committees/fr/aida/home",
  },
  {
    id: "ai-office-annual-report-2025",
    title: "AI Office — Premier rapport annuel d'activité (août 2025)",
    description: "L'AI Office publiera son premier rapport annuel d'activité en août 2025, un an après sa création officielle. Ce rapport présentera les premiers résultats des investigations sur les modèles GPAI, les cas de non-conformité identifiés, les sandboxes opérationnels, et les orientations stratégiques pour 2026.",
    date: "2025-08-15",
    isEstimated: true,
    dateLabel: "Août 2025 (estimé)",
    type: "Publication officielle",
    importance: "haute",
    regulation: "AI Act (UE 2024/1689)",
    authorityId: "ai-office",
    tags: ["AI Office", "Rapport annuel", "GPAI", "Non-conformité", "Investigations"],
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/ai-office",
  },
  {
    id: "cnil-annual-report-2025",
    title: "CNIL — Publication du rapport annuel 2024 (bilan contrôles et sanctions IA)",
    description: "La CNIL publiera son rapport annuel 2024 au printemps 2025, présentant le bilan de ses contrôles et sanctions. Une attention particulière sera portée aux thèmes IA et biométrie qui étaient les priorités de contrôle 2024. Le rapport mentionnera les entreprises mises en demeure ou sanctionnées pour non-conformité dans l'utilisation de l'IA.",
    date: "2025-04-30",
    isEstimated: true,
    dateLabel: "Printemps 2025",
    type: "Publication officielle",
    importance: "haute",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "cnil",
    tags: ["CNIL", "Rapport annuel", "Sanctions", "Contrôles", "Bilan IA", "France"],
    sourceUrl: "https://www.cnil.fr/fr/les-rapports-dactivite-de-la-cnil",
  },
  {
    id: "dpc-annual-report-2025",
    title: "DPC Irlande — Rapport annuel 2024 (Meta, Apple, Google investigations)",
    description: "La DPC irlandaise publiera son rapport annuel 2024 présentant les investigations ouvertes ou clôturées contre les géants tech dont le siège européen est en Irlande (Meta, Apple, Google, Microsoft, Twitter/X, LinkedIn). Ce rapport est scruté par l'ensemble des DPA européennes et la société civile comme baromètre de l'application du RGPD.",
    date: "2025-04-01",
    isEstimated: true,
    dateLabel: "T1-T2 2025",
    type: "Publication officielle",
    importance: "haute",
    regulation: "RGPD (UE 2016/679)",
    authorityId: "dpc",
    tags: ["DPC", "Irlande", "Meta", "Google", "Apple", "Rapport annuel"],
    sourceUrl: "https://www.dataprotection.ie",
  },
];

// Sort by date ascending
export const EU_CALENDAR_EVENTS = EVENTS.sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

export const EVENT_TYPE_CONFIG: Record<EventType, { color: string; bg: string; border: string; dot: string }> = {
  "Arrêt CJUE":            { color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200", dot: "bg-purple-500" },
  "Audience CJUE":         { color: "text-purple-600", bg: "bg-purple-50",  border: "border-purple-200", dot: "bg-purple-400" },
  "Vote Parlement EU":     { color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-500" },
  "Délai réglementaire":   { color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200",    dot: "bg-red-500" },
  "Consultation publique": { color: "text-teal-700",   bg: "bg-teal-50",    border: "border-teal-200",   dot: "bg-teal-500" },
  "Sommet / Conférence":   { color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-500" },
  "Décision DPA attendue": { color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", dot: "bg-orange-500" },
  "Discours / Audition":   { color: "text-slate-700",  bg: "bg-slate-50",   border: "border-slate-200",  dot: "bg-slate-400" },
  "Entrée en vigueur":     { color: "text-red-800",    bg: "bg-red-100",    border: "border-red-300",    dot: "bg-red-600" },
  "Publication officielle":{ color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200", dot: "bg-indigo-500" },
};

export const IMPORTANCE_CONFIG: Record<EventImportance, { label: string; color: string; ring: string }> = {
  critique: { label: "Critique",  color: "text-red-700 bg-red-50 border-red-300",    ring: "ring-red-500" },
  haute:    { label: "Important", color: "text-orange-700 bg-orange-50 border-orange-300", ring: "ring-orange-400" },
  moyenne:  { label: "À suivre",  color: "text-blue-700 bg-blue-50 border-blue-300", ring: "ring-blue-400" },
  info:     { label: "Info",      color: "text-gray-600 bg-gray-50 border-gray-200", ring: "ring-gray-300" },
};
