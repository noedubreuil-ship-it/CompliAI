/**
 * pipeline.test.ts — Tests Phase 5 : RAG Quality Verification Suite.
 *
 * 5 cas obligatoires validés :
 *  1. Exécution golden set : questions OK, warning, critical
 *  2. Détection régression artificielle (article requis disparaît)
 *  3. Détection chunks morts (auto-recherche ne retrouve pas le chunk)
 *  4. Comparaison historique (dérive entre deux exécutions)
 *  5. Couverture articles (article critique absent du top-3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock hoistés (avant imports) ────────────────────────────────────────────

// vi.hoisted() garantit que les mocks sont initialisés avant les imports
// de modules (évite les problèmes de TDZ avec vi.mock hoisting)
const { mockSearchLegalChunks, mockCreateClient } = vi.hoisted(() => {
  const mockSearchLegalChunks = vi.fn();
  const mockCreateClient = vi.fn();
  return { mockSearchLegalChunks, mockCreateClient };
});

vi.mock("@/lib/ai/rag", () => ({
  // Le checker de couverture est passé au chemin hybride (2026-07-19), aligné
  // sur le retrieval réel du chat. On mocke les deux : `searchLegalChunks`
  // reste utilisé par le runner du golden set, `searchLegalChunksHybrid` par le
  // coverage-checker.
  searchLegalChunks: (...args: unknown[]) => mockSearchLegalChunks(...args),
  searchLegalChunksHybrid: (...args: unknown[]) => mockSearchLegalChunks(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// ─── Imports après mocks ──────────────────────────────────────────────────────

import { runQuestion } from "./runner";
import { checkCoverageEntry } from "./coverage-checker";
import { detectHistoricalDrift } from "./history";
import type { QuestionResult } from "./types";
import { getQuestion } from "./golden-set";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function rawChunk(regulation: string, article_number: string, similarity = 0.45) {
  return {
    id: `id-${article_number}`,
    regulation,
    article_number,
    article_title: `Art. ${article_number}`,
    content: `Contenu fictif pour ${regulation} art ${article_number}.`,
    similarity,
  };
}

const AI = "AI Act (UE 2024/1689)";
const RGPD = "RGPD (UE 2016/679)";

// ─── Supabase mock helper ─────────────────────────────────────────────────────

/**
 * Crée un mock de client Supabase retournant des données paginées.
 * Les méthodes chaînées (eq, order, limit, maybeSingle) se terminent sur
 * le `resolvedData` fourni.
 */
function makeSbClient(resolvedData: unknown) {
  const terminal = () => Promise.resolve({ data: resolvedData, error: null });
  // Construire une chaîne de proxy qui résout n'importe quel niveau de chaînage
  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    ["select", "eq", "order", "limit", "gte"].forEach((method) => {
      chain[method] = () => makeChain();
    });
    chain["maybeSingle"] = terminal;
    chain["then"] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: resolvedData, error: null }).then(resolve);
    return chain;
  }
  return {
    from: () => ({
      ...makeChain(),
      insert: () => Promise.resolve({ data: null, error: null }),
      select: () => makeChain(),
    }),
  };
}

// ─── Test 1 : Exécution golden set ───────────────────────────────────────────

