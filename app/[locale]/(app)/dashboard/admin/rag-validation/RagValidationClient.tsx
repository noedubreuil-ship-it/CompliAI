"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Filter,
  SortAsc,
  Columns2,
  LayoutList,
  RefreshCw,
  Layers,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CoverageBar } from "./components/CoverageBar";
import { DocumentCard } from "./components/DocumentCard";
import { BlockedDocumentCard } from "./components/BlockedDocumentCard";
import { ChunkPanel } from "./components/ChunkPanel";
import { SourceViewer } from "./components/SourceViewer";
import { RejectModal } from "./components/RejectModal";
import { CorrectModal } from "./components/CorrectModal";
import {
  DocumentWithStats,
  BlockedDocument,
  StagingChunkRow,
  ValidationStats,
  DOC_TYPE_LABELS,
} from "./components/rag-types";

type SortMode = "date" | "type";
type FilterType = "all" | string;

const KEYBOARD_HINT_TIMEOUT = 4000;

function RejectDocumentModal({ docId, onConfirm, onCancel }: { docId: string; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Rejeter le document entier</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Tous les chunks en attente seront marqués comme rejetés. Motif obligatoire.
        </p>
        <textarea
          className="w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          rows={3}
          placeholder="Motif de rejet..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Rejeter le document
          </button>
        </div>
      </div>
    </div>
  );
}

