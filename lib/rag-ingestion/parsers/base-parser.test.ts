/**
 * Tests du parser de base (base-parser.ts).
 *
 * Tous les appels Claude sont mockés via vi.mock — aucun appel API réel.
 *
 * Couvre :
 * - Parsing JSON correct de la réponse Claude
 * - Tolérance au JSON enveloppé dans des backticks markdown
 * - Construction correcte des StagingChunkInsert
 * - Gestion des erreurs Claude (API error, réponse non-JSON, JSON invalide)
 * - Hash de chunks corrects (SHA-256)
 * - Propagation du promptHash dans le résultat
 * - Mapping document_type → text_type
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: vi.fn() },
    })),
  };
});

import Anthropic from "@anthropic-ai/sdk";
import { parseDocumentWithClaude, _setAnthropicClientForTesting, _resetAnthropicClient } from "./base-parser";
import type { ParserInput } from "./types";

const mockCreate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockReset();
  // Injecter un faux client Anthropic. Le parser est passé au STREAMING
  // (client.messages.stream(...).finalMessage()) le 2026-07-18. On câble donc
  // `stream` pour réutiliser le même mock `create` : il renvoie un objet dont
  // `finalMessage()` résout la valeur simulée. Les mockResolvedValueOnce des
  // tests continuent de piloter la réponse sans changement.
  const fakeClient = {
    messages: {
      create: mockCreate,
      stream: (...args: unknown[]) => {
        const result = mockCreate(...args);
        return { finalMessage: () => result };
      },
    },
  } as unknown as Anthropic;
  _setAnthropicClientForTesting(fakeClient);
});

const SAMPLE_INPUT: ParserInput = {
  documentId: "doc-test-uuid-1",
  documentType: "eu_regulation",
  documentText: "Article premier — Le présent règlement établit des règles harmonisées concernant l'IA.",
  sourceUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689",
  publicationDate: "2024-07-12",
  language: "fr",
  country: "EU",
};

const VALID_CLAUDE_RESPONSE = {
  regulation: "Règlement (UE) 2024/1689",
  celex: "32024R1689",
  publication_date: "2024-07-12",
  chunks: [
    {
      article_number: "1",
      paragraph_number: null,
      point_letter: null,
      article_title: "Objet",
      chapter: "CHAPITRE I",
      content: "Le présent règlement établit des règles harmonisées concernant l'intelligence artificielle.",
    },
    {
      article_number: "2",
      paragraph_number: "1",
      point_letter: "a",
      article_title: "Champ d'application",
      chapter: "CHAPITRE I",
      content: "Le présent règlement s'applique aux fournisseurs qui mettent sur le marché des systèmes d'IA dans l'Union.",
    },
  ],
};

function makeAnthropicResponse(jsonContent: string, inputTokens = 1000, outputTokens = 500) {
  return {
    content: [{ type: "text", text: jsonContent }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

describe("parseDocumentWithClaude", () => {
  // ─── Cas nominal ──────────────────────────────────────────────────────────

  it("parse correctement une réponse JSON valide de Claude", async () => {
    mockCreate.mockResolvedValueOnce(
      makeAnthropicResponse(JSON.stringify(VALID_CLAUDE_RESPONSE), 1200, 400)
    );

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0].regulation).toBe("Règlement (UE) 2024/1689");
    expect(result.chunks[0].article_number).toBe("1");
    expect(result.chunks[0].text_type).toBe("reglement_ue");
    expect(result.chunks[0].document_id).toBe("doc-test-uuid-1");
    expect(result.chunks[0].language).toBe("fr");
    expect(result.usage.inputTokens).toBe(1200);
    expect(result.usage.outputTokens).toBe(400);
  });

  it("tolère une réponse JSON enveloppée dans ```json ... ```", async () => {
    const wrappedJson = `\`\`\`json\n${JSON.stringify(VALID_CLAUDE_RESPONSE)}\n\`\`\``;
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(wrappedJson));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks).toHaveLength(2);
  });

  it("tolère une réponse JSON enveloppée dans ``` ... ``` (sans 'json')", async () => {
    const wrappedJson = `\`\`\`\n${JSON.stringify(VALID_CLAUDE_RESPONSE)}\n\`\`\``;
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(wrappedJson));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks).toHaveLength(2);
  });

  // ─── Calcul des hashes ────────────────────────────────────────────────────

  it("calcule un chunk_hash SHA-256 pour chaque chunk", async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(VALID_CLAUDE_RESPONSE)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const chunk of result.chunks) {
      const expectedHash = createHash("sha256").update(chunk.content.trim()).digest("hex");
      expect(chunk.chunk_hash).toBe(expectedHash);
    }
  });

  it("retourne des chunk_hash différents pour des contenus différents", async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(VALID_CLAUDE_RESPONSE)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const hashes = result.chunks.map((c) => c.chunk_hash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(hashes.length);
  });

  // ─── Mapping document_type → text_type ───────────────────────────────────

  it("mappe eu_regulation → reglement_ue", async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(VALID_CLAUDE_RESPONSE)));
    const result = await parseDocumentWithClaude({ ...SAMPLE_INPUT, documentType: "eu_regulation" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks[0].text_type).toBe("reglement_ue");
    expect(result.chunks[0].source_type).toBe("eu_regulation");
  });

  it("mappe cjeu_judgment → jurisprudence_cjue", async () => {
    const judgmentResponse = {
      ...VALID_CLAUDE_RESPONSE,
      regulation: "ECLI:EU:C:2023:672",
      ecli: "ECLI:EU:C:2023:672",
    };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(judgmentResponse)));
    const result = await parseDocumentWithClaude({ ...SAMPLE_INPUT, documentType: "cjeu_judgment" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks[0].text_type).toBe("jurisprudence_cjue");
  });

  it("mappe national_decision → decision_autorite_nationale", async () => {
    const decisionResponse = {
      ...VALID_CLAUDE_RESPONSE,
      regulation: "CNIL — SAN-2024-009",
      language: "fr",
      country: "FR",
    };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(decisionResponse)));
    const result = await parseDocumentWithClaude({ ...SAMPLE_INPUT, documentType: "national_decision" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks[0].text_type).toBe("decision_autorite_nationale");
    expect(result.chunks[0].country).toBe("FR");
    expect(result.chunks[0].language).toBe("fr");
  });

  // ─── Propagation du promptHash ────────────────────────────────────────────

  it("inclut le promptHash (SHA-256 du fichier prompt) dans le résultat", async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(VALID_CLAUDE_RESPONSE)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.promptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  // ─── Gestion des erreurs ─────────────────────────────────────────────────

  it("retourne une erreur si l'API Anthropic échoue", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Erreur API Anthropic");
    expect(result.error).toContain("Network error");
  });

  it("retourne une erreur si la réponse n'est pas du JSON valide", async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse("Ceci n'est pas du JSON valide."));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Parsing JSON");
  });

  it("retourne une erreur si le champ 'chunks' est absent", async () => {
    const invalidResponse = { regulation: "Test", celex: null };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(invalidResponse)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("chunks");
  });

  it("retourne une erreur si le champ 'chunks' est un tableau vide", async () => {
    const emptyChunksResponse = { regulation: "Test", celex: null, chunks: [] };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(emptyChunksResponse)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("chunks");
  });

  it("retourne une erreur si le champ 'regulation' est absent", async () => {
    const noRegulation = { celex: "32024R1689", chunks: [{ content: "test", article_number: "1" }] };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(noRegulation)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(false);
  });

  it("retourne une erreur si Claude ne retourne pas de bloc texte", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "image", source: {} }],
      usage: { input_tokens: 100, output_tokens: 0 },
    });

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("bloc texte");
  });

  // ─── Métadonnées enrichies ────────────────────────────────────────────────

  it("utilise la publication_date du document si Claude ne la retourne pas", async () => {
    const responseWithoutDate = { ...VALID_CLAUDE_RESPONSE, publication_date: null };
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(responseWithoutDate)));

    const result = await parseDocumentWithClaude({ ...SAMPLE_INPUT, publicationDate: "2024-01-15" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks[0].publication_date).toBe("2024-01-15");
  });

  it("utilise source_url dans tous les chunks", async () => {
    mockCreate.mockResolvedValueOnce(makeAnthropicResponse(JSON.stringify(VALID_CLAUDE_RESPONSE)));

    const result = await parseDocumentWithClaude(SAMPLE_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const chunk of result.chunks) {
      expect(chunk.source_url).toBe(SAMPLE_INPUT.sourceUrl);
    }
  });
});
