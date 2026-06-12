import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockGetUser = vi.fn();
const mockRateLimitUser = vi.fn();
const mockGetCreditBalance = vi.fn();
const mockPreflightCheck = vi.fn();
const mockAssertPro = vi.fn();
const mockBuildNationalRag = vi.fn();
const mockGenerateDocument = vi.fn();
const mockGenerateComparateur = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitUser: (...args: unknown[]) => mockRateLimitUser(...args),
  RATE_LIMITS: {
    generate: { max: 10, windowMs: 60_000 },
    pdf: { max: 20, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/credits", () => ({
  getCreditBalance: (...args: unknown[]) => mockGetCreditBalance(...args),
  preflightCheck: (...args: unknown[]) => mockPreflightCheck(...args),
}));

vi.mock("@/lib/subscription/pro-access", () => ({
  assertProSubscription: (...args: unknown[]) => mockAssertPro(...args),
}));

vi.mock("@/lib/ai/national-rag-for-tools", () => ({
  buildNationalRagContextForTool: (...args: unknown[]) => mockBuildNationalRag(...args),
  appendNationalRagToUserPrompt: (prompt: string, ctx: string) => `${prompt}\n\n${ctx}`,
  getEu27CountryCodesForToolRag: () => ["FR", "DE"],
}));

vi.mock("@/lib/ai/generators", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/generators")>();
  return {
    ...actual,
    generateDocument: (...args: unknown[]) => mockGenerateDocument(...args),
    generateComparateurLegislationsDocument: (...args: unknown[]) => mockGenerateComparateur(...args),
    extractJson: (raw: string) => JSON.parse(raw) as unknown,
  };
});

function passAuthMocks() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-pro" } } });
  mockAssertPro.mockResolvedValue(null);
  mockRateLimitUser.mockResolvedValue(null);
  mockGetCreditBalance.mockResolvedValue({ plan: "pro" });
  mockPreflightCheck.mockResolvedValue(null);
}

describe("routes /api/generate/*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockRateLimitUser.mockResolvedValue(null);
    mockGetCreditBalance.mockResolvedValue({ plan: "free" });
    mockPreflightCheck.mockResolvedValue(null);
    mockBuildNationalRag.mockResolvedValue({
      context: "## Corpus indexé (test)",
      countryCodes: ["FR"],
      statuteHits: 2,
      nationalCaseLawHits: 1,
    });
    mockGenerateDocument.mockResolvedValue('{"titre":"Mémoire test"}');
    mockGenerateComparateur.mockResolvedValue(
      JSON.stringify({
        mode: "bilateral",
        synthese: "Synthèse test",
        tableau: [],
        points_convergence: [],
        points_divergence: [],
        implications_pratiques: "—",
        sources: [],
      }),
    );
  });

  it("authenticateForGenerate({ requirePro: true }) renvoie 403 pour un utilisateur free", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-free" } } });
    mockAssertPro.mockResolvedValue(
      NextResponse.json(
        { error: "Abonnement Pro requis pour cet outil.", code: "pro_required" },
        { status: 403 },
      ),
    );

    const { authenticateForGenerate } = await import("./generate-route");
    const result = await authenticateForGenerate({ requirePro: true });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = (await result.response.json()) as { code?: string };
      expect(body.code).toBe("pro_required");
    }
  });

  it("export-pdf renvoie 401 sans session", async () => {
    const { POST } = await import("@/app/api/generate/export-pdf/route");
    const res = await POST(
      new Request("http://localhost/api/generate/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test", sections: [{ heading: "A", body: "B" }] }),
      }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("memoire-conformite appelle buildNationalRagContextForTool", async () => {
    passAuthMocks();

    const { POST } = await import("@/app/api/generate/memoire-conformite/route");
    const res = await POST(
      new Request("http://localhost/api/generate/memoire-conformite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: "Déploiement LLM RH", contexte: "France" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockBuildNationalRag).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("Déploiement LLM RH"),
        includeEuCaseLaw: true,
      }),
    );
  });

  it("comparateur appelle buildNationalRagContextForTool", async () => {
    passAuthMocks();

    const { POST } = await import("@/app/api/generate/comparateur/route");
    const res = await POST(
      new Request("http://localhost/api/generate/comparateur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bilateral", country1: "FR", country2: "DE", focus: "rgpd" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(mockBuildNationalRag).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCodes: ["FR", "DE"],
        includeEuCaseLaw: true,
      }),
    );
  });
});
