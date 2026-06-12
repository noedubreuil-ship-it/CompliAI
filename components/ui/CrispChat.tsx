"use client";

import { useEffect } from "react";

/**
 * Charge le widget Crisp si NEXT_PUBLIC_CRISP_WEBSITE_ID est défini.
 * Créez un site sur crisp.chat et ajoutez l’identifiant (UUID) dans vos variables d’environnement.
 */
export function CrispChat() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!id || typeof window === "undefined") return;

    (window as unknown as { $crisp?: unknown[] }).$crisp = [];
    const w = window as unknown as {
      CRISP_RUNTIME_CONFIG?: Record<string, string>;
      $crisp?: unknown[];
    };
    w.CRISP_RUNTIME_CONFIG = { website_id: id };

    const s = document.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    document.head.appendChild(s);

    return () => {
      try {
        const existing = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
        existing?.parentNode?.removeChild(existing);
      } catch {
        /* ignore */
      }
    };
  }, []);

  return null;
}
