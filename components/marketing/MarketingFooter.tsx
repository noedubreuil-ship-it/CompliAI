import Link from "next/link";
import { Shield } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-slate-50 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <Shield className="h-5 w-5" />
            CompliAI
          </Link>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Conformité RGPD, AI Act et droit européen du numérique pour les équipes Legal & DPO.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900 mb-2">Produit</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/pricing" className="hover:text-slate-900">
                Tarifs
              </Link>
            </li>
            <li>
              <Link href="/auth/login" className="hover:text-slate-900">
                Connexion
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900 mb-2">Support</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <a href="mailto:support@compliai.eu" className="hover:text-slate-900">
                support@compliai.eu
              </a>
            </li>
            <li>
              <a href="mailto:enterprise@compliai.eu" className="hover:text-slate-900">
                enterprise@compliai.eu
              </a>
            </li>
            <li>
              <Link href="/legal/disclaimer" className="hover:text-slate-900">
                Avertissement juridique
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
