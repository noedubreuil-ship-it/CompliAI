"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Plus, Search, X, FileText, Star, StarOff, Trash2, Network, List,
  ChevronRight, ChevronDown, Hash, BookOpen, Bot, Brain, FolderOpen,
  ArrowLeft, Settings, Loader2, Check, Copy,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";

// Dynamic import for heavy components
const NoteEditor = dynamic(() => import("@/components/brain/NoteEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0F0F0F]">
      <Loader2 className="h-5 w-5 animate-spin text-white/30" />
    </div>
  ),
});

const KnowledgeGraph = dynamic(() => import("@/components/brain/KnowledgeGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0A0A0A]">
      <Loader2 className="h-5 w-5 animate-spin text-white/20" />
      <span className="ml-2 text-sm text-white/30">Chargement du graphe…</span>
    </div>
  ),
});

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BrainNote {
  id: string;
  title: string;
  content: string;
  path: string;
  tags: string[];
  word_count: number;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Backlink {
  source_id: string;
  link_text: string;
  context: string;
  brain_notes: { id: string; title: string; path: string };
}

type ViewMode = "editor" | "graph";
type Panel = "none" | "ai";

// ─── Color for tags ─────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  rgpd: "#4A9EFF", "ai-act": "#7C6AF7", dma: "#4ADE80", dsa: "#FB923C",
  projet: "#4A9EFF", personne: "#F472B6", concept: "#4ADE80", ressource: "#FACC15",
  juridique: "#7C6AF7", référence: "#2DD4BF",
};
function getTagColor(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? "#888888";
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function BrainPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<BrainNote[]>([]);
  const [activeNote, setActiveNote] = useState<BrainNote | null>(null);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [view, setView] = useState<ViewMode>("editor");
  const [rightPanel, setRightPanel] = useState<Panel>("none");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 200);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // AI chat
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string; sources?: { id: string; title: string }[] }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Computed ────────────────────────────────────────────────────────────────
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();
  const filteredNotes = notes.filter((n) => {
    if (activeTag && !n.tags.includes(activeTag)) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    }
    return true;
  });
  const pinnedNotes = filteredNotes.filter((n) => n.pinned_at);
  const recentNotes = filteredNotes.filter((n) => !n.pinned_at);

  // ── Load notes ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setLoading(true);
    const res = await fetch("/api/brain/notes");
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes ?? []);
    }
    setLoading(false);
  }

  // ── Open note ──────────────────────────────────────────────────────────────
  async function openNote(note: BrainNote) {
    setActiveNote(note);
    setView("editor");
    // Fetch backlinks
    const res = await fetch(`/api/brain/notes/${note.id}`);
    if (res.ok) {
      const data = await res.json();
      setBacklinks(data.backlinks ?? []);
    }
  }

  // ── Create note ────────────────────────────────────────────────────────────
  async function createNote() {
    const res = await fetch("/api/brain/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Note sans titre", content: "" }),
    });
    if (res.ok) {
      const data = await res.json();
      const newNote = data.note as BrainNote;
      setNotes((prev) => [newNote, ...prev]);
      setActiveNote(newNote);
      setView("editor");
    }
  }

  // ── Save note (debounced from editor) ──────────────────────────────────────
  const saveNote = useCallback(async (id: string, content: string, title: string) => {
    setSaving(true);
    const res = await fetch(`/api/brain/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...data.note } : n)));
      if (activeNote?.id === id) setActiveNote((prev) => prev ? { ...prev, ...data.note } : prev);
    }
    setSaving(false);
  }, [activeNote]);

  // ── Delete note ────────────────────────────────────────────────────────────
  async function deleteNote(id: string) {
    if (!confirm("Supprimer cette note définitivement ?")) return;
    await fetch(`/api/brain/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  }

  // ── Pin / Unpin ────────────────────────────────────────────────────────────
  async function togglePin(note: BrainNote) {
    const pinned_at = note.pinned_at ? null : new Date().toISOString();
    await fetch(`/api/brain/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned_at }),
    });
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned_at } : n)));
    if (activeNote?.id === note.id) setActiveNote((prev) => prev ? { ...prev, pinned_at } : prev);
  }

  // ── AI Chat ────────────────────────────────────────────────────────────────
  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    const res = await fetch("/api/brain/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, noteId: activeNote?.id }),
    });

    if (!res.ok || !res.body) { setChatLoading(false); return; }

    let assistantMsg = "";
    let sources: { id: string; title: string }[] = [];
    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.text) {
            assistantMsg += parsed.text;
            setChatMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
              return updated;
            });
          }
          if (parsed.done) sources = parsed.sources ?? [];
        } catch {}
      }
    }

    setChatMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: "assistant", content: assistantMsg, sources };
      return updated;
    });
    setChatLoading(false);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); createNote(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "g") { e.preventDefault(); setView((v) => v === "graph" ? "editor" : "graph"); }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); setSidebarOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") { e.preventDefault(); setRightPanel((p) => p === "ai" ? "none" : "ai"); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] overflow-hidden"
      style={{ background: "var(--brain-bg, #0F0F0F)", color: "var(--brain-text, #DCDCDC)" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r transition-all duration-200 overflow-hidden",
          sidebarOpen ? "w-60" : "w-0"
        )}
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#111111" }}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" style={{ color: "#7C6AF7" }} />
                <span className="text-sm font-semibold" style={{ color: "#F0F0F0" }}>Cerveau</span>
              </div>
              <button onClick={createNote} title="Nouvelle note (⌘N)"
                className="p-1 rounded hover:bg-white/10 transition-colors">
                <Plus className="h-3.5 w-3.5" style={{ color: "#888" }} />
              </button>
            </div>

            {/* Search */}
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Search className="h-3 w-3 flex-shrink-0" style={{ color: "#555" }} />
                <input
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-[#555]"
                  style={{ color: "#DCDCDC" }}
                  placeholder="Rechercher…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X className="h-3 w-3" style={{ color: "#555" }} />
                  </button>
                )}
              </div>
            </div>

            {/* Tags filter */}
            {allTags.length > 0 && (
              <div className="px-2 pb-2 flex flex-wrap gap-1">
                {allTags.slice(0, 12).map((tag) => (
                  <button key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className="text-[10px] px-1.5 py-0.5 rounded-full transition-all"
                    style={{
                      background: activeTag === tag ? `${getTagColor(tag)}30` : "rgba(255,255,255,0.06)",
                      color: activeTag === tag ? getTagColor(tag) : "#888",
                      border: `1px solid ${activeTag === tag ? getTagColor(tag) + "50" : "transparent"}`,
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* View toggles */}
            <div className="px-2 pb-2 flex gap-1">
              <button
                onClick={() => setView("editor")}
                className={cn("flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] transition-colors", view === "editor" ? "bg-[#7C6AF7]/20 text-[#A89BFF]" : "text-[#888] hover:bg-white/5")}
              >
                <List className="h-3 w-3" /> Notes
              </button>
              <button
                onClick={() => setView("graph")}
                className={cn("flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] transition-colors", view === "graph" ? "bg-[#7C6AF7]/20 text-[#A89BFF]" : "text-[#888] hover:bg-white/5")}
              >
                <Network className="h-3 w-3" /> Graphe
              </button>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto px-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-white/20" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[11px] text-[#555]">Aucune note</p>
                  <button onClick={createNote} className="mt-2 text-[11px] text-[#7C6AF7] hover:underline">
                    Créer une note
                  </button>
                </div>
              ) : (
                <>
                  {pinnedNotes.length > 0 && (
                    <NoteGroup
                      label="Épinglées"
                      notes={pinnedNotes}
                      activeId={activeNote?.id}
                      onOpen={openNote}
                      onPin={togglePin}
                      onDelete={deleteNote}
                    />
                  )}
                  <NoteGroup
                    label={pinnedNotes.length > 0 ? "Notes" : undefined}
                    notes={recentNotes}
                    activeId={activeNote?.id}
                    onOpen={openNote}
                    onPin={togglePin}
                    onDelete={deleteNote}
                  />
                </>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="px-3 py-2 border-t text-[10px] text-[#555]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {notes.length} notes · ⌘N nouvelle · ⌘G graphe
            </div>
          </>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#111111" }}>
          <button onClick={() => setSidebarOpen((o) => !o)}
            className="p-1 rounded hover:bg-white/10 transition-colors">
            <ArrowLeft className={cn("h-3.5 w-3.5 transition-transform", !sidebarOpen && "rotate-180")} style={{ color: "#555" }} />
          </button>

          {activeNote && view === "editor" ? (
            <>
              <span className="text-xs text-[#555]">{activeNote.path}</span>
              <ChevronRight className="h-3 w-3 text-[#333]" />
              <span className="text-sm font-medium flex-1 truncate" style={{ color: "#F0F0F0" }}>
                {activeNote.title}
              </span>
              <div className="flex items-center gap-1">
                {saving && <Loader2 className="h-3 w-3 animate-spin text-[#555]" />}
                {!saving && activeNote && <Check className="h-3 w-3 text-[#4ADE80]/60" />}
                <button onClick={() => togglePin(activeNote)} className="p-1 rounded hover:bg-white/10 transition-colors">
                  {activeNote.pinned_at
                    ? <StarOff className="h-3.5 w-3.5 text-[#FACC15]" />
                    : <Star className="h-3.5 w-3.5 text-[#555]" />}
                </button>
                <button onClick={() => setRightPanel((p) => p === "ai" ? "none" : "ai")}
                  className={cn("p-1 rounded transition-colors", rightPanel === "ai" ? "bg-[#7C6AF7]/20" : "hover:bg-white/10")}>
                  <Bot className="h-3.5 w-3.5" style={{ color: rightPanel === "ai" ? "#A89BFF" : "#555" }} />
                </button>
              </div>
            </>
          ) : (
            <span className="text-sm font-medium flex-1" style={{ color: "#888" }}>
              {view === "graph" ? "Graphe de connaissances" : "Sélectionnez une note"}
            </span>
          )}

          {activeNote && view === "editor" && (
            <div className="flex items-center gap-3 text-[10px] text-[#555]">
              {activeNote.word_count > 0 && <span>{activeNote.word_count} mots</span>}
              {activeNote.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ background: `${getTagColor(t)}20`, color: getTagColor(t) }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {view === "graph" ? (
            <KnowledgeGraph activeNoteId={activeNote?.id} onNodeClick={(id) => {
              const note = notes.find((n) => n.id === id);
              if (note) openNote(note);
            }} />
          ) : activeNote ? (
            <NoteEditor
              key={activeNote.id}
              noteId={activeNote.id}
              initialTitle={activeNote.title}
              initialContent={activeNote.content}
              notes={notes}
              onSave={saveNote}
              onNavigate={(title) => {
                const target = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
                if (target) openNote(target);
              }}
            />
          ) : (
            <EmptyState onCreate={createNote} />
          )}

          {/* Right Panel — AI Chat */}
          {rightPanel === "ai" && (
            <div className="w-72 flex flex-col border-l flex-shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "#111111" }}>
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5" style={{ color: "#7C6AF7" }} />
                  <span className="text-xs font-semibold" style={{ color: "#F0F0F0" }}>Chat IA</span>
                </div>
                <button onClick={() => setRightPanel("none")}>
                  <X className="h-3.5 w-3.5 text-[#555]" />
                </button>
              </div>

              {/* Backlinks */}
              {backlinks.length > 0 && (
                <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#555" }}>
                    Backlinks ({backlinks.length})
                  </p>
                  {backlinks.slice(0, 4).map((bl) => (
                    <button key={bl.source_id}
                      onClick={() => { const n = notes.find((x) => x.id === bl.brain_notes?.id); if (n) openNote(n); }}
                      className="block w-full text-left py-1 hover:text-[#A89BFF] transition-colors">
                      <span className="text-[11px]" style={{ color: "#888" }}>← {bl.brain_notes?.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="h-8 w-8 mx-auto mb-2" style={{ color: "#333" }} />
                    <p className="text-[11px] text-[#555]">Posez une question sur vos notes</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("text-xs leading-relaxed", msg.role === "user" ? "text-right" : "text-left")}>
                    <div
                      className={cn("inline-block max-w-[90%] px-2.5 py-1.5 rounded-lg text-left whitespace-pre-wrap")}
                      style={{
                        background: msg.role === "user" ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.05)",
                        color: msg.role === "user" ? "#C9B8FF" : "#DCDCDC",
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {msg.sources.map((s) => (
                          <button key={s.id}
                            onClick={() => { const n = notes.find((x) => x.id === s.id); if (n) openNote(n); }}
                            className="block text-[10px] hover:underline"
                            style={{ color: "#7C6AF7" }}
                          >
                            ↗ {s.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-left">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <Loader2 className="h-3 w-3 animate-spin text-[#7C6AF7]" />
                      <span className="text-[11px] text-[#555]">Analyse des notes…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-[#444] resize-none"
                    style={{ color: "#DCDCDC" }}
                    placeholder="Posez une question… (⌘J)"
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
                    }}
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                    className="px-2 py-1 rounded text-[11px] transition-colors disabled:opacity-30"
                    style={{ background: "#7C6AF7", color: "white" }}>
                    ↑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NoteGroup ─────────────────────────────────────────────────────────────────
function NoteGroup({ label, notes, activeId, onOpen, onPin, onDelete }: {
  label?: string;
  notes: BrainNote[];
  activeId?: string;
  onOpen: (n: BrainNote) => void;
  onPin: (n: BrainNote) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (notes.length === 0) return null;
  return (
    <div className="mb-2">
      {label && (
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#444" }}>
          {label}
        </div>
      )}
      {notes.map((note) => (
        <div key={note.id}
          className="group relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
          style={{
            background: activeId === note.id ? "rgba(124,106,247,0.15)" : hovered === note.id ? "rgba(255,255,255,0.04)" : "transparent",
          }}
          onMouseEnter={() => setHovered(note.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onOpen(note)}
        >
          <FileText className="h-3 w-3 flex-shrink-0" style={{ color: activeId === note.id ? "#7C6AF7" : "#444" }} />
          <span className="flex-1 text-xs truncate" style={{ color: activeId === note.id ? "#C9B8FF" : "#888" }}>
            {note.title}
          </span>
          {hovered === note.id && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onPin(note)} className="p-0.5 rounded hover:bg-white/10">
                {note.pinned_at
                  ? <StarOff className="h-2.5 w-2.5 text-[#FACC15]" />
                  : <Star className="h-2.5 w-2.5 text-[#555]" />}
              </button>
              <button onClick={() => onDelete(note.id)} className="p-0.5 rounded hover:bg-white/10">
                <Trash2 className="h-2.5 w-2.5 text-[#555] hover:text-red-400" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: "#0F0F0F" }}>
      <Brain className="h-14 w-14" style={{ color: "#2D2D2D" }} />
      <div className="text-center">
        <p className="text-sm font-medium mb-1" style={{ color: "#555" }}>Votre cerveau numérique</p>
        <p className="text-xs" style={{ color: "#333" }}>
          Créez des notes, connectez vos idées, explorez votre graphe de connaissances.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button onClick={onCreate}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "#7C6AF7", color: "white" }}>
          Créer ma première note
        </button>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#444]">
          <span>⌘N — Nouvelle note</span>
          <span>⌘G — Graphe</span>
          <span>⌘J — Chat IA</span>
          <span>⌘\ — Sidebar</span>
        </div>
      </div>
    </div>
  );
}
