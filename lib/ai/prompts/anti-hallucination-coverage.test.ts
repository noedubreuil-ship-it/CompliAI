import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Audit de couverture anti-hallucination (Axe 1) — garde-fou de régression.
 *
 * Chaque prompt d'outil doit, pour éviter les citations inventées, SOIT porter
 * sa propre section anti-hallucination, SOIT être couvert par le prompt partagé
 * `generateDocument` (« tu ne fabriques ni article ni jurisprudence ») plus la
 * vérification programmatique `verifyGeneratedDocument`.
 *
 * Ce test fige l'état connu : il échoue si un NOUVEAU prompt arrive sans clause
 * et hors de l'allowlist, forçant une décision consciente. Il ne prétend pas que
 * les outils sans clause propre sont défectueux — il rend la couverture visible.
 */

const DATA_DIR = path.join(__dirname, "data");

const CLAUSE_RE = /anti-hallucination|n'invente|ne fabrique|à vérifier|sans inventer|ne cite.*que si/i;

// Prompts dont l'anti-hallucination vient du wrapper code (generateDocument) ou
// d'un protocole injecté (jurisprudence), pas du .md lui-même.
const COVERED_BY_WRAPPER = new Set([
  "explication-article-user-v1.md",
  "investor-report-user-v1.md",
  "memoire-conformite-user-v1.md",
  "plan-memoire-user-v1.md",
  "jurisprudence-eu-commentaire-addendum-v2.md",
  "recherche-jurisprudentielle-eu-v1.md",
]);

// Outils pédagogiques (quiz/cas pratique) : risque juridique moindre, pas de
// citation d'arrêt opposable. Gap documenté, à traiter si on durcit le volet formation.
const PEDAGOGICAL_GAP = new Set([
  "quiz-eu-etudiants-v1.md",
  "simulateur-cas-pratique-v1.md",
]);

// Outils Pro à clause propre manquante — à combler en priorité (chantier dédié).
const PRO_GAP_TO_FIX = new Set([
  "generateur-clauses-ia-v1.md",
  "third-party-contract-analysis-v1.md",
]);

describe("couverture anti-hallucination des prompts d'outils", () => {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".md"));

  it("tout prompt est soit à clause propre, soit explicitement classé", () => {
    const uncategorized: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(path.join(DATA_DIR, f), "utf-8");
      const hasOwnClause = CLAUSE_RE.test(content);
      const classified =
        hasOwnClause ||
        COVERED_BY_WRAPPER.has(f) ||
        PEDAGOGICAL_GAP.has(f) ||
        PRO_GAP_TO_FIX.has(f);
      if (!classified) uncategorized.push(f);
    }
    // Un nouveau prompt sans clause et non classé fait échouer le test → décision consciente.
    expect(uncategorized).toEqual([]);
  });

  it("documente les gaps Pro à combler en priorité", () => {
    for (const f of PRO_GAP_TO_FIX) {
      const content = fs.readFileSync(path.join(DATA_DIR, f), "utf-8");
      // Constat : ces prompts n'ont pas encore de clause propre. Quand on en
      // ajoute une, on les retire de PRO_GAP_TO_FIX (le test suivant le rappelle).
      expect(CLAUSE_RE.test(content)).toBe(false);
    }
  });
});
