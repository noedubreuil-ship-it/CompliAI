import { describe, expect, it } from "vitest";
import {
  filterOffTopicSources,
  filtrerSourcesHorsSujet,
  isQuestionAbout,
  legalChunkAccessor,
  type FilterableSource,
} from "./source-filter";

const SRC_GPAI: FilterableSource = {
  title: "Code de bonnes pratiques GPAI",
  content: "Article 56, paragraphe 9, du Règlement (UE) 2024/1689 — engagements des fournisseurs de modèles d'IA à usage général.",
};

const SRC_RGPD: FilterableSource = {
  title: "RGPD — Article 9",
  content: "Traitement portant sur des catégories particulières de données à caractère personnel, notamment biométriques.",
};

const SRC_NIS2: FilterableSource = {
  title: "NIS2 — mesures de cybersécurité",
  content: "Article 21 de la Directive (UE) 2022/2555.",
};

describe("isQuestionAbout('gpai')", () => {
  it("détecte une question GPAI explicite", () => {
    expect(isQuestionAbout("gpai", "Quelles obligations pour un fournisseur GPAI ?")).toBe(true);
  });

  it("détecte une mention de Claude / GPT", () => {
    expect(isQuestionAbout("gpai", "Si j'utilise Claude pour rédiger mes contrats")).toBe(true);
    expect(isQuestionAbout("gpai", "Différence entre GPT-4 et Gemini")).toBe(true);
  });

  it("ne détecte pas une question RGPD biométrie", () => {
    expect(
      isQuestionAbout(
        "gpai",
        "Quelles sont les obligations pour un système de reconnaissance faciale en entreprise ?"
      )
    ).toBe(false);
  });

  it("renvoie false pour un axe inconnu", () => {
    expect(isQuestionAbout("inexistant", "n'importe quoi")).toBe(false);
  });
});

describe("filterOffTopicSources — axe GPAI", () => {
  it("retire les sources GPAI sur une question RGPD biométrie", () => {
    const filtered = filterOffTopicSources(
      [SRC_GPAI, SRC_RGPD, SRC_NIS2],
      "Mon entreprise utilise la reconnaissance faciale au travail — RGPD ?"
    );
    expect(filtered).toEqual([SRC_RGPD, SRC_NIS2]);
  });

  it("conserve les sources GPAI quand la question parle de Claude", () => {
    const filtered = filterOffTopicSources(
      [SRC_GPAI, SRC_RGPD],
      "Quelles obligations transparence pour Claude en tant que GPAI ?"
    );
    expect(filtered).toEqual([SRC_GPAI, SRC_RGPD]);
  });

  it("conserve toutes les sources si aucune n'est hors-sujet", () => {
    const filtered = filterOffTopicSources([SRC_RGPD, SRC_NIS2], "Article 9 RGPD ?");
    expect(filtered).toEqual([SRC_RGPD, SRC_NIS2]);
  });

  it("retourne un tableau vide pour une entrée vide", () => {
    expect(filterOffTopicSources([], "n'importe quelle question")).toEqual([]);
  });
});

describe("legalChunkAccessor", () => {
  it("expose title + content sous forme filtrable", () => {
    const chunk = {
      regulation: "AI Act",
      article_title: "Art. 56",
      content: "Code de bonnes pratiques GPAI",
    };
    const v = legalChunkAccessor(chunk);
    expect(v.title).toMatch(/AI Act/);
    expect(v.title).toMatch(/Art\. 56/);
    expect(v.content).toMatch(/GPAI/);
  });

  it("filtre un chunk GPAI sur une question RGPD via l'accesseur", () => {
    const chunks = [
      { regulation: "AI Act", article_title: "Art. 56", content: "Code de bonnes pratiques GPAI" },
      { regulation: "RGPD", article_title: "Art. 9", content: "Données biométriques." },
    ];
    const filtered = filterOffTopicSources(chunks, "Reconnaissance faciale et RGPD", legalChunkAccessor);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].regulation).toBe("RGPD");
  });
});

describe("filtrerSourcesHorsSujet — citations juridiques (UX chat)", () => {
  const citeGpai = {
    regulation: "AI Act — article 56, paragraphe 9",
    article_number: "56 § 9",
    article_title: "Pratiques GPAI",
    excerpt: "Code de bonnes pratiques GPAI — engagements des fournisseurs de modèles d'IA à usage général.",
    eurlex_url: "",
  };
  const citeRgpd = {
    regulation: "RGPD — article 9",
    article_number: "9",
    article_title: "Catégories particulières",
    excerpt: "Traitement biométrique en entreprise.",
    eurlex_url: "",
  };

  it("retire une citation GPAI sur une question biométrie / RGPD", () => {
    const out = filtrerSourcesHorsSujet(
      [citeGpai, citeRgpd],
      "Reconnaissance faciale au travail — obligations RGPD ?"
    );
    expect(out).toEqual([citeRgpd]);
  });

  it("conserve la citation GPAI si la question active l'axe", () => {
    const out = filtrerSourcesHorsSujet(
      [citeGpai, citeRgpd],
      "Mes obligations Claude / GPAI sous l'article 56 ?"
    );
    expect(out).toEqual([citeGpai, citeRgpd]);
  });
});
