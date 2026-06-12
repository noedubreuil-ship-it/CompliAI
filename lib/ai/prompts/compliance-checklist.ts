import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "compliance-checklist-interactive-v1.md";

export function getComplianceChecklistMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — CHECKLIST ARTIFACT JSON UNIQUE

Répondez **exclusivement** avec un objet JSON valide conforme au schéma du **message utilisateur**.

Pas de bloc markdown hors JSON ; pas de texte hors JSON.

Respectez le fichier métier (sélection stricte, banque A–I, dates G2, exclusions).
`.trim();

export function getComplianceChecklistSystemPrompt(): string {
  return withPromptApplicationFooter(`${getComplianceChecklistMarkdown()}\n\n${PRODUCT_JSON_SHELL}`);
}

/** Schéma JSON attendu dans le corps du message utilisateur (buildComplianceChecklistUserPrompt). */
export const COMPLIANCE_CHECKLIST_JSON_SPEC = `
## SCHÉMA JSON

\`categories\`: regrouper de façon **logique métier** (ex. urgences légales 2025, haut risque 2026, RGPD, NIS2, sectoriel, gouvernance). Au moins une catégorie **URGENCES / déjà applicable** si des obligations telles préexistantes sont pertinentes au profil.

Chaque **item** :
- \`priority\` **obligatoire pour l’UI** : uniquement les littéraux suivants (sans guillemets dans le JSON) : critique, haute, moyenne, faible — grille : CRITIQUE/urgence → critique ; IMPORTANTE → haute ; secondaire réglementaire modéré → moyenne ; recommandé / bonnes pratiques → faible.
- \`effort\` : low | medium | high.
- \`urgency_band\` recommandé : already_applicable | aug_2026_hr_window | within_6_months_audit | foundation_or_good_practice.
- \`canonical_ref\` comme la banque (A001, B001…) ou nouveau identifiant CUSTOM-xxx si aucune ligne ne colle.
- \`tool_link_slug\` : \`classifier\` | \`art11\` | \`fria\` | \`policy\` | \`contracts\` | \`dpia\` | \`consultant\` ou \`null\`.
- Ne pas ajouter un champ \`status\` par item côté modèle pour pilotage UI ; l’état vit côté client (persisté localement).


{
  "title": "",
  "summary": "",
  "regulation_focus": "",
  "profile_summary": "",
  "applicable_frameworks": "",
  "non_applicable_exclusions": [
    { "area": "", "justification": "" }
  ],

  "total_items": 0,
  "progress_initial_note": "",
  "priority_urgent_items_summary": "",
  "secondary_timeline_hint": "",
  "quick_wins": ["", "", ""],

  "categories": [
    {
      "id": "URGENT_AI_ACT",
      "name": "",
      "article_ref": "",
      "items": [
        {
          "id": "B-001",
          "canonical_ref": "B001",
          "law_category_label": "",
          "subcategory": "",
          "title": "",
          "description": "",
          "legal_basis": "",
          "priority": "critique",
          "deadline_iso": "",
          "deadline_label": "",
          "urgency_band": "already_applicable",
          "article": "",
          "effort": "medium",
          "applicable_to": "",
          "applies_roles": ["provider", "deployer"],
          "responsible": "",
          "validation": "",
          "evidence": "",
          "tool_link_label": "",
          "tool_link_slug": "classifier",
          "tags": ["art5"]
        }
      ]
    }
  ],

  "estimated_total_effort": "M",
  "priority_roadmap": [
    "",
    "",
    ""
  ]
}
`.trim();
