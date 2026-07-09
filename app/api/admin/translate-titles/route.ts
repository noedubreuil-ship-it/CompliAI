import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import Anthropic from "@anthropic-ai/sdk";

const CACHE_TTL_SEC = 30 * 24 * 3600; // 30 jours
const CACHE_PREFIX = "tr:doc:";

// ── Upstash REST helpers ────────────────────────────────────────────────────

function upstashUrl() {
  return process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "") ?? null;
}
function upstashToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? null;
}
function isCacheEnabled() {
  return Boolean(upstashUrl() && upstashToken());
}

async function cacheGet(keys: string[]): Promise<(string | null)[]> {
  if (!isCacheEnabled() || keys.length === 0) return keys.map(() => null);
  const url = upstashUrl()!;
  const token = upstashToken()!;
  const commands = keys.map((k) => ["GET", k]);
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(commands),
  });
  if (!res.ok) return keys.map(() => null);
  const json = (await res.json()) as { result: string | null }[];
  return json.map((r) => r.result);
}

async function cacheSetMany(pairs: { key: string; value: string }[]): Promise<void> {
  if (!isCacheEnabled() || pairs.length === 0) return;
  const url = upstashUrl()!;
  const token = upstashToken()!;
  const commands = pairs.flatMap(({ key, value }) => [
    ["SET", key, value],
    ["EXPIRE", key, CACHE_TTL_SEC],
  ]);
  await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(commands),
  }).catch(() => {});
}

// ── Traduction batch via Claude Sonnet 4.6 ─────────────────────────────────

const FRENCH_LANGS = new Set(["fr", "FR", "fra"]);

interface DocInput {
  id: string;
  title: string;
  language: string;
}

interface TranslationResult {
  id: string;
  title_fr: string;
  from_cache: boolean;
}

async function translateBatch(docs: DocInput[]): Promise<TranslationResult[]> {
  if (docs.length === 0) return [];

  const client = new Anthropic();
  const list = docs.map((d, i) => `${i + 1}. [${d.language.toUpperCase()}] ${d.title}`).join("\n");

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: `Traduis en français les titres de documents juridiques suivants. Réponds UNIQUEMENT avec un JSON array de la forme: [{"i":1,"t":"titre traduit"}, ...]. Ne traduis pas les acronymes ni les numéros de règlement (RGPD, AI Act, DORA, CELEX, ECLI, etc.). Conserve la précision juridique.\n\n${list}`,
      },
    ],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  let parsed: { i: number; t: string }[] = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    // Si parsing échoue, retourner les titres originaux
    return docs.map((d) => ({ id: d.id, title_fr: d.title, from_cache: false }));
  }

  return docs.map((d, idx) => {
    const found = parsed.find((p) => p.i === idx + 1);
    return { id: d.id, title_fr: found?.t ?? d.title, from_cache: false };
  });
}

// ── Route POST ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = (await req.json()) as { documents?: DocInput[] };
  const docs: DocInput[] = (body.documents ?? []).filter(
    (d) => d.id && d.title && !FRENCH_LANGS.has(d.language)
  );

  if (docs.length === 0) {
    return NextResponse.json({ translations: [] });
  }

  // 1. Chercher dans le cache Upstash
  const cacheKeys = docs.map((d) => `${CACHE_PREFIX}${d.id}`);
  const cached = await cacheGet(cacheKeys);

  const results: TranslationResult[] = [];
  const toTranslate: DocInput[] = [];
  const toTranslateIdxInDocs: number[] = [];

  docs.forEach((doc, i) => {
    if (cached[i]) {
      results.push({ id: doc.id, title_fr: cached[i]!, from_cache: true });
    } else {
      toTranslate.push(doc);
      toTranslateIdxInDocs.push(i);
    }
  });

  // 2. Traduire ce qui n'est pas en cache (par lots de 20 max)
  const BATCH_SIZE = 20;
  for (let b = 0; b < toTranslate.length; b += BATCH_SIZE) {
    const batch = toTranslate.slice(b, b + BATCH_SIZE);
    const translated = await translateBatch(batch);
    results.push(...translated);

    // Mettre en cache les nouvelles traductions
    const toCache = translated.map((t) => ({
      key: `${CACHE_PREFIX}${t.id}`,
      value: t.title_fr,
    }));
    await cacheSetMany(toCache);
  }

  return NextResponse.json({ translations: results });
}
