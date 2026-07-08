"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Loader2, Shield, ExternalLink,
  Mic, MicOff, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen,
  Copy, Check, FileDown, Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { LegalCitation } from "@/lib/types/legal";
import { filtrerSourcesHorsSujet } from "@/lib/ai/source-filter";
import { useAIToast } from "@/components/ui/toast-provider";
import { estimateConsultantCreditsRange } from "@/lib/ai/consultant-credits";
import { charsToRevealThisFrame } from "@/lib/chat/smooth-stream-reveal";
import { CreditsUpsellModal } from "@/components/ui/credits-upsell-modal";

const ASSISTANT_MARKDOWN_CLASS =
  "text-sm leading-relaxed text-slate-800 prose prose-sm max-w-none " +
  "prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:mt-4 prose-headings:mb-2 " +
  "prose-h1:text-base prose-h2:text-sm prose-h3:text-sm " +
  "prose-p:my-2 prose-p:leading-relaxed " +
  "prose-strong:text-slate-900 prose-strong:font-semibold " +
  "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline " +
  "prose-blockquote:border-l-4 prose-blockquote:border-blue-300 prose-blockquote:pl-4 prose-blockquote:italic " +
  "prose-blockquote:text-slate-600 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:rounded-r " +
  "prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5 " +
  "prose-ol:my-2 prose-ol:pl-4 " +
  "prose-table:text-xs prose-table:w-full " +
  "prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-semibold " +
  "prose-td:p-2 prose-td:border-b prose-td:border-slate-100 " +
  "prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-xs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: LegalCitation[];
  loading?: boolean;
  /** Réponse en cours de streaming — texte brut, pas de re-parse Markdown à chaque token */
  streaming?: boolean;
}

interface Conversation {
  id: string;
  sessionId?: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

const STORAGE_KEY = "compliai_chat_history";

function serializableMessages(messages: Message[]): Message[] {
  return messages
    .filter((m) => !m.loading && !m.streaming && m.content.trim().length > 0)
    .map(({ id, role, content, citations }) => ({ id, role, content, citations }));
}

function SourcesPanel({ sources }: { sources: LegalCitation[] }) {
  // Affichage comme avant (ouvert par défaut), mais rendu progressif pour éviter le freeze.
  const [open, setOpen] = useState(true);
  const [renderCount, setRenderCount] = useState(12);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) return;
    if (renderCount >= sources.length) return;
    const id = window.setTimeout(() => {
      setRenderCount((c) => Math.min(sources.length, c + 24));
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, renderCount, sources.length]);

  const visible = open ? sources.slice(0, renderCount) : [];

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Sources juridiques ({sources.length})
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          {open ? "Masquer" : "Afficher"}
        </button>
      </div>

      {open && renderCount < sources.length && (
        <p className="text-xs text-slate-500">
          Chargement des sources… {renderCount}/{sources.length}
        </p>
      )}

