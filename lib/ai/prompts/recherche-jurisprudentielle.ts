import { AI_CONFIG } from "../config";
import {
  USER_PROMPT_CAHIER_REMINDER,
  loadPromptMarkdown,
  withPromptApplicationFooter,
} from "./load-prompt-markdown";

const PROMPT_FILE = "recherche-jurisprudentielle-eu-v1.md";

export function getRechercheJurisprudentielleMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export const RECHERCHE_JP_OUTPUT_JSON_SPEC = `
## SCHÉMA JSON OBLIGATOIRE (UN SEUL OBJET)

- Réponse **exclusivement** en JSON valide — pas de markdown autour.
- \`decisions[]\` : 3 à 8 entrées **certaines** ; classer par \`importance\` (3 = ⭐⭐⭐, 2 = ⭐⭐, 1 = ⭐).
- \`type_decision\` : \`fondateur\` | \`confirmatif\` | \`revirement\` | \`application\` | \`sanction\` | \`normatif\`
- Ne pas inventer d'ECLI ni de numéro d'affaire ; \`lacunes_signalees\` si corpus pauvre.

Structure :

{
  "requete": "",
  "mode_recherche": "article|theme|mots_cles|combinaison",
  "filtres_appliques": {
    "juridictions": [],
    "pays_dpa": [],
    "periode": "",
    "textes_eu": [],
    "types": []
  },
  "nb_resultats": 0,
  "lacunes_signalees": [],
  "etat_du_droit": ["point 1", "point 2"],
  "decisions": [
    {
      "rang": 1,
      "importance": 3,
      "type_decision": "fondateur",
      "reference": "C-XXX/YY Nom",
      "juridiction": "CJUE",
      "date": "YYYY-MM-DD",
      "ecli": "ECLI:... ou null",
      "parties": "",
      "formation": "GC|Chambre|...",
      "en_une_ligne": "15 mots max",
      "textes_eu_interpretes": ["Art. X RGPD"],
      "ce_que_la_juridiction_a_decide": "ratio en 3-5 phrases abstraites",
      "apport_au_droit_positif": "",
      "implication_pratique": "action concrète",
      "rag_source": "indexé|connaissance_modèle"
    }
  ],
  "edpb_et_soft_law": [
    { "document": "", "date": "", "objet": "", "pertinence": "" }
  ],
  "questions_ouvertes": [],
  "evolution_chronologique": [
    { "annee": "YYYY", "decision": "", "apport": "" }
  ],
  "synthese_thematique": "4-5 phrases (compat UI — peut reprendre etat_du_droit)",
  "evolution": "tendances récentes (compat UI)",
  "conseil_pratique": "conseil global entreprises/DPO",
  "pour_approfondir": [
    { "outil": "Analyseur de jurisprudence", "chemin": "/dashboard/tools/jurisprudence", "usage": "" },
    { "outil": "Consultant IA", "chemin": "/dashboard/chat", "usage": "" }
  ],
  "sources_officielles": ["https://curia.europa.eu", "https://hudoc.echr.coe.int", "https://www.edpb.europa.eu"],
  "disclaimer": "Panorama indicatif — vérifier sur CURIA/HUDOC les décisions récentes."
}
`.trim();

export function getRechercheJurisprudentielleSystemPrompt(): string {
  return withPromptApplicationFooter(
    `${getRechercheJurisprudentielleMarkdown()}\n\n${RECHERCHE_JP_OUTPUT_JSON_SPEC}`
  );
}

export type RechercheJpIntake = {
  requete: string;
  filtres?: string;
  mode?: string;
  texte_eu?: string;
  periode?: string;
  rag_context?: string;
};

export function buildRechercheJurisprudentielleUserPrompt(data: RechercheJpIntake): string {
  const reqEsc = JSON.stringify(data.requete);
  return `${USER_PROMPT_CAHIER_REMINDER}# RECHERCHE JURISPRUDENTIELLE EUROPÉENNE

| Champ | Valeur |
| --- | --- |
| Requête | ${data.requete} |
| Filtre juridiction (UI) | ${data.filtres || "Toutes"} |
| Mode indicatif | ${data.mode || "auto"} |
| Texte EU ciblé | ${data.texte_eu || "—"} |
| Période | ${data.periode || "Tout"} |

${data.rag_context ? `## Extraits corpus indexé (priorité factuelle)\n\n${data.rag_context}\n` : "## Corpus RAG\n\nAucun extrait indexé retourné pour cette requête — appliquez R2 (lacunes) et limitez-vous aux décisions dont vous êtes certain.\n"}

Produisez le panorama JSON complet selon le schéma système. \`requete\` dans le JSON = ${reqEsc}.

${RECHERCHE_JP_OUTPUT_JSON_SPEC}`;
}

export function rechercheJpAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv =
    typeof process.env.AI_RECHERCHE_JP_MODEL === "string" ? process.env.AI_RECHERCHE_JP_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_RECHERCHE_JP === "string" ? process.env.AI_MAX_TOKENS_RECHERCHE_JP.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_RECHERCHE_JP === "string" ? process.env.AI_TEMPERATURE_RECHERCHE_JP.trim() : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ?
      Math.min(8192, Math.floor(Number(mtRaw)))
    : 4000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.2;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}
