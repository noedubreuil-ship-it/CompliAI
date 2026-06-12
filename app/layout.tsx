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

export const metadata: Metadata = {
  title: "CompliAI — Conformité Réglementaire IA Européenne",
  description:
    "Auditez votre projet IA, identifiez vos obligations réglementaires (AI Act, RGPD, DSA) et générez votre roadmap de conformité en minutes.",
  keywords: ["AI Act", "RGPD", "conformité IA", "audit IA", "DSA", "DMA"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full w-full">
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
