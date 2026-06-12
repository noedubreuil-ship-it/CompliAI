/**
 * Agents Claude (outillage contrôlé) pour maintenir le corpus PostgreSQL national.
 * Une instance logique « par pays » = même code paramétré par code ISO UE-27.
 */

import Anthropic from "@anthropic-ai/sdk";

import { AI_CONFIG } from "@/lib/ai/config";
import { EU27 } from "@/lib/data/eu27-registry";
import {
  fetchAllowlistedNationalHttpsPage,
  getNationalIngestTtlMs,
  isNationalLegalSourceFreshForUrl,
  tryDirectNationalStatuteIngest,
} from "@/lib/ai/national-auto-ingest";
import { ingestPlainNationalDocument, truncateForAutoIngest } from "@/lib/ai/national-ingest-pipeline";

const MODEL = (): string =>
  process.env.NATIONAL_CORPUS_AGENT_MODEL?.trim() || AI_CONFIG.model;
const TEMPERATURE = (): number =>
  Number.isFinite(Number(process.env.NATIONAL_CORPUS_AGENT_TEMPERATURE))
    ? Number(process.env.NATIONAL_CORPUS_AGENT_TEMPERATURE)
    : 0.05;

const MAX_CHUNKS = Math.min(Number(process.env.NATIONAL_AUTO_INGEST_MAX_CHUNKS) || 100, 200);
const CHUNK_CHARS = Math.min(Math.max(Number(process.env.NATIONAL_AUTO_INGEST_CHUNK_CHARS) || 2000, 800), 6000);
const MAX_AUTO_BODY_CHARS =
  Number.isFinite(Number(process.env.NATIONAL_AUTO_INGEST_MAX_BODY_CHARS)) &&
  Number(process.env.NATIONAL_AUTO_INGEST_MAX_BODY_CHARS) > 0
    ? Number(process.env.NATIONAL_AUTO_INGEST_MAX_BODY_CHARS)
    : 600_000;

/** Normalise pour comparer des URL du registre. */
export function canonicalUrlHref(urlStr: string): string | null {
  try {
    const u = new URL(urlStr.trim());
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return null;
  }
}

function isApprovedRegistryUrl(candidate: string, row: (typeof EU27)[string]): boolean {
  const c = canonicalUrlHref(candidate);
  if (!c) return false;
  const known = [row.gdpr_law.fetch_url, row.gdpr_law.portal_url].filter(Boolean) as string[];
  return known.some((k) => canonicalUrlHref(k) === c);
}

type SessionHolder = {
  stagedPlaintext: string | null;
  stagedFinalUrl: string | null;
  ingestDone: boolean;
  outcomeSummary: string;
};

function client(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
}

function isAnthropicOverloadedError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const status = "status" in e ? Number((e as { status?: number }).status) : NaN;
  if (status === 529) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /overloaded|529/i.test(msg);
}

