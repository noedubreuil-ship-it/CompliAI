import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
