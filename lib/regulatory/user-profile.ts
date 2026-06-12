import { SupabaseClient } from "@supabase/supabase-js";

export interface UserRegulatoryProfile {
  userId: string;
  sectors: string[];
  riskLevels: string[];                // "Haut", "Limité", "Minimal"
  aiActClassifications: string[];      // "Systèmes à haut risque", "GPAI", etc.
  dataTypes: string[];                 // "santé", "biométrique", "financier", etc.
  hasHighRiskSystems: boolean;
  usesGPAI: boolean;                   // uses ChatGPT/Claude/Gemini in projects
  isPublicEntity: boolean;
  countries: string[];
  auditVerdicts: string[];
  chatTopics: string[];                // extracted topics from chat history
  relevantRegulations: string[];       // ranked list of most relevant regulations
  personalizedAlertWeights: Record<string, number>; // regulation → weight 0-1
}

// Maps sector to relevant regulations with weights
const SECTOR_REGULATION_WEIGHTS: Record<string, Record<string, number>> = {
  "RH & Recrutement": {
    "AI Act (UE 2024/1689)": 1.0,
    "RGPD (UE 2016/679)": 1.0,
    "Directive 2006/54/CE (Égalité hommes/femmes)": 0.8,
    "Directive 2000/78/CE (Égalité emploi)": 0.8,
    "DSA (UE 2022/2065)": 0.3,
  },
  "Santé": {
    "AI Act (UE 2024/1689)": 1.0,
    "RGPD (UE 2016/679)": 1.0,
    "Règlement 2017/745 (Dispositifs médicaux)": 0.9,
    "Règlement 2017/746 (DM in vitro)": 0.7,
    "DSA (UE 2022/2065)": 0.2,
  },
  "Finance & Crédit": {
    "AI Act (UE 2024/1689)": 1.0,
    "RGPD (UE 2016/679)": 0.9,
    "DORA (UE 2022/2554)": 0.9,
    "MiCA (UE 2023/1114)": 0.7,
    "Directive CRD IV": 0.6,
    "DSA (UE 2022/2065)": 0.4,
    "DMA (UE 2022/1925)": 0.5,
  },
  "Éducation": {
    "AI Act (UE 2024/1689)": 0.9,
    "RGPD (UE 2016/679)": 1.0,
    "Directive 2002/58/CE (vie privée)": 0.6,
  },
  "Justice": {
    "AI Act (UE 2024/1689)": 1.0,
    "RGPD (UE 2016/679)": 1.0,
    "Directive Police (UE 2016/680)": 0.9,
    "Convention 108+": 0.8,
  },
  "Sécurité": {
    "AI Act (UE 2024/1689)": 1.0,
    "RGPD (UE 2016/679)": 0.9,
    "Directive Police (UE 2016/680)": 0.8,
    "NIS2 (UE 2022/2555)": 0.9,
  },
  "Transport": {
    "AI Act (UE 2024/1689)": 0.9,
    "RGPD (UE 2016/679)": 0.7,
    "NIS2 (UE 2022/2555)": 0.8,
  },
  "Infrastructure critique": {
    "AI Act (UE 2024/1689)": 1.0,
    "NIS2 (UE 2022/2555)": 1.0,
    "CER (UE 2022/2557)": 0.9,
    "RGPD (UE 2016/679)": 0.7,
  },
  "Tech / SaaS": {
    "AI Act (UE 2024/1689)": 1.0,
    "RGPD (UE 2016/679)": 0.9,
    "DSA (UE 2022/2065)": 0.8,
    "DMA (UE 2022/1925)": 0.7,
    "Data Act (UE 2023/2854)": 0.8,
  },
  "default": {
    "AI Act (UE 2024/1689)": 0.9,
    "RGPD (UE 2016/679)": 0.9,
    "DSA (UE 2022/2065)": 0.5,
    "DMA (UE 2022/1925)": 0.4,
    "Data Act (UE 2023/2854)": 0.5,
  },
};

const GPAI_KEYWORDS = ["chatgpt", "claude", "gemini", "gpt", "llm", "langage", "génération", "openai", "anthropic", "mistral", "llama", "copilot"];

