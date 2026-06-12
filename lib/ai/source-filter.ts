/**
 * source-filter.ts — Filtrage des sources RAG hors-sujet avant injection.
 *
 * Le contexte RAG injecté au modèle peut contenir des sources qui figurent
 * dans la base de veille mais qui ne sont pas pertinentes pour la question
 * posée (ex. fiches "Code de bonnes pratiques GPAI" remontées sur une
 * question RGPD biométrie). Ce module évite la "contamination RAG" décrite
 * au § 1.3 du protocole universel et à la section 5 du protocole de
 * vérification jurisprudentielle.
 *
 * Stratégie générale :
 *   - Pour chaque axe thématique (`gpai` aujourd'hui, extensible demain),
 *     on définit un déclencheur (regex) appliqué à la question utilisateur
 *     ET une liste de motifs (patterns) appliqués au contenu des sources.
 *   - Si la question N'ACTIVE PAS le déclencheur, on retire les sources
 *     dont le contenu ou le titre contient l'un des motifs : elles sont
 *     considérées hors-sujet.
 *   - Si la question active le déclencheur, toutes les sources passent.
 *
 * Le filtrage est volontairement conservateur : on ne retire jamais une
 * source au seul motif qu'elle pourrait être hors-sujet — il faut une
 * correspondance explicite sur un motif connu.
 */

import type { LegalCitation } from "@/lib/types/legal";

/** Définition d'un axe thématique de filtrage. */
export interface OffTopicAxis {
  /** Identifiant lisible (pour logs). */
  id: string;
  /** Si la question matche, on garde toutes les sources de cet axe. */
  triggers: RegExp;
  /** Motifs qui, présents dans une source, la marquent comme appartenant à l'axe. */
  patterns: string[];
}

/**
 * Axes thématiques connus à filtrer.
 *
 * Conformément à la section 5 du protocole de vérification jurisprudentielle :
 *   - GPAI / Art. 56 § 9 ne doivent jamais "contaminer" une question RGPD,
 *     biométrie, NIS2, etc.
 *
 * Étendre cette liste pour couvrir d'autres faux-positifs récurrents
 * (rapports annuels CNIL, fiches de calendrier, etc.).
 */
export const OFF_TOPIC_AXES: OffTopicAxis[] = [
  {
    id: "gpai",
    triggers:
      /(\bgpai\b|modèle\s+de\s+fondation|modèle[s]?\s+à\s+usage\s+général|usage\s+général|foundation\s+model|claude|gpt|gemini|mistral|llama|openai|anthropic|google\s+deepmind|meta\s+ai)/i,
    patterns: [
      "Code de bonnes pratiques GPAI",
      "code of practice gpai",
      "Art. 56§9",
      "Art. 56 § 9",
      "Article 56 § 9",
      "Article 56, paragraphe 9",
      "modèles d'IA à usage général",
      "modèle d'IA à usage général",
      "general-purpose AI model",
      "GPAI",
    ],
  },
];

/** Une source filtrable expose au minimum du texte (titre et/ou contenu). */
export interface FilterableSource {
  title?: string | null;
  content?: string | null;
}

/**
 * Indique si la question utilisateur active le déclencheur d'un axe donné.
 * Exposé pour les tests et pour le logging côté monitoring.
 */
export function isQuestionAbout(axisId: string, question: string): boolean {
  const axis = OFF_TOPIC_AXES.find((a) => a.id === axisId);
  if (!axis) return false;
  return axis.triggers.test(question);
}

function sourceMatchesPattern(source: FilterableSource, pattern: string): boolean {
  const needle = pattern.toLowerCase();
  const title = (source.title ?? "").toLowerCase();
  const content = (source.content ?? "").toLowerCase();
  return title.includes(needle) || content.includes(needle);
}

function sourceBelongsToAxis(source: FilterableSource, axis: OffTopicAxis): boolean {
  return axis.patterns.some((p) => sourceMatchesPattern(source, p));
}

/**
 * Filtre une liste de sources selon les axes hors-sujet connus.
 *
 * @param sources tableau de sources avec accès à `title` et/ou `content`.
 * @param question question utilisateur posée.
 * @param accessor optionnel : adaptateur si la source ne suit pas l'interface `FilterableSource`.
 * @returns sous-ensemble pertinent (les sources hors-sujet sont retirées).
 */
export function filterOffTopicSources<T>(
  sources: T[],
  question: string,
  accessor?: (s: T) => FilterableSource
): T[] {
  if (!sources || sources.length === 0) return [];
  const view = accessor ?? ((s: T) => s as unknown as FilterableSource);

  return sources.filter((s) => {
    const filterable = view(s);
    // Une source est rejetée si elle appartient à un axe dont le
    // déclencheur n'est PAS activé par la question.
    for (const axis of OFF_TOPIC_AXES) {
      const belongs = sourceBelongsToAxis(filterable, axis);
      if (!belongs) continue;
      const triggered = axis.triggers.test(question);
      if (!triggered) return false;
    }
    return true;
  });
}

/**
 * Adaptateur typé pour les chunks RAG (`LegalChunk`) — concatène les
 * champs sémantiquement pertinents avant filtrage.
 */
export function legalChunkAccessor(chunk: {
  regulation?: string | null;
  article_title?: string | null;
  content?: string | null;
}): FilterableSource {
  return {
    title: `${chunk.regulation ?? ""} ${chunk.article_title ?? ""}`.trim() || null,
    content: chunk.content ?? null,
  };
}

/** Adaptateur chunks RAG nationale (`NationalLegalText`). */
export function nationalLegalChunkAccessor(chunk: {
  country_name?: string | null;
  title?: string | null;
  reference?: string | null;
  domain?: string | null;
  ecli?: string | null;
  court?: string | null;
  content?: string | null;
}): FilterableSource {
  return {
    title:
      `${chunk.country_name ?? ""} ${chunk.court ?? ""} ${chunk.ecli ?? ""} ${chunk.title ?? ""} ${chunk.reference ?? ""} ${chunk.domain ?? ""}`.trim() ||
      null,
    content: chunk.content ?? null,
  };
}

/**
 * Adaptateur pour les citations affichées côté client — aligné sur `legalChunkAccessor`.
 */
export function legalCitationAccessor(cite: LegalCitation): FilterableSource {
  return {
    title:
      `${cite.regulation ?? ""} ${cite.article_number ?? ""} ${cite.article_title ?? ""}`.trim() ||
      null,
    content: cite.excerpt ?? null,
  };
}

/** Alias projet : même logique que le filtre RAG appliqué côté API. */
export function filtrerSourcesHorsSujet<T extends LegalCitation>(
  sources: T[],
  userMessage: string
): T[] {
  return filterOffTopicSources(sources, userMessage, legalCitationAccessor);
}
