"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorView, keymap, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { EditorState, StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap, historyKeymap, history, indentWithTab } from "@codemirror/commands";
import { useDebounce } from "use-debounce";

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  notes: { id: string; title: string }[];
  onSave: (id: string, content: string, title: string) => void;
  onNavigate?: (title: string) => void;
}

// ─── WikiLink Decoration ──────────────────────────────────────────────────────
function buildWikiLinkDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const content = view.state.doc.toString();
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    builder.add(
      from,
      to,
      Decoration.mark({ class: "cm-wiki-link", attributes: { "data-title": match[1] } })
    );
  }
  return builder.finish();
}

const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildWikiLinkDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildWikiLinkDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// ─── Tag Decoration ───────────────────────────────────────────────────────────
function buildTagDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const content = view.state.doc.toString();
  const regex = /#([\w/\-]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    builder.add(match.index, match.index + match[0].length, Decoration.mark({ class: "cm-tag" }));
  }
  return builder.finish();
}

const tagPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildTagDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildTagDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// ─── WikiLink autocomplete dropdown ──────────────────────────────────────────
interface Suggestion { title: string; id: string }

export default function NoteEditor({
  noteId,
  initialTitle,
  initialContent,
  notes,
  onSave,
  onNavigate,
}: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [debouncedContent] = useDebounce(content, 800);
  const [debouncedTitle] = useDebounce(title, 800);

  // WikiLink autocomplete
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestPos, setSuggestPos] = useState({ top: 0, left: 0 });
  const [selectedIdx, setSelectedIdx] = useState(0);

  const suggestions: Suggestion[] = suggestQuery
    ? notes.filter((n) => n.title.toLowerCase().includes(suggestQuery.toLowerCase())).slice(0, 8)
    : notes.slice(0, 8);

  // ── Auto-save ────────────────────────────────────────────────────────────
  useEffect(() => {
    onSave(noteId, debouncedContent, debouncedTitle);
  }, [debouncedContent, debouncedTitle]);

  // ── CodeMirror setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        history(),
        markdown({ base: markdownLanguage }),
        wikiLinkPlugin,
        tagPlugin,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),

        // Handle [[ trigger for WikiLink autocomplete
        EditorView.updateListener.of((update) => {
          const doc = update.state.doc.toString();
          setContent(doc);

          if (update.docChanged) {
            const head = update.state.selection.main.head;
            const lineStart = update.state.doc.lineAt(head).from;
            const textBefore = doc.slice(lineStart, head);
            const wikiMatch = textBefore.match(/\[\[([^\]]*)$/);
            if (wikiMatch) {
              setSuggestQuery(wikiMatch[1]);
              setSelectedIdx(0);
              const coords = update.view.coordsAtPos(head);
              if (coords) setSuggestPos({ top: coords.bottom + 4, left: coords.left });
              setShowSuggest(true);
            } else {
              setShowSuggest(false);
            }
          }
        }),

        // Handle click on wiki-link spans to navigate
        EditorView.domEventHandlers({
          click(event, view) {
            const target = event.target as HTMLElement;
            const linkEl = target.closest(".cm-wiki-link") as HTMLElement | null;
            if (linkEl && onNavigate) {
              const title = linkEl.dataset.title ?? "";
              if (title) onNavigate(title);
            }
          },
        }),

        // Theme
        EditorView.theme({
          "&": {
            fontSize: "15px",
            fontFamily: "'Georgia', serif",
            lineHeight: "1.8",
            background: "transparent",
            color: "#DCDCDC",
            height: "100%",
          },
          ".cm-content": { padding: "0 0 40px 0", caretColor: "#7C6AF7" },
          ".cm-line": { padding: "0 0 2px 0" },
          ".cm-cursor": { borderLeftColor: "#7C6AF7" },
          ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
            background: "rgba(124,106,247,0.2) !important",
          },
          ".cm-focused": { outline: "none" },
          "&.cm-focused": { outline: "none" },
          ".cm-scroller": { overflow: "auto" },

          // Markdown headings
          ".cm-header-1": { fontSize: "1.6em", fontWeight: "700", color: "#F0F0F0", lineHeight: "1.4" },
          ".cm-header-2": { fontSize: "1.3em", fontWeight: "600", color: "#F0F0F0", lineHeight: "1.4" },
          ".cm-header-3": { fontSize: "1.1em", fontWeight: "600", color: "#DCDCDC" },
          ".cm-strong": { fontWeight: "600", color: "#FFFFFF" },
          ".cm-em": { fontStyle: "italic", color: "#C9B8FF" },
          ".cm-link": { color: "#7C6AF7", textDecoration: "none" },
          ".cm-url": { color: "#4A9EFF", opacity: "0.7" },

          // Code
          ".cm-code": {
            fontFamily: "'JetBrains Mono', monospace",
            background: "rgba(255,255,255,0.06)",
            color: "#89DDFF",
            borderRadius: "3px",
            padding: "0 4px",
          },

          // WikiLinks
          ".cm-wiki-link": {
            color: "#A89BFF",
            background: "rgba(124,106,247,0.15)",
            borderRadius: "3px",
            padding: "0 3px",
            cursor: "pointer",
            borderBottom: "1px solid rgba(124,106,247,0.4)",
          },
          ".cm-wiki-link:hover": {
            background: "rgba(124,106,247,0.25)",
          },

          // Tags
          ".cm-tag": {
            color: "#7C6AF7",
            background: "rgba(124,106,247,0.1)",
            borderRadius: "3px",
            padding: "0 3px",
          },

          // Blockquote
          ".cm-blockquote": { borderLeft: "2px solid #4A4A4A", paddingLeft: "12px", color: "#888" },

          // Horizontal rule & lists
          ".cm-hr": { borderTop: "1px solid #333", margin: "8px 0" },
        }),

        EditorView.lineWrapping,
      ],
    });

    viewRef.current = new EditorView({ state, parent: editorRef.current });
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [noteId]); // remount when note changes

  // ── Insert WikiLink from suggestion ──────────────────────────────────────
  const insertWikiLink = useCallback((suggestion: Suggestion) => {
    const view = viewRef.current;
    if (!view) return;
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    const textBefore = view.state.doc.sliceString(line.from, head);
    const wikiMatch = textBefore.match(/\[\[([^\]]*)$/);
    if (wikiMatch) {
      const from = head - wikiMatch[0].length;
      view.dispatch({
        changes: { from, to: head, insert: `[[${suggestion.title}]]` },
        selection: { anchor: from + suggestion.title.length + 4 },
      });
    }
    setShowSuggest(false);
    view.focus();
  }, []);

  // ── Keyboard navigation for autocomplete ──────────────────────────────────
  useEffect(() => {
    if (!showSuggest) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (suggestions[selectedIdx]) insertWikiLink(suggestions[selectedIdx]);
      }
      if (e.key === "Escape") setShowSuggest(false);
    }
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [showSuggest, suggestions, selectedIdx, insertWikiLink]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: "#0F0F0F" }}>
      {/* Title */}
      <div className="px-10 pt-10 pb-4">
        <input
          className="w-full text-3xl font-bold bg-transparent outline-none placeholder:text-[#333]"
          style={{ color: "#F0F0F0", fontFamily: "'Inter', sans-serif" }}
          placeholder="Note sans titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto px-10 pb-10">
        <div
          ref={editorRef}
          className="min-h-full focus-within:outline-none"
          style={{ maxWidth: "720px" }}
        />
      </div>

      {/* WikiLink autocomplete dropdown */}
      {showSuggest && suggestions.length > 0 && (
        <div
          className="fixed z-50 rounded-lg border overflow-hidden shadow-xl"
          style={{
            top: suggestPos.top,
            left: suggestPos.left,
            background: "#1E1E1E",
            borderColor: "rgba(255,255,255,0.1)",
            minWidth: "200px",
            maxWidth: "280px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {suggestQuery === "" && (
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "#555", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              Lier une note
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
              style={{
                background: i === selectedIdx ? "rgba(124,106,247,0.2)" : "transparent",
                color: i === selectedIdx ? "#C9B8FF" : "#888",
              }}
              onMouseDown={(e) => { e.preventDefault(); insertWikiLink(s); }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="text-xs">📄</span>
              <span className="text-xs truncate">{s.title}</span>
            </button>
          ))}
          <div className="px-3 py-1 text-[9px] border-t" style={{ color: "#444", borderColor: "rgba(255,255,255,0.06)" }}>
            ↑↓ naviguer · ↵ insérer · ESC fermer
          </div>
        </div>
      )}
    </div>
  );
}
