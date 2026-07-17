import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildProcedureDocument,
  extractActivityType,
  extractProcessType,
  extractStage,
  isEpProcedureRelevant,
  latestActivity,
  pickProcedureTitle,
} from "./ep-procedures";

const FIXTURES = join(process.cwd(), "tests/fixtures/rag_monitoring");

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf-8"));
}

/** Procédure 2025/0429(COD) — prolongation de la dérogation ePrivacy (« Chat Control 1.0 »). */
const chatControl = loadFixture("ep-procedure-2025-0429.json").data[0];

describe("extraction des vocabulaires contrôlés", () => {
  it("extrait le type de procédure", () => {
    expect(extractProcessType("def/ep-procedure-types/COD")).toBe("COD");
  });
  it("extrait le type d'activité", () => {
    expect(extractActivityType("def/ep-activities/PLENARY_VOTE")).toBe("PLENARY_VOTE");
  });
  it("extrait le stade depuis une URI publications.europa.eu", () => {
    expect(
      extractStage("http://publications.europa.eu/resource/authority/procedure-phase/RDG2")
    ).toBe("RDG2");
  });
  it("ne jette pas sur une valeur absente", () => {
    expect(extractStage(undefined)).toBe("");
  });
});

describe("pickProcedureTitle", () => {
  it("préfère le français", () => {
    expect(pickProcedureTitle({ en: "Extension", fr: "Prolongation" })).toEqual({
      text: "Prolongation",
      language: "fr",
    });
  });
  it("se replie sur l'anglais faute de français", () => {
    expect(pickProcedureTitle({ en: "Extension", sk: "Zmena" })).toEqual({
      text: "Extension",
      language: "en",
    });
  });
  it("se replie sur la première langue disponible", () => {
    expect(pickProcedureTitle({ sk: "Zmena" })).toEqual({ text: "Zmena", language: "sk" });
  });
});

describe("isEpProcedureRelevant", () => {
  it("retient la procédure Chat Control (fixture réelle)", () => {
    // Son titre ne contient aucun mot-clé thématique : elle n'est retenue que
    // parce qu'elle cite le règlement 2021/1232. Régression à ne pas perdre.
    expect(isEpProcedureRelevant(chatControl.process_title)).toBe(true);
  });

  it("retient un acte modificatif citant un règlement suivi", () => {
    expect(
      isEpProcedureRelevant({ fr: "Modification du règlement (UE) 2024/1689 en ce qui concerne les délais" })
    ).toBe(true);
  });

  it("retient une procédure thématique sans numéro d'acte", () => {
    expect(
      isEpProcedureRelevant({ fr: "Règles harmonisées sur l'intelligence artificielle" })
    ).toBe(true);
  });
  it("écarte une procédure hors périmètre", () => {
    expect(
      isEpProcedureRelevant({ fr: "Accord de pêche avec les Seychelles", en: "Fisheries agreement" })
    ).toBe(false);
  });
  it("écarte un titre absent", () => {
    expect(isEpProcedureRelevant(undefined)).toBe(false);
  });
});

describe("latestActivity", () => {
  it("retient l'événement le plus récent de la fixture", () => {
    expect(latestActivity(chatControl.consists_of)?.activity_date).toBe("2026-07-09");
  });
  it("ignore les événements sans date", () => {
    expect(
      latestActivity([{ activity_id: "x" }, { activity_id: "y", activity_date: "2026-01-01" }])
        ?.activity_id
    ).toBe("y");
  });
  it("renvoie undefined sans événement daté", () => {
    expect(latestActivity([])).toBeUndefined();
  });
});

describe("buildProcedureDocument — cas Chat Control du 2026-07-09", () => {
  const doc = buildProcedureDocument(chatControl);

  it("détecte la procédure", () => {
    expect(doc).toBeDefined();
  });

  it("porte le type de veille, jamais ingéré dans legal_chunks", () => {
    expect(doc?.documentType).toBe("legislative_procedure");
  });

  it("ancre l'externalId sur le dernier événement, pas sur la seule procédure", () => {
    // Régression : un externalId figé sur le process_id aurait fait passer le
    // vote du 9 juillet pour un doublon de la procédure déjà connue.
    expect(doc?.externalId).toBe("2025-0429:2025-0429-DEC-DCPL-2026-07-09");
  });

  it("date la détection au dernier événement", () => {
    expect(doc?.publicationDate?.toISOString().slice(0, 10)).toBe("2026-07-09");
  });

  it("affiche le stade et le type d'événement dans le titre", () => {
    expect(doc?.title).toContain("2025/0429(COD)");
    expect(doc?.title).toContain("RDG2");
    expect(doc?.title).toContain("PLENARY_AMEND_COUNCIL_POSITION");
  });

  it("pointe vers la fiche de procédure OEIL", () => {
    expect(doc?.sourceUrl).toContain("2025%2F0429(COD)");
  });

  it("est rattaché à l'UE", () => {
    expect(doc?.country).toBe("EU");
  });

  it("écarte une procédure hors périmètre", () => {
    expect(
      buildProcedureDocument({ ...chatControl, process_title: { fr: "Accord de pêche" } })
    ).toBeUndefined();
  });

  it("écarte une procédure sans événement daté", () => {
    expect(buildProcedureDocument({ ...chatControl, consists_of: [] })).toBeUndefined();
  });
});

describe("fixture liste", () => {
  it("expose des procédures typées exploitables", () => {
    const list = loadFixture("ep-procedures-list-2026.json").data;
    expect(list.length).toBeGreaterThan(0);
    expect(extractProcessType(list[0].process_type)).toMatch(/^[A-Z]+$/);
  });
});
