"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, Send, Mic, MicOff, Sun, Moon, X, MessageSquare, Sparkles
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: number;
  image?: string;
};

type TenantConfig = {
  id: string;
  name: string;
  slug: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    welcomeMessage: string;
    botName: string;
    darkMode: boolean;
  };
};

function ChatInterface() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") || "default";

  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBuffer = useRef("");

  useEffect(() => {
    fetch(`/api/tenant/public?slug=${tenantSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setConfig(d.tenant);
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: d.tenant.branding?.welcomeMessage || `Hi! I'm ${d.tenant.name}'s AI assistant. How can I help you today?`,
            time: Date.now(),
          }]);
        }
      })
      .catch(() => {
        setConfig({
          id: "default",
          name: "AI Support",
          slug: tenantSlug,
          branding: {
            primaryColor: "#10b981",
            secondaryColor: "#14b8a6",
            welcomeMessage: "Hi! How can I help you today?",
            botName: "AI Support",
            darkMode: false,
          },
        });
      });
  }, [tenantSlug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(async (text: string, image?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    if (isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed || "What's in this image?",
      time: Date.now(),
      image,
    };

    const draftId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: draftId, role: "assistant", content: "", time: Date.now() },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantSlug,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.image ? { image: m.image } : {}),
          })),
        }),
      });

      if (!res.ok || !res.body) {
        let errorMsg = "Something went wrong. Please try again.";
        try {
          const d = await res.json();
          errorMsg = d.error ?? errorMsg;
        } catch {}
        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId ? { ...m, content: errorMsg } : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamBuffer.current = "";
      let headerParsed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer.current += decoder.decode(value, { stream: true });

        if (!headerParsed) {
          const nl = streamBuffer.current.indexOf("\n");
          if (nl !== -1) {
            streamBuffer.current = streamBuffer.current.slice(nl + 1);
            headerParsed = true;
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId
              ? { ...m, content: streamBuffer.current }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === draftId
            ? { ...m, content: "Network error. Please check your connection." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, tenantSlug]);

  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported. Use Chrome or Edge.");
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const copyMessage = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  function parseActions(text: string) {
    const pattern = /\[OPEN:([^\]|]+)\|([^\]]+)\]/g;
    const actions: { label: string; url: string }[] = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      actions.push({ label: match[1].trim(), url: match[2].trim() });
    }
    return { text: text.replace(pattern, "").trim(), actions };
  }

  function renderMarkdown(text: string) {
    return text.split("\n").map((line, idx) => {
      const t = line.trim();
      if (!t) return <div key={idx} className="h-2" />;
      const parts = t.split(/(\*\*[^*]+\*\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g).filter(Boolean);
      return (
        <p key={idx} className="whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**"))
              return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
            if (part.startsWith("`") && part.endsWith("`"))
              return <code key={i} className="rounded bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-700 dark:text-emerald-400">{part.slice(1, -1)}</code>;
            const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch)
              return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">{linkMatch[1]}</a>;
            return <span key={i}>{part}</span>;
          })}
        </p>
      );
    });
  }

  const primaryColor = config?.branding?.primaryColor || "#10b981";
  const botName = config?.branding?.botName || "AI Support";
  const businessName = config?.name || "Support";

  return (
    <div className={`flex flex-col h-dvh ${theme === "dark" ? "dark" : ""}`}>
      <div className="flex flex-col h-full bg-zinc-950">
        <header className="relative bg-zinc-950 dark:bg-zinc-950 shrink-0">
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(to right, ${primaryColor}, ${config?.branding?.secondaryColor || primaryColor})` }}
          />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="relative shrink-0">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl font-mono text-[10px] font-bold text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {botName[0]}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-950 ${isLoading ? 'bg-amber-400' : 'bg-emerald-400'}`}>
                <span className={`absolute inset-0 rounded-full ${isLoading ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping opacity-40`} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{botName}</p>
              <p className="font-mono text-[10px] text-zinc-400">{businessName}</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{botName}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  How can I help you today?
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => {
                  const parsed = parseActions(msg.content);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div
                          className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center font-mono text-[10px] font-bold text-white mr-3"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {botName[0]}
                        </div>
                      )}
                      <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                        <div
                          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "rounded-br-md text-white"
                              : "rounded-bl-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                          }`}
                          style={msg.role === "user" ? { backgroundColor: primaryColor } : {}}
                        >
                          {msg.content ? renderMarkdown(parsed.text) : (
                            <span className="inline-flex gap-1 py-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: primaryColor, animationDelay: "0ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: primaryColor, animationDelay: "150ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: primaryColor, animationDelay: "300ms" }} />
                            </span>
                          )}

                          {parsed.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {parsed.actions.map((a) => (
                                <a
                                  key={a.url}
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  {a.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {msg.role === "assistant" && msg.content && (
                          <button
                            onClick={() => copyMessage(msg.content, msg.id)}
                            className="mt-1 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedId === msg.id ? "Copied!" : "Copy"}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="mx-auto max-w-3xl flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 pr-12 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-3 bottom-2.5 p-1 rounded-lg transition-colors ${
                  isListening
                    ? "text-red-500 animate-pulse"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl text-white disabled:opacity-50 transition-all shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-sm font-bold text-zinc-950">
            {"</>"}
          </div>
          <div className="flex gap-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SuspenseWrapper>
      <ChatInterface />
    </SuspenseWrapper>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  const [Suspense] = useState(() => {
    return require("react").Suspense;
  });
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
