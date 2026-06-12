/**
 * Génère un rapport Markdown (scanner page web bêta) via Claude.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  buildScannerUserPrompt,
  generateScannerMarkdownReport,
  type ScannerInputMode,
  type ScannerQuestionnaire,
} from "@/lib/ai/generators";
import { runScannerHeuristics, type ScannerHeuristicResult } from "@/lib/ai/scanner-heuristics";
import { indexGeneratedDocumentEmbedding } from "@/lib/documents-semantic";

export const runtime = "nodejs";

const BLOCK_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"];

function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (BLOCK_HOSTS.includes(h)) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  return false;
}

function parseQuestionnaire(raw: unknown): ScannerQuestionnaire {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = <T extends string>(val: unknown, allowed: readonly T[], fallback: T): T =>
    typeof val === "string" && (allowed as readonly string[]).includes(val) ? (val as T) : fallback;

  return {
    cookie_banner: pick(r.cookie_banner, ["accept_refuse", "accept_only", "prechecked", "none"], "none"),
    analytics: pick(r.analytics, ["ga", "matomo", "plausible", "fathom", "none", "unknown"], "unknown"),
    form: pick(r.form, ["none", "with_consent", "without_consent"], "none"),
    footer_legal: pick(r.footer_legal, ["yes", "no", "no_footer"], "no_footer"),
    privacy_link: pick(r.privacy_link, ["yes", "no"], "no"),
    google_fonts: pick(r.google_fonts, ["yes", "no", "unknown"], "unknown"),
    chatbot: pick(r.chatbot, ["no", "labeled", "unlabeled"], "no"),
    https: pick(r.https, ["yes", "no"], "yes"),
  };
}

async function fetchPublicPage(urlStr: string): Promise<{ ok: true; html: string; finalUrl: string } | { ok: false; message: string }> {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return { ok: false, message: "URL invalide" };
  }
  if (!["http:", "https:"].includes(u.protocol)) return { ok: false, message: "Seuls http(s) sont autorisés" };
  if (isBlockedHost(u.hostname)) return { ok: false, message: "Cible non autorisée" };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(u.toString(), {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: { "User-Agent": "CompliAI-ComplianceScanner/2.0 (+https://compliai.eu)" },
    });
    let html = await res.text();
    if (html.length > 800_000) html = html.slice(0, 800_000);
    return { ok: true, html, finalUrl: res.url || u.toString() };
  } catch (e) {
    return { ok: false, message: `Téléchargement impossible : ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = body.mode as ScannerInputMode | undefined;

  let html = "";
  let pageUrl: string | undefined = typeof body.url === "string" ? body.url.trim() : undefined;
  let heuristics: ScannerHeuristicResult | null = null;

  try {
    if (mode === "html") {
      html = typeof body.html === "string" ? body.html : "";
      if (!html.trim()) {
        return NextResponse.json({ error: "Collez le code HTML ou choisissez un autre mode." }, { status: 400 });
      }
      const label =
        pageUrl && pageUrl.length > 0 ? `HTML collé (contexte URL : ${pageUrl})` : "HTML collé par l'utilisateur";
      heuristics = runScannerHeuristics(html, { source_label: label, pageUrl });
    } else if (mode === "url") {
      if (!pageUrl) {
        return NextResponse.json({ error: "Indiquez une URL à analyser." }, { status: 400 });
      }
      const fetched = await fetchPublicPage(pageUrl);
      if (!fetched.ok) return NextResponse.json({ error: fetched.message }, { status: 502 });
      html = fetched.html;
      pageUrl = fetched.finalUrl;
      heuristics = runScannerHeuristics(html, { source_label: pageUrl, pageUrl });
    } else if (mode === "description") {
      const obs = typeof body.observations === "string" ? body.observations.trim() : "";
      if (!obs || obs.length < 10) {
        return NextResponse.json(
          { error: "Décrivez ce que vous voyez sur la page (au moins une phrase)." },
          { status: 400 },
        );
      }
      if (!pageUrl) pageUrl = undefined;
    } else if (mode === "questionnaire") {
      /* heuristics stays null */
    } else {
      return NextResponse.json(
        { error: "mode requis : html, url, description ou questionnaire." },
        { status: 400 },
      );
    }

    const questionnaire = mode === "questionnaire" ? parseQuestionnaire(body.questionnaire) : undefined;

    const prompt = buildScannerUserPrompt({
      mode: mode === "description" ? "description" : mode === "questionnaire" ? "questionnaire" : mode === "url" ? "url" : "html",
      html: mode === "html" || mode === "url" ? html : undefined,
      url: pageUrl,
      observations: mode === "description" ? String(body.observations ?? "") : undefined,
      questionnaire,
      heuristics,
    });

    const report_markdown = await generateScannerMarkdownReport(prompt, auth.billing("scanner", "scanner"));

    const title =
      mode === "description" ?
        `Scan exploratoire — description`
      : mode === "questionnaire" ?
        `Scan exploratoire — questionnaire`
      : `Scan exploratoire — ${pageUrl ?? "HTML"}`;

    const content = {
      report_markdown,
      mode,
      url: pageUrl ?? null,
      heuristics,
      generated_at: new Date().toISOString(),
    };

    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        user_id: auth.userId,
        project_id: (typeof body.project_id === "string" ? body.project_id : null) ?? null,
        doc_type: "web_scan",
        title,
        content,
        raw_text: report_markdown,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Scanner DB insert:", insertError.message);
      throw new Error(`Enregistrement document : ${insertError.message}`);
    }

    if (doc?.id) void indexGeneratedDocumentEmbedding(doc.id).catch(() => {});

    return NextResponse.json({ doc_id: doc?.id, ...content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Scanner generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
