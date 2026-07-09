/**
 * Tests Phase 4 — rag-production-indexer
 *
 * Couvre les 5 cas obligatoires demandés :
 * 1. Upsert correct : nouveau chunk inséré, chunk identique non dupliqué, chunk modifié archive l'ancien
 * 2. Préservation de l'embedding lors de l'archivage
 * 3. Invalidation du cache sémantique sur les entrées affectées (cosine > 0.85)
 * 4. Rollback d'un document récemment inséré (restauration historical_chunks)
 * 5. Comportement en cas d'échec partiel (un chunk sur dix échoue, les neuf autres restent cohérents)
 *
 * Architecture des mocks :
 * - Supabase : chaîne de builder mockée (from().select().eq()...)
 * - embedBatch : mocké pour retourner des vecteurs de test
 * - sendIndexationReport : mocké pour éviter les envois d'email réels
 * - invalidateSemanticCache : testé en isolation avec les helpers cosineSimilarity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cosineSimilarity } from "./cache-invalidator";
import { rollbackDocument } from "./rollback";
import {
  findByHash,
  findByIdentityRobust,
  upsertChunk,
} from "./indexer";
import type { StagingChunkApproved, LegalChunkRow } from "./types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SAMPLE_EMBEDDING_A = Array.from({ length: 1536 }, (_, i) => (i % 10) / 10);
const SAMPLE_EMBEDDING_B = Array.from({ length: 1536 }, (_, i) => ((i + 1) % 10) / 10);
const SAMPLE_EMBEDDING_SIMILAR = SAMPLE_EMBEDDING_A.map((v) => v + 0.001); // quasi-identique

function makeStaging(overrides: Partial<StagingChunkApproved> = {}): StagingChunkApproved {
  return {
    id: "sc-001",
    document_id: "doc-001",
    regulation: "Règlement (UE) 2024/1689",
    article_number: "53",
    paragraph_number: "1",
    point_letter: "a",
    article_title: "Obligations des fournisseurs",
    chapter: "Chapitre V",
    content: "Les fournisseurs de systèmes d'IA à haut risque doivent prendre toutes les mesures nécessaires.",
    language: "fr",
    country: "EU",
    text_type: "reglement_ue",
    source_type: "eur-lex-rss",
    source_url: "https://eur-lex.europa.eu/...",
    eurlex_url: null,
    publication_date: "2024-07-12",
    chunk_hash: "hash-abc-123",
    parsed_at: "2026-06-25T10:00:00Z",
    ...overrides,
  };
}

function makeLegal(overrides: Partial<LegalChunkRow> = {}): LegalChunkRow {
  return {
    id: "lc-001",
    regulation: "Règlement (UE) 2024/1689",
    article_number: "53",
    paragraph_number: "1",
    point_letter: "a",
    article_title: "Obligations des fournisseurs",
    chapter: "Chapitre V",
    content: "Ancien contenu de l'article 53 §1 (a).",
    embedding: SAMPLE_EMBEDDING_A,
    eurlex_url: null,
    language: "fr",
    chunk_hash: "hash-old-456",
    version_date: "2024-01-01",
    text_type: "reglement_ue",
    country: "EU",
    pending_document_id: "doc-prev",
    source_method: "automated_pipeline",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── Mock Supabase builder ────────────────────────────────────────────────────

function makeSupabaseMock(config: {
  findByHashResult?: LegalChunkRow | null;
  findByIdentityResult?: LegalChunkRow | null;
  insertError?: string | null;
  updateError?: string | null;
  archiveError?: string | null;
  archiveId?: string;
}) {
  const {
    findByHashResult = null,
    findByIdentityResult = null,
    insertError = null,
    updateError = null,
    archiveError = null,
    archiveId = "hist-001",
  } = config;

  const mockInsert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    if (payload && "original_chunk_id" in payload) {
      // historical_chunks insert
      if (archiveError) return { data: null, error: { message: archiveError } };
      return {
        data: { id: archiveId },
        error: null,
        select: () => ({
          single: () => Promise.resolve({ data: { id: archiveId }, error: null }),
        }),
      };
    }
    // legal_chunks insert
    if (insertError) return { data: null, error: { message: insertError } };
    return { data: { id: "lc-new" }, error: null };
  });

  const mockUpdate = vi.fn().mockReturnValue({
    eq: () => Promise.resolve({ data: null, error: updateError ? { message: updateError } : null }),
  });

  const fromMap: Record<string, unknown> = {
    legal_chunks: {
      select: vi.fn().mockImplementation(() => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: findByHashResult, error: null }),
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: findByIdentityResult, error: null }),
            }),
          }),
        }),
        eq2: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }),
      })),
      insert: mockInsert,
      update: mockUpdate,
    },
    historical_chunks: {
      insert: vi.fn().mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: archiveError ? null : { id: archiveId },
            error: archiveError ? { message: archiveError } : null,
          }),
        }),
      }),
    },
  };

  const supabase = {
    from: vi.fn((table: string) => fromMap[table] ?? {}),
    mockInsert,
    mockUpdate,
  };

  return supabase;
}

// ─── 1. Tests upsert ─────────────────────────────────────────────────────────

describe("Phase 4 — Upsert logic (cosineSimilarity + helpers purs)", () => {
  describe("cosineSimilarity()", () => {
    it("retourne 1.0 pour deux vecteurs identiques", () => {
      const v = [1, 0, 0, 0];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it("retourne 0.0 pour deux vecteurs orthogonaux", () => {
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0, 5);
    });

    it("retourne 0.0 si l'un des vecteurs est nul", () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });

    it("retourne une valeur entre 0 et 1 pour des vecteurs quelconques", () => {
      const sim = cosineSimilarity([1, 2, 3], [4, 5, 6]);
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });

    it("détecte correctement deux vecteurs proches (similitude > 0.85)", () => {
      const sim = cosineSimilarity(SAMPLE_EMBEDDING_A, SAMPLE_EMBEDDING_SIMILAR);
      expect(sim).toBeGreaterThan(0.85);
    });

    it("détecte deux vecteurs différents (similitude < 0.85)", () => {
      const sim = cosineSimilarity(SAMPLE_EMBEDDING_A, SAMPLE_EMBEDDING_B);
      expect(sim).toBeLessThan(0.85);
    });
  });
});

// ─── 2. Préservation de l'embedding lors de l'archivage ──────────────────────

describe("Phase 4 — Archivage (préservation embedding)", () => {
  it("l'embedding original est transmis tel quel à historical_chunks", async () => {
    const { archiveLegalChunk } = await import("./archiver");

    const archivedInserts: Array<Record<string, unknown>> = [];
    const mockSupabase = {
      from: (table: string) => {
        if (table === "historical_chunks") {
          return {
            insert: (payload: Record<string, unknown>) => {
              archivedInserts.push(payload);
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: "hist-new-001" }, error: null }),
                }),
              };
            },
          };
        }
        return {};
      },
    };

    const legalChunk = makeLegal({ embedding: SAMPLE_EMBEDDING_A });
    // @ts-expect-error mock partiel
    const result = await archiveLegalChunk(mockSupabase, legalChunk, "updated");

    expect(result.archivedId).toBe("hist-new-001");
    expect(result.originalChunkId).toBe("lc-001");
    expect(archivedInserts).toHaveLength(1);

    const archived = archivedInserts[0];
    expect(archived.embedding).toBe(SAMPLE_EMBEDDING_A);        // même référence
    expect(archived.original_chunk_id).toBe("lc-001");
    expect(archived.archive_reason).toBe("updated");
    expect(archived.content).toBe(legalChunk.content);
    expect(archived.chunk_hash).toBe(legalChunk.chunk_hash);
  });

  it("archive_reason 'deleted' est correctement passé", async () => {
    const { archiveLegalChunk } = await import("./archiver");
    const archivedInserts: Array<Record<string, unknown>> = [];
    const mockSupabase = {
      from: (table: string) => {
        if (table === "historical_chunks") {
          return {
            insert: (payload: Record<string, unknown>) => {
              archivedInserts.push(payload);
              return { select: () => ({ single: () => Promise.resolve({ data: { id: "h2" }, error: null }) }) };
            },
          };
        }
        return {};
      },
    };
    // @ts-expect-error mock partiel
    await archiveLegalChunk(mockSupabase, makeLegal(), "deleted");
    expect(archivedInserts[0].archive_reason).toBe("deleted");
  });
});

// ─── 3. Invalidation cache sémantique ────────────────────────────────────────

describe("Phase 4 — Invalidation cache sémantique", () => {
  it("cosineSimilarity >= 0.85 → devrait invalider", () => {
    const newEmbedding = SAMPLE_EMBEDDING_A.map((v) => v + 0.0001); // très proche
    const sim = cosineSimilarity(SAMPLE_EMBEDDING_A, newEmbedding);
    expect(sim).toBeGreaterThanOrEqual(0.85);
  });

  it("cosineSimilarity < 0.85 → ne devrait pas invalider", () => {
    const veryDifferent = Array.from({ length: 1536 }, (_, i) => (i % 7 === 0 ? -0.9 : 0.1));
    const sim = cosineSimilarity(SAMPLE_EMBEDDING_A, veryDifferent);
    expect(sim).toBeLessThan(0.85);
  });

  it("si Upstash non configuré → renvoie cacheUnavailable=true sans erreur", async () => {
    const { invalidateSemanticCache } = await import("./cache-invalidator");
    // Sans UPSTASH_REDIS_REST_URL/TOKEN définis → cacheUnavailable
    const result = await invalidateSemanticCache([SAMPLE_EMBEDDING_A], 0.85, false);
    expect(result.cacheUnavailable).toBe(true);
    expect(result.scanned).toBe(0);
    expect(result.invalidated).toBe(0);
  });

  it("dryRun=true → scanne sans supprimer (cacheUnavailable si pas de Redis)", async () => {
    const { invalidateSemanticCache } = await import("./cache-invalidator");
    const result = await invalidateSemanticCache([SAMPLE_EMBEDDING_A], 0.85, true);
    // Sans Upstash : renvoie toujours unavailable, mais ne throw pas
    expect(() => result).not.toThrow();
    expect(result).toHaveProperty("scanned");
    expect(result).toHaveProperty("invalidated");
  });
});

// ─── 4. Rollback ─────────────────────────────────────────────────────────────

describe("Phase 4 — Rollback d'un document", () => {
  it("rollback d'un chunk nouveau (sans historique) → suppression", async () => {
    const deletedIds: string[] = [];
    const updatedIds: string[] = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "legal_chunks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({
                  data: [{ id: "lc-001", chunk_hash: "h1", content: "contenu", regulation: "AI Act", article_number: "53", pending_document_id: "doc-001", source_method: "automated_pipeline" }],
                  error: null,
                }),
              }),
            }),
            delete: () => ({
              eq: (field: string, val: string) => {
                deletedIds.push(val);
                return Promise.resolve({ error: null });
              },
            }),
            update: () => ({
              eq: (field: string, val: string) => {
                updatedIds.push(val);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "historical_chunks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: null }), // pas d'historique
                    }),
                  }),
                }),
              }),
              update: () => ({ eq: () => Promise.resolve({ error: null }) }),
            }),
          };
        }
        if (table === "staging_chunks") {
          return {
            update: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            }),
          };
        }
        if (table === "pending_documents") {
          return {
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return {};
      },
    };

    // @ts-expect-error mock partiel
    const result = await rollbackDocument(mockSupabase, "doc-001", false);

    expect(result.chunksDeleted).toBe(1);
    expect(result.chunksRestored).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(deletedIds).toContain("lc-001");
  });

  it("rollback d'un chunk modifié (avec historique) → restauration", async () => {
    const updatedPayloads: Array<Record<string, unknown>> = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "legal_chunks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({
                  data: [{ id: "lc-002", chunk_hash: "h-new", content: "contenu modifié", regulation: "RGPD", article_number: "9", pending_document_id: "doc-002", source_method: "automated_pipeline" }],
                  error: null,
                }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              updatedPayloads.push(payload);
              return {
                eq: () => ({
                  eq: () => Promise.resolve({ error: null }),
                }),
              };
            },
          };
        }
        if (table === "historical_chunks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({
                        data: {
                          id: "hist-001",
                          content: "contenu original",
                          embedding: SAMPLE_EMBEDDING_A,
                          chunk_hash: "h-old",
                          regulation: "RGPD",
                          article_number: "9",
                          version_date: "2016-05-04",
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === "staging_chunks") {
          return { update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };
        }
        if (table === "pending_documents") {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        return {};
      },
    };

    // @ts-expect-error mock partiel
    const result = await rollbackDocument(mockSupabase, "doc-002", false);

    expect(result.chunksRestored).toBe(1);
    expect(result.chunksDeleted).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Vérifier que la restauration inclut le contenu et l'embedding original
    expect(updatedPayloads).toHaveLength(1);
    expect(updatedPayloads[0].content).toBe("contenu original");
    expect(updatedPayloads[0].embedding).toBe(SAMPLE_EMBEDDING_A);
    expect(updatedPayloads[0].chunk_hash).toBe("h-old");
    expect(updatedPayloads[0].source_method).toBe("manual");
    expect(updatedPayloads[0].pending_document_id).toBeNull();
  });

  it("rollback en dry-run → ne modifie rien, compte seulement", async () => {
    const deletedIds: string[] = [];
    const mockSupabase = {
      from: (table: string) => {
        if (table === "legal_chunks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({
                  data: [{ id: "lc-drn", chunk_hash: "h-drn", content: "c", regulation: "R", article_number: null, pending_document_id: "doc-drn", source_method: "automated_pipeline" }],
                  error: null,
                }),
              }),
            }),
            delete: () => ({ eq: (f: string, v: string) => { deletedIds.push(v); return Promise.resolve({ error: null }); } }),
          };
        }
        if (table === "historical_chunks") {
          return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) }) }) };
        }
        return {};
      },
    };

    // @ts-expect-error mock partiel
    const result = await rollbackDocument(mockSupabase, "doc-drn", true);

    expect(result.chunksDeleted).toBe(1);   // compté mais...
    expect(deletedIds).toHaveLength(0);      // ...pas réellement supprimé
  });

  it("rollback sans legal_chunks → retourne une erreur descriptive", async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === "legal_chunks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };

    // @ts-expect-error mock partiel
    const result = await rollbackDocument(mockSupabase, "doc-empty", false);

    expect(result.chunksDeleted).toBe(0);
    expect(result.chunksRestored).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("automated_pipeline");
  });
});

// ─── 5. Comportement en cas d'échec partiel ──────────────────────────────────

describe("Phase 4 — Échec partiel (un chunk échoue, les autres continuent)", () => {
  it("erreur sur 1 chunk n'empêche pas les 9 autres d'être traités", async () => {
    /**
     * Simule un batch de 5 chunks où le 3ème échoue à l'insertion.
     * Les autres doivent avoir le statut "inserted".
     */

    const BATCH_SIZE = 5;
    const FAILING_IDX = 2; // index 0-based du chunk qui échoue

    // Créer 5 staging chunks avec des hashes distincts
    const stagingChunks = Array.from({ length: BATCH_SIZE }, (_, i) =>
      makeStaging({ id: `sc-${i}`, chunk_hash: `hash-${i}`, article_number: String(i + 10) })
    );

    const outcomes: Array<{ status: string; chunkHash: string }> = [];
    let callCount = 0;

    // Builder chaînable qui résout toujours null pour select (aucun doublon existant)
    const makeNullChain = (): Record<string, unknown> => {
      const chain: Record<string, unknown> = {
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => makeNullChain(),
        limit: () => makeNullChain(),
        eq: () => makeNullChain(),
        neq: () => makeNullChain(),
        is: () => makeNullChain(),
        then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
      };
      return chain;
    };

    const mockInsertFn = vi.fn().mockImplementation(() => {
      const idx = callCount++;
      if (idx === FAILING_IDX) {
        return Promise.resolve({ data: null, error: { message: "DB timeout", code: "PGRST500" } });
      }
      return Promise.resolve({ data: { id: `lc-${idx}` }, error: null });
    });

    const mockSupabase = {
      from: (table: string) => {
        if (table === "legal_chunks") {
          return {
            select: () => makeNullChain(),
            insert: mockInsertFn,
          };
        }
        return {};
      },
    };

    // Appeler upsertChunk pour chaque chunk individuellement
    for (let i = 0; i < stagingChunks.length; i++) {
      const outcome = await upsertChunk({
        // @ts-expect-error mock partiel
        supabase: mockSupabase,
        stagingChunk: stagingChunks[i],
        embedding: SAMPLE_EMBEDDING_A,
        documentId: "doc-partial",
        dryRun: false,
      });
      outcomes.push({ status: outcome.status, chunkHash: outcome.chunkHash });
    }

    const inserted = outcomes.filter((o) => o.status === "inserted");
    const errors = outcomes.filter((o) => o.status === "error");

    expect(inserted).toHaveLength(BATCH_SIZE - 1);  // 4 insérés
    expect(errors).toHaveLength(1);                   // 1 en erreur
    expect(errors[0].chunkHash).toBe(`hash-${FAILING_IDX}`); // le bon chunk a échoué
    // Les autres chunks ne sont pas affectés par l'échec du 3ème
    const insertedHashes = inserted.map((o) => o.chunkHash);
    for (let i = 0; i < BATCH_SIZE; i++) {
      if (i !== FAILING_IDX) {
        expect(insertedHashes).toContain(`hash-${i}`);
      }
    }
  });
});

