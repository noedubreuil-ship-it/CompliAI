"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderSearch, FileText, BookOpen, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  project: FolderSearch,
  audit: FileText,
  ai_system: BookOpen,
  document: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  project: "Projet",
  audit: "Audit",
  ai_system: "Système IA",
  document: "Document",
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setActiveIndex(0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyNav(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex].href);
    }
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-w-[180px] lg:min-w-[240px]"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">Rechercher…</span>
        <kbd className="hidden lg:inline text-[10px] bg-white border rounded px-1 py-0.5 text-slate-400">⌘K</kbd>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 lg:w-96 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyNav}
              placeholder="Projets, audits, systèmes IA, documents…"
              className="flex-1 text-sm outline-none bg-transparent"
              autoComplete="off"
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {query && !loading && (
              <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {query.length < 2 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucun résultat pour &quot;{query}&quot;
              </div>
            ) : (
              <div className="py-1">
                {results.map((r, i) => {
                  const Icon = TYPE_ICONS[r.type] ?? FileText;
                  return (
                    <button
                      key={r.id + r.type}
                      onClick={() => navigate(r.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        i === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                        {r.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
