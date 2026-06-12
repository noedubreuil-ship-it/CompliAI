import { describe, expect, it } from "vitest";
import { isNationalFetchHostnameAllowed } from "@/lib/ai/national-fetch-allowlist";

describe("isNationalFetchHostnameAllowed", () => {
  it("autorise legifrance pour la France", () => {
    expect(isNationalFetchHostnameAllowed("www.legifrance.gouv.fr", "FR")).toBe(true);
    expect(isNationalFetchHostnameAllowed("legifrance.gouv.fr", "FR")).toBe(true);
  });

  it("refuse un domaine non listé pour le pays", () => {
    expect(isNationalFetchHostnameAllowed("evil.example.com", "FR")).toBe(false);
  });

  it("refuse Legifrance si le pays réclamé est l’Allemagne", () => {
    expect(isNationalFetchHostnameAllowed("legifrance.gouv.fr", "DE")).toBe(false);
  });

  it("autorise le site de l’ULD Hambourg pour l’Allemagne", () => {
    expect(isNationalFetchHostnameAllowed("datenschutz-hamburg.de", "DE")).toBe(true);
  });

  it("autorise EUR-Lex et CURIA pour le code réservé EU (corpus CJUE)", () => {
    expect(isNationalFetchHostnameAllowed("eur-lex.europa.eu", "EU")).toBe(true);
    expect(isNationalFetchHostnameAllowed("curia.europa.eu", "EU")).toBe(true);
  });

  it("refuse un domaine hors institutions UE pour le code EU", () => {
    expect(isNationalFetchHostnameAllowed("legifrance.gouv.fr", "EU")).toBe(false);
  });
});
