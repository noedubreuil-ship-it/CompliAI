import { z } from "zod";

const LikelihoodEnum = z.enum(["low", "medium", "high"]);
const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);
const StatusEnum = z.enum(["implemented", "planned", "required"]);
const MeasureCategoryEnum = z.enum(["Technique", "Organisationnelle", "Contractuelle", "Juridique"]);
const OverallRiskEnum = z.enum(["low", "medium", "high", "critical"]);

const DpiaRiskSchema = z.object({
  risk: z.string().min(1),
  threat: z.string().min(1),
  likelihood: LikelihoodEnum,
  severity: SeverityEnum,
  residual_risk: SeverityEnum,
  measures: z.string().min(1),
  affected_rights: z.array(z.string()).optional().default([]),
});

const DpiaMeasureSchema = z.object({
  category: MeasureCategoryEnum,
  measure: z.string().min(1),
  article_ref: z.string().optional().default(""),
  status: StatusEnum,
  responsible_role: z.string().optional().default(""),
});

const DataSubjectRightsSchema = z.object({
  information: z.string().optional().default(""),
  access: z.string().optional().default(""),
  rectification: z.string().optional().default(""),
  erasure: z.string().optional().default(""),
  portability: z.string().optional().default(""),
  opposition: z.string().optional().default(""),
  automated_decisions: z.string().optional().default(""),
});

const ProcessingDescriptionSchema = z.object({
  purposes_assessment: z.string().optional().default(""),
  legal_basis: z.string().min(1),
  proportionality: z.string().optional().default(""),
  necessity: z.string().optional().default(""),
  retention_assessment: z.string().optional().default(""),
});

export const DpiaOutputSchema = z.object({
  title: z.string().min(1),
  dpia_required: z.boolean(),
  necessity_score: z.number().int().min(0).max(100),
  necessity_criteria_matched: z.array(z.string()).optional().default([]),
  executive_summary: z.string().min(1),
  processing_description: ProcessingDescriptionSchema,
  risks: z.array(DpiaRiskSchema).min(1),
  measures: z.array(DpiaMeasureSchema).min(1),
  data_subject_rights: DataSubjectRightsSchema,
  transfers: z.string().optional().default("Non applicable"),
  consultation_required: z.boolean(),
  consultation_justification: z.string().optional().default(""),
  dpo_opinion: z.string().optional().default(""),
  overall_risk_level: OverallRiskEnum,
  conclusion: z.string().min(1),
  action_plan: z.array(z.string()).min(1),
  review_trigger: z.string().optional().default(""),
  legal_references: z.array(z.string()).optional().default([]),
});

export type DpiaOutput = z.infer<typeof DpiaOutputSchema>;
