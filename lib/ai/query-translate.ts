/**
 * Traduit une question utilisateur en français pour améliorer la recherche RAG
 * sur un corpus de textes juridiques en français.
 *
 * Si la question est déjà en français, retourne la question d'origine sans appel LLM.
 * Si la traduction échoue, retourne la question d'origine en fallback.
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Marqueurs français distinctifs (peu de collision avec EN/DE/NL/ES/IT).
 * Volontairement sans tokens partagés avec l'anglais ("obligations", "article"…)
 * ni avec l'espagnol/italien ("que", "le", "la"…). Inclut les élisions
 * apostrophées typiquement françaises (qu', n', c', j', s', m', t').
 */
const FRENCH_RE =
  /\b(avec|dans|pour|vous|nous|votre|notre|leurs|aux|sous|sans|sur|être|où|déjà|combien|pourquoi|quelle|quelles|quels|conformité|règlement|règlements|données|traitement|responsable|également|notamment|afin|ainsi|française|français|entreprise|juridique|est-ce|puis-je|dois-je|doit-il|faut-il|cette|ces|conformément|au titre|au sens|résume|résumé|rédige|explique)\b|(?:^|[\s('’])(?:qu|n|c|j|m|t|s|l|d)['’]/i;

/**
 * Détecte si la langue d'une question est déjà le français.
 * Heuristique rapide — on évite l'appel LLM si inutile.
 */
function isProbablyFrench(text: string): boolean {
  return FRENCH_RE.test(text);
}

/**
 * Traduit la question en français pour la recherche RAG.
 * Retourne la question originale si déjà en français ou en cas d'erreur.
 */
export async function translateQueryForRag(question: string): Promise<{
  translated: string;
  originalLanguage: string | null;
  wasTranslated: boolean;
}> {
  if (isProbablyFrench(question)) {
    return { translated: question, originalLanguage: "fr", wasTranslated: false };
  }

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system:
        "Tu es un traducteur juridique. Traduis la question de l'utilisateur en français juridique précis, " +
        "en conservant tous les termes techniques, numéros d'articles et références légales tels quels. " +
        "Réponds uniquement avec la traduction, sans commentaire ni explication. " +
        "Si la question est déjà en français, renvoie-la telle quelle.",
      messages: [{ role: "user", content: question }],
    });

    const translated =
      response.content[0].type === "text" ? response.content[0].text.trim() : question;

    // Détecte la langue d'origine depuis les stop_reason metadata (heuristique simple)
    const detectedLang = detectLanguage(question);

    return {
      translated,
      originalLanguage: detectedLang,
      wasTranslated: translated.toLowerCase() !== question.toLowerCase(),
    };
  } catch {
    // Fallback silencieux : on utilise la question d'origine
    return { translated: question, originalLanguage: null, wasTranslated: false };
  }
}

/**
 * Builds a language response instruction to append to a system prompt.
 * Returns an empty string if the detected language is French (default).
 */
export function buildToolLanguageAddendum(inputText: string): string {
  const lang = detectLanguage(inputText);
  if (!lang || lang === "fr") return "";
  const langNames: Record<string, string> = {
    de: "allemand", nl: "néerlandais", es: "espagnol", it: "italien",
    pl: "polonais", pt: "portugais", ro: "roumain", sv: "suédois",
    da: "danois", fi: "finnois", cs: "tchèque", sk: "slovaque",
    hu: "hongrois", el: "grec", bg: "bulgare", en: "anglais",
  };
  const langName = langNames[lang] ?? lang;
  return (
    `\n\n## Instruction langue\n` +
    `L'utilisateur s'exprime en ${langName} (code : ${lang}). ` +
    `Tu dois rédiger l'intégralité de ta réponse dans cette même langue. ` +
    `Les références aux articles, règlements et textes de loi restent dans leur forme officielle européenne ` +
    `mais peuvent être formulées dans la langue de l'utilisateur. ` +
    `La rigueur juridique et les règles de production s'appliquent dans toutes les langues.\n`
  );
}

/**
 * Détecte la langue d'une question par heuristique légère (pas de LLM).
 */
export function detectLanguage(text: string): string {
  const t = text.toLowerCase();

  const markers: [string, RegExp][] = [
    ["fr", FRENCH_RE],
    ["de", /\b(und|oder|mit|sind|werden|nicht|haben|nach|dem|den|das|die|der|für|von|bei|durch|unter|über|welche|welcher)\b/],
    ["nl", /\b(en|van|het|een|zijn|voor|met|ook|hebben|worden|niet|deze|maar|door)\b/],
    ["es", /\b(que|con|para|por|una|son|está|tienen|según|también|mediante|cuales|sobre)\b/],
    ["it", /\b(che|con|per|una|sono|della|delle|degli|degli|secondo|anche|mediante)\b/],
    ["pl", /\b(jest|nie|się|tego|który|która|które|przez|przy|lub|oraz|jego|jej)\b/],
    ["pt", /\b(que|com|para|por|uma|são|está|têm|segundo|também|mediante)\b/],
    ["ro", /\b(și|sau|pentru|care|este|sunt|prin|din|asupra|conform|potrivit)\b/],
    ["sv", /\b(och|eller|med|för|inte|som|vid|från|enligt|vilken|dessa)\b/],
    ["da", /\b(og|eller|ikke|ved|fra|ifølge|hvilken|disse)\b/],
    ["fi", /\b(ja|tai|kanssa|jonka|joka|jotka|mukaan|kaikki|nämä)\b/],
    ["cs", /\b(nebo|pro|která|který|které|podle|není|jsou|jejich)\b/],
    ["sk", /\b(alebo|pre|ktorá|ktorý|ktoré|podľa|nie|sú|ich)\b/],
    ["hu", /\b(és|vagy|amely|amelyek|szerint|nem|azok|azaz)\b/],
    ["el", /[\u0370-\u03ff]{3,}/], // Greek characters
    ["bg", /[\u0400-\u04ff]{3,}/], // Cyrillic
  ];

  for (const [lang, re] of markers) {
    if (re.test(t)) return lang;
  }
  return "en"; // fallback to English
}
