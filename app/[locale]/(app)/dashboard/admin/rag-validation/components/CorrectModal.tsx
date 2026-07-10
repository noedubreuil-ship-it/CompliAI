"use client";

import { useState, useEffect } from "react";
import { Pencil, X, CheckCircle2, AlertCircle } from "lucide-react";
import { StagingChunkRow, buildChunkRef } from "./rag-types";

interface CorrectModalProps {
  chunk: StagingChunkRow | null;
  onConfirm: (chunk: StagingChunkRow, corrections: Record<string, unknown>) => void;
  onCancel: () => void;
}

function buildEditableJson(chunk: StagingChunkRow) {
  return {
    regulation: chunk.regulation,
    article_number: chunk.article_number,
    paragraph_number: chunk.paragraph_number,
    point_letter: chunk.point_letter,
    article_title: chunk.article_title,
    chapter: chunk.chapter,
    content: chunk.content,
  };
}

export function CorrectModal({ chunk, onConfirm, onCancel }: CorrectModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (chunk) {
      setJsonText(JSON.stringify(buildEditableJson(chunk), null, 2));
      setParseError(null);
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

  const handleConfirm = () => {
    if (!chunk) return;
    try {
      const parsed = JSON.parse(jsonText);
      setParseError(null);

      // Calculer les diff par rapport au chunk original
      const original = buildEditableJson(chunk);
      const corrections: Record<string, unknown> = {};
      for (const key of Object.keys(original) as (keyof typeof original)[]) {
        if (JSON.stringify(parsed[key]) !== JSON.stringify(original[key])) {
          corrections[key] = parsed[key];
        }
      }

      if (Object.keys(corrections).length === 0) {
        setParseError("Aucune modification détectée par rapport au chunk original.");
        return;
      }

      onConfirm(chunk, corrections);
    } catch (e) {
      setParseError(`JSON invalide : ${(e as Error).message}`);
    }
  };

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
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Valider avec corrections
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Référence :{" "}
            <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{chunkRef}</span>
          </p>

          <div className="mb-3 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-300">
            <strong>Champs éditables :</strong> regulation, article_number, paragraph_number, point_letter, article_title, chapter, content.
            Seules les valeurs modifiées seront sauvegardées. Les autres métadonnées (text_type, source_url, etc.) ne peuvent pas être modifiées ici.
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
            JSON du chunk (éditable)
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setParseError(null);
            }}
            rows={16}
            spellCheck={false}
            className="w-full rounded-lg border border-neutral-300 dark:border-white/15 bg-neutral-950 px-4 py-3 font-mono text-xs text-green-400 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
          />

          {parseError && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-white/10 px-5 py-3 shrink-0">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-200 dark:border-white/15 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Valider avec corrections
          </button>
        </div>
      </div>
    </div>
  );
}
