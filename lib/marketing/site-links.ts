export type FooterLink = { label: string; href: string; external?: boolean };

export const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/#fonctionnalités" },
      { label: "Tarifs", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Réglementations",
    links: [
      {
        label: "AI Act",
        href: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
        external: true,
      },
      {
        label: "RGPD",
        href: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679",
        external: true,
      },
      {
        label: "DSA",
        href: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2065",
        external: true,
      },
      {
        label: "DMA",
        href: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R1925",
        external: true,
      },
      {
        label: "Data Act",
        href: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R2854",
        external: true,
      },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
      {
        label: "EUR-Lex",
        href: "https://eur-lex.europa.eu",
        external: true,
      },
      {
        label: "CNIL",
        href: "https://www.cnil.fr",
        external: true,
      },
      {
        label: "EDPB",
        href: "https://www.edpb.europa.eu",
        external: true,
      },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/legal/mentions-legales" },
      { label: "Confidentialité", href: "/legal/privacy" },
      { label: "CGU", href: "/legal/cgu" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function loginRedirectHref(target: string): string {
  return `/auth/login?redirectTo=${encodeURIComponent(target)}`;
}

export function redirectDestinationLabel(path: string): string {
  if (path === "/dashboard" || path === "/dashboard/overview") return "Tableau de bord";
  if (path === "/dashboard/chat") return "Consultant juridique";
  if (path === "/dashboard/tools") return "Catalogue d'outils";
  if (path.startsWith("/dashboard/tools/")) {
    const slug = path.replace("/dashboard/tools/", "");
    const names: Record<string, string> = {
      checklist: "Checklist conformité",
      dpia: "DPIA Art. 35",
      jurisprudence: "Analyseur jurisprudence",
      comparateur: "Comparateur UE-27",
      classifier: "Classifieur AI Act",
      ropa: "RoPA Art. 30",
    };
    return names[slug] ?? "Outil juridique";
  }
  if (path.startsWith("/dashboard/projects")) return "Projets";
  return "Espace CompliAI";
}
