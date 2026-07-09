/**
 * Tests du pipeline d'ingestion RAG Phase 2.
 *
 * Tous les appels Supabase et Claude sont mockés.
 *
 * Couvre :
 * - Mode dryRun : aucune écriture en base, sortie JSON console
 * - Traitement nominal : pending → staged
 * - Gestion des types non supportés (skipped)
 * - Gestion des erreurs (texte manquant, Claude échoue, validation échoue)
 * - Comptage correct des tokens
 * - Filtrage par documentType
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// Mocker Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Mocker le base-parser pour contrôler la réponse Claude
vi.mock("./parsers/base-parser", () => ({
  parseDocumentWithClaude: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { parseDocumentWithClaude } from "./parsers/base-parser";
import { runIngestionPipeline } from "./pipeline";
import type { StagingChunkInsert } from "./parsers/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Texte de plus de 100 caractères pour passer le seuil minimum du pipeline
const SAMPLE_RAW_TEXT =
  "Article premier — Le présent règlement établit des règles harmonisées concernant l'intelligence artificielle dans l'Union européenne. Il vise à garantir un niveau élevé de protection de la santé et de la sécurité.";

function makeDoc(overrides: Partial<{
  id: string;
  document_type: string;
  status: string;
  raw_content_text: string | null;
  raw_content_url: string | null;
  title: string;
  language: string;
  country: string;
  publication_date: string | null;
  source_url: string;
}> = {}) {
  return {
    id: "doc-uuid-001",
    source_id: "src-uuid-001",
    external_id: "hash-abc123",
    celex: null,
    ecli: null,
    source_url: "https://example.com/doc",
    title: "Règlement (UE) 2024/1689",
    document_type: "eu_regulation",
    language: "fr",
    country: "EU",
    publication_date: "2024-07-12",
    status: "pending",
    raw_content_url: null,
    raw_content_text: SAMPLE_RAW_TEXT,
    metadata: {},
    retry_count: 0,
    ...overrides,
  };
}

function makeChunk(documentId: string, idx: number): StagingChunkInsert {
  const content = `Contenu du chunk ${idx} — article ${idx} du Règlement (UE) 2024/1689 sur l'intelligence artificielle. Ce chunk est suffisamment long pour passer la validation du pipeline RAG.`;
  return {
    document_id: documentId,
    regulation: "Règlement (UE) 2024/1689",
    article_number: String(idx),
    paragraph_number: null,
    point_letter: null,
    article_title: `Article ${idx}`,
    chapter: "CHAPITRE I",
    content,
    language: "fr",
    country: "EU",
    text_type: "reglement_ue",
    source_type: "eu_regulation",
    source_url: "https://example.com/doc",
    eurlex_url: null,
    publication_date: "2024-07-12",
    chunk_hash: createHash("sha256").update(content).digest("hex"),
  };
}

function makeSuccessParserResponse(documentId: string, numChunks = 2) {
  return {
    ok: true as const,
    rawOutput: {
      regulation: "Règlement (UE) 2024/1689",
      celex: "32024R1689",
      publication_date: "2024-07-12",
      chunks: [],
    },
    chunks: Array.from({ length: numChunks }, (_, i) => makeChunk(documentId, i + 1)),
    usage: { inputTokens: 1500, outputTokens: 600, latencyMs: 800 },
    promptHash: "a".repeat(64),
  };
}

// ─── Setup mocks ──────────────────────────────────────────────────────────────

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
let _capturedEqCalls: Array<[string, unknown]> = [];

/**
 * Crée un query builder thenable qui supporte le chaînage complet Supabase.
 * Chaque méthode retourne `this` pour permettre le chaînage.
 * `await builder` résout vers { data, error }.
 */
