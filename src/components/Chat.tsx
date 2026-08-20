"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const SUGGESTIONS = [
  "Which products do you have?",
  "I want to book a skin consultation",
  "Do you have a Vitamin C cream?",
  "What is your return policy?",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Asha from Ay Cosmetics 🌸 — ask me about products, orders, bookings, or anything beauty-related.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer.current += decoder.decode(value, { stream: true });
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
            ? { ...m, content: "Network error — please check your connection and retry.", error: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] max-h-[640px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-xl shadow-rose-100/60">
      <div className="flex items-center gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-fuchsia-50 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-500 text-lg text-white">
          🌸
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-900">Asha · Ay Cosmetics</p>
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Online — usually replies instantly
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
                  ? "rounded-br-sm bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white"
                  : m.error
                    ? "rounded-bl-sm border border-rose-200 bg-rose-50 text-rose-700"
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
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
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
            placeholder="Type your message…"
            className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-rose-300 focus:bg-white"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}