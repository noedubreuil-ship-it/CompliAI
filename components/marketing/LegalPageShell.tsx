import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { MarketingSiteFooter } from "./MarketingSiteFooter";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-[#1D1D1F]">
          <Shield className="h-5 w-5 text-[#003399]" />
          CompliAI
        </Link>
      </nav>
      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 prose prose-slate w-full">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 no-underline not-prose"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
        <h1>{title}</h1>
        {children}
      </main>
      <MarketingSiteFooter variant="compact" />
    </div>
  );
}
