import Link from "next/link";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#003399] flex items-center justify-center mb-6">
        <Shield className="h-6 w-6 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Page introuvable</h1>
      <p className="text-sm text-[#6E6E73] mt-2 max-w-md">
        Cette adresse n&apos;existe pas ou a été déplacée. Les outils juridiques sont accessibles depuis votre espace
        après connexion.
      </p>
      <div className="flex flex-wrap gap-3 mt-8 justify-center">
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="outline">Se connecter</Button>
        </Link>
        <Link href="/dashboard/tools">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Catalogue outils
          </Button>
        </Link>
      </div>
      <p className="text-xs text-[#6E6E73] mt-10">
        Besoin d&apos;aide ? <Link href="/contact" className="underline hover:text-[#1D1D1F]">Contact</Link>
      </p>
    </div>
  );
}