describe("Test 1 — Exécution du golden set", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Supabase non requis pour runner.ts (il n'appelle pas la DB)
  });

  it("Q01 : retourne OK quand Art. 6 et Art. 9 sont présents", async () => {
    // Q01 requiert AI Act Art. 6 (critical) et Art. 9 (important)
    mockSearchLegalChunks.mockResolvedValue([
      rawChunk(AI, "6", 0.42),
      rawChunk(AI, "9_§1", 0.40),
    ]);

    const q01 = getQuestion("Q01")!;
    expect(q01).toBeDefined();

    const result = await runQuestion(q01);
    expect(result.status).toBe("ok");
    expect(result.missing_required).toHaveLength(0);
    expect(result.present_blacklisted).toHaveLength(0);
    expect(result.articles_cited).toContain(`${AI}:6`);
  });

  it("Q02 : retourne OK quand Art. 5 §1 (pratique interdite) est présent", async () => {
    mockSearchLegalChunks.mockResolvedValue([rawChunk(AI, "5_§1", 0.48)]);

    const q02 = getQuestion("Q02")!;
    const result = await runQuestion(q02);

    expect(result.status).toBe("ok");
    expect(result.missing_required).toHaveLength(0);
  });

  it("Q03 : retourne OK quand Art. 51 et Art. 55 sont tous les deux présents", async () => {
    mockSearchLegalChunks.mockResolvedValue([
      rawChunk(AI, "51", 0.50),
      rawChunk(AI, "55", 0.51),
    ]);

    const q03 = getQuestion("Q03")!;
    const result = await runQuestion(q03);

    expect(result.status).toBe("ok");
    expect(result.articles_cited).toContain(`${AI}:51`);
    expect(result.articles_cited).toContain(`${AI}:55`);
  });

  it("retourne CRITICAL si article requis critique est absent", async () => {
    // Pour Q03, Art. 51 manque → critical
    mockSearchLegalChunks.mockResolvedValue([rawChunk(AI, "55", 0.48)]);

    const q03 = getQuestion("Q03")!;
    const result = await runQuestion(q03);

    expect(result.status).toBe("critical");
    expect(result.missing_required.some((r) => r.article_number === "51")).toBe(true);
    expect(result.anomalies.some((a) => a.includes("CRITICAL_MISSING"))).toBe(true);
  });

  it("retourne CRITICAL si article blacklisté est présent sans le requis (Q04)", async () => {
    // Q04 requiert Art. 53, blackliste Art. 55 seul sans Art. 53
    // → Art. 55 présent sans Art. 53 → blacklisted + missing
    mockSearchLegalChunks.mockResolvedValue([rawChunk(AI, "55", 0.45)]);

    const q04 = getQuestion("Q04")!;
    const result = await runQuestion(q04);

    expect(result.status).toBe("critical");
    // Art. 53 manque (required) ET Art. 55 est blacklisté
    expect(result.present_blacklisted.some((b) => b.article_number === "55")).toBe(true);
    expect(result.anomalies.some((a) => a.includes("BLACKLISTED_PRESENT"))).toBe(true);
  });

  it("gère l'erreur API RAG (retourne status critical avec anomalie)", async () => {
    mockSearchLegalChunks.mockRejectedValue(new Error("OpenAI timeout"));

    const q01 = getQuestion("Q01")!;
    const result = await runQuestion(q01);

    expect(result.status).toBe("critical");
    expect(result.anomalies[0]).toContain("rag_search_error");
    expect(result.returned_chunks).toHaveLength(0);
  });
});

// ─── Test 2 : Détection régression artificielle ───────────────────────────────

describe("Test 2 — Régression artificielle (article requis qui disparaît)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("détecte qu'Art. 51 (requis pour Q03) a disparu après ré-embedding", async () => {
    // Avant : Art. 51 + Art. 55 présents → OK
    mockSearchLegalChunks.mockResolvedValueOnce([
      rawChunk(AI, "51", 0.50),
      rawChunk(AI, "55", 0.51),
    ]);

    const q03 = getQuestion("Q03")!;
    const before = await runQuestion(q03);
    expect(before.status).toBe("ok");

    // Après régression : Art. 51 disparaît → critical
    mockSearchLegalChunks.mockResolvedValueOnce([
      rawChunk(AI, "55", 0.48),
      rawChunk(AI, "13", 0.35),
    ]);

    const after = await runQuestion(q03);
    expect(after.status).toBe("critical");
    expect(after.missing_required.some((r) => r.article_number === "51")).toBe(true);
    expect(after.anomalies.some((a) => a.includes("CRITICAL_MISSING:AI Act:51"))).toBe(true);
  });

  it("détecte régression qualificative Q01 : Art. 9 (important) disparaît → warning", async () => {
    // Q01 requiert Art. 6 (critical) et Art. 9 (important)
    // Avant : les deux présents → ok
    mockSearchLegalChunks.mockResolvedValueOnce([
      rawChunk(AI, "6", 0.42),
      rawChunk(AI, "9_§1", 0.40),
    ]);
    const q01 = getQuestion("Q01")!;
    const before = await runQuestion(q01);
    expect(before.status).toBe("ok");

    // Après : Art. 9 disparaît, seul Art. 6 reste → warning (important manquant)
    mockSearchLegalChunks.mockResolvedValueOnce([rawChunk(AI, "6", 0.42)]);
    const after = await runQuestion(q01);
    expect(after.status).toBe("warning");
    expect(after.missing_required.some((r) => r.article_number === "9")).toBe(true);
  });
});

// ─── Test 3 : Chunks morts ────────────────────────────────────────────────────

