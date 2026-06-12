/**
 * Outil « Comparateur de législations — UE-27 complet » — CompliAI v1.
 * Registre EU-27 + comparaison bilatérale ou panorama.
 */
import { AI_CONFIG } from "../config";
import {
  EU27,
  getDPASummary,
  getNationalLawSummary,
  getNIS2TranspositionStatus,
} from "@/lib/data/eu27-registry";
import { getEu27IsoCodesSorted } from "@/lib/data/eu27-codes";
import {
  USER_PROMPT_CAHIER_REMINDER,
  loadPromptMarkdown,
  withPromptApplicationFooter,
} from "./load-prompt-markdown";

const PROMPT_FILE = "comparateur-legislations-eu27-v1.md";

export function getComparateurLegislationsMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export type ComparateurFocus = "rgpd" | "ai_act" | "nis2" | "transversal";

export const COMPARATEUR_JSON_OUTPUT_SPEC = `
## SCHÉMA JSON OBLIGATOIRE (réponse exclusive — pas de markdown autour)

{
  "mode": "bilateral | panorama",
  "focus": "rgpd | ai_act | nis2 | transversal",
  "pays_codes": ["DE", "FR"],
  "pays_labels": ["Allemagne", "France"],
  "synthese": "Synthèse en 3-5 phrases avec signaux 🟢🟡🔴 si pertinent",
  "registry_notice": "Rappel RÈGLE N1/N5 — état registre + date de vérification",
  "tableau": [
    {
      "aspect": "Aspect comparé (ex. DPO, données salariés, autorité AI Act, transposition NIS2)",
      "pays1": "Position pays 1 (réf. loi/DPA si 🟢)",
      "pays2": "Position pays 2",
      "divergence": "Faible | Moyenne | Forte",
      "fiabilite": "🟢 | 🟡 | 🔴",
      "commentaire": "Analyse courte — RÈGLE N4 si lacune"
    }
  ],
  "divergences_cles": [
    { "theme": "DPO / salariés / AI Act / NIS2", "resume": "…", "fiabilite": "🟢" }
  ],
  "points_convergence": ["…"],
  "points_divergence": [
    { "point": "…", "avantage": "DE | FR | neutre", "explication": "…", "fiabilite": "🟢" }
  ],
  "implications_pratiques": "Pour une organisation opérant dans les juridictions comparées",
  "limitations": ["Lacunes RÈGLE N3/N4 si applicable"],
  "sources": ["URL ou référence officielle — DPA, portail législatif, registre EU-27"],
  "disclaimer": "Analyse indicative — vérifier textes en vigueur et positions DPA locales."
}

Règles :
- Mode **bilateral** : minimum **8 lignes** dans \`tableau\` ; \`pays1\`/\`pays2\` = les deux États demandés.
- Mode **panorama** : \`tableau\` avec une ligne par État membre (27) ou par groupe cohérent ; \`pays1\` = code ISO, \`pays2\` = synthèse ; adapter les colonnes au focus.
- Appliquer **RÈGLES N1–N5** ; prioriser le registre injecté dans le message utilisateur.
- Ne pas inventer de positions DPA ni de numéros d'articles non certains.
`.trim();

export function getComparateurLegislationsSystemPrompt(): string {
  return withPromptApplicationFooter(
    `${getComparateurLegislationsMarkdown()}\n\n---\n\n${COMPARATEUR_JSON_OUTPUT_SPEC}`,
  );
}

const FOCUS_LABELS: Record<ComparateurFocus, string> = {
  rgpd: "RGPD — lois nationales de mise en œuvre + pratiques DPA",
  ai_act: "AI Act — autorités nationales et désignations",
  nis2: "NIS2 — transposition et cadre national",
  transversal: "Transversal RGPD + AI Act + NIS2 (divergences clés du cahier)",
};

/** Contexte registre live injecté dans le message utilisateur (RÈGLE N1). */
export function buildComparateurRegistryContext(countryCodes: string[]): string {
  const codes =
    countryCodes.length > 0 ?
      countryCodes.map((c) => c.trim().toUpperCase()).filter((c) => EU27[c])
    : getEu27IsoCodesSorted();

  const fiches = codes
    .map((code) => {
      const row = EU27[code];
      return `### ${row.name_fr} (${code})
- DPA : ${row.dpa.name} (${row.dpa.acronym}) — ${row.dpa.url} — décisions : ${row.dpa.decisions_url}
- Loi RGPD : ${row.gdpr_law.title} — ${row.gdpr_law.reference} — ${row.gdpr_law.portal_url}
- NIS2 : ${row.nis2.status}${row.nis2.law_title ? ` — ${row.nis2.law_title}` : ""}${row.nis2.notes ? ` (${row.nis2.notes})` : ""}
- AI Act : ${row.ai_act_authority.status}${row.ai_act_authority.name ? ` — ${row.ai_act_authority.name}` : ""}${row.ai_act_authority.notes ? ` (${row.ai_act_authority.notes})` : ""}`;
    })
    .join("\n\n");

  return `## REGISTRE EU-27 COMPLIAI (injection runtime — source primaire RÈGLE N1)

${getDPASummary(codes)}

${getNationalLawSummary(codes)}

${getNIS2TranspositionStatus()}

### Fiches détaillées (${codes.length} pays)

${fiches}`;
}

export function resolveCountryLabel(code: string): string {
  const c = EU27[code.trim().toUpperCase()];
  return c ? `${c.name_fr} (${c.code})` : code;
}

export function buildComparateurCompareUserPrompt(opts: {
  countryCodes: [string, string];
  focus: ComparateurFocus;
  aspect?: string;
}): string {
  const [a, b] = opts.countryCodes.map((c) => c.trim().toUpperCase());
  const aspectLine = opts.aspect?.trim() ? `\nAspects prioritaires demandés : ${opts.aspect.trim()}` : "";

  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : COMPARAISON BILATÉRALE UE-27

| Paramètre | Valeur |
| --- | --- |
| Mode | bilateral |
| Focus | ${FOCUS_LABELS[opts.focus]} |
| Pays A | ${resolveCountryLabel(a)} |
| Pays B | ${resolveCountryLabel(b)} |${aspectLine}

${buildComparateurRegistryContext([a, b])}

Produisez **uniquement** le JSON selon le schéma système (mode \`bilateral\`, \`pays_codes\`: ["${a}","${b}"]).`;
}

export function buildComparateurPanoramaUserPrompt(opts: {
  focus: ComparateurFocus;
  aspect?: string;
}): string {
  const aspectLine = opts.aspect?.trim() ? `\nAspects prioritaires : ${opts.aspect.trim()}` : "";

  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : PANORAMA UE-27 (27 ÉTATS MEMBRES)

| Paramètre | Valeur |
| --- | --- |
| Mode | panorama |
| Focus | ${FOCUS_LABELS[opts.focus]} |${aspectLine}

${buildComparateurRegistryContext(getEu27IsoCodesSorted())}

Produisez **uniquement** le JSON selon le schéma système (mode \`panorama\`). Couvrir les **27** États membres dans \`tableau\` ou une structure équivalente exploitable.`;
}

export function comparateurAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv =
    typeof process.env.AI_COMPARATEUR_MODEL === "string" ? process.env.AI_COMPARATEUR_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_COMPARATEUR === "string" ?
      process.env.AI_MAX_TOKENS_COMPARATEUR.trim()
    : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_COMPARATEUR === "string" ?
      process.env.AI_TEMPERATURE_COMPARATEUR.trim()
    : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ?
      Math.min(8192, Math.floor(Number(mtRaw)))
    : 6000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.15;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}
