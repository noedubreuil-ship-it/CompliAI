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
import { sanitizeRagExcerptForDisplay, sanitizeRagTextForModel } from "@/lib/ai/sanitize-rag-context";
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
  validateConsultantCitations,
  buildConsultantRewritePrompt,
} from "@/lib/ai/consultant-citation-validator";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return aiUnauthorized();

  const limited = await rateLimitUser(user.id, "chat", RATE_LIMITS.chat);
  if (limited) return limited;

  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, plan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return blocked;
  }

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

  const detectedCountries = detectEuMemberCountriesFromQuestion(question);
  const nationalRagCountries = resolveConsultantNationalCountryCodes(question, detectedCountries);

  // ── 1. RAG local (pgvector) ───────────────────────────────────────────────
  const ragMatchCount = nationalRagCountries.length > 0 ? 5 : 3;
  let rawChunks = await searchLegalChunks(question, ragMatchCount, 0.6);

  if (asksLegalDeadline(question)) {
    const deadlineChunks = await searchLegalChunks(AI_ACT_ART113_RAG_QUERY, 4, 0.52);
    const seen = new Set(rawChunks.map((c) => c.id));
    for (const c of deadlineChunks) {
      if (!seen.has(c.id)) {
        rawChunks.push(c);
        seen.add(c.id);
      }
    }
  }
  // Évite la "contamination RAG" (cf. § 1.3 du protocole universel et § 5
  // du protocole de vérification jurisprudentielle) : on retire les sources
  // hors-sujet (ex. fiches « Code de bonnes pratiques GPAI » remontées sur
  // une question RGPD biométrie) avant injection au modèle. Le même tableau
  // filtré est utilisé pour les citations renvoyées au client, afin de ne
  // pas afficher une source que le modèle n'a pas réellement vue.
  const chunks = filterOffTopicSources(rawChunks, question, legalChunkAccessor);
  const legalContext = buildLegalContext(chunks);

  const jurisprudenceHeavy = /jurisprudence|arr[eê]t|cour de justice|\bcjue\b|\btjue\b|rechtsprechung|case law|ECLI\b|pourvoi|cour supr[eê]me|h[oö]chstes gericht/i.test(
    question
  );

  let jpMatchEu = jurisprudenceHeavy ? 8 : 6;
  let jpMatchNational = jurisprudenceHeavy ? 8 : 5;
  const jpThresholdEu = jurisprudenceHeavy ? 0.46 : 0.49;
  const jpThresholdNational = jurisprudenceHeavy ? 0.46 : 0.49;
  if (nationalRagCountries.length >= 23) {
    jpMatchEu = Math.min(14, jpMatchEu + 3);
    jpMatchNational = Math.min(14, jpMatchNational + 3);
  }

  /**
   * Modèle cible : une « bibliothèque juridique » alimentée hors requête (crons
   * national-corpus-agents, case-law-seeds, ingest / backfill CLI, fetch
   * déterministe depuis le registre UE-27). Le consultant interroge ce corpus
   * via RAG ; il ne remplace pas cette maintenance.
   *
   * Filet optionnel au chat (pays explicitement détectés dans la question) :
   * agent + rafraîchissement TTL peuvent combler un trou récent. En production
   * « bibliothèque seule », désactiver : NATIONAL_CORPUS_AGENTS_CHAT=0 et
   * NATIONAL_AUTO_INGEST=0 (voir .env.example).
   */
  if (detectedCountries.length > 0) {
    await maintainNationalAgentsForCountriesOnChat(detectedCountries);
    await refreshNationalCorpusForDetectedCountries(detectedCountries);
  }

  const statuteMatchCount =
    nationalRagCountries.length >= 23 ? 14
    : nationalRagCountries.length >= 10 ? 10
    : nationalRagCountries.length >= 1 ? 6
    : 0;

  const statuteThreshold =
    nationalRagCountries.length >= 23 ? 0.5
    : nationalRagCountries.length <= 3 ? 0.48
    : 0.52;

  let nationalChunksRaw =
    statuteMatchCount > 0 ?
      await resolveNationalStatuteChunksForChat(
        question,
        nationalRagCountries,
        statuteMatchCount,
        statuteThreshold
      )
    : [];
  const nationalChunks = filterOffTopicSources(nationalChunksRaw, question, nationalLegalChunkAccessor);

  const recruitmentBoost = detectRecruitmentAiActQuestion(question);

  let euJudgmentChunksRaw = recruitmentBoost
    ? await fetchRecruitmentCaseLawChunks(question)
    : await searchEuCaseLawTexts(question, jpMatchEu, jpThresholdEu);
  const euJudgmentChunks = filterOffTopicSources(euJudgmentChunksRaw, question, nationalLegalChunkAccessor);

  let nationalJudgmentChunksRaw =
    nationalRagCountries.length > 0 ?
      await searchNationalCaseLawTexts(question, nationalRagCountries, jpMatchNational, jpThresholdNational)
    : [];
  const nationalJudgmentChunks = filterOffTopicSources(
    nationalJudgmentChunksRaw,
    question,
    nationalLegalChunkAccessor
  );

  const wantIntlRag = detectIntlStandardsQuestion(question) || detectAiGovernanceTopic(question);
  const wantUkRag = detectUkRegulatorQuestion(question);

  const intlStandardsChunksRaw =
    wantIntlRag ? await searchIntlStandardsTexts(question, 5, 0.52) : [];
  const intlStandardsChunks = filterOffTopicSources(
    intlStandardsChunksRaw,
    question,
    nationalLegalChunkAccessor
  );

  const ukRegulatorChunksRaw =
    wantUkRag ? await searchUkRegulatorTexts(question, 5, 0.52) : [];
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

  // ── 4. Citations renvoyées au client ─────────────────────────────────────
  const ragCitations = chunks.map((c) => ({
    regulation: c.regulation,
    article_number: c.article_number ?? "",
    article_title: c.article_title ?? "",
    excerpt: sanitizeRagExcerptForDisplay(c.content),
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

  const nationalCitations = nationalChunks.map((c) => ({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: c.reference ?? c.text_type,
    article_title: `${c.domain} (${c.country_code})`,
    excerpt: sanitizeRagExcerptForDisplay(c.content),
    eurlex_url: (c.source_url?.trim()) || "",
    source: "national" as const,
  }));

  const euJudgmentCitations = euJudgmentChunks.map((c) => ({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: [c.ecli, c.reference].filter(Boolean).join(" · ") || c.text_type,
    article_title: [c.domain, c.court].filter(Boolean).join(" — ") || c.domain,
    excerpt: sanitizeRagExcerptForDisplay(c.content),
    eurlex_url: (c.source_url?.trim()) || "",
    source: "eu_case_law" as const,
  }));

  const euSeedFallbackCitations =
    recruitmentBoost && euJudgmentChunks.length === 0
      ? seedsForRecruitmentFallback().slice(0, 6).map((s) => ({
          regulation: `Union européenne — ${s.title}`,
          article_number: s.reference_line,
          article_title: s.ecli ?? "CJUE",
          excerpt: sanitizeRagExcerptForDisplay(s.body),
          eurlex_url: s.source_url,
          source: "eu_case_law" as const,
        }))
      : [];

  const nationalJudgmentCitations = nationalJudgmentChunks.map((c) => ({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: [c.ecli, c.reference].filter(Boolean).join(" · ") || c.text_type,
    article_title: [c.domain, c.court, c.country_code].filter(Boolean).join(" — "),
    excerpt: sanitizeRagExcerptForDisplay(c.content),
    eurlex_url: (c.source_url?.trim()) || "",
    source: "national_case_law" as const,
  }));

  const intlStandardsCitations = intlStandardsChunks.map((c) => ({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: c.reference ?? c.text_type,
    article_title: c.domain,
    excerpt: sanitizeRagExcerptForDisplay(c.content),
    eurlex_url: (c.source_url?.trim()) || "",
    source: "intl_standards" as const,
  }));

  const officialPortalCitations =
    detectedCountries.length > 0 ?
      buildOfficialLegislationPortalCitations(detectedCountries)
    : nationalRagCountries.length > 0 ?
      buildOfficialLegislationPortalCitations(nationalRagCountries)
    : [];

  const ukRegulatorCitations = ukRegulatorChunks.map((c) => ({
    regulation: `${c.country_name} — ${c.title}`,
    article_number: c.reference ?? c.text_type,
    article_title: [c.domain, c.court].filter(Boolean).join(" — "),
    excerpt: sanitizeRagExcerptForDisplay(c.content),
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

  // ── 6. Streaming SSE via l'orchestrateur ─────────────────────────────────
  const encoder = new TextEncoder();
  let fullResponse = "";
  const inputWarnings = inputCheck.warnings;

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`));

      const credits = await getCreditBalance(user.id);
      const consultantPlan = credits?.plan ?? "free";

      await streamClaude(
        {
          tool: "consultant",
          userMessage: question,
          context: context || undefined,
          consultantCreditsPlan: consultantPlan,
          consultantResponseDepth: consultantDepth,
          systemAddendum: consultantDepthAddendum,
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

            const shouldRewrite =
              citationCheck.needsRewrite || meta.stopReason === "max_tokens";

            if (shouldRewrite) {
              try {
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
                  finalText = rewrite.text;
                  fullResponse = finalText;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "replace", text: finalText })}\n\n`)
                  );
                }
                void billAiCall({
                  userId: user.id,
                  plan: consultantPlan,
                  apiModel: rewrite.model,
                  endpoint: "consultant_rewrite",
                  inputTokens: rewrite.inputTokens,
                  outputTokens: rewrite.outputTokens,
                  tool: "consultant",
                }).catch((e) => console.error("[chat] rewrite billing error:", e));
              } catch (rewriteErr) {
                console.error("[chat] citation rewrite failed:", rewriteErr);
              }
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  max_tokens: meta.maxTokens,
                  stop_reason: meta.stopReason,
                  citation_issues: citationIssues.length > 0 ? citationIssues : undefined,
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

            void billAiCall({
              userId: user.id,
              plan: consultantPlan,
              apiModel: meta.model,
              endpoint: "consultant",
              inputTokens: meta.inputTokens,
              outputTokens: meta.outputTokens,
              tool: "consultant",
            }).catch((e) => console.error("[chat] billing error:", e));

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

            // Persistance conversation
            fullResponse = finalText;
            let sessionId = session_id;
            if (!sessionId) {
              const { data: session } = await supabase
                .from("chat_sessions")
                .insert({ user_id: user.id, title: question.slice(0, 60) })
                .select()
                .single();
              sessionId = session?.id;
            }

            if (sessionId && fullResponse) {
              await supabase.from("chat_messages").insert([
                { session_id: sessionId, user_id: user.id, role: "user", content: question },
                { session_id: sessionId, user_id: user.id, role: "assistant", content: fullResponse, citations },
              ]);
            }
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