function createQueryBuilder(result: { data: unknown[]; error: null | { message: string } }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((...args: [string, unknown]) => {
      _capturedEqCalls.push(args);
      return builder;
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: <T>(onfulfilled: (value: typeof result) => T) => Promise.resolve(result).then(onfulfilled),
    catch: <T>(onrejected: (r: unknown) => T) => Promise.resolve(result).catch(onrejected),
    finally: (onfinally: () => void) => Promise.resolve(result).finally(onfinally),
  };
  return builder;
}

function setupSupabaseMock(pendingDocs: ReturnType<typeof makeDoc>[]) {
  _capturedEqCalls = [];

  const queryBuilder = createQueryBuilder({ data: pendingDocs, error: null });

  // Mock update : retourne un objet avec eq() → Promise<{ error: null }>
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  // Mock insert : retourne une Promise<{ error: null }>
  mockInsert.mockResolvedValue({ error: null });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "pending_documents") {
      return { select: queryBuilder.select, update: mockUpdate, ...queryBuilder };
    }
    if (table === "staging_chunks") {
      return { insert: mockInsert };
    }
    return {};
  });

  (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
  return { queryBuilder, mockFrom };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runIngestionPipeline", () => {
beforeEach(() => {
  // resetAllMocks reset aussi les implementations — nécessaire pour éviter que
  // mockReturnValue d'un test précédent contamine le test suivant.
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

  // ─── Cas nominal dryRun ─────────────────────────────────────────────────

  it("mode dryRun : ne fait aucune écriture en base", async () => {
    const doc = makeDoc();
    setupSupabaseMock([doc]);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSuccessParserResponse(doc.id)
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await runIngestionPipeline({ dryRun: true, batchSize: 1 });
    consoleSpy.mockRestore();

    expect(result.staged).toBe(1);
    expect(result.errors).toBe(0);
    // En dryRun, aucune insertion dans staging_chunks
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("mode dryRun : affiche la sortie JSON dans la console", async () => {
    const doc = makeDoc();
    setupSupabaseMock([doc]);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSuccessParserResponse(doc.id)
    );

    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });

    await runIngestionPipeline({ dryRun: true, batchSize: 1 });
    vi.restoreAllMocks();

    // Vérifier qu'on a loggué le JSON avec dryRun=true
    const jsonLog = logs.find((l) => l.includes('"dryRun": true'));
    expect(jsonLog).toBeTruthy();
    expect(jsonLog).toContain('"documentId"');
    expect(jsonLog).toContain('"chunksCount"');
  });

  // ─── Cas nominal production ──────────────────────────────────────────────

  it("mode production : appelle réellement supabase.insert() avec les chunks", async () => {
    const doc = makeDoc();
    const { mockFrom } = setupSupabaseMock([doc]);
    const parserResponse = makeSuccessParserResponse(doc.id, 3);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue(parserResponse);
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: false, batchSize: 1, throttleMs: 0 });

    // NOTE Vitest v3 : vi.restoreAllMocks() efface aussi le mock.calls des vi.fn() réguliers.
    // Les assertions sur les mocks DOIVENT être faites AVANT vi.restoreAllMocks().

    // Comportement observable : document stagé avec succès
    expect(result.staged).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.processed).toBe(1);
    expect(result.details[0].status).toBe("staged");
    expect(result.details[0].chunksCount).toBe(3);

    // Vérification directe : mockInsert a été appelé avec les chunks corrects
    expect(mockInsert).toHaveBeenCalledOnce();
    const insertedChunks = mockInsert.mock.calls[0][0] as StagingChunkInsert[];
    expect(insertedChunks).toHaveLength(3);
    expect(insertedChunks[0].document_id).toBe(doc.id);
    expect(insertedChunks[0].text_type).toBe("reglement_ue");

    // Vérification : from() a été appelé pour staging_chunks
    expect(mockFrom).toHaveBeenCalledWith("staging_chunks");

    // Restauration des spies (APRÈS les assertions)
    vi.restoreAllMocks();
  });

  it("mode production : ne log pas le JSON dryRun dans la console", async () => {
    const doc = makeDoc();
    setupSupabaseMock([doc]);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSuccessParserResponse(doc.id)
    );

    const dryRunLogs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      dryRunLogs.push(args.join(" "));
    });

    await runIngestionPipeline({ dryRun: false, batchSize: 1, throttleMs: 0 });

    // Assertion AVANT vi.restoreAllMocks() (Vitest v3 bug : restoreAllMocks efface aussi vi.fn() calls)
    const hasDryRunJson = dryRunLogs.some((l) => l.includes('"dryRun": true'));
    expect(hasDryRunJson).toBe(false);

    vi.restoreAllMocks();
  });

  // ─── Aucun document pending ─────────────────────────────────────────────

  it("retourne 0 traités si aucun document pending", async () => {
    setupSupabaseMock([]);
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: true });

    expect(result.processed).toBe(0);
    expect(result.staged).toBe(0);
    vi.restoreAllMocks();
  });

  // ─── Types non supportés ────────────────────────────────────────────────

  it("ignore (skipped) les documents avec type non supporté", async () => {
    const doc = makeDoc({ document_type: "other" });
    setupSupabaseMock([doc]);
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: true, batchSize: 1 });

    // NOTE : assertions sur vi.fn() AVANT vi.restoreAllMocks() (Vitest v3 efface les calls sinon)
    expect(result.skipped).toBe(1);
    expect(result.staged).toBe(0);
    expect(parseDocumentWithClaude).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // ─── Texte manquant ─────────────────────────────────────────────────────

  it("gère l'erreur si le texte du document est introuvable", async () => {
    const doc = makeDoc({ raw_content_text: null, raw_content_url: null });
    setupSupabaseMock([doc]);
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: false, batchSize: 1 });

    expect(result.errors).toBe(1);
    expect(result.staged).toBe(0);
    expect(parseDocumentWithClaude).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // ─── Erreur Claude ──────────────────────────────────────────────────────

  it("gère l'erreur si Claude échoue", async () => {
    const doc = makeDoc(); // raw_content_text par défaut (> 100 chars)
    setupSupabaseMock([doc]);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: "Timeout API Claude",
      usage: { inputTokens: 500, outputTokens: 0, latencyMs: 30000 },
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: false, batchSize: 1 });

    expect(result.errors).toBe(1);
    expect(result.staged).toBe(0);
    expect(result.details[0].error).toContain("Parsing Claude échoué");
    vi.restoreAllMocks();
  });

  // ─── Comptage des tokens ────────────────────────────────────────────────

  it("additionne correctement les tokens de tous les documents traités", async () => {
    const docs = [makeDoc({ id: "doc-1" }), makeDoc({ id: "doc-2" })];
    setupSupabaseMock(docs);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeSuccessParserResponse("doc-1")) // 1500 in, 600 out
      .mockResolvedValueOnce(makeSuccessParserResponse("doc-2")); // 1500 in, 600 out
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: true, batchSize: 2, throttleMs: 0 });

    expect(result.totalInputTokens).toBe(3000);
    expect(result.totalOutputTokens).toBe(1200);
    vi.restoreAllMocks();
  });

  // ─── Filtrage par documentType ──────────────────────────────────────────

  it("filtre les documents par type si documentType est spécifié", async () => {
    const doc = makeDoc({ document_type: "eu_regulation" });
    setupSupabaseMock([doc]);
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSuccessParserResponse(doc.id)
    );
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runIngestionPipeline({ dryRun: true, documentType: "eu_regulation", batchSize: 1 });

    // _capturedEqCalls est un tableau ordinaire (pas affecté par restoreAllMocks)
    const hasDocTypeFilter = _capturedEqCalls.some(
      ([field, value]) => field === "document_type" && value === "eu_regulation"
    );
    expect(hasDocTypeFilter).toBe(true);
    vi.restoreAllMocks();
  });

  // ─── Validation échouée ─────────────────────────────────────────────────

  it("marque en erreur si la validation des chunks échoue", async () => {
    const doc = makeDoc(); // raw_content_text par défaut (> 100 chars)
    setupSupabaseMock([doc]);

    // Retourner un chunk invalide (contenu trop court)
    const invalidResponse = {
      ok: true as const,
      rawOutput: { regulation: "Test", celex: null, publication_date: null, chunks: [] },
      chunks: [
        {
          document_id: doc.id,
          regulation: "Test",
          article_number: "1",
          paragraph_number: null,
          point_letter: null,
          article_title: null,
          chapter: null,
          content: "Court.", // trop court (< 50 chars)
          language: "fr",
          country: "EU",
          text_type: "reglement_ue",
          source_type: "eu_regulation",
          source_url: null,
          eurlex_url: null,
          publication_date: null,
          chunk_hash: createHash("sha256").update("Court.").digest("hex"),
        } as StagingChunkInsert,
      ],
      usage: { inputTokens: 100, outputTokens: 50, latencyMs: 500 },
      promptHash: "a".repeat(64),
    };
    (parseDocumentWithClaude as ReturnType<typeof vi.fn>).mockResolvedValue(invalidResponse);
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await runIngestionPipeline({ dryRun: false, batchSize: 1 });

    expect(result.errors).toBe(1);
    expect(result.staged).toBe(0);
    expect(result.details[0].error).toContain("Validation");
    vi.restoreAllMocks();
  });
});
