"use client";

import { useState, useEffect, useRef } from "react";
import { XCircle, X } from "lucide-react";
import { StagingChunkRow, buildChunkRef } from "./rag-types";

interface RejectModalProps {
  chunk: StagingChunkRow | null;
  onConfirm: (chunk: StagingChunkRow, reason: string) => void;
  onCancel: () => void;
}

const REJECT_PRESETS = [
  "Découpage incorrect — le chunk mélange plusieurs points distincts",
  "Contenu tronqué ou incomplet",
  "Erreur de parsing — texte mal extrait",
  "Métadonnées incorrectes (article_number, regulation, etc.)",
  "Doublon avec un chunk existant",
  "Hors périmètre RAG (annexe, considérant non pertinent)",
];

export function RejectModal({ chunk, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chunk) {
      setReason("");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [chunk]);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  if (!chunk) return null;

  const chunkRef = buildChunkRef(chunk);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Rejeter le chunk
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Référence : <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{chunkRef}</span>
          </p>

          {/* Motifs prédéfinis */}
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
            Motifs rapides
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {REJECT_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setReason(preset)}
                className="text-xs rounded-full border border-neutral-200 dark:border-white/15 px-2.5 py-1 text-neutral-600 dark:text-neutral-400 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-700 dark:hover:text-red-400 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Motif libre */}
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
            Motif de rejet *
          </label>
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Décrivez précisément le problème constaté..."
            rows={3}
            className="w-full rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-white/10 px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 dark:border-white/15 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (reason.trim()) onConfirm(chunk, reason.trim());
            }}
            disabled={!reason.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Confirmer le rejet
          </button>
        </div>
      </div>
    </div>
  );
}
