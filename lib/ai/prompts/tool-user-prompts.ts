import { loadPromptMarkdown } from "./load-prompt-markdown";

function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((out, [key, value]) => out.replaceAll(`{{${key}}}`, value), template);
}

const MEMOIRE_FILE = "memoire-conformite-user-v1.md";
const AUDIT_QR_FILE = "audit-qr-user-v1.md";
const PLAN_MEMOIRE_FILE = "plan-memoire-user-v1.md";
const EXPLICATION_FILE = "explication-article-user-v1.md";
const INVESTOR_FILE = "investor-report-user-v1.md";

export function getMemoireConformiteUserMarkdown(): string {
  return loadPromptMarkdown(MEMOIRE_FILE);
}

export function getAuditQrUserMarkdown(): string {
  return loadPromptMarkdown(AUDIT_QR_FILE);
}

export function getPlanMemoireUserMarkdown(): string {
  return loadPromptMarkdown(PLAN_MEMOIRE_FILE);
}

export function getExplicationArticleUserMarkdown(): string {
  return loadPromptMarkdown(EXPLICATION_FILE);
}

export function getInvestorReportUserMarkdown(): string {
  return loadPromptMarkdown(INVESTOR_FILE);
}

export function buildMemoireConformiteUserPrompt(situation: string, contexte: string): string {
  return interpolate(getMemoireConformiteUserMarkdown(), {
    SITUATION: situation,
    CONTEXTE: contexte || "(non précisé)",
    DATE_FR: new Date().toLocaleDateString("fr-FR"),
  });
}

export function buildAuditQrUserPrompt(systemDescription: string, secteur: string): string {
  return interpolate(getAuditQrUserMarkdown(), {
    SYSTEM_DESCRIPTION: systemDescription,
    SECTEUR: secteur || "(non précisé)",
    SYSTEM_DESCRIPTION_JSON: systemDescription.replace(/"/g, '\\"'),
  });
}

export function buildPlanMemoireUserPrompt(sujet: string, niveau: string): string {
  return interpolate(getPlanMemoireUserMarkdown(), {
    SUJET: sujet,
    NIVEAU: niveau,
  });
}

export function buildExplicationArticleUserPrompt(article: string, texte: string, niveau: string): string {
  return interpolate(getExplicationArticleUserMarkdown(), {
    ARTICLE: article,
    TEXTE: texte,
    NIVEAU: niveau,
  });
}

export function buildInvestorReportPrompt(data: {
  company_name: string;
  project_name: string;
  verdict: string;
  risk_level: string;
  compliance_score: number;
  ai_act_classification: string;
  roadmap_summary: string;
  cost_estimate: string;
  blocking_issues_count: number;
}): string {
  return interpolate(getInvestorReportUserMarkdown(), {
    COMPANY_NAME: data.company_name,
    PROJECT_NAME: data.project_name,
    VERDICT: data.verdict,
    RISK_LEVEL: data.risk_level,
    COMPLIANCE_SCORE: String(data.compliance_score),
    AI_ACT_CLASSIFICATION: data.ai_act_classification,
    BLOCKING_ISSUES_COUNT: String(data.blocking_issues_count),
    ROADMAP_SUMMARY: data.roadmap_summary,
    COST_ESTIMATE: data.cost_estimate,
  });
}
