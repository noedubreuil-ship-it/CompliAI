import { z } from "zod";

const EffortEnum = z.enum(["low", "medium", "high"]);
const ClassificationEnum = z.enum(["Inacceptable", "Haut risque", "Risque limité", "Risque minimal"]);

const ObligationSchema = z.object({
  obligation: z.string().min(1),
  article: z.string().optional().default(""),
  description: z.string().optional().default(""),
  effort: EffortEnum,
  deadline: z.string().optional().default(""),
  applicable: z.boolean(),
});

const RecommendedActionSchema = z.object({
  priority: z.number().int().min(1),
  action: z.string().min(1),
  deadline: z.string().optional().default(""),
  article_ref: z.string().optional().default(""),
});

const DecisionTreeTraceSchema = z.object({
  step_0_ai_system_under_act: z.string().optional().default(""),
  step_1_exclusions_art2: z.string().optional().default(""),
  step_2_gpai: z.string().optional().default(""),
  step_3_art5_prohibited: z.string().optional().default(""),
  step_4_high_risk_art6: z.string().optional().default(""),
  step_5_art50_transparency: z.string().optional().default(""),
  result_label: z.string().optional().default(""),
});

const ConformityAssessmentSchema = z.object({
  method: z.string().optional().default(""),
  article: z.string().optional().default(""),
  estimated_cost: z.string().optional().default(""),
  estimated_duration: z.string().optional().default(""),
}).nullable();

export const AiActClassifierOutputSchema = z.object({
  system_name: z.string().min(1),
  classification: ClassificationEnum,
  legal_basis: z.string().min(1),
  classification_justification: z.string().min(1),
  decision_tree_trace: DecisionTreeTraceSchema.optional(),
  risk_category_detail: z.string().nullable().optional(),
  prohibited: z.boolean(),
  prohibited_article: z.string().nullable().optional(),
  prohibited_reason: z.string().nullable().optional(),
  high_risk_annex: z.string().nullable().optional(),
  annexIII_point: z.string().nullable().optional(),
  art6_route: z.string().nullable().optional(),
  gpai: z.boolean(),
  gpai_notes: z.string().nullable().optional(),
  uncertainty_zones: z.array(z.string()).optional().default([]),
  intake_followup_questions: z.array(z.string()).nullable().optional(),
  fiche_classification_markdown: z.string().optional().default(""),
  cost_estimate_table_markdown: z.string().optional().default(""),
  estimated_compliance_cost_eur_min: z.number().nullable().optional(),
  estimated_compliance_cost_eur_max: z.number().nullable().optional(),
  sandbox_suggestion: z.string().optional().default(""),
  rgpd_overlap_note: z.string().optional().default(""),
  obligations: z.array(ObligationSchema).optional().default([]),
  conformity_assessment: ConformityAssessmentSchema.optional(),
  registration_required: z.boolean().nullable().optional(),
  registration_article_note: z.string().nullable().optional(),
  ce_marking_required: z.boolean().optional().default(false),
  transparency_obligations: z.array(z.string()).optional().default([]),
  recommended_actions: z.array(RecommendedActionSchema).optional().default([]),
  compliance_score_estimate: z.number().int().min(0).max(100).nullable().optional(),
  sandbox_eligible: z.boolean().nullable().optional(),
});

export type AiActClassifierOutput = z.infer<typeof AiActClassifierOutputSchema>;
