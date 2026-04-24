"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Shield, ExternalLink, BookOpen, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LegalCitation } from "@/lib/types/legal";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: LegalCitation[];
  loading?: boolean;
}

const EXAMPLE_QUESTIONS = [
  "Puis-je utiliser la reconnaissance faciale pour pointer mes employés ?",
  "Mon chatbot doit-il être déclaré en vertu de l'AI Act ?",
  "Quelles sont mes obligations RGPD si j'entraîne un modèle sur des données clients ?",
  "Qu'est-ce qu'un système IA à haut risque selon l'Annexe III de l'AI Act ?",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question?: string) {
    const q = question ?? input.trim();
    if (!q || streaming) return;

    setInput("");
    setStreaming(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, session_id: sessionId }),
      });

      if (!res.ok) throw new Error("Erreur réseau");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let citations: LegalCitation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "citations") {
              citations = event.citations;
            } else if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.text, loading: false }
                    : m
                )
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, citations, loading: false } : m
                )
              );
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Une erreur est survenue. Veuillez réessayer.", loading: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-3 bg-slate-50">
        <div className="p-2 bg-slate-900 rounded-lg">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold">Consultant juridique IA</h1>
          <p className="text-xs text-muted-foreground">
            Réponses basées exclusivement sur le droit européen (AI Act, RGPD, DSA, DMA)
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto mt-8 space-y-6">
            <div className="text-center space-y-2">
              <BookOpen className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-slate-600 font-medium">Questions fréquentes</p>
              <p className="text-sm text-muted-foreground">
                Je réponds uniquement à partir des textes de loi européens indexés.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 mt-1">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div
              className={`space-y-3 ${
                msg.role === "user"
                  ? "max-w-xl bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-3"
                  : "flex-1 max-w-2xl bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm"
              }`}
            >
              {msg.loading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm italic">Analyse des textes de loi en cours…</span>
                </div>
              ) : (
                <>
                  {msg.role === "assistant" ? (
                    <div className="text-sm leading-relaxed text-slate-800 prose prose-sm max-w-none
                      prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:mt-4 prose-headings:mb-2
                      prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
                      prose-p:my-2 prose-p:leading-relaxed
                      prose-strong:text-slate-900 prose-strong:font-semibold
                      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                      prose-blockquote:border-l-4 prose-blockquote:border-blue-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:rounded-r
                      prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5
                      prose-ol:my-2 prose-ol:pl-4
                      prose-table:text-xs prose-table:w-full
                      prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-semibold
                      prose-td:p-2 prose-td:border-b prose-td:border-slate-100
                      prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Sources juridiques ({msg.citations.length})
                      </p>
                      {msg.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-blue-900">
                                {cite.regulation}
                                {cite.article_number && ` — Art. ${cite.article_number}`}
                              </p>
                              {cite.article_title && (
                                <p className="text-blue-700 mt-0.5">{cite.article_title}</p>
                              )}
                              <p className="text-blue-800 mt-1.5 italic">&ldquo;{cite.excerpt}&rdquo;</p>
                            </div>
                            {cite.eurlex_url && (
                              <a
                                href={cite.eurlex_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4 bg-white shadow-[0_-1px_4px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                placeholder={listening ? "Parlez maintenant…" : "Ex: Puis-je utiliser des données de santé pour entraîner mon modèle IA ?"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                className={`resize-none pr-12 transition-all ${listening ? "border-red-400 ring-2 ring-red-200" : ""}`}
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
              className="flex-shrink-0 mb-0.5"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {listening
              ? "🔴 Écoute en cours — parlez clairement en français, puis cliquez sur le micro pour envoyer"
              : "Informations juridiques uniquement — Consultez un avocat pour des conseils personnalisés"}
          </p>
        </div>
      </div>
    </div>
  );
}
