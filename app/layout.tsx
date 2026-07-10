import type { ReactNode } from "react";

/**
 * Layout racine minimal. Le rendu <html>/<body>, les providers et l'i18n sont
 * gérés par app/[locale]/layout.tsx (routing next-intl). Ce layout ne fait que
 * transmettre les enfants pour satisfaire l'exigence Next d'un layout racine.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
