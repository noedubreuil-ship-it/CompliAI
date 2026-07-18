import { describe, it, expect } from "vitest";
import { detectBlockedPage } from "./pipeline";

/** Document réel plausible : assez de texte utile pour être exploitable. */
const VRAI_DOCUMENT = `<html><body><article>
${"La Commission européenne publie des lignes directrices sur la classification des systèmes d'intelligence artificielle à haut risque au sens de l'article 6 du règlement (UE) 2024/1689. ".repeat(4)}
</article></body></html>`;

describe("detectBlockedPage — garde-fou avant l'appel Claude", () => {
  it("laisse passer un document réel", () => {
    expect(detectBlockedPage(VRAI_DOCUMENT)).toBeNull();
  });

  it("rejette une page de vérification anti-bot", () => {
    // Régression du 2026-07-18 : une publication « AI Office » redirigeait vers
    // f6s.com, dont la page anti-bot a été parsée par Claude — ~30 000 tokens
    // dépensés pour s'entendre répondre « ceci est une page anti-bot ».
    const page = `<html><head><title>Just a moment...</title></head>
      <body>Checking your browser before accessing f6s.com</body></html>`;
    expect(detectBlockedPage(page)).toMatch(/page de blocage/);
  });

  it("rejette un captcha", () => {
    expect(
      detectBlockedPage(`<html><body><div class="g-recaptcha">reCAPTCHA</div></body></html>`)
    ).toMatch(/page de blocage/);
  });

  it("rejette un mur de connexion", () => {
    expect(
      detectBlockedPage(`<html><body><h1>Sign in to continue</h1></body></html>`)
    ).toMatch(/page de blocage/);
  });

  it("rejette une page sans contenu utile, même volumineuse en balisage", () => {
    // Beaucoup d'octets, presque pas de texte : typique d'une coquille SPA.
    const coquille = `<html><head>${"<script>var x=1;</script>".repeat(200)}</head><body><div id="root"></div></body></html>`;
    expect(detectBlockedPage(coquille)).toMatch(/contenu utile insuffisant/);
  });

  it("ne se laisse pas berner par du JavaScript volumineux autour d'un vrai texte", () => {
    const avecScripts = `<html><head>${"<script>var a=1;</script>".repeat(100)}</head>
      <body>${VRAI_DOCUMENT}</body></html>`;
    expect(detectBlockedPage(avecScripts)).toBeNull();
  });
});
