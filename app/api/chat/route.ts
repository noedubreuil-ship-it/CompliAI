import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchLegalChunks, buildLegalContext } from "@/lib/ai/rag";
import {
  resolveNationalStatuteChunksForChat,
  searchEuCaseLawTexts,
  searchNationalCaseLawTexts,
  searchIntlStandardsTexts,
  searchUkRegulatorTexts,
  buildNationalLegalContext,
} from "@/lib/ai/national-rag";
import {
  detectAiGovernanceTopic,
  detectIntlStandardsQuestion,
  detectUkRegulatorQuestion,
} from "@/lib/ai/supplementary-rag-detect";
import { refreshNationalCorpusForDetectedCountries } from "@/lib/ai/national-auto-ingest";
import { maintainNationalAgentsForCountriesOnChat } from "@/lib/agents/national-corpus-agent";
import { detectEuMemberCountriesFromQuestion } from "@/lib/ai/country-detection";
import {
  AI_ACT_ART113_RAG_QUERY,
  asksLegalDeadline,
  resolveConsultantNationalCountryCodes,
} from "@/lib/ai/consultant-national-scope";
import { sanitizeRagExcerptForDisplay, sanitizeRagTextForModel, sanitizeCitationField } from "@/lib/ai/sanitize-rag-context";
import { sanitizeConsultantResponse } from "@/lib/ai/sanitize-consultant-response";
import { buildNationalInstitutionalLawContext } from "@/lib/ai/national-institutional-context";
import { buildOfficialLegislationPortalCitations } from "@/lib/ai/official-portal-citations";
import { searchEurLex, buildEurLexContext, buildEurLexSearchUrl } from "@/lib/ai/eurlex";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { getRelevantCalendarDecisions, buildCalendarDecisionContext } from "@/lib/ai/calendar-context";
import { searchDoctrineForDecision, buildDoctrineContext } from "@/lib/ai/doctrine-search";
import { getCreditBalance, preflightCheck } from "@/lib/credits";
import { billAiCall } from "@/lib/ai/bill-ai-call";
import type { PlanName } from "@/lib/pricing";
import {
  aiUnauthorized,
  aiBadRequest,
  preflightToResponse,
} from "@/lib/ai/http-errors";
import { streamClaude, callClaude, type ConsultantResponseDepthMode } from "@/lib/ai/client";
import {
  validateUserInput,
  validateAIOutput,
  isOutOfScope,
  OUT_OF_SCOPE_MESSAGE,
} from "@/lib/ai/guardrails";
import { logAIInteraction } from "@/lib/ai/monitoring";
import { filterOffTopicSources, legalChunkAccessor, nationalLegalChunkAccessor } from "@/lib/ai/source-filter";
import {
  detectRecruitmentAiActQuestion,
  fetchRecruitmentCaseLawChunks,
  buildInlineCaseLawFallbackContext,
  seedsForRecruitmentFallback,
} from "@/lib/ai/consultant-recruitment-rag";
import {
  detectDpoTransferQuestion,
  fetchDpoTransferCaseLawChunks,
} from "@/lib/ai/consultant-dpo-transfer-rag";
import {
  validateConsultantCitations,
  buildConsultantRewritePrompt,
} from "@/lib/ai/consultant-citation-validator";
import { translateQueryForRag } from "@/lib/ai/query-translate";