describe("Test 3 — Détection chunks morts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifie comme mort un chunk qui ne revient pas dans sa propre recherche", async () => {
    const recentChunks = [
      {
        id: "chunk-alive-id",
        regulation: AI,
        article_number: "6",
        content: "Les systèmes d'IA à haut risque doivent respecter les exigences du chapitre III.",
        created_at: new Date().toISOString(),
        pending_document_id: null,
      },
      {
        id: "chunk-dead-id",
        regulation: RGPD,
        article_number: "22",
        content: "Toute personne a le droit de ne pas faire l'objet d'une décision automatisée.",
        created_at: new Date().toISOString(),
        pending_document_id: null,
      },
    ];

    // Supabase retourne les 2 chunks récents
    mockCreateClient.mockReturnValue(makeSbClient(recentChunks));

    // searchLegalChunks :
    // - Pour chunk-alive : chunk-alive-id en position 1 → vivant
    // - Pour chunk-dead : chunk-dead-id absent → mort
    mockSearchLegalChunks
      .mockResolvedValueOnce([
        { id: "chunk-alive-id", regulation: AI, article_number: "6", content: "...", similarity: 0.45 },
      ])
      .mockResolvedValueOnce([
        { id: "chunk-other-id", regulation: RGPD, article_number: "17", content: "...", similarity: 0.32 },
      ]);

    const { runDeadChunksCheck } = await import("./dead-chunks");
    const result = await runDeadChunksCheck();

    expect(result.dead_chunks.some((c) => c.chunk_id === "chunk-dead-id")).toBe(true);
    expect(result.alive_chunks.some((c) => c.chunk_id === "chunk-alive-id")).toBe(true);
    expect(result.chunks_checked).toBe(2);
  });

  it("retourne aucun chunk mort quand tous sont retrouvés", async () => {
    const recentChunk = {
      id: "chunk-healthy-id",
      regulation: AI,
      article_number: "5",
      content: "Pratique interdite : inférence d'émotions sur le lieu de travail.",
      created_at: new Date().toISOString(),
      pending_document_id: null,
    };

    mockCreateClient.mockReturnValue(makeSbClient([recentChunk]));

    mockSearchLegalChunks.mockResolvedValueOnce([
      { id: "chunk-healthy-id", regulation: AI, article_number: "5", content: "...", similarity: 0.52 },
    ]);

    const { runDeadChunksCheck } = await import("./dead-chunks");
    const result = await runDeadChunksCheck();

    expect(result.dead_chunks).toHaveLength(0);
    expect(result.alive_chunks).toHaveLength(1);
    expect(result.alive_chunks[0].chunk_id).toBe("chunk-healthy-id");
  });

  it("retourne 0 chunks vérifiés quand aucun chunk récent", async () => {
    mockCreateClient.mockReturnValue(makeSbClient([]));

    const { runDeadChunksCheck } = await import("./dead-chunks");
    const result = await runDeadChunksCheck();

    expect(result.chunks_checked).toBe(0);
    expect(result.dead_chunks).toHaveLength(0);
    expect(mockSearchLegalChunks).not.toHaveBeenCalled();
  });
});

// ─── Test 4 : Comparaison historique (dérive) ─────────────────────────────────

describe("Test 4 — Comparaison historique (dérive articles)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeSbHistoryClient(historicalArticles: string[]) {
    const historyRecord = {
      executed_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      question_id: "Q01",
      articles_cited: historicalArticles,
      anomalies_detected: [],
      status: "ok",
    };
    return makeSbClient([historyRecord]);
  }

  it("détecte une dérive quand un article disparaît entre deux exécutions", async () => {
    // Historique DB : Q01 avait Art. 6 + Art. 9 dans ses résultats
    mockCreateClient.mockReturnValue(
      makeSbHistoryClient([`${AI}:6`, `${AI}:9_§1`])
    );

    // Exécution actuelle : Art. 6 a disparu
    const currentResults: QuestionResult[] = [
      {
        question_id: "Q01",
        question: "Test Q01",
        executed_at: new Date().toISOString(),
        returned_chunks: [],
        articles_cited: [`${AI}:27`, `${AI}:9_§1`], // Art. 6 absent!
        missing_required: [],
        present_blacklisted: [],
        anomalies: [],
        status: "ok",
      },
    ];

    const alerts = await detectHistoricalDrift(currentResults);

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toContain("DRIFT_DISAPPEARED");
    expect(alerts[0]).toContain("Q01");
    expect(alerts[0]).toContain(`${AI}:6`);
  });

  it("ne génère pas d'alerte quand les articles sont stables", async () => {
    // Historique identique à l'état actuel
    mockCreateClient.mockReturnValue(
      makeSbHistoryClient([`${AI}:6`, `${AI}:9_§1`])
    );

    const currentResults: QuestionResult[] = [
      {
        question_id: "Q01",
        question: "Test Q01",
        executed_at: new Date().toISOString(),
        returned_chunks: [],
        articles_cited: [`${AI}:6`, `${AI}:9_§1`], // Identique
        missing_required: [],
        present_blacklisted: [],
        anomalies: [],
        status: "ok",
      },
    ];

    const alerts = await detectHistoricalDrift(currentResults);
    expect(alerts).toHaveLength(0);
  });

  it("détecte une dérive par apparition de nombreux nouveaux articles", async () => {
    mockCreateClient.mockReturnValue(
      makeSbHistoryClient([`${AI}:6`])
    );

    // Plus de 2 nouveaux articles → alerte DRIFT_APPEARED
    const currentResults: QuestionResult[] = [
      {
        question_id: "Q01",
        question: "Test Q01",
        executed_at: new Date().toISOString(),
        returned_chunks: [],
        articles_cited: [`${AI}:6`, `${AI}:9`, `${AI}:13`, `${AI}:50`], // 3 nouveaux
        missing_required: [],
        present_blacklisted: [],
        anomalies: [],
        status: "ok",
      },
    ];

    const alerts = await detectHistoricalDrift(currentResults);
    expect(alerts.some((a) => a.includes("DRIFT_APPEARED"))).toBe(true);
  });
});

