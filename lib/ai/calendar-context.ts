/**
 * Extrait les décisions passées du calendrier EU qui sont pertinentes
 * pour une question donnée et les formate en contexte pour Claude.
 *
 * Décisions ciblées : Arrêt CJUE, Décision DPA attendue/rendue,
 * Entrée en vigueur, Vote Parlement EU.
 */

import { EU_CALENDAR_EVENTS, type CalendarEvent } from "@/lib/data/eu-calendar";

// Types d'événements qui représentent des décisions/résultats officiels
const DECISION_TYPES = new Set([
  "Arrêt CJUE",
  "Décision DPA attendue",
  "Entrée en vigueur",
  "Vote Parlement EU",
  "Publication officielle",
]);

// ─── Extraction de la référence CJUE depuis le titre/description ──────────────
const CJUE_REF_REGEX = /\b(C-\d+\/\d+|T-\d+\/\d+|F-\d+\/\d+)\b/g;
const ECLI_REGEX = /ECLI:EU:[CT]:\d{4}:\d+/g;

export interface CalendarDecision {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  regulation: string;
  tags: string[];
  sourceUrl?: string;
  cjueRef?: string;       // ex: "C-131/12"
  ecli?: string;          // ex: "ECLI:EU:C:2014:317"
  relevanceScore: number;
}

/**
 * Retourne les décisions passées du calendrier pertinentes pour `query`.
 * Score basé sur le chevauchement de mots-clés entre la question et les tags/titre.
 */
export function getRelevantCalendarDecisions(
  query: string,
  maxResults = 3
): CalendarDecision[] {
  const today = new Date();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/['']/g, ""));

  const decisions: CalendarDecision[] = EU_CALENDAR_EVENTS
    .filter((e: CalendarEvent) => {
      // Décisions passées uniquement
      if (new Date(e.date) > today) return false;
      return DECISION_TYPES.has(e.type);
    })
    .map((e: CalendarEvent) => {
      // Extraire la référence CJUE
      const combined = `${e.title} ${e.description}`;
      const cjueRefs = combined.match(CJUE_REF_REGEX);
      const eclis = combined.match(ECLI_REGEX);

      // Calcul du score de pertinence
      let score = 0;

      // Mots de la question présents dans le titre (poids fort)
      for (const w of queryWords) {
        if (e.title.toLowerCase().includes(w)) score += 3;
      }

      // Mots dans les tags (poids moyen)
      for (const tag of e.tags) {
        for (const w of queryWords) {
          if (tag.toLowerCase().includes(w)) score += 2;
        }
      }

      // Mots dans la description (poids faible)
      for (const w of queryWords) {
        if (e.description.toLowerCase().includes(w)) score += 1;
      }

      // Mots dans le nom de la réglementation
      for (const w of queryWords) {
        if (e.regulation.toLowerCase().includes(w)) score += 2;
      }

      return {
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.date,
        type: e.type,
        regulation: e.regulation,
        tags: e.tags,
        sourceUrl: e.sourceUrl,
        cjueRef: cjueRefs?.[0],
        ecli: eclis?.[0],
        relevanceScore: score,
      };
    })
    .filter((d) => d.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  return decisions;
}

/**
 * Formate les décisions en bloc de contexte pour Claude.
 */
export function buildCalendarDecisionContext(decisions: CalendarDecision[]): string {
  if (decisions.length === 0) return "";

  const lines = decisions.map((d) => {
    const ref = d.cjueRef ? ` [Réf. ${d.cjueRef}]` : "";
    const ecli = d.ecli ? ` | ${d.ecli}` : "";
    const url = d.sourceUrl ? `\n    Source officielle : ${d.sourceUrl}` : "";
    return [
      `• ${d.type} — ${d.title}${ref}${ecli}`,
      `  Date : ${new Date(d.date + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
      `  Règlement concerné : ${d.regulation}`,
      `  Résumé : ${d.description.slice(0, 400)}${d.description.length > 400 ? "…" : ""}`,
      url,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return lines.join("\n\n");
}