export async function POST(request: Request) {
  const t0 = Date.now();
  const timings: Record<string, number> = {};
  const mark = (k: string) => {
    timings[k] = Date.now() - t0;
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return aiUnauthorized();
  mark("auth");

  const limited = await rateLimitUser(user.id, "chat", RATE_LIMITS.chat);
  if (limited) return limited;
  mark("ratelimit");

  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, plan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return blocked;
  }
  mark("preflight");

  const body = await request.json();
  const { question, session_id, response_depth } = body as {
    question: string;
    session_id?: string;
    /** `brief` = synthèse courte ; autre / absent = note développée */
    response_depth?: string;
  };

  const consultantDepth: ConsultantResponseDepthMode =
    response_depth === "brief" ? "brief" : "detailed";

  const consultantDepthAddendum =
    consultantDepth === "brief" ?
      "## Instruction utilisateur : réponse **SYNTHÉTIQUE**\n" +
        "Répondez en **prose** (pas de fiche technique ni chiffres romains) : conclusion et échéance en tête si demandée ; articles clés intégrés dans le texte. Conservez la clôture juridique obligatoire.\n"
    : "## Instruction utilisateur : réponse **NOTE DE CABINET**\n" +
      "Rédigez en **prose articulée** (règles de production consultant) : pyramide inversée, échéances explicites si la question le demande, pas de bloc « Jurisprudence applicable » sous chaque article, pas de droit national non sollicité.\n";

  // ── Validation entrée + détection hors-champ ─────────────────────────────
  const inputCheck = validateUserInput(question);
  if (!inputCheck.valid) {
    return aiBadRequest(inputCheck.reason ?? "Question invalide");
  }

  const scopeCheck = isOutOfScope(question);
  if (scopeCheck.outOfScope) {
    return NextResponse.json({
      out_of_scope: true,
      topic: scopeCheck.topic,
      message: OUT_OF_SCOPE_MESSAGE,
    });
  }
  mark("validate");

  const detectedCountries = detectEuMemberCountriesFromQuestion(question);
  const nationalRagCountries = resolveConsultantNationalCountryCodes(question, detectedCountries);

  // ── Traduction de la question pour la recherche RAG ───────────────────────
  // Le corpus juridique est en français. Si l'utilisateur écrit dans une autre
  // langue UE (DE, NL, ES, IT, PL...), on traduit la question en français pour
  // l'embedding RAG uniquement. La réponse est générée dans la langue d'origine.
  const { translated: ragQuery, originalLanguage, wasTranslated } = await translateQueryForRag(question);
  mark("query_translate");

  // ── 1. RAG local (pgvector) ───────────────────────────────────────────────
  // Questions couvrant un chapitre entier ou plusieurs articles explicites →
  // on remonte plus de chunks pour ne pas tronquer la couverture.
  const asksMultiArticle =
    /chapitre\s+[IVX\d]+|articles?\s+\d+\s*(à|au|et)\s*\d+|art\.\s*\d+\s*(à|et)\s*\d+/i.test(question) ||
    /chapter\s+[IVX\d]+|articles?\s+\d+\s*(to|and|through)\s*\d+/i.test(question);
  const ragMatchCount = asksMultiArticle ? 20 : nationalRagCountries.length > 0 ? 5 : 8;
  const ragThreshold = asksMultiArticle ? 0.3 : 0.6;
  let rawChunks = await searchLegalChunks(ragQuery, ragMatchCount, ragThreshold);
  mark("rag_base");

  // Second pass : récupération directe des articles explicitement mentionnés dans la question.
  // La recherche cosine peut rater des articles moins courants sémantiquement (ex: Art.47-48 RGPD).
  // On extrait les plages d'articles (ex: "44 à 49") et on les injecte directement depuis legal_chunks.
  if (asksMultiArticle) {
    const rangeMatch = question.match(/articles?\s+(\d+)\s*(?:à|au|to|through)\s*(\d+)/i) ||
                       question.match(/art\.\s*(\d+)\s*(?:à|et|to)\s*(\d+)/i);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1]);
      const to = parseInt(rangeMatch[2]);
      if (to - from <= 20) {
        const articleNumbers = Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
        const { data: directChunks } = await supabase
          .from("legal_chunks")
          .select("id, regulation, article_number, article_title, content, eurlex_url, granularity")
          .in("article_number", articleNumbers)
          .in("granularity", ["article", "paragraph"])
          .order("article_number");
        if (directChunks && directChunks.length > 0) {
          const seen = new Set(rawChunks.map((c) => c.id));
          for (const dc of directChunks) {
            if (!seen.has(dc.id)) {
              rawChunks.push({
                id: dc.id,
                regulation: dc.regulation,
                article_number: dc.article_number,
                article_title: dc.article_title,
                content: dc.content,
                source_url: dc.eurlex_url,
                similarity: 0.5,
                granularity: dc.granularity,
              } as unknown as (typeof rawChunks)[number]);
              seen.add(dc.id);
            }
          }
        }
      }
    }
  }
  mark("rag_direct_articles");

  if (asksLegalDeadline(question) || asksLegalDeadline(ragQuery)) {
    const deadlineChunks = await searchLegalChunks(AI_ACT_ART113_RAG_QUERY, 4, 0.52);
    const seen = new Set(rawChunks.map((c) => c.id));
    for (const c of deadlineChunks) {
      if (!seen.has(c.id)) {
        rawChunks.push(c);
        seen.add(c.id);
      }
    }
  }
  mark("rag_deadlines");
  // Évite la "contamination RAG" (cf. § 1.3 du protocole universel et § 5
  // du protocole de vérification jurisprudentielle) : on retire les sources
  // hors-sujet (ex. fiches « Code de bonnes pratiques GPAI » remontées sur
  // une question RGPD biométrie) avant injection au modèle. Le même tableau
  // filtré est utilisé pour les citations renvoyées au client, afin de ne
  // pas afficher une source que le modèle n'a pas réellement vue.
  const chunks = filterOffTopicSources(rawChunks, question, legalChunkAccessor);
  const legalContext = buildLegalContext(chunks);
  mark("rag_filter");

  const jurisprudenceHeavy = /jurisprudence|arr[eê]t|cour de justice|\bcjue\b|\btjue\b|rechtsprechung|case law|ECLI\b|pourvoi|cour supr[eê]me|h[oö]chstes gericht/i.test(
    question
  );

  let jpMatchEu = jurisprudenceHeavy ? 15 : asksMultiArticle ? 12 : 10;
  let jpMatchNational = jurisprudenceHeavy ? 12 : asksMultiArticle ? 10 : 8;
  const jpThresholdEu = jurisprudenceHeavy ? 0.40 : 0.46;
  const jpThresholdNational = jurisprudenceHeavy ? 0.40 : 0.46;
  if (nationalRagCountries.length >= 23) {
    jpMatchEu = Math.min(20, jpMatchEu + 3);
    jpMatchNational = Math.min(20, jpMatchNational + 3);
  }

  /**
   * Maintenance corpus national : **jamais bloquante** pour le stream consultant.
   * Agents Claude au chat : opt-in `NATIONAL_CORPUS_AGENTS_CHAT=1`.
   * Auto-ingest lazy : opt-in `NATIONAL_AUTO_INGEST=1` (défaut prod = bibliothèque seule).
   */
  if (detectedCountries.length > 0) {
    if (process.env.NATIONAL_CORPUS_AGENTS_CHAT === "1") {
      void maintainNationalAgentsForCountriesOnChat(detectedCountries).catch(() => null);
    }
    if (process.env.NATIONAL_AUTO_INGEST === "1") {
      void refreshNationalCorpusForDetectedCountries(detectedCountries, { deadlineMs: 2500 }).catch(
        () => null
      );
    }
  }

  const statuteMatchCount =
    nationalRagCountries.length >= 23 ? (asksMultiArticle ? 20 : 16)
    : nationalRagCountries.length >= 10 ? (asksMultiArticle ? 15 : 12)
    : nationalRagCountries.length >= 1 ? (asksMultiArticle ? 10 : 8)
    : 0;

  const statuteThreshold =
    nationalRagCountries.length >= 23 ? 0.45
    : nationalRagCountries.length <= 3 ? 0.43
    : 0.47;

  const recruitmentBoost = detectRecruitmentAiActQuestion(question);
  const dpoTransferBoost = detectDpoTransferQuestion(question);
  const wantIntlRag = detectIntlStandardsQuestion(question) || detectAiGovernanceTopic(question);
  const wantUkRag = detectUkRegulatorQuestion(question);

  let nationalChunksRaw: Awaited<ReturnType<typeof resolveNationalStatuteChunksForChat>> = [];
  let euJudgmentChunksRaw: Awaited<ReturnType<typeof searchEuCaseLawTexts>> = [];
  let nationalJudgmentChunksRaw: Awaited<ReturnType<typeof searchNationalCaseLawTexts>> = [];
  let intlStandardsChunksRaw: Awaited<ReturnType<typeof searchIntlStandardsTexts>> = [];
  let ukRegulatorChunksRaw: Awaited<ReturnType<typeof searchUkRegulatorTexts>> = [];

  const euCaseLawPromise = recruitmentBoost
    ? fetchRecruitmentCaseLawChunks(question)
    : dpoTransferBoost
      ? fetchDpoTransferCaseLawChunks(question)
      : searchEuCaseLawTexts(question, jpMatchEu, jpThresholdEu);

  await Promise.all([
    statuteMatchCount > 0
      ? resolveNationalStatuteChunksForChat(
          question,
          nationalRagCountries,
          statuteMatchCount,
          statuteThreshold
        ).then((r) => {
          nationalChunksRaw = r;
        })
      : Promise.resolve(),
    euCaseLawPromise.then((r) => {
      euJudgmentChunksRaw = r;
    }),
    nationalRagCountries.length > 0
      ? searchNationalCaseLawTexts(
          question,
          nationalRagCountries,
          jpMatchNational,
          jpThresholdNational
        ).then((r) => {
          nationalJudgmentChunksRaw = r;
        })
      : Promise.resolve(),
    wantIntlRag
      ? searchIntlStandardsTexts(question, asksMultiArticle ? 10 : 6, 0.46).then((r) => {
          intlStandardsChunksRaw = r;
        })
      : Promise.resolve(),
    wantUkRag
      ? searchUkRegulatorTexts(question, asksMultiArticle ? 10 : 6, 0.46).then((r) => {
          ukRegulatorChunksRaw = r;
        })
      : Promise.resolve(),
  ]);
  mark("rag_parallel");

  const nationalChunks = filterOffTopicSources(nationalChunksRaw, question, nationalLegalChunkAccessor);
  const euJudgmentChunks = filterOffTopicSources(euJudgmentChunksRaw, question, nationalLegalChunkAccessor);
  const nationalJudgmentChunks = filterOffTopicSources(
    nationalJudgmentChunksRaw,
    question,
    nationalLegalChunkAccessor
  );
  const intlStandardsChunks = filterOffTopicSources(
    intlStandardsChunksRaw,
    question,
    nationalLegalChunkAccessor
  );
  const ukRegulatorChunks = filterOffTopicSources(
    ukRegulatorChunksRaw,
    question,
    nationalLegalChunkAccessor
  );

  const nationalContext = buildNationalLegalContext(nationalChunks);
  const euJudgmentsContext =
    euJudgmentChunks.length > 0 ? buildNationalLegalContext(euJudgmentChunks, "Extraits CJUE/TJ/TG indexés.") : "";

  const recruitmentCaseLawFallback =
    recruitmentBoost && euJudgmentChunks.length === 0
      ? buildInlineCaseLawFallbackContext(seedsForRecruitmentFallback())
      : "";

  const nationalJudgmentsContext =
    nationalJudgmentChunks.length > 0 ?
      buildNationalLegalContext(nationalJudgmentChunks, "Extraits jurisprudence nationale indexée.")
    : "";

  const intlStandardsContext =
    intlStandardsChunks.length > 0 ?
      buildNationalLegalContext(
        intlStandardsChunks,
        "Cadres internationaux indexés (ISO 42001, NIST AI RMF, OCDE, CURIA)."
      )
    : "";

  const ukRegulatorContext =
    ukRegulatorChunks.length > 0 ?
      buildNationalLegalContext(ukRegulatorChunks, "Doctrine ICO / UK GDPR indexée.")
    : "";

  let institutionalNationalLawGuide = "";
  if (detectedCountries.length > 0) {
    institutionalNationalLawGuide = sanitizeRagTextForModel(
      buildNationalInstitutionalLawContext(detectedCountries)
    );
  } else if (nationalRagCountries.length > 0 && nationalRagCountries.length < 20) {
    institutionalNationalLawGuide = sanitizeRagTextForModel(
      buildNationalInstitutionalLawContext(nationalRagCountries)
    );
  }

  const ragCountryScopeLabel =
    nationalRagCountries.length >= 27 ? "UE-27 (tous États membres filtrés)"
    : nationalRagCountries.length === 0 ? "(aucun filtre national actif)"
    : nationalRagCountries.join(", ");

  // ── 2. Fallback EUR-Lex si peu de résultats ───────────────────────────────
  const RAG_FALLBACK_THRESHOLD = 2;
  let eurLexResults: Awaited<ReturnType<typeof searchEurLex>> = [];
  let eurLexContext = "";

  if (chunks.length < RAG_FALLBACK_THRESHOLD) {
    eurLexResults = await searchEurLex(question, 5);
    eurLexContext = buildEurLexContext(eurLexResults);
  }
  mark("eurlex_fallback");

  // ── 3. Décisions du calendrier EU + doctrine associée ────────────────────
  const relevantDecisions = getRelevantCalendarDecisions(question, 3);
  const calendarDecisionContext = buildCalendarDecisionContext(relevantDecisions);

  const cjueDecisions = relevantDecisions.filter((d) => d.type === "Arrêt CJUE" || d.cjueRef);
  const doctrineContextParts: string[] = [];

  if (cjueDecisions.length > 0) {
    const doctrineResults = await Promise.allSettled(
      cjueDecisions.slice(0, 2).map((d) => searchDoctrineForDecision(d, question))
    );
    for (let i = 0; i < doctrineResults.length; i++) {
      const r = doctrineResults[i];
      if (r.status === "fulfilled" && r.value.length > 0) {
        doctrineContextParts.push(buildDoctrineContext(cjueDecisions[i], r.value));
      }
    }
  }
  mark("doctrine");

  // ── 4. Citations renvoyées au client ─────────────────────────────────────
  const mapCitation = <T extends { regulation: string; article_number: string; article_title: string; excerpt: string }>(
    c: T
  ): T => ({
    ...c,
    regulation: sanitizeCitationField(c.regulation),
    article_number: sanitizeCitationField(c.article_number),
    article_title: sanitizeCitationField(c.article_title),
    excerpt: sanitizeRagExcerptForDisplay(c.excerpt),
  });

  const ragCitations = chunks.map((c) =>
    mapCitation({
    regulation: c.regulation,
    article_number: c.article_number ?? "",
    article_title: c.article_title ?? "",
    excerpt: c.content,
    eurlex_url: c.eurlex_url ?? `https://eur-lex.europa.eu/search.html?text=${encodeURIComponent(c.regulation)}`,
    source: "rag" as const,
  }));

  const eurLexCitations = eurLexResults.map((r) => ({
    regulation: r.title.slice(0, 80),
    article_number: r.celex,
    article_title: r.docType ?? "Acte législatif",
    excerpt: r.summary || "(Consulter le texte complet sur EUR-Lex)",
    eurlex_url: r.eurlex_url,
    source: "eurlex" as const,
  }));

  const calendarCitations = relevantDecisions.map((d) => ({
    regulation: d.regulation,
    article_number: d.cjueRef ?? d.type,
    article_title: d.title,
    excerpt: d.description.slice(0, 300) + (d.description.length > 300 ? "…" : ""),
    eurlex_url: d.sourceUrl ?? `https://eur-lex.europa.eu/search.html?text=${encodeURIComponent(d.title)}`,
    source: "calendar" as const,
  }));

  const nationalCitations = nationalChunks.map((c) =>
    mapCitation({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: c.reference ?? c.text_type,
    article_title: `${c.domain} (${c.country_code})`,
    excerpt: c.content,
    eurlex_url: (c.source_url?.trim()) || "",
    source: "national" as const,
  }));

  const euJudgmentCitations = euJudgmentChunks.map((c) =>
    mapCitation({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: [c.ecli, c.reference].filter(Boolean).join(" · ") || c.text_type,
    article_title: [c.domain, c.court].filter(Boolean).join(" — ") || c.domain,
    excerpt: c.content,
    eurlex_url: (c.source_url?.trim()) || "",
    source: "eu_case_law" as const,
  }));

  const euSeedFallbackCitations =
    recruitmentBoost && euJudgmentChunks.length === 0
      ? seedsForRecruitmentFallback().slice(0, 6).map((s) =>
          mapCitation({
          regulation: `Union européenne — ${s.title}`,
          article_number: s.reference_line,
          article_title: s.ecli ?? "CJUE",
          excerpt: s.body,
          eurlex_url: s.source_url,
          source: "eu_case_law" as const,
        })
        )
      : [];

  const nationalJudgmentCitations = nationalJudgmentChunks.map((c) =>
    mapCitation({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: [c.ecli, c.reference].filter(Boolean).join(" · ") || c.text_type,
    article_title: [c.domain, c.court, c.country_code].filter(Boolean).join(" — "),
    excerpt: c.content,
    eurlex_url: (c.source_url?.trim()) || "",
    source: "national_case_law" as const,
  }));

  const intlStandardsCitations = intlStandardsChunks.map((c) =>
    mapCitation({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: c.reference ?? c.text_type,
    article_title: c.domain,
    excerpt: c.content,
    eurlex_url: (c.source_url?.trim()) || "",
    source: "intl_standards" as const,
  }));

  const officialPortalCitations =
    detectedCountries.length > 0 ?
      buildOfficialLegislationPortalCitations(detectedCountries)
    : nationalRagCountries.length > 0 ?
      buildOfficialLegislationPortalCitations(nationalRagCountries)
    : [];

  const ukRegulatorCitations = ukRegulatorChunks.map((c) =>
    mapCitation({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: c.reference ?? c.text_type,
    article_title: [c.domain, c.court].filter(Boolean).join(" — "),
    excerpt: c.content,
    eurlex_url: (c.source_url?.trim()) || "",
    source: "uk_regulator" as const,
  }));

  const citations = [
    ...officialPortalCitations,
    ...nationalCitations,
    ...nationalJudgmentCitations,
    ...euJudgmentCitations,
    ...euSeedFallbackCitations,
    ...intlStandardsCitations,
    ...ukRegulatorCitations,
    ...ragCitations,
    ...eurLexCitations,
    ...calendarCitations,
  ];
  mark("citations");

  // ── 5. Composition du contexte injecté au modèle ─────────────────────────
  const contextSections: string[] = [];

  if (legalContext) {
    contextSections.push(`=== SOURCE : Corpus juridique indexé (RAG) ===\n${legalContext}\n=== FIN SOURCE ===`);
  }

  if (institutionalNationalLawGuide) {
    contextSections.push(
      `=== SOURCE : Répertoire institutionnel national (où trouver les textes de loi officiels au niveau États membres) ===\n` +
        `${institutionalNationalLawGuide}\n=== FIN SOURCE ===`
    );
  }

  if (nationalContext && nationalContext.trim().length > 0) {
    contextSections.push(
      `=== SOURCE : Corpus national — textes législatifs (${ragCountryScopeLabel}) ===\n` +
        `${nationalContext}\n=== FIN SOURCE ===`
    );
  }

  if (euJudgmentsContext.trim()) {
    contextSections.push(
      `=== SOURCE : Corpus jurisprudence UE (extraits indexés CURIA / EUR-Lex) ===\n` +
        `${euJudgmentsContext}\n=== FIN SOURCE ===`
    );
  } else if (recruitmentCaseLawFallback.trim()) {
    contextSections.push(
      `=== SOURCE : Corpus jurisprudence UE (extraits indexés CURIA / EUR-Lex) ===\n` +
        `${recruitmentCaseLawFallback}\n=== FIN SOURCE ===`
    );
  }

  if (nationalJudgmentsContext.trim()) {
    contextSections.push(
      `=== SOURCE : Corpus jurisprudence nationale (${ragCountryScopeLabel}) ===\n` +
        `${nationalJudgmentsContext}\n=== FIN SOURCE ===`
    );
  }

  if (intlStandardsContext.trim()) {
    contextSections.push(
      `=== SOURCE : Cadres internationaux (ISO / NIST / OCDE) ===\n` +
        `${intlStandardsContext}\n=== FIN SOURCE ===`
    );
  }

  if (ukRegulatorContext.trim()) {
    contextSections.push(
      `=== SOURCE : Régulateur UK (ICO) ===\n` + `${ukRegulatorContext}\n=== FIN SOURCE ===`
    );
  }

  if (eurLexContext) {
    contextSections.push(`=== SOURCE : EUR-Lex (recherche en ligne) ===\n${eurLexContext}\n=== FIN SOURCE ===`);
  }

  if (calendarDecisionContext) {
    contextSections.push(
      `=== SOURCE : Calendrier réglementaire — décisions passées ===\n` +
      `Les décisions et actes officiels suivants sont pertinents pour cette question :\n\n` +
      `${calendarDecisionContext}\n=== FIN SOURCE ===`
    );
  }

  if (doctrineContextParts.length > 0) {
    contextSections.push(
      `=== SOURCE : Doctrine & Conclusions AG (EUR-Lex / CURIA) ===\n` +
      `${doctrineContextParts.join("\n\n")}\n=== FIN SOURCE ===`
    );
  }

  if (chunks.length < RAG_FALLBACK_THRESHOLD && eurLexResults.length === 0) {
    const searchUrl = buildEurLexSearchUrl(question);
    contextSections.push(`=== SOURCE : EUR-Lex (URL de recherche) ===\n${searchUrl}\n=== FIN SOURCE ===`);
  }

  const context = contextSections.join("\n\n");
  mark("context_compose");

  // ── 6. Streaming SSE via l'orchestrateur ─────────────────────────────────
  const encoder = new TextEncoder();
  let fullResponse = "";
  const inputWarnings = inputCheck.warnings;

  const readable = new ReadableStream({
    async start(controller) {
      console.log(
        JSON.stringify({
          level: "info",
          event: "chat_timings_pre_stream",
          userId: user.id,
          timings,
          rag: {
            chunks: chunks.length,
            national: nationalChunks.length,
            euCaseLaw: euJudgmentChunks.length,
            nationalCaseLaw: nationalJudgmentChunks.length,
            eurlex: eurLexResults.length,
          },
        })
      );

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`));

      const credits = await getCreditBalance(user.id);
      const consultantPlan = credits?.plan ?? "free";

      // Instruction de langue : répondre dans la langue de l'utilisateur
      const languageAddendum =
        wasTranslated && originalLanguage && originalLanguage !== "fr"
          ? `## Instruction langue\nL'utilisateur écrit dans une autre langue que le français (code détecté : ${originalLanguage}). ` +
            `Tu dois répondre **dans la même langue que sa question** — pas en français. ` +
            `Les références aux articles, règlements et textes de loi restent dans leur forme officielle européenne ` +
            `(ex. "article 53 du règlement (UE) 2024/1689" peut être traduit dans la langue de l'utilisateur). ` +
            `La rigueur juridique et les règles de production s'appliquent dans toutes les langues.\n`
          : "";

      await streamClaude(
        {
          tool: "consultant",
          userMessage: question,
          context: context || undefined,
          consultantCreditsPlan: consultantPlan,
          consultantResponseDepth: consultantDepth,
          systemAddendum: consultantDepthAddendum + languageAddendum,
        },
        {
          onText: (text) => {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
          },
          onError: (err) => {
            console.error("[chat] stream error:", err.message);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`));
          },
          onDone: async (meta) => {
            const tGenDone = Date.now() - t0;
            let finalText = meta.fullText;
            const citationIssues: string[] = [];

            if (meta.stopReason === "max_tokens") {
              console.warn(
                `[chat] réponse tronquée: len=${meta.fullText.length} max_tokens=${meta.maxTokens} out=${meta.outputTokens}`
              );
              citationIssues.push("truncated_max_tokens");
            }

            const citationCheck = validateConsultantCitations(finalText, context);
            citationIssues.push(...citationCheck.issues);

            const shouldRewrite = citationCheck.needsRewrite;

            let creditsConsumed = 0;
            let newBalance: number | undefined;

            finalText = sanitizeConsultantResponse(finalText);
            if (finalText !== meta.fullText) {
              fullResponse = finalText;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "replace", text: finalText })}\n\n`)
              );
            }

            if (shouldRewrite) {
              try {
                const rwStart = Date.now();
                const rewrite = await callClaude({
                  tool: "consultant",
                  userMessage: buildConsultantRewritePrompt(finalText, citationIssues),
                  context: context || undefined,
                  consultantCreditsPlan: consultantPlan,
                  consultantResponseDepth: consultantDepth,
                  temperatureOverride: 0,
                });
                const recheck = validateConsultantCitations(rewrite.text, context);
                if (
                  recheck.ok ||
                  recheck.issues.length < citationCheck.issues.length ||
                  !/jurisprudence applicable/i.test(rewrite.text)
                ) {
                  finalText = sanitizeConsultantResponse(rewrite.text);
                  fullResponse = finalText;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "replace", text: finalText })}\n\n`)
                  );
                }
                const rewriteBill = await billAiCall({
                  userId: user.id,
                  plan: consultantPlan,
                  apiModel: rewrite.model,
                  endpoint: "consultant_rewrite",
                  inputTokens: rewrite.inputTokens,
                  outputTokens: rewrite.outputTokens,
                  tool: "consultant",
                  responseDepth: consultantDepth,
                }).catch((e) => {
                  console.error("[chat] rewrite billing error:", e);
                  return null;
                });
                if (rewriteBill && "consumed" in rewriteBill) {
                  creditsConsumed += rewriteBill.consumed;
                  newBalance = rewriteBill.newBalance;
                }
                timings.rewrite_ms = Date.now() - rwStart;
              } catch (rewriteErr) {
                console.error("[chat] citation rewrite failed:", rewriteErr);
              }
            }

            const billStart = Date.now();
            const mainBill = await billAiCall({
              userId: user.id,
              plan: consultantPlan,
              apiModel: meta.model,
              endpoint: "consultant",
              inputTokens: meta.inputTokens,
              outputTokens: meta.outputTokens,
              tool: "consultant",
              responseDepth: consultantDepth,
            }).catch((e) => {
              console.error("[chat] billing error:", e);
              return null;
            });

            if (mainBill && "consumed" in mainBill) {
              creditsConsumed += mainBill.consumed;
              newBalance = mainBill.newBalance;
            } else if (mainBill && "code" in mainBill) {
              console.error("[chat] billing failed:", mainBill.code);
            }
            timings.billing_ms = Date.now() - billStart;

            const persistStart = Date.now();
            let persistedSessionId = session_id;
            if (!persistedSessionId) {
              const { data: session } = await supabase
                .from("chat_sessions")
                .insert({ user_id: user.id, title: question.slice(0, 60) })
                .select()
                .single();
              persistedSessionId = session?.id;
            } else {
              await supabase
                .from("chat_sessions")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", persistedSessionId)
                .eq("user_id", user.id);
            }

            if (persistedSessionId && finalText) {
              await supabase.from("chat_messages").insert([
                { session_id: persistedSessionId, user_id: user.id, role: "user", content: question },
                {
                  session_id: persistedSessionId,
                  user_id: user.id,
                  role: "assistant",
                  content: finalText,
                  citations,
                },
              ]);
            }
            timings.persist_ms = Date.now() - persistStart;
            timings.total_ms = Date.now() - t0;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  max_tokens: meta.maxTokens,
                  stop_reason: meta.stopReason,
                  citation_issues: citationIssues.length > 0 ? citationIssues : undefined,
                  credits_consumed: creditsConsumed > 0 ? creditsConsumed : undefined,
                  new_balance: newBalance,
                  session_id: persistedSessionId,
                  timings,
                  gen_ms: tGenDone,
                })}\n\n`
              )
            );
            controller.close();

            // Validation sortie + logging best-effort
            const outputCheck = validateAIOutput(finalText);
            const warnings = [
              ...inputWarnings,
              ...outputCheck.warnings,
              ...citationIssues.map((i) => `citation:${i}`),
            ];

            void logAIInteraction(supabase, {
              userId: user.id,
              tool: "consultant",
              userInput: question,
              outputLength: finalText.length,
              latencyMs: meta.latencyMs,
              temperature: meta.temperature,
              model: meta.model,
              warnings,
            });

            console.log(
              JSON.stringify({
                level: "info",
                event: "chat_timings_done",
                userId: user.id,
                timings,
                meta: {
                  model: meta.model,
                  inputTokens: meta.inputTokens,
                  outputTokens: meta.outputTokens,
                  stopReason: meta.stopReason,
                  latencyMs: meta.latencyMs,
                },
              })
            );
          },
        }
      );
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
