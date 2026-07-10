import { defineRouting } from "next-intl/routing";

/**
 * Routing i18n CompliAI.
 * - `fr` : langue par défaut, SANS préfixe d'URL (les URLs de prod restent inchangées).
 * - `en` : servie sous /en.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeCookie: {
    name: "COMPLIAI_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];
