"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sélecteur de langue (FR / EN). Conserve la route courante en changeant de
 * locale via la navigation localisée next-intl.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchTo(next: string) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        className="flex items-center gap-1 text-xs font-medium text-[#1D1D1F]/75 hover:text-[#1D1D1F] transition-colors cursor-pointer"
      >
        <Globe className="h-3.5 w-3.5" />
        {locale.toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 rounded-lg border border-black/[0.08] bg-white shadow-lg py-1 z-50">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={cn(
                "block w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50",
                l === locale ? "font-semibold text-[#003399]" : "text-[#1D1D1F]/80"
              )}
            >
              {l === "fr" ? "Français" : "English"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