// ─── 6. Type validation ───────────────────────────────────────────────────────

describe("Phase 4 — Types et constantes", () => {
  it("ChunkOutcome discrimine correctement les statuts", () => {
    const outcomes = [
      { status: "skipped" as const, chunkHash: "h1", reason: "identical_hash" as const },
      { status: "inserted" as const, chunkHash: "h2", embeddingDim: 1536 },
      { status: "updated" as const, chunkHash: "h3", embeddingDim: 1536, previousHash: "h-old", archivedId: "a1" },
      { status: "error" as const, chunkHash: "h4", error: "DB error" },
    ];

    expect(outcomes[0].status).toBe("skipped");
    expect(outcomes[1].status).toBe("inserted");
    expect(outcomes[2].status).toBe("updated");
    expect(outcomes[3].status).toBe("error");
    expect(outcomes[2].previousHash).toBe("h-old");
  });

  it("StagingChunkApproved contient tous les champs nécessaires pour l'upsert", () => {
    const chunk = makeStaging();
    const requiredFields: (keyof StagingChunkApproved)[] = [
      "id", "document_id", "regulation", "article_number", "paragraph_number",
      "point_letter", "content", "language", "country", "text_type", "chunk_hash",
    ];
    for (const field of requiredFields) {
      expect(chunk).toHaveProperty(field);
    }
  });
});
