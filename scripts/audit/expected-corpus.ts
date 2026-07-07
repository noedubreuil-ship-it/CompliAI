/**
 * Corpus attendu — structure officielle de référence pour l'audit d'intégrité.
 * Sources : EUR-Lex, textes officiels JOUE.
 */

export interface ExpectedDoc {
  regulation: string;         // Nom exact dans legal_chunks
  articles: number;           // Articles dans le texte principal (hors annexes)
  considerants: number;       // Considérants du préambule
  annexes: number;            // Annexes
  status: "present" | "absent"; // present = dans le corpus production actuel
  notes?: string;
}

export const EXPECTED_CORPUS: ExpectedDoc[] = [
  // ── Règlements et directives UE présents ────────────────────────────────
  {
    regulation: "AI Act (UE 2024/1689)",
    articles: 113,
    considerants: 180,
    annexes: 13,
    status: "present",
  },
  {
    regulation: "RGPD (UE 2016/679)",
    articles: 99,
    considerants: 173,
    annexes: 4,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk ePrivacy)
    regulation: "Directive ePrivacy (UE 2002/58/CE) — communications électroniques & cookies",
    articles: 22,
    considerants: 49,
    annexes: 0,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk eIDAS2)
    // Texte consolidé EUR-Lex — pas de préambule, pas de considérants
    regulation: "eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)",
    articles: 83,
    considerants: 0,
    annexes: 5,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk DSA)
    regulation: "DSA — Règlement sur les services numériques (UE 2022/2065)",
    articles: 93,
    considerants: 156,
    annexes: 1,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk DMA)
    regulation: "DMA — Règlement sur les marchés numériques (UE 2022/1925)",
    articles: 54,
    considerants: 109,
    annexes: 1,
    status: "present",
  },
  {
    regulation: "Directive NIS 2 (UE 2022/2555)",
    articles: 46,
    considerants: 144,
    annexes: 11,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk CRA)
    regulation: "Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847)",
    articles: 71,
    considerants: 130,
    annexes: 6,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk Data Act)
    regulation: "Data Act — Règlement sur les données (UE 2023/2854)",
    articles: 50,
    considerants: 119,
    annexes: 1,
    status: "present",
  },
  {
    regulation: "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
    articles: 32,
    considerants: 86,
    annexes: 0,
    status: "present",
  },
  {
    // Nom exact en production (issu du rechunk DGA)
    regulation: "Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868)",
    articles: 38,
    considerants: 63,
    annexes: 0,
    status: "present",
  },
  {
    regulation: "Règlement Machines (UE 2023/1230) — produits IA intégrés",
    articles: 54,
    considerants: 86,
    annexes: 9,
    status: "present",
  },
  {
    regulation: "Règlement DORA (UE 2022/2554) — Résilience opérationnelle numérique du secteur financier",
    articles: 64,
    considerants: 102,
    annexes: 0,
    status: "present",
  },

  // ── Jurisprudence CJUE présente ──────────────────────────────────────────
  {
    regulation: "CJUE — Arrêt Meta Platforms Ireland (C-252/21) — Traitement de données à des fins publicitaires personnalisées et bases légales RGPD",
    articles: 0,
    considerants: 0,
    annexes: 0,
    status: "present",
    notes: "237 paragraphes — ingestion antérieure (seeds)",
  },
  {
    regulation: "CJUE — Arrêt Breyer (C-582/14) — Adresses IP et données personnelles",
    articles: 0,
    considerants: 0,
    annexes: 0,
    status: "present",
    notes: "28 paragraphes — Chantier 7",
  },
  {
    regulation: "CJUE — Arrêt Google Spain (C-131/12) — Droit à l'oubli",
    articles: 0,
    considerants: 0,
    annexes: 0,
    status: "present",
    notes: "99 paragraphes — Chantier 7",
  },
  {
    regulation: "CJUE — Arrêt Schrems II (C-311/18) — Transferts de données vers les États-Unis",
    articles: 0,
    considerants: 0,
    annexes: 0,
    status: "present",
    notes: "203 paragraphes — Chantier 7",
  },

  // ── EDPB Guidelines présentes ────────────────────────────────────────────
  {
    regulation: "EDPB Lignes directrices 02/2019 — Article 6(1)(b) RGPD : nécessité d'exécution du contrat (services en ligne)",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "44 paragraphes — ingestion antérieure",
  },
  {
    regulation: "EDPB Lignes directrices 04/2019 — Article 25 RGPD : protection des données dès la conception et par défaut (Privacy by Design)",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "74 paragraphes — ingestion antérieure",
  },
  {
    regulation: "EDPB Lignes directrices 05/2020 — Consentement au sens du RGPD : validité, granularité, retrait",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "81 paragraphes — ingestion antérieure",
  },
  {
    regulation: "EDPB Lignes directrices 07/2020 — Notions de responsable du traitement et de sous-traitant dans le RGPD",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "126 paragraphes — ingestion antérieure",
  },
  {
    regulation: "EDPB Guidelines 01/2025 — Pseudonymisation as a data protection measure",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "123 paragraphes — Chantier 7",
  },
  {
    regulation: "EDPB Guidelines 01/2024 — Legitimate interest (Art. 6(1)(f) GDPR)",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "134 paragraphes — Chantier 7",
  },
  {
    regulation: "EDPB Guidelines 02/2023 — Technical scope of Art. 5(3) ePrivacy Directive",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "38 paragraphes — Chantier 7",
  },
  {
    regulation: "EDPB Guidelines 01/2022 — Right of access (Art. 15 GDPR)",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "201 paragraphes — Chantier 7",
  },
  {
    regulation: "EDPB Opinion 28/2024 — AI Act & personal data protection",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "113 paragraphes — Chantier 7",
  },

  // ── Commission AI Act présente ───────────────────────────────────────────
  {
    regulation: "Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "509 paragraphes — Chantier 7",
  },
  {
    regulation: "Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)",
    articles: 0, considerants: 0, annexes: 0, status: "present",
    notes: "388 paragraphes — Chantier 7",
  },

  // ── Absents du corpus (à ingérer dans un chantier futur) ─────────────────
  { regulation: "LED (UE 2016/680) — Protection données pénales", articles: 72, considerants: 107, annexes: 5, status: "absent" },
  { regulation: "Règlement 2018/1725 — Protection données institutions UE", articles: 100, considerants: 170, annexes: 4, status: "absent" },
  { regulation: "P2B (UE 2019/1150) — Relations plateformes-entreprises", articles: 22, considerants: 55, annexes: 0, status: "absent" },
  { regulation: "Cybersecurity Act (UE 2019/881)", articles: 67, considerants: 103, annexes: 0, status: "absent" },
  { regulation: "EHDS (UE 2025/327) — Espace européen des données de santé", articles: 103, considerants: 150, annexes: 13, status: "absent" },
  { regulation: "MiCA (UE 2023/1114) — Marchés cryptoactifs", articles: 149, considerants: 226, annexes: 0, status: "absent" },
  { regulation: "CSRD (UE 2022/2464) — Reporting développement durable", articles: 54, considerants: 95, annexes: 0, status: "absent" },
  { regulation: "CSDDD (UE 2024/1760) — Devoir de vigilance", articles: 37, considerants: 82, annexes: 0, status: "absent" },
  { regulation: "Product Liability (UE 2024/2853)", articles: 28, considerants: 80, annexes: 1, status: "absent" },
  { regulation: "GPSR (UE 2023/988) — Sécurité générale produits", articles: 51, considerants: 130, annexes: 2, status: "absent" },
];

// Réglementations présentes avec structure attendue (articles + considérants)
export const STRUCTURED_REGS = EXPECTED_CORPUS.filter(
  d => d.status === "present" && d.articles > 0
);
