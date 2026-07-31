import { describe, it, expect } from "vitest";
import { classifyProviderError } from "./provider-error";

const RAW_ANTHROPIC_CREDIT =
  '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}';

describe("classifyProviderError", () => {
  it("ne renvoie jamais le message brut du fournisseur à l'utilisateur", () => {
    const { userMessage } = classifyProviderError(RAW_ANTHROPIC_CREDIT);
    expect(userMessage).not.toContain("credit balance");
    expect(userMessage).not.toContain("Anthropic");
    expect(userMessage).not.toContain("400");
  });

  it("détecte un crédit épuisé comme cause exploitant", () => {
    const c = classifyProviderError(RAW_ANTHROPIC_CREDIT);
    expect(c.kind).toBe("credit_exhausted");
    expect(c.operational).toBe(true);
  });

  it("classe un 429 en rate_limited non-exploitant", () => {
    const c = classifyProviderError("Request failed 429 rate_limit_error");
    expect(c.kind).toBe("rate_limited");
    expect(c.operational).toBe(false);
  });

  it("classe la surcharge (529 / overloaded)", () => {
    expect(classifyProviderError("529 overloaded_error").kind).toBe("overloaded");
  });

  it("classe les timeouts", () => {
    expect(classifyProviderError("socket ETIMEDOUT").kind).toBe("timeout");
  });

  it("retombe sur un message générique pour l'inconnu", () => {
    const c = classifyProviderError("something weird happened");
    expect(c.kind).toBe("unknown");
    expect(c.userMessage.length).toBeGreaterThan(0);
  });

  it("gère une entrée vide sans planter", () => {
    expect(classifyProviderError(undefined).kind).toBe("unknown");
  });
});
