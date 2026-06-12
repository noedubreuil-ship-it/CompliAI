import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "fria-art27-ai-act-v1.md";

export function getFRIA27Markdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — SORTIE JSON FRIA ART. 27

Répondez **exclusivement** avec un objet JSON valide conforme au schéma fourni dans le **message utilisateur**.

- Début : \`{\` · fin : \`}\` — aucune prose hors JSON, aucun bloc \`\`\`.
- Le dernier caractère de votre réponse doit être le \`}\` qui ferme l’objet racine (aucun commentaire ni texte après).
- **Concision** : phrases courtes dans chaque champ narratif ; évitez les répétitions entre \`rights_areas\`, \`rights_assessment\`, \`section3\`. Un JSON **complet** prime sur un texte long **tronqué**.
- Respectez les règles G1–G7 et la checklist § Partie 7 du prompt métier.
`.trim();

export function getFRIA27SystemPrompt(): string {
  return withPromptApplicationFooter(`${getFRIA27Markdown()}\n\n${PRODUCT_JSON_SHELL}`);
}

/**
 * Schéma JSON attendu (message utilisateur) — compact mais exhaustif § Art. 27(2) + Sections 7 & signatures + disclaimer.
 */
export const FRIA_27_OUTPUT_JSON_SPEC = `
## SCHÉMA JSON OBLIGATOIRE

Remplissez tous les champs avec du contenu **contextuel**. Tableaux avec plusieurs lignes lorsque pertinent. Si un volet juridique est hors champ pour le déploiement décrit : \`risk_rows\` peut être vide et \`introduction\` doit motiver **n/a** avec précision factuelle.

- \`overall_risk_level\` et \`rights_assessment[].impact_level\` : \`none\` | \`low\` | \`medium\` | \`high\` | \`critical\`.
- \`deployment_recommendation\` : \`recommended_as_is\` | \`conditional\` | \`not_recommended\` (une seule option — cohérente avec \`section6.motivated_conclusion_text\`).
- \`synthesis_rows[].level_indicator\` : \`red\` | \`yellow\` | \`green\`.

**\`rights_areas\` — inclure tout droit pertinent** ; codes conseillés (adapter \`legal_refs\`, retirer les non pertinents avec n/a) :
\`art1_dignity\`, \`art7_private_art8_echr\`, \`art8_charter_personal_data\`, \`art21_discrimination_bias\`, \`art24_children\`, \`art23_gender_equality\`, \`art26_disability_integration\`, \`art41_good_administration\`, \`art47_effective_remedy\`, \`art11_freedom_expression\`.

{
  "title": "FRIA — [système]",
  "honesty_notes": ["Limites données fournies / hypothèses explicites si besoin"],

  "identification": {
    "deployer_organisation": "",
    "legal_nature": "",
    "deployment_country": "",
    "system_evaluated": "",
    "date_establishment": "",
    "date_revision_minimum": "",
    "responsible_name_function_contact": "",
    "ai_act_classification": "",
    "is_public_entity_context": ""
  },

  "executive_summary": "3 à 8 phrases synthèse exécutive honnête.",
  "overall_risk_level": "medium",
  "deployment_recommendation": "conditional",
  "deployment_conditions": ["Condition 1 + délai", "Condition 2 + délai"],
  "consultation_required": true,
  "required_actions": [],

  "section1_system_context": {
    "general_description": "",
    "institutional_process_chain": "",
    "frequency_usage": "",
    "deployment_duration_planned": "",
    "geographic_scope": "",
    "estimated_processing_volume_monthly": "",
    "expected_benefits_documented_non_marketing": ""
  },

  "section2_persons": {
    "category_table": [
      {
        "category": "",
        "estimated_volume_band": "",
        "impact_direct_or_indirect": "",
        "vulnerability_degree": ""
      }
    ],
    "vulnerable_groups_specific_analysis": [
      {
        "group": "",
        "why_more_exposed": "",
        "potential_biases": "",
        "specific_measures": ""
      }
    ]
  },

  "section3_fundamental_rights": {
    "matrix_legend": "Probabilité 1–5, Gravité 1–5, Score=P×G. 1–6 faible, 7–14 moyen, 15–25 élevé/critique.",
    "rights_areas": [
      {
        "code": "art1_dignity",
        "title_short": "",
        "legal_refs": "",
        "introduction": "",
        "risk_rows": [
          {"risk": "", "probability_1_to_5": 1, "gravity_1_to_5": 1, "score": 1, "mitigation": ""}
        ]
      }
    ],
    "art21_bias_dimension_table": [
      {"dimension": "genre|origine|handicap|âge|religion|situation socio-éco…", "bias_analysis": "", "mitigation": ""}
    ],
    "aipd_required_under_art35_rgpd": false,
    "aipd_cross_reference_if_any": "",
    "children_minors_relevant": false,
    "children_risks_note": "",
    "expression_freedom_note": "",
    "synthesis_rows": [
      {
        "fundamental_right": "",
        "raw_score_aggregate": "",
        "attenuations": "",
        "residual_score": "",
        "level_indicator": "yellow"
      }
    ],
    "max_raw_aggregate_theoretical": "",
    "max_residual_aggregate_numeric": "",
    "raw_scores_sum_actual": "",
    "residual_scores_sum_actual": ""
  },

  "section4_mitigation_human_oversight": {
    "art13_art14_human_control_summary": "",
    "human_oversight_table": [
      {"measure": "", "responsible_role": "", "frequency_or_trigger": "", "documentation": ""}
    ],
    "additional_mitigations_for_medium_high_residual": [
      {"risk_ref": "", "residual_before": "", "measure": "", "deadline": "", "owner": "", "kpi": ""}
    ],
    "complaints_internal_procedure": {"contact": "", "response_sla_days": "", "steps": ""},
    "external_remedies": [""],
    "training_art4_summary": ""
  },

  "section5_residual_acceptability": {
    "justified_residual_rows": [{"risk_residual": "", "residual_score": "", "why_acceptable": ""}],
    "continuous_monitoring_commitment": "",
    "fria_review_frequency_trigger": ""
  },

  "section6_motivated_conclusion": {
    "residual_global_score_brut_over_225": "",
    "count_rights_high_residual": 0,
    "count_rights_medium_residual": 0,
    "count_rights_low_residual": 0,
    "motivated_conclusion_text": "Avis trichotomique développé (recommandé / conditionnel / non recommandé).",
    "revision_triggers_bullets": [""]
  },

  "section7_registration_governance": {
    "eu_aida_article49_reminder": "Obligation enregistrement avant déploiement — Réf EU AIDA : À compléter",
    "stakeholders_consulted": [{"organisation_or_group": "", "date": "", "outcome": ""}],
    "validation": {"fria_responsible": "", "validated_by": "", "consulted": ["DPO…"], "validation_date": ""}
  },

  "signatures_block_markdown": "Bloc signatures texte lignes _____ conforme § modèle métier",

  "rights_assessment": [
    {
      "right": "",
      "charter_article": "",
      "impact_level": "high",
      "probability_1_to_5": 3,
      "gravity_1_to_5": 5,
      "score_px_g": 15,
      "description": "",
      "mitigation": ""
    }
  ],

  "affected_groups": [
    {"group": "", "specific_risks": "", "protections": ""}
  ],

  "conclusion": "Résumé court (2-5 phrases) aligné sur l'avis final — redondant mais utile pour PDF/exports.",
  "professional_disclaimer": "Avertissement type CompliAI + validation juriste + complétude déployeur."
}
`.trim();
