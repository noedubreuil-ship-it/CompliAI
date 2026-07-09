/**
 * Manifeste EDPB — vague corpus-mass-edpb
 *
 * Docs déjà en pending_documents (insérés lors de P1 le 2026-07-03) :
 *   - edpb-01-2022-art15-access     (Guidelines 01/2022 — Droit d'accès, était "03/2023" dans l'audit)
 *   - edpb-02-2023-eprivacy-5-3     (Guidelines 02/2023 — ePrivacy Art. 5(3))
 *   - edpb-opinion-28-2024-ai       (Opinion 28/2024 — Modèles IA)
 *   - edpb-01-2024-legitimate-interest (Guidelines 01/2024 — Intérêt légitime)
 *   - edpb-01-2025-pseudonymisation (Guidelines 01/2025 — Pseudonymisation)
 *
 * Ce manifeste contient UNIQUEMENT les nouveaux documents EDPB.
 *
 * CORRECTION SOURCE : "EDPB Guidelines 03/2023 — Droit d'accès" dans l'audit
 * RAG_CORPUS_GAPS_EXTENDED_2026-06-30.md est une ERREUR. Ce document n'existe pas.
 * Le document correct est "Guidelines 01/2022 — Right of Access" déjà en pending_documents.
 */

import type { MassDocument } from "./types";

export const EDPB_MASS_MANIFEST: MassDocument[] = [
  // ─── P2 ─────────────────────────────────────────────────────────────────────

  {
    id: "edpb-04-2022-fines",
    title: "EDPB Guidelines 04/2022 — Calcul des amendes RGPD",
    kind: "edpb_guideline",
    wave: "edpb",
    priority: "P2",
    language: "en",
    // URL page officielle retourne 404 — structure EDPB modifiée pour les guidelines 2022
    // À rechercher manuellement via https://www.edpb.europa.eu/our-work-tools/our-documents
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-42022-calculation-administrative-fines_en",
    estimatedChunks: [50, 80],
    sizeRisk: "low",
    urlConfidence: "low",
    skipUntilUrlFixed: true,
  },

  {
    id: "edpb-02-2024-art48",
    title: "EDPB Guidelines 02/2024 — Art. 48 RGPD (transferts sans décision d'adéquation)",
    kind: "edpb_guideline",
    wave: "edpb",
    priority: "P2",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22024-article-48-gdpr_en",
    estimatedChunks: [40, 70],
    sizeRisk: "low",
    urlConfidence: "medium",
  },

  {
    id: "edpb-statement-04-2024-ai-models",
    title: "EDPB Statement 04/2024 — Modèles d'IA et données personnelles",
    kind: "other", // edpb statement
    wave: "edpb",
    priority: "P2",
    language: "en",
    // Note: La "Statement IA générative avril 2023" n'existe pas comme doc formel.
    // Le document le plus proche est Opinion 28/2024 (déjà en pending_documents).
    // URL construite par analogie — retourne 404 — à rechercher manuellement.
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-42024-personal-data-processing-context-ai-models_en",
    estimatedChunks: [20, 40],
    sizeRisk: "low",
    urlConfidence: "low",
    skipUntilUrlFixed: true,
  },

  {
    id: "edpb-wp251-profiling",
    title: "WP29 WP251 rev.01 — Profilage et prise de décision automatisée (Art. 22 RGPD)",
    kind: "edpb_guideline",
    wave: "edpb",
    priority: "P2",
    language: "en",
    officialUrl:
      "https://ec.europa.eu/newsroom/article29/items/612053",
    rawContentUrl:
      "https://www.edpb.europa.eu/sites/default/files/files/file1/wp251rev.01_en.pdf",
    estimatedChunks: [70, 120],
    sizeRisk: "low",
    urlConfidence: "medium",
  },

  {
    id: "edpb-wp260-transparency",
    title: "WP29 WP260 rev.01 — Transparence (Art. 12-14 RGPD)",
    kind: "edpb_guideline",
    wave: "edpb",
    priority: "P2",
    language: "en",
    officialUrl:
      "https://ec.europa.eu/newsroom/article29/items/622227",
    rawContentUrl:
      "https://www.edpb.europa.eu/sites/default/files/files/file1/wp260_en.pdf",
    estimatedChunks: [80, 130],
    sizeRisk: "low",
    urlConfidence: "medium",
  },

  // ─── P3 ─────────────────────────────────────────────────────────────────────

  {
    id: "edpb-05-2022-political-campaigns",
    title: "EDPB Guidelines 05/2022 — Utilisation des données personnelles en campagne politique",
    kind: "edpb_guideline",
    wave: "edpb",
    priority: "P3",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-52022-use-personal-data-context-political-campaigns_en",
    rawContentUrl:
      "https://www.edpb.europa.eu/system/files/2023-05/edpb_guidelines_05-2022_politicalcampaigns_v2.0_en.pdf",
    estimatedChunks: [40, 70],
    sizeRisk: "low",
    urlConfidence: "medium",
  },

  {
    id: "edpb-01-2023-certification",
    title: "EDPB Guidelines 01/2023 — Critères de certification RGPD (Art. 42-43)",
    kind: "edpb_guideline",
    wave: "edpb",
    priority: "P3",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-12023-certification-criteria-according-articles_en",
    estimatedChunks: [50, 80],
    sizeRisk: "low",
    urlConfidence: "medium",
  },

  {
    id: "edpb-statement-2024-aiact-gdpr",
    title: "EDPB Statement 03/2024 — Rôle de l'EDPB et des APD dans le cadre de l'AI Act",
    kind: "other", // edpb statement
    wave: "edpb",
    priority: "P2",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-32024-role-edpb-national-dpas-ai-act_en",
    estimatedChunks: [20, 40],
    sizeRisk: "low",
    urlConfidence: "low", // URL à vérifier en dry-run — format incertain
  },
];
