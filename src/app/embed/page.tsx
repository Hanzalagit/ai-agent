"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, X, MessageCircle } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: number;
};

type TenantConfig = {
  name: string;
  slug: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    welcomeMessage: string;
    botName: string;
  };
};

function EmbedChat() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") || "default";

  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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
            content: d.tenant.branding?.welcomeMessage || "Hi! How can I help you today?",
            time: Date.now(),
          }]);
        }
      })
      .catch(() => {
        setConfig({
          name: "Support",
          slug: tenantSlug,
          branding: {
            primaryColor: "#10b981",
            secondaryColor: "#14b8a6",
            welcomeMessage: "Hi! How can I help you today?",
            botName: "Support AI",
          },
        });
      });
  }, [tenantSlug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      time: Date.now(),
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
          })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamBuffer.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer.current += decoder.decode(value, { stream: true });

        const content = streamBuffer.current.replace(/^.*?\n/, "");

        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId ? { ...m, content } : m
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
        style={{ backgroundColor: config?.branding?.primaryColor || "#10b981" }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 w-[380px] h-[520px] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 border border-zinc-700 bg-zinc-900"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: config?.branding?.primaryColor || "#10b981" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {config?.branding?.botName?.[0] || "A"}
          </div>
          <div>
            <p className="text-sm font-semibold">{config?.branding?.botName || "AI Support"}</p>
            <p className="text-[10px] opacity-80">{config?.name}</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-900">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-md text-white"
                  : "rounded-bl-md bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm"
              }`}
              style={msg.role === "user" ? { backgroundColor: config?.branding?.primaryColor || "#10b981" } : {}}
            >
              {msg.content || (
                <span className="inline-flex gap-1 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 bg-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: config?.branding?.primaryColor || "#10b981" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-100">
          <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <EmbedChat />
    </Suspense>
  );
}