async function createAgentMessageWithRetry(
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  maxAttempts = 4
): Promise<Anthropic.Message> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client().messages.create(params);
    } catch (e) {
      lastErr = e;
      if (!isAnthropicOverloadedError(e) || attempt >= maxAttempts) throw e;
      const waitMs = Math.min(30_000, 2000 * 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

function buildTools(): Anthropic.Tool[] {
  return [
    {
      name: "get_registry_facts",
      description:
        "Retourne les métadonnées registre CompliAI : titres, fetch_url nationale, portal_url. À invoquer avant tout téléchargement.",
      input_schema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "fetch_statute_candidate",
      description:
        "Téléchargement HTTPS allowlist uniquement : variant fetch_url | portal_url | variant_url (variant_url doit être strictement égale au fetch OU portal officiel).",
      input_schema: {
        type: "object",
        properties: {
          variant: {
            type: "string",
            enum: ["fetch_url", "portal_url", "variant_url"],
          },
          variant_url: {
            type: "string",
            description: "Obligatoire lorsque variant=variant_url.",
          },
        },
        required: [],
      },
    },
    {
      name: "finalize_corpus_refresh",
      description:
        "Clôture : indexer le corps mis en mémoire (staging serveur après fetch_statute_candidate) ou abandonner avec justification.",
      input_schema: {
        type: "object",
        properties: {
          decision: {
            type: "string",
            enum: ["index_staged_plaintext", "abort"],
          },
          rationale: { type: "string", description: "Motifs factuels" },
        },
        required: ["decision", "rationale"],
      },
    },
  ];
}

function systemPrompt(code: string): string {
  return `Tu es l’agent Corpus national (${code}). Tu n’interprètes jamais le droit hors extraits téléchargés.
Ordre conseillé : get_registry_facts → fetch_statute_candidate → finalize_corpus_refresh.
Si fetch_url absente mais portal_url disponible dans les métadonnées → fetch_statute_candidate variant portal_url.
Si le corps téléchargé n’est manifestement pas un texte législatif exploitable, finalize avec abort.`;
}

async function ingestStaged(
  code: string,
  session: SessionHolder,
  resolvedUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const row = EU27[code];
  const canonicalSource = row?.gdpr_law.fetch_url ?? row?.gdpr_law.portal_url;
  if (!row || !canonicalSource || !session.stagedPlaintext)
    return { ok: false, error: "Staging ou source officielle absente dans le registre." };

  let body = truncateForAutoIngest(session.stagedPlaintext, MAX_AUTO_BODY_CHARS);
  if (body.length < 800) return { ok: false, error: "Texte trop court." };

  if (body.length > CHUNK_CHARS * MAX_CHUNKS * 0.5) {
    body = body.slice(0, Math.floor(CHUNK_CHARS * MAX_CHUNKS * 0.55));
  }

  const sourceUrl = canonicalSource;
  let hostLabel = sourceUrl;
  try {
    hostLabel = new URL(session.stagedFinalUrl || canonicalSource).hostname;
  } catch {
    /* ignore */
  }

  const dpaLang = row.dpa.language.split(/[,/|]/)[0]?.trim()?.toLowerCase() || "";
  const language = /^[a-z]{2}$/.test(dpaLang) ? dpaLang : "fr";

  const out = await ingestPlainNationalDocument({
    country_code: code,
    country_name: row.name_fr,
    domain: "rgpd_nat",
    text_type: "statute_consolidated_agent",
    title: `${row.gdpr_law.title} (agent national — ${hostLabel})`,
    reference: `${row.gdpr_law.reference} — résolu ${resolvedUrl}`,
    source_url: sourceUrl,
    language,
    date_adopted:
      typeof row.gdpr_law.year === "number" && row.gdpr_law.year > 1850 && row.gdpr_law.year < 2100
        ? `${row.gdpr_law.year}-01-01`
        : null,
    date_applicable: null,
    chunk_chars_max: CHUNK_CHARS,
    replace: true,
    raw_body: body,
    max_chunks: MAX_CHUNKS,
  });

  if (!out.ok) return { ok: false, error: out.error };
  session.ingestDone = true;
  session.outcomeSummary = `indexed_segments=${out.inserted}`;
  return { ok: true };
}

async function handleToolCall(
  name: string,
  input: Record<string, unknown>,
  session: SessionHolder,
  code: string
): Promise<object> {
  const row = EU27[code];
  if (!row) return { ok: false, error: "Pays hors registre." };

  switch (name) {
    case "get_registry_facts": {
      return {
        country_code: code,
        pays_fr: row.name_fr,
        loi_transposition_title: row.gdpr_law.title,
        loi_reference: row.gdpr_law.reference,
        annee: row.gdpr_law.year,
        fetch_url: row.gdpr_law.fetch_url ?? null,
        portal_url: row.gdpr_law.portal_url ?? null,
      };
    }

    case "fetch_statute_candidate": {
      const variant = typeof input.variant === "string" ? input.variant : "fetch_url";
      const vuRaw = typeof input.variant_url === "string" ? input.variant_url.trim() : "";

      let target = "";
      if (variant === "fetch_url") {
        target = row.gdpr_law.fetch_url || "";
      } else if (variant === "portal_url") {
        target = row.gdpr_law.portal_url || "";
      } else {
        target = vuRaw;
        if (!target || !isApprovedRegistryUrl(target, row)) {
          return { ok: false, message: "variant_url différent du fetch_url ou portal_url officiel du registre." };
        }
      }

      if (!target) return { ok: false, message: "URL vide pour cette variante." };

      const fetched = await fetchAllowlistedNationalHttpsPage(target, code);
      if (!fetched || fetched.text.length < 400) {
        return { ok: false, message: "Fetch vide ou corps trop court." };
      }

      session.stagedPlaintext = fetched.text;
      session.stagedFinalUrl = fetched.finalUrl;
      return {
        ok: true,
        final_url: fetched.finalUrl,
        approx_chars_after_strip: fetched.text.length,
        excerpt_preview: fetched.text.slice(0, 3800),
      };
    }

    case "finalize_corpus_refresh": {
      const decision = input.decision === "abort" ? "abort" : "index_staged_plaintext";
      const rationale = String(input.rationale ?? "").slice(0, 2400);

      session.outcomeSummary = rationale.slice(0, 500);

      if (decision === "abort") {
        session.stagedPlaintext = null;
        return { ok: true, aborted: true, rationale };
      }

      if (!session.stagedPlaintext || !session.stagedFinalUrl) {
        return { ok: false, error: "Aucun téléchargement en staging avant index." };
      }

      const ingest = await ingestStaged(code, session, session.stagedFinalUrl);
      if (!ingest.ok) return { ok: false, error: ingest.error, rationale };

      return { ok: true, indexed: true, ingest_summary: session.outcomeSummary };
    }

    default:
      return { ok: false, error: `Outil inconnu : ${name}` };
  }
}

export interface NationalAgentRunOpts {
  ignoreTtl?: boolean;
  deadlineMs?: number;
  maxSteps?: number;
  /** true si le backfill a déjà tenté tryDirectNationalStatuteIngest. */
  skipDirectIngest?: boolean;
}

export async function runNationalCorpusAgentForCountry(
  countryCode: string,
  opts: NationalAgentRunOpts = {}
): Promise<{ code: string; status: string; summary: string }> {
  const code = countryCode.trim().toUpperCase();
  const row = EU27[code];

  const deadlineMs =
    opts.deadlineMs ??
    (Number.isFinite(Number(process.env.NATIONAL_AGENT_DEADLINE_MS))
      ? Number(process.env.NATIONAL_AGENT_DEADLINE_MS)
      : 55_000);
  const maxSteps =
    opts.maxSteps ??
    (Number.isFinite(Number(process.env.NATIONAL_AGENT_MAX_STEPS))
      ? Number(process.env.NATIONAL_AGENT_MAX_STEPS)
      : 14);

  if (!process.env.ANTHROPIC_API_KEY) return { code, status: "skipped", summary: "ANTHROPIC_API_KEY absent." };
  if (!process.env.OPENAI_API_KEY) return { code, status: "skipped", summary: "OPENAI_API_KEY absent." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { code, status: "skipped", summary: "SUPABASE_SERVICE_ROLE_KEY absent." };

  if (!row) return { code, status: "error", summary: `Code ignoré (${code}).` };

  const ttlMs = getNationalIngestTtlMs();
  const ignoreTtl = opts.ignoreTtl === true;
  const hasFetch = !!(row.gdpr_law.fetch_url && row.gdpr_law.fetch_url.length > 12);
  const hasPortal = !!(row.gdpr_law.portal_url && row.gdpr_law.portal_url.length > 12);

  if (!hasFetch && !hasPortal) {
    return { code, status: "skipped_no_source", summary: "Aucune fetch_url ni portal_url dans eu27-registry." };
  }

  const sourceForTtl = row.gdpr_law.fetch_url ?? row.gdpr_law.portal_url;
  if (
    sourceForTtl &&
    !ignoreTtl &&
    (await isNationalLegalSourceFreshForUrl(sourceForTtl, ttlMs))
  ) {
    return { code, status: "fresh_ttl", summary: `Corpus encore dans le TTL (${Math.round(ttlMs / 3600000)} h).` };
  }

  if (!opts.skipDirectIngest) {
    const direct = await tryDirectNationalStatuteIngest(code, { ignoreTtl });
    if (direct.status === "indexed") {
      return { code, status: "indexed", summary: direct.summary };
    }
  }

  const session: SessionHolder = {
    stagedPlaintext: null,
    stagedFinalUrl: null,
    ingestDone: false,
    outcomeSummary: "",
  };

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Exécute la maintenance nationale pour ISO ${code} en utilisant les outils.`,
    },
  ];

  let step = 0;
  const deadline = Date.now() + deadlineMs;

  try {
    while (step++ < maxSteps && Date.now() < deadline && !session.ingestDone) {
      const resp = await createAgentMessageWithRetry({
        model: MODEL(),
        max_tokens: 4096,
        temperature: TEMPERATURE(),
        system: systemPrompt(code),
        tools: buildTools(),
        messages,
      });

      const blocks = resp.content;
      messages.push({
        role: "assistant",
        content: blocks,
      });

      const toolUses = blocks.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

      if (toolUses.length === 0) {
        if (resp.stop_reason === "end_turn") break;
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUses) {
        const inputPayload = (tu.input ?? {}) as Record<string, unknown>;
        const payload = await handleToolCall(tu.name, inputPayload, session, code);
        const parsed = payload && typeof payload === "object";

        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(payload),
          is_error: Boolean(
            parsed && "ok" in (payload as { ok?: unknown }) && (payload as { ok?: boolean }).ok === false && !(payload as { aborted?: boolean }).aborted
          ),
        });
      }

      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    const status =
      session.ingestDone ? "indexed"
      : session.stagedPlaintext ? "stopped_before_index"
      : "no_fetch_or_aborted";

    return {
      code,
      status,
      summary:
        session.outcomeSummary.trim() ||
        (status === "indexed" ? "Indexation Claude terminée." : status),
    };
  } catch (e) {
    return {
      code,
      status: "error",
      summary: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Sélection rotation horaire (UTC) pour crons peu fréquentes mais couvrant l’ensemble des membres. */
export function cronBatchCountryCodesUtcHour(now = new Date()): string[] {
  const sorted = [...Object.keys(EU27)].sort();
  let batchRaw = Number(process.env.NATIONAL_AGENT_CRON_BATCH_SIZE);
  if (!Number.isFinite(batchRaw) || batchRaw < 1) batchRaw = 4;
  batchRaw = Math.min(batchRaw, sorted.length);

  const hourBucket = Math.floor(now.getTime() / 3600000);
  const offset = hourBucket % sorted.length;
  return Array.from({ length: batchRaw }, (_, i) => sorted[(offset + i) % sorted.length]) as string[];
}

export async function maintainNationalAgentsForCountriesOnChat(countryCodes: string[]): Promise<void> {
  if (process.env.NATIONAL_CORPUS_AGENTS_CHAT === "0") return;

  let budget = Number(process.env.NATIONAL_AGENT_CHAT_BUDGET_MS);
  if (!Number.isFinite(budget) || budget < 2000) budget = 18_000;

  let maxPerMsg = Number(process.env.NATIONAL_AGENT_CHAT_MAX_COUNTRIES);
  if (!Number.isFinite(maxPerMsg) || maxPerMsg < 1) maxPerMsg = 2;
  maxPerMsg = Math.min(maxPerMsg, 5);

  const uniq = [...new Set(countryCodes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))];
  uniq.sort();
  const targets = uniq.slice(0, maxPerMsg);

  const deadlineGlob = Date.now() + budget;
  const perCountry = Math.max(4000, Math.floor((deadlineGlob - Date.now()) / Math.max(targets.length, 1)));
  const maxStepsChat = Number.isFinite(Number(process.env.NATIONAL_AGENT_CHAT_MAX_STEPS))
    ? Number(process.env.NATIONAL_AGENT_CHAT_MAX_STEPS)
    : 8;

  for (const code of targets) {
    const remains = deadlineGlob - Date.now();
    if (remains < 2500) break;
    await runNationalCorpusAgentForCountry(code, {
      deadlineMs: Math.min(perCountry, remains),
      maxSteps: maxStepsChat,
    });
  }
}