// ─── Test 5 : Couverture articles ────────────────────────────────────────────

describe("Test 5 — Couverture articles (mécanisme 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const entryArt5 = {
    id: "ai-act-5",
    query: "Article 5 du Règlement IA européen AI Act - Pratiques interdites",
    regulation: "AI Act",
    article: "5",
    priority: "critical" as const,
    indexed: true,
  };

  it("valide qu'un article est bien en top-3 quand il est au rang #1", async () => {
    // Le chunk retourné a article_number "5_§1" qui doit matcher "5"
    mockSearchLegalChunks.mockResolvedValue([
      rawChunk(AI, "5_§1", 0.55),
      rawChunk(AI, "5_§2", 0.48),
    ]);

    const result = await checkCoverageEntry(entryArt5);
    expect(result.found_in_top3).toBe(true);
    expect(result.best_rank).toBe(1);
  });

  it("détecte qu'un article critique n'est pas dans les 5 résultats retournés", async () => {
    // Mock ne retourne aucun chunk Art. 5 → best_rank = null
    mockSearchLegalChunks.mockResolvedValue([
      rawChunk(AI, "6", 0.48),
      rawChunk(AI, "9", 0.45),
      rawChunk(AI, "13", 0.42),
    ]);

    const result = await checkCoverageEntry(entryArt5);
    expect(result.found_in_top3).toBe(false);
    expect(result.best_rank).toBeNull();
  });

  it("détecte que l'article est trouvé mais pas en top-3 (rang #5)", async () => {
    // Art. 5 au rang #5 — au-delà du TOP_N=3
    mockSearchLegalChunks.mockResolvedValue([
      rawChunk(AI, "6", 0.48),
      rawChunk(AI, "9", 0.45),
      rawChunk(AI, "13", 0.42),
      rawChunk(AI, "50", 0.38),
      rawChunk(AI, "5", 0.35),   // rang #5
    ]);

    const result = await checkCoverageEntry(entryArt5);
    expect(result.found_in_top3).toBe(false);
    expect(result.best_rank).toBe(5);
    expect(result.top_chunk).not.toBeNull();
    expect(result.top_chunk!.article_number).toBe("5");
  });

  it("ne lance pas d'alerte pour les articles non encore indexés (indexed=false)", async () => {
    const entryDsa = {
      id: "dsa-16",
      query: "Article 16 du Digital Services Act DSA mécanisme de signalement",
      regulation: "DSA",
      article: "16",
      priority: "critical" as const,
      indexed: false,
    };

    const result = await checkCoverageEntry(entryDsa);
    expect(mockSearchLegalChunks).not.toHaveBeenCalled();
    expect(result.found_in_top3).toBe(false);
    expect(result.best_rank).toBeNull();
  });

  it("calcule le score de couverture 50% sur deux entrées (une trouvée, une absente)", async () => {
    // Art. 5 → trouvé ; Art. 6 → absent
    mockSearchLegalChunks
      .mockResolvedValueOnce([rawChunk(AI, "5", 0.55)])  // Art. 5 trouvé
      .mockResolvedValueOnce([rawChunk(AI, "9", 0.50)]);  // Art. 6 absent

    const [r5, r6] = await Promise.all([
      checkCoverageEntry(entryArt5),
      checkCoverageEntry({ ...entryArt5, id: "ai-6", article: "6" }),
    ]);

    const found = [r5, r6].filter((r) => r.found_in_top3).length;
    const score = found / 2;
    expect(r5.found_in_top3).toBe(true);
    expect(r6.found_in_top3).toBe(false);
    expect(score).toBe(0.5);
  });
});
