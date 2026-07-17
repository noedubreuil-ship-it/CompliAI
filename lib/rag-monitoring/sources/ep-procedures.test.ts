import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  EP_DEFAULT_WATCHLIST,
  buildProcedureDocument,
  extractActivityType,
  extractStage,
  fetchEpProcedures,
  latestActivity,
  pickLabel,
  pickProcedureTitle,
} from "./ep-procedures";
import type { FetchFn } from "../types";

const FIXTURES = join(process.cwd(), "tests/fixtures/rag_monitoring");
const rawChatControl = readFileSync(
  join(FIXTURES, "ep-procedure-2025-0429.json"),
  "utf-8"
);

/** Procédure 2025/0429(COD) — prolongation de la dérogation ePrivacy (« Chat Control 1.0 »). */
const chatControl = JSON.parse(rawChatControl).data[0];

/** fetch simulé depuis la fixture : les tests ne touchent jamais le réseau. */
function fixtureFetcher(
  body: string = rawChatControl,
  ok = true,
  status = 200
): FetchFn {
  return async () => ({ ok, status, text: async () => body });
}

describe("extraction des vocabulaires contrôlés", () => {
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

describe("pickLabel — double base juridique", () => {
  it("prend le premier libellé quand l'API renvoie un tableau", () => {
    // Cas réel : 2025/0803 expose label ET process_type sous forme de tableaux.
    expect(pickLabel(["2025/0803(CNS)", "2025/0803(NLE)"], "x")).toBe("2025/0803(CNS)");
  });
  it("accepte un libellé simple", () => {
    expect(pickLabel("2025/0429(COD)", "x")).toBe("2025/0429(COD)");
  });
  it("se replie sur la valeur par défaut", () => {
    expect(pickLabel(undefined, "2025-0429")).toBe("2025-0429");
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

describe("EP_DEFAULT_WATCHLIST", () => {
  it("suit les textes du périmètre CompliAI", () => {
    expect(EP_DEFAULT_WATCHLIST).toContain("2025-0429"); // Chat Control 1.0
    expect(EP_DEFAULT_WATCHLIST).toContain("2022-0155"); // CSAR
    expect(EP_DEFAULT_WATCHLIST).toContain("2021-0106"); // AI Act
  });
  it("n'a pas de doublon", () => {
    expect(new Set(EP_DEFAULT_WATCHLIST).size).toBe(EP_DEFAULT_WATCHLIST.length);
  });
  it("utilise le format d'identifiant de l'API (2025-0429, pas 2025/0429)", () => {
    EP_DEFAULT_WATCHLIST.forEach((id) => expect(id).toMatch(/^\d{4}-\d{4}$/));
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
    // Régression : un externalId figé sur le process_id ferait passer chaque
    // nouveau vote pour un doublon de la procédure déjà suivie.
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

  it("écarte une procédure sans événement daté", () => {
    expect(buildProcedureDocument({ ...chatControl, consists_of: [] })).toBeUndefined();
  });

  it("ne filtre plus sur la pertinence : une procédure suivie l'est par choix", () => {
    // Le titre réel ne contient aucun mot-clé thématique — il cite seulement
    // le règlement modifié. C'est précisément pourquoi le filtrage a été
    // supprimé au profit de la watchlist.
    expect(
      buildProcedureDocument({ ...chatControl, process_title: { fr: "Accord de pêche" } })
    ).toBeDefined();
  });
});

describe("fetchEpProcedures — watchlist", () => {
  it("interroge chaque procédure suivie et renvoie ses détections", async () => {
    const docs = await fetchEpProcedures({
      processIds: ["2025-0429"],
      fetcher: fixtureFetcher(),
      throttleMs: 0,
    });
    expect(docs).toHaveLength(1);
    expect(docs[0].externalId).toBe("2025-0429:2025-0429-DEC-DCPL-2026-07-09");
  });

  it("n'appelle l'API qu'une fois par procédure suivie", async () => {
    const calls: string[] = [];
    const spy: FetchFn = async (url) => {
      calls.push(url);
      return { ok: true, status: 200, text: async () => rawChatControl };
    };
    await fetchEpProcedures({
      processIds: ["2025-0429", "2021-0106"],
      fetcher: spy,
      throttleMs: 0,
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("/procedures/2025-0429");
    expect(calls[1]).toContain("/procedures/2021-0106");
  });

  it("une procédure en erreur ne fait pas échouer le run entier", async () => {
    let first = true;
    const flaky: FetchFn = async () => {
      if (first) {
        first = false;
        return { ok: false, status: 500, text: async () => "" };
      }
      return { ok: true, status: 200, text: async () => rawChatControl };
    };
    const docs = await fetchEpProcedures({
      processIds: ["cassee", "a", "b", "c"],
      fetcher: flaky,
      throttleMs: 0,
    });
    expect(docs).toHaveLength(3);
  });

  it("compte un corps vide (HTTP 204 observé) comme un échec, pas comme un silence", async () => {
    // Sous le seuil : toléré, mais comptabilisé.
    let n = 0;
    const oneEmpty: FetchFn = async () => {
      n++;
      return n === 1
        ? { ok: true, status: 204, text: async () => "" }
        : { ok: true, status: 200, text: async () => rawChatControl };
    };
    const docs = await fetchEpProcedures({
      processIds: ["a", "b", "c", "d"],
      fetcher: oneEmpty,
      throttleMs: 0,
    });
    expect(docs).toHaveLength(3);
  });

  it("jette si toute la watchlist renvoie un corps non JSON", async () => {
    await expect(
      fetchEpProcedures({
        processIds: ["a", "b"],
        fetcher: fixtureFetcher("<html>error</html>"),
        throttleMs: 0,
      })
    ).rejects.toThrow(/inaccessibles/);
  });
});

describe("erreurs silencieuses — régression du 2026-07-17", () => {
  it("jette quand la majorité de la watchlist est inaccessible", async () => {
    // Un run rate-limité renvoyait « ok, 3/13 trouvées » : la veille se taisait
    // au lieu de signaler qu'elle était aveugle.
    const down: FetchFn = async () => ({ ok: false, status: 429, text: async () => "" });
    await expect(
      fetchEpProcedures({ processIds: ["a", "b", "c", "d"], fetcher: down, throttleMs: 0 })
    ).rejects.toThrow(/inaccessibles/);
  });

  it("tolère un échec isolé sous le seuil", async () => {
    let n = 0;
    const flaky: FetchFn = async () => {
      n++;
      return n === 1
        ? { ok: false, status: 500, text: async () => "" }
        : { ok: true, status: 200, text: async () => rawChatControl };
    };
    const docs = await fetchEpProcedures({
      processIds: ["a", "b", "c", "d"],
      fetcher: flaky,
      throttleMs: 0,
    });
    expect(docs).toHaveLength(3);
  });
});