      {visible.map((cite, i) => {
        const source = cite.source ?? "rag";
        const isEurLex = source === "eurlex";
        const isNational = source === "national";
        const isCalendar = source === "calendar";
        const isEuCaseLaw = source === "eu_case_law";
        const isNationalCaseLaw = source === "national_case_law";
        const isIntlStandards = source === "intl_standards";
        const isUkRegulator = source === "uk_regulator";
        const isOfficialPortal = source === "official_portal";
        let wrapper = "bg-blue-50 border-blue-200";
        let titleColor = "text-blue-900";
        let excerptColor = "text-blue-800";
        let subColor = "text-blue-700";
        let badge: ReactNode = (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">
            CompliAI
          </span>
        );

        if (isEurLex) {
          wrapper = "bg-indigo-50 border-indigo-200";
          titleColor = "text-indigo-900";
          excerptColor = "text-indigo-800";
          subColor = "text-indigo-700";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800">
              ★ EUR-Lex
            </span>
          );
        } else if (isNational) {
          wrapper = "bg-emerald-50 border-emerald-200";
          titleColor = "text-emerald-900";
          excerptColor = "text-emerald-800";
          subColor = "text-emerald-700";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">
              National
            </span>
          );
        } else if (isEuCaseLaw) {
          wrapper = "bg-violet-50 border-violet-200";
          titleColor = "text-violet-950";
          excerptColor = "text-violet-900";
          subColor = "text-violet-800";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-200 text-violet-900">
              JP UE
            </span>
          );
        } else if (isNationalCaseLaw) {
          wrapper = "bg-sky-50 border-sky-200";
          titleColor = "text-sky-950";
          excerptColor = "text-sky-900";
          subColor = "text-sky-800";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-200 text-sky-900">
              JP national
            </span>
          );
        } else if (isCalendar) {
          wrapper = "bg-amber-50 border-amber-200";
          titleColor = "text-amber-950";
          excerptColor = "text-amber-900";
          subColor = "text-amber-800";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
              Calendrier EU
            </span>
          );
        } else if (isIntlStandards) {
          wrapper = "bg-teal-50 border-teal-200";
          titleColor = "text-teal-950";
          excerptColor = "text-teal-900";
          subColor = "text-teal-800";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-200 text-teal-900">
              ISO / NIST
            </span>
          );
        } else if (isUkRegulator) {
          wrapper = "bg-rose-50 border-rose-200";
          titleColor = "text-rose-950";
          excerptColor = "text-rose-900";
          subColor = "text-rose-800";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
              ICO UK
            </span>
          );
        } else if (isOfficialPortal) {
          wrapper = "bg-slate-50 border-slate-300";
          titleColor = "text-slate-950";
          excerptColor = "text-slate-800";
          subColor = "text-slate-700";
          badge = (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-900">
              Journal officiel
            </span>
          );
        }

        const showEuHint = isEurLex;
        let linkTone = "text-blue-600 hover:text-blue-800";
        let linkTitle = "Ouvrir la source";
        if (isEurLex) {
          linkTone = "text-indigo-600 hover:text-indigo-900";
          linkTitle = "Voir sur EUR-Lex";
        } else if (isNational) {
          linkTone = "text-emerald-600 hover:text-emerald-900";
          linkTitle = "Voir la référence nationale";
        } else if (isEuCaseLaw) {
          linkTone = "text-violet-700 hover:text-violet-950";
          linkTitle = "Voir l’arrêt / la décision";
        } else if (isNationalCaseLaw) {
          linkTone = "text-sky-700 hover:text-sky-950";
          linkTitle = "Voir la décision nationale";
        } else if (isCalendar) {
          linkTone = "text-amber-700 hover:text-amber-950";
          linkTitle = "Voir le lien calendrier";
        } else if (isIntlStandards) {
          linkTone = "text-teal-700 hover:text-teal-950";
          linkTitle = "Voir le cadre international";
        } else if (isUkRegulator) {
          linkTone = "text-rose-700 hover:text-rose-950";
          linkTitle = "Voir la doctrine ICO";
        } else if (isOfficialPortal) {
          linkTone = "text-slate-700 hover:text-slate-950";
          linkTitle = "Ouvrir le portail officiel du droit national";
        }

        const showExcerpt = expanded[i] === true;

        return (
          <div key={i} className={`rounded-lg p-3 text-xs border ${wrapper}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {badge}
                  <p className={`font-semibold ${titleColor}`}>
                    {cite.regulation}
                    {!isEurLex && cite.article_number && ` — ${cite.article_number}`}
                    {isEurLex && cite.article_number && ` · ${cite.article_number}`}
                  </p>
                </div>
                {cite.article_title && (
                  <p className={`mt-0.5 ${subColor}`}>{cite.article_title}</p>
                )}
                {cite.excerpt && cite.excerpt !== "(Consulter le texte complet sur EUR-Lex)" && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
                      className={`text-[11px] font-medium ${subColor} hover:opacity-90`}
                    >
                      {showExcerpt ? "Masquer l’extrait" : "Afficher l’extrait"}
                    </button>
                    {showExcerpt && (
                      <p className={`mt-1 italic ${excerptColor}`}>&ldquo;{cite.excerpt}&rdquo;</p>
                    )}
                  </div>
                )}
                {showEuHint && (
                  <p className="mt-1.5 text-indigo-600 font-medium">Résultat de recherche EUR-Lex — consultez le texte complet ↗</p>
                )}
              </div>
              {cite.eurlex_url && cite.eurlex_url.length > 0 && (
                <a href={cite.eurlex_url} target="_blank" rel="noopener noreferrer"
                  className={`flex-shrink-0 ${linkTone}`}
                  title={linkTitle}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MessageBubble with copy button ──────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({
  msg,
  citationFilterQuestion,
}: {
  msg: Message;
  citationFilterQuestion?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const aiToast = useAIToast();

  function copyText() {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function exportPdf() {
    const q = citationFilterQuestion?.trim();
    if (!q || !msg.content.trim() || msg.role !== "assistant") return;
    setPdfBusy(true);
    try {
      const res = await fetch("/api/consultant/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, answer: msg.content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliai-consultant-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      aiToast.aiError("Export PDF impossible pour le moment.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      {msg.role === "assistant" && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900">
          <Shield className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className={cn(
        "space-y-3",
        msg.role === "user"
          ? "max-w-[85%] rounded-3xl rounded-br-md bg-neutral-200/80 px-4 py-3 text-neutral-900"
          : "max-w-full flex-1 rounded-2xl border-0 bg-transparent px-0 py-1",
      )}>
        {msg.loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm italic">Analyse des textes de loi en cours…</span>
          </div>
        ) : (
          <>
            {msg.role === "assistant" ? (
              <div>
                <div className={ASSISTANT_MARKDOWN_CLASS}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  {msg.streaming && (
                    <span
                      className="inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom bg-blue-500/70 animate-pulse"
                      aria-hidden
                    />
                  )}
                </div>
                {msg.content && !msg.loading && !msg.streaming && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={copyText}
                      title="Copier toute la réponse"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          Copié
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copier
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={exportPdf}
                      disabled={pdfBusy || !citationFilterQuestion?.trim()}
                      title="Télécharger en PDF"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 transition-colors"
                    >
                      {pdfBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileDown className="h-3.5 w-3.5" />
                      )}
                      PDF
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            )}

            {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
              <SourcesPanel
                sources={
                  citationFilterQuestion
                    ? filtrerSourcesHorsSujet(msg.citations, citationFilterQuestion)
                    : msg.citations
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

function loadConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

function mergeServerAndLocal(
  server: Conversation[],
  local: Conversation[]
): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const c of server) {
    if (c.messages.length > 0) byId.set(c.id, c);
  }
  for (const c of local) {
    if (!byId.has(c.id) && serializableMessages(c.messages).length > 0) {
      byId.set(c.id, { ...c, messages: serializableMessages(c.messages) });
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ChatInterface() {
  const aiToast = useAIToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [responseDepth, setResponseDepth] = useState<"brief" | "detailed">("detailed");
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellBalance, setUpsellBalance] = useState(0);
  const creditRange = useMemo(
    () => estimateConsultantCreditsRange("starter", responseDepth),
    [responseDepth]
  );
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef("");
  const streamDisplayPosRef = useRef(0);
  const streamRafRef = useRef<number | null>(null);
  const streamLastFrameRef = useRef(0);
  const streamDoneRef = useRef(false);
  const streamAssistantIdRef = useRef<string | null>(null);
  const streamCitationsRef = useRef<LegalCitation[]>([]);
  const isStreamingRef = useRef(false);

  const stopStreamReveal = useCallback(() => {
    if (streamRafRef.current !== null) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }
    streamLastFrameRef.current = 0;
  }, []);

  const flushStreamReveal = useCallback(
    (assistantId: string) => {
      const target = streamBufferRef.current;
      streamDisplayPosRef.current = target.length;
      const citations = streamCitationsRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: target, citations, loading: false, streaming: false }
            : m
        )
      );
      stopStreamReveal();
    },
    [stopStreamReveal]
  );

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const startStreamReveal = useCallback(
    (assistantId: string) => {
      if (streamRafRef.current !== null) return;

      const tick = (now: number) => {
        if (streamAssistantIdRef.current !== assistantId) {
          streamRafRef.current = null;
          return;
        }

        const target = streamBufferRef.current;
        let pos = streamDisplayPosRef.current;
        const lag = target.length - pos;

        if (lag > 0) {
          const delta = streamLastFrameRef.current ? now - streamLastFrameRef.current : 16;
          streamLastFrameRef.current = now;
          pos = Math.min(pos + charsToRevealThisFrame(lag, delta), target.length);
          streamDisplayPosRef.current = pos;

          const content = target.slice(0, pos);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content, loading: false, streaming: true }
                : m
            )
          );
          scrollMessagesToBottom();
        }

        if (pos >= target.length && streamDoneRef.current) {
          const citations = streamCitationsRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: target, citations, loading: false, streaming: false }
                : m
            )
          );
          streamRafRef.current = null;
          return;
        }

        streamRafRef.current = requestAnimationFrame(tick);
      };

      streamRafRef.current = requestAnimationFrame(tick);
    },
    [scrollMessagesToBottom]
  );

  useEffect(() => {
    async function hydrateHistory() {
      const local = loadConversations();
      try {
        const res = await fetch("/api/chat/sessions");
        if (res.ok) {
          const data = (await res.json()) as { conversations?: Conversation[] };
          const merged = mergeServerAndLocal(data.conversations ?? [], local);
          setConversations(merged);
          saveConversations(merged);
          return;
        }
      } catch {
        /* repli local */
      }
      setConversations(local);
    }
    void hydrateHistory();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setSidebarOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function startNewConversation() {
    setActiveId(null);
    setMessages([]);
    setSessionId(undefined);
    setInput("");
  }

  function loadConversation(conv: Conversation) {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setSessionId(conv.sessionId ?? conv.id);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const conv = conversations.find((c) => c.id === id);
    const serverId = conv?.sessionId ?? id;
    try {
      await fetch(`/api/chat/sessions?id=${encodeURIComponent(serverId)}`, { method: "DELETE" });
    } catch {
      /* local delete anyway */
    }
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    saveConversations(updated);
    if (activeId === id) startNewConversation();
  }

  function persistMessages(
    convId: string,
    convMessages: Message[],
    firstQuestion: string,
    serverSessionId?: string
  ) {
    const existing = loadConversations();
    const idx = existing.findIndex((c) => c.id === convId);
    const stableId = serverSessionId ?? existing[idx]?.sessionId ?? convId;
    const entry: Conversation = {
      id: stableId,
      sessionId: serverSessionId ?? existing[idx]?.sessionId,
      title: firstQuestion.length > 55 ? firstQuestion.slice(0, 55) + "…" : firstQuestion,
      messages: serializableMessages(convMessages),
      createdAt: idx >= 0 ? existing[idx].createdAt : new Date().toISOString(),
    };
    const withoutDup = existing.filter((c) => c.id !== convId && c.id !== stableId);
    const updated = [entry, ...withoutDup];
    saveConversations(updated);
    setConversations(updated);
    if (activeId === convId && stableId !== convId) {
      setActiveId(stableId);
    }
  }

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
      setListening(true);
    }
  }

  useEffect(() => {
    if (isStreamingRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question?: string) {
    const q = question ?? input.trim();
    if (!q || streaming) return;

    setInput("");
    setStreaming(true);
    isStreamingRef.current = true;
    streamBufferRef.current = "";
    streamDisplayPosRef.current = 0;
    streamDoneRef.current = false;
    streamCitationsRef.current = [];
    stopStreamReveal();

    const convId = activeId ?? crypto.randomUUID();
    if (!activeId) setActiveId(convId);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", loading: true };
    streamAssistantIdRef.current = assistantId;

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);

    const firstQuestion = messages.length === 0 ? q : (conversations.find((c) => c.id === convId)?.title ?? q);

    let resolvedSessionId = sessionId;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          session_id: sessionId,
          response_depth: responseDepth === "brief" ? "brief" : undefined,
        }),
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        setUpsellBalance(data.balance ?? 0);
        setUpsellOpen(true);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        isStreamingRef.current = false;
        setStreaming(false);
        return;
      }
      if (res.status === 429) {
        aiToast.rateLimited();
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        isStreamingRef.current = false;
        setStreaming(false);
        return;
      }
      if (res.status === 503) {
        const data = await res.json().catch(() => ({}));
        aiToast.aiError((data as { error?: string }).error);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        isStreamingRef.current = false;
        setStreaming(false);
        return;
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let citations: LegalCitation[] = [];
      let finalMessages = newMessages;
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "citations") {
              citations = event.citations;
              streamCitationsRef.current = event.citations;
            } else if (event.type === "text" && typeof event.text === "string") {
              streamBufferRef.current += event.text;
              startStreamReveal(assistantId);
            } else if (event.type === "error") {
              stopStreamReveal();
              aiToast.aiError(typeof event.message === "string" ? event.message : undefined);
              setMessages((prev) => prev.filter((m) => m.id !== assistantId));
              setStreaming(false);
              isStreamingRef.current = false;
              return;
            } else if (event.type === "replace" && typeof event.text === "string") {
              streamBufferRef.current = event.text;
              flushStreamReveal(assistantId);
            } else if (event.type === "done") {
              streamDoneRef.current = true;
              streamCitationsRef.current = citations;
              flushStreamReveal(assistantId);
              if (typeof event.session_id === "string") {
                resolvedSessionId = event.session_id;
                setSessionId(event.session_id);
              }
              if (typeof event.credits_consumed === "number" && event.credits_consumed > 0) {
                window.dispatchEvent(
                  new CustomEvent("compliai:credits-updated", {
                    detail: {
                      consumed: event.credits_consumed,
                      balance: event.new_balance,
                    },
                  })
                );
              }
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      // Si le serveur n'a pas émis "done", afficher le buffer restant
      if (!streamDoneRef.current) {
        streamDoneRef.current = true;
        flushStreamReveal(assistantId);
      }
      await new Promise<void>((resolve) => {
        const waitDone = () => {
          if (streamRafRef.current === null) {
            resolve();
            return;
          }
          requestAnimationFrame(waitDone);
        };
        waitDone();
      });

      setMessages((prev) => {
        finalMessages = prev;
        return prev;
      });
      isStreamingRef.current = false;

      persistMessages(convId, finalMessages, firstQuestion, resolvedSessionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      aiToast.aiError(msg.includes("fetch") ? undefined : msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Une erreur est survenue. Veuillez réessayer.", loading: false }
            : m
        )
      );
    } finally {
      stopStreamReveal();
      streamAssistantIdRef.current = null;
      isStreamingRef.current = false;
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0 bg-[#fafafa]">
      {/* Sidebar historique — style Claude */}
      <div className={cn(
        "flex flex-col border-r border-neutral-200/80 bg-[#f5f5f5] transition-all duration-200 shrink-0 overflow-hidden",
        sidebarOpen ? "w-60" : "w-0"
      )}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200/80 shrink-0">
          <span className="text-xs font-medium text-neutral-500">Conversations</span>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
            onClick={startNewConversation}
            title="Nouvelle conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {conversations.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-6 px-2">Aucune conversation</p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-xs transition-colors",
                activeId === conv.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:bg-white/80 hover:text-neutral-900",
              )}
            >
              <button
                type="button"
                onClick={() => loadConversation(conv)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-snug">{conv.title}</p>
                  <p className="text-slate-400 mt-0.5">{formatRelativeDate(conv.createdAt)}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => deleteConversation(conv.id, e)}
                className="shrink-0 mt-0.5 text-slate-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 transition-all"
                aria-label="Supprimer la conversation"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="relative flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800 transition-colors"
            title={sidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={startNewConversation}
            className="h-8 rounded-lg text-xs text-neutral-600 hover:bg-neutral-200/60"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nouveau
          </Button>
          {/* Art. 50 AI Act — badge IA générative permanent */}
          <a
            href="/transparence-ia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            title="Cet outil est une intelligence artificielle — voir la page de transparence"
          >
            <Bot className="h-3 w-3" />
            IA générative
          </a>
        </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6 pt-10">
        {messages.length === 0 && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 shadow-sm">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Comment puis-je vous aider ?
            </h1>
            <p className="mt-2 max-w-md text-sm text-neutral-500 leading-relaxed">
              Consultant RGPD, AI Act et droit national UE-27 — réponses sourcées à partir du corpus indexé.
              Information juridique, pas un conseil personnalisé.
            </p>
            {/* Art. 50 AI Act — déclaration transparence IA obligatoire depuis août 2025 */}
            <div className="mt-5 flex max-w-md items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-left text-xs text-blue-800">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p className="leading-relaxed">
                Vous interagissez avec <strong>CompliAI</strong>, une intelligence artificielle basée sur Claude Sonnet&nbsp;4.6.
                Les réponses sont générées par IA à partir de sources juridiques officielles européennes (EUR-Lex, EDPB, CJUE, autorités nationales de protection des données).
                Elles constituent un support à la décision juridique et doivent être validées par un professionnel avant application définitive.{" "}
                <a href="/transparence-ia" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                  En savoir plus
                </a>
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const citationFilterQuestion =
            msg.role === "assistant"
              ? (() => {
                  for (let j = index - 1; j >= 0; j--) {
                    if (messages[j].role === "user") return messages[j].content;
                  }
                  return undefined;
                })()
              : undefined;
          return (
            <MessageBubble key={msg.id} msg={msg} citationFilterQuestion={citationFilterQuestion} />
          );
        })}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — barre flottante type Claude */}
      <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="text-xs text-neutral-500">Format</span>
            <div className="inline-flex gap-0.5 rounded-full border border-neutral-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                disabled={streaming}
                onClick={() => setResponseDepth("detailed")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50",
                  responseDepth === "detailed"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                Note développée
              </button>
              <button
                type="button"
                disabled={streaming}
                onClick={() => setResponseDepth("brief")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50",
                  responseDepth === "brief"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                Synthèse courte
              </button>
            </div>
            <span className="text-xs text-neutral-400">
              ~{creditRange.min}–{creditRange.typical} crédits / question
            </span>
          </div>
          <div className="relative flex items-end gap-2 rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg shadow-neutral-200/50 ring-1 ring-neutral-100">
            <div className="relative flex-1">
              <Textarea
                placeholder={listening ? "Parlez maintenant…" : "Posez votre question juridique…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                className={cn(
                  "min-h-[44px] max-h-40 resize-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:ring-0",
                  listening && "ring-2 ring-red-200",
                )}
                disabled={streaming}
              />
              {/* Micro button inside textarea */}
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  disabled={streaming}
                  title={listening ? "Arrêter l'écoute" : "Parler à l'IA"}
                  className={`absolute right-3 bottom-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    listening
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  }`}
                >
                  {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              size="icon"
              className="mb-0.5 h-9 w-9 shrink-0 rounded-xl bg-neutral-900 hover:bg-neutral-800"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-center text-[11px] text-neutral-400">
            {listening
              ? "Écoute en cours — parlez en français puis recliquez sur le micro"
              : "Les outils juridiques (DPIA, comparateur UE-27…) sont dans le menu en haut."}
          </p>
        </div>
      </div>
      </div>

      <CreditsUpsellModal
        open={upsellOpen}
        balance={upsellBalance}
        onClose={() => setUpsellOpen(false)}
      />
    </div>
  );
}