export function RagValidationClient() {
  // ── Stats globales ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Onglet actif ──────────────────────────────────────────────────────────
  // "staging"  : documents parses, en attente de validation
  // "blocked"  : documents detectes que le pipeline n'a PAS pu ingerer.
  //              Ils sont conserves plutot qu'ecartes : l'admin doit pouvoir
  //              arbitrer (recuperer le texte a la main, ou ecarter sciemment).
  const [activeTab, setActiveTab] = useState<"staging" | "blocked">("staging");
  const [blockedDocs, setBlockedDocs] = useState<BlockedDocument[]>([]);
  const [blockedTotal, setBlockedTotal] = useState(0);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // ── Liste des documents ───────────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentWithStats[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // ── Chunks du document sélectionné ───────────────────────────────────────
  const [chunks, setChunks] = useState<StagingChunkRow[]>([]);
  const [chunkTotal, setChunkTotal] = useState(0);
  const [isSample, setIsSample] = useState(true);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [currentChunkIdx, setCurrentChunkIdx] = useState(0);
  const [chunkDoc, setChunkDoc] = useState<DocumentWithStats | null>(null);

  // ── Modales ───────────────────────────────────────────────────────────────
  const [rejectTarget, setRejectTarget] = useState<StagingChunkRow | null>(null);
  const [correctTarget, setCorrectTarget] = useState<StagingChunkRow | null>(null);

  // ── Toast / feedback ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Keyboard hint ─────────────────────────────────────────────────────────
  const [showKeyHint, setShowKeyHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowKeyHint(false), KEYBOARD_HINT_TIMEOUT);
    return () => clearTimeout(t);
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Fetch helpers
  // ────────────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/rag-validation/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchBlocked = useCallback(async () => {
    setLoadingBlocked(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filterType !== "all") params.set("type", filterType);
      const res = await fetch(`/api/admin/rag-validation/blocked?${params}`);
      if (!res.ok) throw new Error("Chargement impossible");
      const json = await res.json();
      setBlockedDocs(json.documents ?? []);
      setBlockedTotal(json.total ?? 0);
    } catch {
      setBlockedDocs([]);
      setBlockedTotal(0);
    } finally {
      setLoadingBlocked(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (activeTab === "blocked") void fetchBlocked();
  }, [activeTab, fetchBlocked]);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams({ sort: sortMode });
      if (filterType !== "all") params.set("type", filterType);
      const res = await fetch(`/api/admin/rag-validation/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        const docs: DocumentWithStats[] = data.documents ?? [];
        setDocuments(docs);

        // Traduction en arrière-plan des titres non-français
        const toTranslate = docs.filter(
          (d) => d.title && !["fr", "FR", "fra"].includes(d.language)
        );
        if (toTranslate.length > 0) {
          fetch("/api/admin/translate-titles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documents: toTranslate.map((d) => ({
                id: d.id,
                title: d.title,
                language: d.language,
              })),
            }),
          })
            .then((r) => r.ok ? r.json() : null)
            .then((data: { translations?: { id: string; title_fr: string }[] } | null) => {
              if (!data?.translations) return;
              const map = new Map(data.translations.map((t) => [t.id, t.title_fr]));
              setDocuments((prev) =>
                prev.map((d) =>
                  map.has(d.id) ? { ...d, title_fr: map.get(d.id) } : d
                )
              );
            })
            .catch(() => {});
        }
      }
    } finally {
      setLoadingDocs(false);
    }
  }, [filterType, sortMode]);

  const fetchChunks = useCallback(async (docId: string, sample: boolean) => {
    setLoadingChunks(true);
    setCurrentChunkIdx(0);
    try {
      const params = new URLSearchParams({ sample: String(sample) });
      const res = await fetch(`/api/admin/rag-validation/documents/${docId}/chunks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setChunks(data.chunks ?? []);
        setChunkTotal(data.total ?? 0);
        setIsSample(data.is_sample ?? sample);
        setChunkDoc(documents.find((d) => d.id === docId) ?? null);
      }
    } finally {
      setLoadingChunks(false);
    }
  }, [documents]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Charger les chunks quand un document est sélectionné
  useEffect(() => {
    if (selectedDocId) {
      fetchChunks(selectedDocId, true); // sample par défaut
    } else {
      setChunks([]);
      setChunkDoc(null);
    }
  }, [selectedDocId, fetchChunks]);

  // ────────────────────────────────────────────────────────────────────────
  // Actions de validation
  // ────────────────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const postValidation = useCallback(async (payload: {
    documentId: string;
    chunkIds?: string[];
    action: string;
    reason?: string;
    corrections?: Record<string, unknown>;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rag-validation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      // Mettre à jour localement le chunk sans recharger
      if (payload.action === "approve_document") {
        setChunks((prev) => prev.map((c) => c.validation_status === "pending" ? { ...c, validation_status: "approved", rejection_reason: null } : c));
      } else if (payload.chunkIds && payload.chunkIds.length > 0) {
        setChunks((prev) =>
          prev.map((c) =>
            payload.chunkIds!.includes(c.id)
              ? {
                  ...c,
                  validation_status:
                    payload.action === "rejected"
                      ? "rejected"
                      : payload.action === "corrected" || payload.action === "approved" || payload.action === "bulk_approved"
                      ? "approved"
                      : c.validation_status,
                  rejection_reason: payload.action === "rejected" ? (payload.reason ?? null) : null,
                }
              : c
          )
        );
      }

      // Mettre à jour les stats du document dans la liste
      if (selectedDocId) {
        setDocuments((prev) =>
          prev.map((d) => {
            if (d.id !== selectedDocId) return d;
            if (payload.action === "approve_document") {
              return { ...d, approved_chunks: d.approved_chunks + d.pending_chunks, pending_chunks: 0 };
            }
            const delta = payload.chunkIds?.length ?? 0;
            if (payload.action === "approved" || payload.action === "corrected" || payload.action === "bulk_approved") {
              return { ...d, pending_chunks: Math.max(0, d.pending_chunks - delta), approved_chunks: d.approved_chunks + delta };
            } else if (payload.action === "rejected") {
              return { ...d, pending_chunks: Math.max(0, d.pending_chunks - delta), rejected_chunks: d.rejected_chunks + delta };
            }
            return d;
          })
        );
      }

      // Si le document est complètement validé, rafraîchir la liste
      if (data.document_fully_validated) {
        showToast("Document entièrement validé ✓", "success");
        // Retirer le document de la liste ou le marquer
        setDocuments((prev) => prev.filter((d) => d.id !== selectedDocId));
        setSelectedDocId(null);
        fetchStats();
      } else {
        showToast(
          payload.action === "rejected"
            ? "Chunk rejeté"
            : payload.action === "corrected"
            ? "Chunk validé avec corrections"
            : "Chunk validé ✓",
          "success"
        );
        // Avancer automatiquement au chunk suivant si possible
        if (currentChunkIdx < chunks.length - 1) {
          setCurrentChunkIdx((i) => i + 1);
        }
      }
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [selectedDocId, currentChunkIdx, chunks.length, showToast, fetchStats]);

  const handleValidate = useCallback((chunk: StagingChunkRow) => {
    if (!selectedDocId || submitting) return;
    postValidation({ documentId: selectedDocId, chunkIds: [chunk.id], action: "approved" });
  }, [selectedDocId, submitting, postValidation]);

  const handleRejectConfirm = useCallback((chunk: StagingChunkRow, reason: string) => {
    if (!selectedDocId || submitting) return;
    setRejectTarget(null);
    postValidation({ documentId: selectedDocId, chunkIds: [chunk.id], action: "rejected", reason });
  }, [selectedDocId, submitting, postValidation]);

  const handleCorrectConfirm = useCallback((chunk: StagingChunkRow, corrections: Record<string, unknown>) => {
    if (!selectedDocId || submitting) return;
    setCorrectTarget(null);
    postValidation({
      documentId: selectedDocId,
      chunkIds: [chunk.id],
      action: "corrected",
      corrections: { [chunk.id]: corrections },
    });
  }, [selectedDocId, submitting, postValidation]);

  const handleBulkValidate = useCallback(() => {
    if (!selectedDocId || submitting || chunks.length === 0) return;
    const pendingIds = chunks.filter((c) => c.validation_status === "pending").map((c) => c.id);
    if (pendingIds.length === 0) return;
    postValidation({ documentId: selectedDocId, chunkIds: pendingIds, action: "bulk_approved" });
  }, [selectedDocId, submitting, chunks, postValidation]);

  const handleApproveDocument = useCallback((docId: string) => {
    if (submitting) return;
    postValidation({ documentId: docId, action: "approve_document" });
  }, [submitting, postValidation]);

  const [rejectDocTarget, setRejectDocTarget] = useState<string | null>(null);

  // ────────────────────────────────────────────────────────────────────────
  // Raccourcis clavier
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignorer si focus dans un input/textarea
      if (
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"
      ) return;

      // Ignorer si une modale est ouverte
      if (rejectTarget || correctTarget) return;

      const currentChunk = chunks[currentChunkIdx];
      if (!currentChunk) return;

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        handleValidate(currentChunk);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setRejectTarget(currentChunk);
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setCorrectTarget(currentChunk);
      } else if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (currentChunkIdx < chunks.length - 1) setCurrentChunkIdx((i) => i + 1);
      } else if (e.key === "ArrowLeft" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (currentChunkIdx > 0) setCurrentChunkIdx((i) => i - 1);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chunks, currentChunkIdx, rejectTarget, correctTarget, handleValidate]);

  // ────────────────────────────────────────────────────────────────────────
  // Types de documents disponibles pour le filtre
  // ────────────────────────────────────────────────────────────────────────

  const availableTypes = Array.from(new Set(documents.map((d) => d.document_type)));

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Keyboard hint */}
      {showKeyHint && selectedDocId && (
        <div className="fixed bottom-4 right-4 z-40 rounded-xl bg-neutral-900 dark:bg-neutral-800 px-4 py-3 text-xs text-white shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          <p className="font-semibold mb-1">Raccourcis clavier</p>
          <div className="flex flex-col gap-0.5 text-neutral-300">
            <span><kbd className="font-mono bg-white/20 rounded px-1">V</kbd> Valider</span>
            <span><kbd className="font-mono bg-white/20 rounded px-1">R</kbd> Rejeter</span>
            <span><kbd className="font-mono bg-white/20 rounded px-1">E</kbd> Corriger</span>
            <span><kbd className="font-mono bg-white/20 rounded px-1">← →</kbd> Naviguer</span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl transition-all animate-in fade-in slide-in-from-top-2",
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          )}
        >
          {toast.message}
        </div>
      )}

      {/* CoverageBar */}
      <div className="shrink-0 px-6 pt-6">
        <CoverageBar stats={stats} loading={loadingStats} onRefresh={() => { fetchStats(); fetchDocuments(); }} />
      </div>

      {/* Layout principal : liste gauche + reviewer droite */}
      <div className="flex-1 flex overflow-hidden mt-4 px-6 pb-6 gap-4 min-h-0">
        {/* ── Colonne gauche : liste des documents ──────────────────── */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900">
          {/* En-tête liste */}
          <div className="shrink-0 px-3 py-3 border-b border-neutral-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("staging")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                    activeTab === "staging"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                  )}
                >
                  À valider
                </button>
                <button
                  onClick={() => setActiveTab("blocked")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                    activeTab === "blocked"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                  )}
                  title="Documents détectés que le pipeline n'a pas pu ingérer automatiquement"
                >
                  Non ingérés{blockedTotal > 0 ? ` (${blockedTotal})` : ""}
                </button>
              </div>
              <button
                onClick={() => { activeTab === "blocked" ? fetchBlocked() : (fetchDocuments(), fetchStats()); }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-neutral-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs bg-transparent border-none text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tous les types</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{DOC_TYPE_LABELS[t] ?? t}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <SortAsc className="h-3 w-3 text-neutral-400" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="text-xs bg-transparent border-none text-neutral-600 dark:text-neutral-400 focus:outline-none cursor-pointer"
                >
                  <option value="date">Par date</option>
                  <option value="type">Par type</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {activeTab === "blocked" ? (
              loadingBlocked ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-neutral-100 dark:bg-white/5 animate-pulse" />
                ))
              ) : blockedDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-neutral-400 dark:text-neutral-500 gap-2">
                  <Layers className="h-8 w-8" />
                  <p className="text-sm font-medium">Aucun document bloqué</p>
                  <p className="text-xs">Tout ce qui a été détecté a pu être ingéré.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedDocs.map((doc) => (
                    <BlockedDocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              )
            ) : loadingDocs ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-neutral-100 dark:bg-white/5 animate-pulse" />
              ))
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-neutral-400 dark:text-neutral-500 gap-2">
                <Layers className="h-8 w-8" />
                <p className="text-sm font-medium">Aucun document en attente</p>
                <p className="text-xs">La file de staging est vide.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  isSelected={doc.id === selectedDocId}
                  onSelect={() => setSelectedDocId(doc.id)}
                  onApproveAll={() => handleApproveDocument(doc.id)}
                  onRejectAll={() => setRejectDocTarget(doc.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Colonne droite : reviewer ──────────────────────────────── */}
        {selectedDocId && chunkDoc ? (
          <div className="flex-1 min-w-0 flex gap-4 overflow-hidden">
            {/* Source officielle */}
            <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Source officielle
                </span>
                <div className="flex items-center gap-2">
                  {/* Mode échantillon / Tous les chunks */}
                  <button
                    onClick={() => fetchChunks(selectedDocId, !isSample)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      isSample
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                    title={isSample ? "Afficher tous les chunks" : "Revenir à l'échantillon (5 chunks)"}
                  >
                    {isSample ? (
                      <><FlaskConical className="h-3 w-3" /> Échantillon (5)</>
                    ) : (
                      <><LayoutList className="h-3 w-3" /> Tous ({chunkTotal})</>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <SourceViewer url={chunkDoc.source_url} title={chunkDoc.title} />
              </div>
            </div>

            {/* Chunk reviewer */}
            <div className="w-[420px] shrink-0 flex flex-col rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 overflow-hidden">
              {/* Bouton validation globale de l'échantillon */}
              {isSample && chunks.length > 0 && chunks.some((c) => c.validation_status === "pending") && (
                <div className="shrink-0 px-3 py-2 border-b border-neutral-200 dark:border-white/10 bg-green-50 dark:bg-green-900/10">
                  <button
                    onClick={handleBulkValidate}
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    <Columns2 className="h-4 w-4" />
                    Valider tout l&apos;échantillon ({chunks.filter(c => c.validation_status === "pending").length} chunks)
                  </button>
                </div>
              )}

              {loadingChunks ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : chunks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-neutral-400 dark:text-neutral-500 gap-2">
                  <Layers className="h-8 w-8" />
                  <p className="text-sm">Aucun chunk à afficher</p>
                </div>
              ) : (
                <ChunkPanel
                  chunks={chunks}
                  currentIndex={currentChunkIdx}
                  isSample={isSample}
                  document={chunkDoc}
                  onNavigate={(i) => setCurrentChunkIdx(Math.max(0, Math.min(chunks.length - 1, i)))}
                  onValidate={handleValidate}
                  onReject={(chunk) => setRejectTarget(chunk)}
                  onCorrect={(chunk) => setCorrectTarget(chunk)}
                />
              )}
            </div>
          </div>
        ) : (
          // État vide — aucun document sélectionné
          <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 dark:border-white/10 text-center px-8 gap-3 text-neutral-400 dark:text-neutral-500">
            <Columns2 className="h-10 w-10" />
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Sélectionnez un document
              </p>
              <p className="text-xs mt-1">
                Choisissez un document dans la liste pour afficher ses chunks et la source officielle côte à côte.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <RejectModal
        chunk={rejectTarget}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />
      <CorrectModal
        chunk={correctTarget}
        onConfirm={handleCorrectConfirm}
        onCancel={() => setCorrectTarget(null)}
      />
      {/* Modale rejet document entier */}
      {rejectDocTarget && (
        <RejectDocumentModal
          docId={rejectDocTarget}
          onConfirm={(reason) => {
            const docId = rejectDocTarget;
            setRejectDocTarget(null);
            postValidation({ documentId: docId, action: "reject_document", reason });
          }}
          onCancel={() => setRejectDocTarget(null)}
        />
      )}
    </div>
  );
}