export async function buildUserProfile(userId: string, db: SupabaseClient): Promise<UserRegulatoryProfile> {
  const [
    { data: projects },
    { data: audits },
    { data: aiSystems },
    { data: chatSessions },
    { data: profile },
  ] = await Promise.all([
    db.from("projects").select("name, sector, description, data_types, target_audience").eq("user_id", userId).eq("status", "active"),
    db.from("audits").select("verdict, ai_act_classification, risk_level, raw_response").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    db.from("ai_system_register").select("risk_category, ai_act_classification, purpose, description").eq("user_id", userId),
    db.from("chat_sessions").select("messages").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    db.from("profiles").select("sector").eq("id", userId).single(),
  ]);

  // Collect sectors
  const sectors = [...new Set([
    ...(projects ?? []).map((p: any) => p.sector).filter(Boolean),
    ...(aiSystems ?? []).map((s: any) => s.risk_category).filter(Boolean),
    profile?.sector,
  ].filter(Boolean))] as string[];

  // Risk levels
  const riskLevels = [...new Set([
    ...(audits ?? []).map((a: any) => a.risk_level).filter(Boolean),
    ...(aiSystems ?? []).map((s: any) => s.risk_category).filter(Boolean),
  ])] as string[];

  // AI Act classifications
  const aiActClassifications = [...new Set([
    ...(audits ?? []).map((a: any) => a.ai_act_classification).filter(Boolean),
    ...(aiSystems ?? []).map((s: any) => s.ai_act_classification).filter(Boolean),
  ])] as string[];

  // Data types
  const dataTypes = [...new Set(
    (projects ?? []).flatMap((p: any) => p.data_types ?? [])
  )] as string[];

  // Detect GPAI usage
  const allText = [
    ...(projects ?? []).map((p: any) => `${p.name} ${p.description ?? ""}`),
    ...(aiSystems ?? []).map((s: any) => `${s.purpose ?? ""} ${s.description ?? ""}`),
  ].join(" ").toLowerCase();
  const usesGPAI = GPAI_KEYWORDS.some(kw => allText.includes(kw));

  // Has high risk systems
  const hasHighRiskSystems =
    riskLevels.includes("Haut") ||
    aiActClassifications.some(c => c?.toLowerCase().includes("haut risque"));

  // Extract chat topics (basic keyword extraction)
  const chatText = (chatSessions ?? [])
    .flatMap((s: any) => {
      try { return Array.isArray(s.messages) ? s.messages.map((m: any) => m.content ?? "") : []; }
      catch { return []; }
    })
    .join(" ")
    .toLowerCase();

  const topicKeywords = [
    "biais", "discrimination", "santé", "biométrique", "reconnaissance faciale",
    "scoring", "crédit", "emploi", "contrat", "données personnelles", "dpia",
    "cybersécurité", "sous-traitant", "lgpd", "nis2", "dsa", "dma",
  ];
  const chatTopics = topicKeywords.filter(kw => chatText.includes(kw));

  // Build personalized weights by merging sector weights
  const weights: Record<string, number> = { ...SECTOR_REGULATION_WEIGHTS["default"] };
  for (const sector of sectors) {
    const sectorWeights = SECTOR_REGULATION_WEIGHTS[sector] ?? {};
    for (const [reg, w] of Object.entries(sectorWeights)) {
      weights[reg] = Math.max(weights[reg] ?? 0, w);
    }
  }

  // Boost weights based on data types
  if (dataTypes.some(d => d.toLowerCase().includes("santé") || d.toLowerCase().includes("médic"))) {
    weights["RGPD (UE 2016/679)"] = 1.0;
    weights["Règlement 2017/745 (Dispositifs médicaux)"] = 0.9;
  }
  if (dataTypes.some(d => d.toLowerCase().includes("biométr"))) {
    weights["AI Act (UE 2024/1689)"] = 1.0;
    weights["RGPD (UE 2016/679)"] = 1.0;
  }

  // Boost based on audit verdicts
  const auditVerdicts = [...new Set((audits ?? []).map((a: any) => a.verdict).filter(Boolean))] as string[];
  if (auditVerdicts.some(v => v.includes("risque") || v.includes("Non conforme"))) {
    weights["AI Act (UE 2024/1689)"] = 1.0;
  }

  const relevantRegulations = Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .map(([reg]) => reg);

  return {
    userId,
    sectors,
    riskLevels,
    aiActClassifications,
    dataTypes,
    hasHighRiskSystems,
    usesGPAI,
    isPublicEntity: false,
    countries: [],
    auditVerdicts,
    chatTopics,
    relevantRegulations,
    personalizedAlertWeights: weights,
  };
}

export function scoreAlertForUser(
  alertRegulation: string,
  alertTitle: string,
  profile: UserRegulatoryProfile
): number {
  let score = profile.personalizedAlertWeights[alertRegulation] ?? 0.3;

  // Boost if matches specific profile
  if (profile.hasHighRiskSystems && alertTitle.includes("haut risque")) score = Math.min(1, score + 0.3);
  if (profile.usesGPAI && (alertTitle.includes("GPAI") || alertTitle.includes("usage général"))) score = Math.min(1, score + 0.3);
  if (profile.dataTypes.some(d => d.includes("biométr")) && alertTitle.includes("biométr")) score = 1;

  return score;
}
