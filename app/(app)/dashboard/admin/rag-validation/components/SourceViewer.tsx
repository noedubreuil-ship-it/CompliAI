"use client";

import { useState } from "react";
import { ExternalLink, AlertCircle, Globe } from "lucide-react";

interface SourceViewerProps {
  url: string | null;
  title?: string | null;
}

/**
 * Affiche la source officielle dans un iframe.
 * Fallback gracieux si l'iframe est bloqué par X-Frame-Options ou CSP.
 *
 * EUR-Lex (eur-lex.europa.eu) bloque les iframes en production.
 * Curia (curia.europa.eu) est embeddable.
 * APD, EDPB, AI Office varient selon les sources.
 */
export function SourceViewer({ url, title }: SourceViewerProps) {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-48 text-neutral-400 dark:text-neutral-500 gap-2">
        <Globe className="h-8 w-8" />
        <p className="text-sm">Aucune URL source disponible</p>
      </div>
    );
  }

  const isPdf = url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("pdf");
  const isEurLex = url.includes("eur-lex.europa.eu");

  // Pour EUR-Lex, on propose directement le lien (bloque les iframes)
  if (isEurLex && !isPdf) {
    return (
      <EurLexFallback url={url} title={title} />
    );
  }

  if (iframeError) {
    return <IframeFallback url={url} title={title} />;
  }

  if (isPdf) {
    return (
      <div className="flex flex-col h-full">
        <iframe
          src={url}
          className="flex-1 w-full border-0 rounded"
          title={title ?? "Source officielle (PDF)"}
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
        />
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 z-10 rounded">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}
      <iframe
        src={url}
        className="flex-1 w-full border-0 rounded bg-white"
        title={title ?? "Source officielle"}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        onLoad={() => setIframeLoaded(true)}
        onError={() => setIframeError(true)}
      />
      {/* Message si l'iframe semble vide après chargement */}
      {iframeLoaded && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Si le contenu ne s&apos;affiche pas, certains sites bloquent les iframes.
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Ouvrir <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function EurLexFallback({ url, title }: { url: string; title?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-48 gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          EUR-Lex — intégration iframe non disponible
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          EUR-Lex bloque l&apos;intégration dans les iframes pour des raisons de sécurité.
          Ouvrez la source dans un nouvel onglet.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Ouvrir EUR-Lex
        <ExternalLink className="h-4 w-4" />
      </a>
      {title && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate max-w-full" title={title}>
          {title}
        </p>
      )}
    </div>
  );
}

function IframeFallback({ url, title }: { url: string; title?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-48 gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Intégration bloquée par la source
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Ce site bloque l&apos;affichage dans un cadre intégré.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Ouvrir la source
        <ExternalLink className="h-4 w-4" />
      </a>
      {title && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate max-w-full" title={title}>
          {title}
        </p>
      )}
    </div>
  );
}
