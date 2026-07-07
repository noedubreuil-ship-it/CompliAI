import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import { DarkModeProvider } from "@/components/ui/dark-mode-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  weight: ["400", "500", "600", "700", "800"],
});

const BASE_URL = "https://www.compliai.eu";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "CompliAI — Conformité AI Act & RGPD pour les DPO et équipes juridiques",
    template: "%s — CompliAI",
  },
  description:
    "Plateforme IA pour DPO, avocats et équipes conformité. Checklist AI Act, DPIA Art.35, jurisprudence CJUE, comparateur UE-27. Conformité RGPD & AI Act en quelques minutes.",
  keywords: [
    "AI Act conformité",
    "RGPD DPO",
    "DPIA Art 35",
    "audit IA conformité",
    "checklist AI Act",
    "jurisprudence CJUE RGPD",
    "conformité IA entreprise",
    "DSA DMA",
    "logiciel DPO",
    "outil conformité réglementaire",
  ],
  authors: [{ name: "CompliAI", url: BASE_URL }],
  creator: "CompliAI",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BASE_URL,
    siteName: "CompliAI",
    title: "CompliAI — Conformité AI Act & RGPD pour les DPO",
    description:
      "Checklist AI Act, DPIA, jurisprudence CJUE, comparateur 27 États membres. L'outil de conformité IA pour les équipes juridiques européennes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CompliAI — Conformité AI Act & RGPD",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CompliAI — Conformité AI Act & RGPD",
    description: "Checklist AI Act, DPIA, jurisprudence CJUE. L'outil de conformité IA pour les DPO.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full w-full">
      <head>
        <script
          type="text/javascript"
          data-cmp-ab="1"
          src="https://cdn.consentmanager.net/delivery/autoblocking/cfe565ec0275c.js"
          data-cmp-host="c.delivery.consentmanager.net"
          data-cmp-cdn="cdn.consentmanager.net"
          data-cmp-codesrc="16"
          async
        />
      </head>
      <body
        className={`${inter.variable} ${ebGaramond.variable} font-sans min-h-full w-full overflow-x-hidden antialiased`}
        style={{
          margin: 0,
          minHeight: "100%",
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <DarkModeProvider>
          {children}
        </DarkModeProvider>
      </body>
    </html>
  );
}
