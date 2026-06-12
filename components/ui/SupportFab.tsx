"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, Mail, MessageCircle, LifeBuoy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { openCrispChat, isCrispConfigured } from "@/lib/crisp";

export function SupportFab() {
  const [open, setOpen] = useState(false);
  const crisp = isCrispConfigured();
  const pathname = usePathname();
  const onChat = pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");

  if (onChat) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9998] flex flex-col items-start gap-2">
      {open && (
        <div
          className="rounded-xl border bg-white shadow-xl p-2 min-w-[200px] animate-in fade-in slide-in-from-bottom-2"
          role="menu"
        >
          <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aide</p>
          {crisp && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
              onClick={() => {
                openCrispChat();
                setOpen(false);
              }}
            >
              <MessageCircle className="h-4 w-4 text-blue-600" />
              Chat en direct
            </button>
          )}
          <Link
            href="/dashboard/support"
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <LifeBuoy className="h-4 w-4 text-indigo-600" />
            Centre support
          </Link>
          <a
            href="mailto:support@compliai.eu"
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            <Mail className="h-4 w-4 text-slate-600" />
            support@compliai.eu
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-full shadow-lg border transition-colors",
          open ? "bg-slate-800 text-white border-slate-800" : "bg-white text-blue-700 border-slate-200 hover:border-blue-300",
        )}
        aria-label={open ? "Fermer l'aide" : "Ouvrir l'aide"}
        aria-expanded={open}
      >
        {open ?
          <X className="h-5 w-5" />
        : <HelpCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
