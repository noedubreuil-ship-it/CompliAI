"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Pencil, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  StagingChunkRow,
  DocumentWithStats,
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
  isEcliChunk,
  isParagraphRange,
  buildChunkRef,
} from "./rag-types";

interface ChunkPanelProps {
  chunks: StagingChunkRow[];
  currentIndex: number;
  isSample: boolean;
  document: Pick<DocumentWithStats, "id" | "title" | "document_type" | "celex" | "ecli" | "source_url">;
  onNavigate: (index: number) => void;
  onValidate: (chunk: StagingChunkRow) => void;
  onReject: (chunk: StagingChunkRow) => void;
  onCorrect: (chunk: StagingChunkRow) => void;
}

const STATUS_STYLES = {
  pending: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50",
  approved: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50",
  rejected: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50",
  correction_needed: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50",
};

const STATUS_LABELS = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Rejeté",
  correction_needed: "Correction",
};

export function ChunkPanel({
  chunks,
  currentIndex,
  isSample,
  document: doc,
  onNavigate,
  onValidate,
  onReject,
  onCorrect,
}: ChunkPanelProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const chunk = chunks[currentIndex];
  if (!chunk) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500 gap-2">
        <p className="text-sm">Aucun chunk sélectionné</p>
      </div>
    );
  }

  const isEcli = isEcliChunk(chunk);
  const isParagraph = isParagraphRange(chunk.article_number);
  const chunkRef = buildChunkRef(chunk);
  const docTypeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type;
  const docTypeColor = DOC_TYPE_COLORS[doc.document_type] ?? DOC_TYPE_COLORS.other;

  const chunkJson = {
    regulation: chunk.regulation,
    text_type: chunk.text_type,
    article_number: chunk.article_number,
    paragraph_number: chunk.paragraph_number,
    point_letter: chunk.point_letter,
    article_title: chunk.article_title,
    chapter: chunk.chapter,
    content: chunk.content,
    language: chunk.language,
    country: chunk.country,
    source_url: chunk.source_url,
    publication_date: chunk.publication_date,
    chunk_hash: chunk.chunk_hash,
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(chunkJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* En-tête du document */}
      <div className="shrink-0 px-4 py-3 border-b border-neutral-200 dark:border-white/10">
        <div className="flex items-start gap-2 flex-wrap">
          {/* Type badge avec distinction ECLI / CELEX */}
          <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", docTypeColor)}>
            {docTypeLabel}
          </span>
          {isEcli ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              ⚖ ECLI
            </span>
          ) : doc.celex ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              📋 CELEX
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
          {doc.title ?? chunk.regulation}
        </p>
        {(doc.celex || doc.ecli) && (
          <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            {doc.ecli ?? doc.celex}
          </p>
        )}
      </div>

      {/* Navigation chunks */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-white/3 border-b border-neutral-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label="Chunk précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Chunk {currentIndex + 1} / {chunks.length}
            {isSample && (
              <span className="ml-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">(échantillon)</span>
            )}
          </span>
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex === chunks.length - 1}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label="Chunk suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              chunk.validation_status === "approved"
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                : chunk.validation_status === "rejected"
                ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            )}
          >
            {STATUS_LABELS[chunk.validation_status]}
          </span>
        </div>
      </div>

      {/* Contenu du chunk */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn("m-3 rounded-lg border p-4", STATUS_STYLES[chunk.validation_status])}>
          {/* Identifiant du chunk */}
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {isParagraph ? (
              // Pour EDPB : plage de paragraphes (§5-§6) — distinctement "Section"
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 dark:bg-teal-900/30 px-2.5 py-1 text-sm font-semibold text-teal-800 dark:text-teal-300">
                <span className="text-xs font-normal text-teal-600 dark:text-teal-400">Section</span>
                {chunk.article_number}
              </span>
            ) : chunk.article_number ? (
              // Pour règlements/directives : "Article X §Y (a)"
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 text-sm font-semibold text-blue-800 dark:text-blue-300">
                {chunkRef}
              </span>
            ) : chunk.chapter ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {chunk.chapter}
              </span>
            ) : null}

            {chunk.article_title && (
              <span className="text-sm text-neutral-600 dark:text-neutral-400 italic">
                {chunk.article_title}
              </span>
            )}
          </div>

          {/* Contenu textuel */}
          <div className="text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed whitespace-pre-wrap font-sans">
            {chunk.content}
          </div>

          {chunk.rejection_reason && (
            <div className="mt-3 rounded bg-red-100 dark:bg-red-900/20 px-3 py-2 text-xs text-red-800 dark:text-red-300">
              <strong>Motif de rejet :</strong> {chunk.rejection_reason}
            </div>
          )}
        </div>

        {/* Métadonnées JSON (collapsible) */}
        <div className="mx-3 mb-3 rounded-lg border border-neutral-200 dark:border-white/10 overflow-hidden">
          <button
            onClick={() => setJsonExpanded(!jsonExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            <span>JSON structuré complet</span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
                title="Copier le JSON"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              <svg
                className={cn("h-4 w-4 text-neutral-400 transition-transform", jsonExpanded && "rotate-180")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {jsonExpanded && (
            <div className="border-t border-neutral-200 dark:border-white/10 bg-neutral-950 rounded-b-lg overflow-x-auto">
              <pre className="px-4 py-3 text-xs text-green-400 font-mono leading-relaxed">
                {JSON.stringify(chunkJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="shrink-0 px-4 py-3 border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onValidate(chunk)}
            disabled={chunk.validation_status === "approved"}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              chunk.validation_status === "approved"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed opacity-70"
                : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Valider
            <kbd className="ml-1 rounded bg-white/20 px-1 py-0.5 text-[10px] font-mono">V</kbd>
          </button>

          <button
            onClick={() => onReject(chunk)}
            disabled={chunk.validation_status === "rejected"}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              chunk.validation_status === "rejected"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-not-allowed opacity-70"
                : "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
            )}
          >
            <XCircle className="h-4 w-4" />
            Rejeter
            <kbd className="ml-1 rounded bg-white/20 px-1 py-0.5 text-[10px] font-mono">R</kbd>
          </button>

          <button
            onClick={() => onCorrect(chunk)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/10 transition-colors"
            title="Valider avec corrections (E)"
          >
            <Pencil className="h-4 w-4" />
            Corriger
            <kbd className="ml-0.5 rounded bg-neutral-100 dark:bg-white/10 px-1 py-0.5 text-[10px] font-mono">E</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
