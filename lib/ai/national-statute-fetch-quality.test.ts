import { describe, expect, it } from "vitest";

import { statutePlaintextMatchesRegistry } from "./national-statute-fetch-quality";

describe("statutePlaintextMatchesRegistry", () => {
  it("accepte un texte contenant la référence officielle", () => {
    const body =
      "Tietosuojalaki 1050/2018 — laki yksityisyyden suojasta ja henkilötietojen käsittelystä. 6 § Käsittelyn oikeusperusta.";
    expect(
      statutePlaintextMatchesRegistry(
        { title: "Tietosuojalaki", reference: "1050/2018", year: 2018 },
        body
      )
    ).toBe(true);
  });

  it("rejette une page d'accueil générique", () => {
    const body =
      "Finlex — Ajantasainen lainsäädäntö. Selaa lakeja. Etusivu. Kirjaudu sisään. Uutiset ja palvelut.";
    expect(
      statutePlaintextMatchesRegistry(
        { title: "Tietosuojalaki", reference: "1050/2018", year: 2018 },
        body
      )
    ).toBe(false);
  });

  it("accepte la LIL par mots-clés du titre", () => {
    const body =
      "Loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés. Article 35 — sous-traitant.";
    expect(
      statutePlaintextMatchesRegistry(
        {
          title: "Loi Informatique et Libertés",
          reference: "78-17",
          year: 1978,
        },
        body
      )
    ).toBe(true);
  });
});
