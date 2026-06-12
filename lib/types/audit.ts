export type RiskLevel = "Inacceptable" | "Haut" | "Limité" | "Minimal";
export type Verdict =
  | "Conforme"
  | "Attention requise"
  | "Risque élevé"
  | "Non conforme";

export interface RoadmapAction {
  title: string;
  description: string;
  regulation?: string;
  article?: string;
  effort: "low" | "medium" | "high";
  cost_estimate?: string;
}

export interface RoadmapPhase {
  phase: string;
  duration?: string;
  actions: RoadmapAction[];
}

export interface CostEstimate {
  initial: string;
  recurring_annual: string;
  details: string;
}

export interface BlockingIssue {
  title: string;
  description: string;
  regulation: string;
  article?: string;
  severity: "critical" | "high" | "medium" | "low";
  phase: string;
}

export interface AuditResult {
  verdict: Verdict;
  ai_act_classification: string;
  risk_level: RiskLevel;
  compliance_score: number;
  summary: string;
  roadmap: RoadmapPhase[];
  cost_estimate: CostEstimate;
  blocking_issues: BlockingIssue[];
  lawyer_needed: boolean;
  legal_basis: string[];
}

export interface ProjectFormData {
  /** Projet rattaché à une organisation (équipe) — optionnel */
  organization_id?: string | null;
  name: string;
  description: string;
  sector: string;
  business_model: string;
  target_audience: "B2B" | "B2C" | "B2B2C" | "Public sector";
  data_types: string[];
  uses_personal_data: boolean;
  uses_biometric_data: boolean;
  uses_automated_decisions: boolean;
  deployment_country: string[];
  ai_model_type: string;
  training_data_source: string;
}
