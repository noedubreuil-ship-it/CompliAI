import Link from "next/link";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { EUFlagSVG } from "@/components/EUFlag";
import { FOOTER_COLUMNS } from "@/lib/marketing/site-links";

/** Correspondance libellé FR d'origine → clé de traduction (les noms propres restent). */
const LABEL_KEY: Record<string, string> = {
  "Produit": "colProduct",
  "Réglementations": "colRegulations",
  "Ressources": "colResources",
  "Légal": "colLegal",
  "Fonctionnalités": "features",
  "Tarifs": "pricing",
  "Changelog": "changelog",
  "Roadmap": "roadmap",
  "Documentation": "documentation",
  "Blog": "blog",
  "Mentions légales": "legalNotice",
  "Confidentialité": "privacy",
  "CGU": "terms",
  "Contact": "contact",
};

export function MarketingSiteFooter({ variant = "default" }: { variant?: "default" | "compact" }) {
  const t = useTranslations("Footer");
  const tr = (label: string) => (LABEL_KEY[label] ? t(LABEL_KEY[label]) : label);

  if (variant === "compact") {
    return (
      <footer className="border-t bg-[#F5F5F7] mt-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-wrap gap-4 text-xs text-[#6E6E73]">
          <Link href="/legal/mentions-legales" className="hover:text-[#1D1D1F]">
            {t("legalNotice")}
          </Link>
          <Link href="/legal/privacy" className="hover:text-[#1D1D1F]">
            {t("privacy")}
          </Link>
          <Link href="/legal/cgu" className="hover:text-[#1D1D1F]">
            {t("terms")}
          </Link>
          <Link href="/contact" className="hover:text-[#1D1D1F]">
            {t("contact")}
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#F5F5F7] border-t border-black/[0.06]">
      <div className="max-w-[980px] mx-auto px-5 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold text-[#1D1D1F] mb-3">{tr(col.title)}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                      >
                        {tr(link.label)}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                      >
                        {tr(link.label)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <div className="w-6 h-6 rounded-md bg-[#003399] flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-[#1D1D1F]">
              Compli<span className="text-[#003399]">AI</span>
            </span>
            <span className="text-xs text-[#6E6E73]">
              © {new Date().getFullYear()} · {t("rights")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#6E6E73]">
            <EUFlagSVG width={16} height={11} />
            {t("eurlexLine")}
          </div>
        </div>
      </div>
    </footer>
  );
}
