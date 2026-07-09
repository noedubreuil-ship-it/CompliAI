/**
 * Cache sémantique pour le consultant IA (H11).
 *
 * Principe : à chaque requête chat, on calcule l'embedding de la question
 * et on cherche dans Redis Upstash si une question similaire (cosine > seuil)
 * a déjà reçu une réponse dans la fenêtre de cache. Si oui → réponse cachée.
 *
 * Structure Redis :
 * - `sc:idx` — liste des clés d'index (pour balayer les entrées)
 * - `sc:emb:{sha}` — JSON sérialisé { embedding: number[], question_hash: string, cached_at: number }
 * - `sc:resp:{sha}` — réponse textuelle complète (string)
 *
 * TTL : SEMANTIC_CACHE_TTL_SEC (default 86400 = 24h)
 * Seuil : SEMANTIC_CACHE_THRESHOLD (default 0.95)
 *
 * Si Upstash n'est pas configuré → cache désactivé silencieusement.
 */

import { createHash } from "crypto";
import { embedText } from "./embeddings";

const CACHE_TTL_SEC = parseInt(process.env.SEMANTIC_CACHE_TTL_SEC ?? "86400");
const CACHE_THRESHOLD = parseFloat(process.env.SEMANTIC_CACHE_THRESHOLD ?? "0.95");
const MAX_INDEX_SIZE = 500; // max entrées à comparer (évite scan linéaire trop coûteux)
const CACHE_ENABLED = process.env.SEMANTIC_CACHE !== "0";

function getUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisGet(key: string): Promise<string | null> {
  const redis = getUpstash();
  if (!redis) return null;
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

async function redisSetEx(key: string, ttlSec: number, value: string): Promise<void> {
  const redis = getUpstash();
  if (!redis) return;
  try {
    await fetch(`${redis.url}/setex/${encodeURIComponent(key)}/${ttlSec}/${encodeURIComponent(value)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
  } catch { /* best-effort */ }
}

async function redisSadd(setKey: string, member: string): Promise<void> {
  const redis = getUpstash();
  if (!redis) return;
  try {
    await fetch(`${redis.url}/sadd/${encodeURIComponent(setKey)}/${encodeURIComponent(member)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
  } catch { /* best-effort */ }
}

async function redisSmembers(setKey: string): Promise<string[]> {
  const redis = getUpstash();
  if (!redis) return [];
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

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

export interface CacheLookupResult {
  hit: boolean;
  response?: string;
  similarity?: number;
}

/**
 * Cherche une réponse sémantiquement similaire dans le cache.
 * Retourne `{ hit: true, response }` si trouvé, sinon `{ hit: false }`.
 */
export async function semanticCacheLookup(
  question: string
): Promise<CacheLookupResult> {
  if (!CACHE_ENABLED || !getUpstash()) return { hit: false };

  try {
    const queryEmbedding = await embedText(question.slice(0, 2000));

    // Récupérer les clés d'index
    const keys = await redisSmembers("sc:idx");
    if (keys.length === 0) return { hit: false };

    // Comparer cosine sur les N premières entrées
    const toCheck = keys.slice(0, MAX_INDEX_SIZE);

    for (const sha of toCheck) {
      const raw = await redisGet(`sc:emb:${sha}`);
      if (!raw) continue;

      try {
        const entry = JSON.parse(raw) as { embedding: number[] };
        const sim = cosineSimilarity(queryEmbedding, entry.embedding);

        if (sim >= CACHE_THRESHOLD) {
          const cached = await redisGet(`sc:resp:${sha}`);
          if (cached) {
            return { hit: true, response: cached, similarity: sim };
          }
        }
      } catch { /* entrée corrompue, on skip */ }
    }

    return { hit: false };
  } catch (e) {
    console.warn("[semantic-cache] lookup error:", e);
    return { hit: false };
  }
}

/**
 * Stocke une réponse dans le cache sémantique.
 */
export async function semanticCacheStore(
  question: string,
  response: string
): Promise<void> {
  if (!CACHE_ENABLED || !getUpstash()) return;
  if (response.length < 100) return; // Ne cache pas les réponses trop courtes

  try {
    const embedding = await embedText(question.slice(0, 2000));
    const sha = createHash("sha256")
      .update(question)
      .digest("hex")
      .slice(0, 32);

    await Promise.all([
      redisSetEx(`sc:emb:${sha}`, CACHE_TTL_SEC, JSON.stringify({ embedding, cached_at: Date.now() })),
      redisSetEx(`sc:resp:${sha}`, CACHE_TTL_SEC, response),
      redisSadd("sc:idx", sha),
    ]);
  } catch (e) {
    console.warn("[semantic-cache] store error:", e);
  }
}
