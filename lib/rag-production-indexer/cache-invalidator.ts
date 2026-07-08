/**
 * cache-invalidator.ts — Invalidation du cache sémantique Upstash.
 *
 * Après l'insertion ou la mise à jour d'un chunk dans legal_chunks, on invalide
 * les entrées du cache sémantique dont l'embedding de requête est sémantiquement
 * proche du nouveau chunk (similarité cosinus > THRESHOLD).
 *
 * Logique : si une requête utilisateur était assez proche du chunk mis à jour
 * pour être concernée, sa réponse cachée est potentiellement obsolète.
 *
 * Structure Redis (identique à lib/ai/semantic-cache.ts) :
 *   - sc:idx          → SET de SHAs (index des entrées)
 *   - sc:emb:{sha}    → JSON { embedding: number[], cached_at: number }
 *   - sc:resp:{sha}   → string (réponse complète cachée)
 */

const DEFAULT_THRESHOLD = 0.85;

interface UpstashClient {
  url: string;
  token: string;
}

function getUpstash(): UpstashClient | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisGet(redis: UpstashClient, key: string): Promise<string | null> {
  try {
    const res = await fetch(`${redis.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json() as { result?: string | null };
    return json.result ?? null;
  } catch { return null; }
}

async function redisSmembers(redis: UpstashClient, setKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${redis.url}/smembers/${encodeURIComponent(setKey)}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json() as { result?: string[] };
    return json.result ?? [];
  } catch { return []; }
}

async function redisDel(redis: UpstashClient, ...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    // Upstash REST : DEL key1 key2 ...
    const keySegments = keys.map(k => encodeURIComponent(k)).join("/");
    await fetch(`${redis.url}/del/${keySegments}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
  } catch { /* best-effort */ }
}

async function redisSrem(redis: UpstashClient, setKey: string, member: string): Promise<void> {
  try {
    await fetch(`${redis.url}/srem/${encodeURIComponent(setKey)}/${encodeURIComponent(member)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
  } catch { /* best-effort */ }
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// ─── Invalidation ─────────────────────────────────────────────────────────────

export interface InvalidationResult {
  scanned: number;
  invalidated: number;
  cacheUnavailable: boolean;
}

/**
 * Invalide les entrées du cache sémantique dont l'embedding est similaire
 * à l'un des embeddings de chunks fournis.
 *
 * @param chunkEmbeddings  Embeddings des chunks nouvellement insérés/modifiés
 * @param threshold        Seuil de similarité cosinus (défaut 0.85)
 * @param dryRun           Si true, compte seulement sans supprimer
 */
export async function invalidateSemanticCache(
  chunkEmbeddings: number[][],
  threshold = DEFAULT_THRESHOLD,
  dryRun = false
): Promise<InvalidationResult> {
  const redis = getUpstash();
  if (!redis || chunkEmbeddings.length === 0) {
    return { scanned: 0, invalidated: 0, cacheUnavailable: !redis };
  }

  // Récupérer toutes les clés d'index
  const shas = await redisSmembers(redis, "sc:idx");
  if (shas.length === 0) {
    return { scanned: 0, invalidated: 0, cacheUnavailable: false };
  }

  let invalidated = 0;

  for (const sha of shas) {
    const raw = await redisGet(redis, `sc:emb:${sha}`);
    if (!raw) continue;

    let cachedEmbedding: number[];
    try {
      const entry = JSON.parse(raw) as { embedding: number[] };
      cachedEmbedding = entry.embedding;
    } catch { continue; }

    // Vérifier si l'entrée cache est proche d'au moins un des nouveaux chunks
    const shouldInvalidate = chunkEmbeddings.some(
      (ce) => cosineSimilarity(ce, cachedEmbedding) >= threshold
    );

    if (shouldInvalidate) {
      if (!dryRun) {
        await redisDel(redis, `sc:emb:${sha}`, `sc:resp:${sha}`);
        await redisSrem(redis, "sc:idx", sha);
      }
      invalidated++;
    }
  }

  return { scanned: shas.length, invalidated, cacheUnavailable: false };
}
