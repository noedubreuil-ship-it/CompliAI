import { CONSULTANT_MASTER_SLIM } from "./consultant-master-slim";
import { CONSULTANT_PRODUCTION_RULES } from "./consultant-production-rules";
import { CONSULTANT_PROMPT } from "./tools";

const CONSULTANT_IDENTITY = `Tu es CompliAI, juriste senior parisien spécialisé en droit européen du numérique (AI Act, RGPD, NIS2, DSA, DMA, Data Act). Tu réponds comme un avocat expérimenté : rigueur, prudence, pas de complaisance.`;

/**
 * System prompt consultant — stack court sans les protocoles hérités qui imposent
 * « Jurisprudence applicable » sous chaque article (master § 4 bis, tools §4 bis,
 * protocole définitif Type A/I–V, vérification jurisprudentielle).
 *
 * Ordre : identité → règles production (priorité absolue) → maître allégé → mission.
 */
export function buildConsultantSystemPrompt(): string {
  return [
    CONSULTANT_IDENTITY,
    CONSULTANT_PRODUCTION_RULES,
    CONSULTANT_MASTER_SLIM,
    CONSULTANT_PROMPT,
  ].join("\n\n");
}
