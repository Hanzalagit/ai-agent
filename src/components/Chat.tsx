"use client";

import { useEffect, useRef, useState } from "react";

type ChatSource = {
  title: string;
  url: string;
  snippet: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  error?: boolean;
};

const SUGGESTIONS = [
  "What's happening in the world today?",
  "Explain how artificial intelligence works",
  "What is the capital of France?",
  "Give me a simple recipe for pasta",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. I can answer almost any question — news, facts, ideas, coding, writing and more, with search-backed information. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");
  const sourcesRef = useRef<ChatSource[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    const draftId = crypto.randomUUID();
    const draftMessage: ChatMessage = {
      id: draftId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, draftMessage]);
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMessage];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        let errorMsg = "Something went wrong. Please try again.";
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          /* keep default */
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId
              ? { ...m, content: errorMsg, error: true }
              : m
          )
        );
        return;
      }

      if (!res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId
              ? { ...m, content: "No response received." }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamBuffer.current = "";
      sourcesRef.current = [];
      let headerParsed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer.current += decoder.decode(value, { stream: true });

        if (!headerParsed) {
          const nlIndex = streamBuffer.current.indexOf("\n");
          if (nlIndex !== -1) {
            const headerLine = streamBuffer.current.slice(0, nlIndex);
            streamBuffer.current = streamBuffer.current.slice(nlIndex + 1);
            headerParsed = true;
            try {
              const parsed = JSON.parse(headerLine);
              sourcesRef.current = Array.isArray(parsed.__sources)
                ? parsed.__sources
                : [];
            } catch {
              sourcesRef.current = [];
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === draftId
              ? { ...m, content: streamBuffer.current, sources: sourcesRef.current }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === draftId
            ? { ...m, content: "Network error — please check your connection and retry.", error: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] max-h-[640px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60">
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg text-white">
          ✨
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-900">AI Assistant</p>
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Online — search-grounded, up-to-date answers
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-white px-5 py-5"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-gradient-to-br from-indigo-600 to-violet-700 text-white"
                  : m.error
                    ? "rounded-bl-sm border border-red-200 bg-red-50 text-red-700"
                    : "rounded-bl-sm border border-zinc-100 bg-zinc-50 text-zinc-800"
              }`}
            >
              {m.content}
              {m.content === "" && m.role === "assistant" && (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                </span>
              )}
              {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-zinc-200 pt-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Sources
                  </p>
                  <ul className="space-y-1">
                    {m.sources.map((s) => (
                      <li key={s.url} className="text-xs leading-snug">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {s.title || s.url}
                        </a>
                        {s.snippet && (
                          <span className="text-zinc-500"> — {s.snippet}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {messages.length <= 1 && !isLoading && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-5 pb-3 pt-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-100 bg-white p-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything…"
            className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}