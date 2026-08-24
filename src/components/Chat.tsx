"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatSource = {
  title: string;
  url: string;
  snippet: string;
};

type ChatAction = {
  label: string;
  url: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  actions?: ChatAction[];
  error?: boolean;
  time: number;
};

type Session = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

type SpeechAlt = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlt };
type SpeechEvent = {
  resultIndex: number;
  results: { length: number } & Record<number, SpeechResult>;
};
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const STORAGE_KEY = "ai-agent-sessions-v1";
const ACTIVE_KEY = "ai-agent-active-v1";
const VOICE_KEY = "ai-agent-voice-v1";
const MAX_SESSIONS = 60;

const SUGGESTIONS = [
  "Aaj cinema mein konsi movies lag rahi hain?",
  "CineStar Lahore ki aaj ki showtimes batao",
  "Lipstick kitne ki hai?",
  "Mera order ORD-1001 kahan tak pohancha?",
];

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Session =>
        s && typeof s.id === "string" && Array.isArray(s.messages)
    );
  } catch {
    return [];
  }
}

function newSession(): Session {
  return {
    id: crypto.randomUUID(),
    title: "Nayi chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function bootstrap(): { sessions: Session[]; activeId: string; voiceOn: boolean } {
  const loaded = loadSessions();
  const sessions = loaded.length > 0 ? loaded : [newSession()];
  const savedActive =
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) ?? "" : "";
  const activeId = sessions.some((s) => s.id === savedActive)
    ? savedActive
    : [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
  const voiceOn = localStorage.getItem(VOICE_KEY) === "on";
  return { sessions, activeId, voiceOn };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Aaj";
  if (sameDay(d, yesterday)) return "Kal";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function stripForSpeech(text: string): string {
  return text
    .replace(/\[OPEN:[^\]]*\|[^\]]*\]/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_`#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />;
    const bullet = /^[-•*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      return (
        <div key={idx} className="flex gap-2 pl-1">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/70" />
          <span>{renderInline(bullet[1], `b${idx}`)}</span>
        </div>
      );
    }
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      return (
        <div key={idx} className="flex gap-2 pl-1">
          <span className="shrink-0 font-mono text-xs font-semibold text-emerald-600">
            {numbered[1]}.
          </span>
          <span>{renderInline(numbered[2], `n${idx}`)}</span>
        </div>
      );
    }
    return <p key={idx}>{renderInline(trimmed, `p${idx}`)}</p>;
  });
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 11.5a7 7 0 0 1-14 0M12 18.5V22m-3.5 0h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {active && (
        <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M4.5 12 20 4.5 15 20l-3.5-6L4.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <path
        d="M6 7h12m-9 0V5h6v2m-8 0 1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Chat() {
  const [boot] = useState(bootstrap);
  const [sessions, setSessions] = useState<Session[]>(boot.sessions);
  const [activeId, setActiveId] = useState<string>(boot.activeId);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(boot.voiceOn);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceError, setVoiceError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuffer = useRef("");
  const sourcesRef = useRef<ChatSource[]>([]);
  const recognitionRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sessions.slice(0, MAX_SESSIONS))
      );
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {}
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [sessions, activeId, isLoading]);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      recognitionRef.current?.stop();
    };
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId),
    [sessions, activeId]
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  function speak(text: string) {
    if (!ttsEnabled || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    const clean = stripForSpeech(text);
    if (!clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice =
      voices.find((v) => /^ur/i.test(v.lang)) ??
      voices.find((v) => /^hi/i.test(v.lang)) ??
      voices.find((v) => /^en/i.test(v.lang)) ??
      null;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleTts() {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    try {
      localStorage.setItem(VOICE_KEY, next ? "on" : "off");
    } catch {}
    if (!next && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }

  const updateActiveSession = useCallback(
    (updater: (session: Session) => Session) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId ? { ...updater(s), updatedAt: Date.now() } : s
        )
      );
    },
    [activeId]
  );

  const patchDraftMessage = useCallback(
    (draftId: string, patch: Partial<ChatMessage>) => {
      updateActiveSession((session) => ({
        ...session,
        messages: session.messages.map((m) =>
          m.id === draftId ? { ...m, ...patch } : m
        ),
      }));
    },
    [updateActiveSession]
  );

  function parseActions(raw: string): { text: string; actions: ChatAction[] } {
    const pattern = /\[OPEN:([^\]|]+)\|([^\]]+)\]/g;
    const actions: ChatAction[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
      actions.push({ label: match[1].trim(), url: match[2].trim() });
    }
    const text = raw.replace(pattern, "").trim();
    return { text, actions };
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !activeId) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        time: Date.now(),
      };
      const draftId = crypto.randomUUID();

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                title:
                  s.title === "Nayi chat"
                    ? trimmed.length > 42
                      ? `${trimmed.slice(0, 42)}…`
                      : trimmed
                    : s.title,
                messages: [
                  ...s.messages,
                  userMessage,
                  {
                    id: draftId,
                    role: "assistant",
                    content: "",
                    time: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : s
        )
      );
      setInput("");
      setIsLoading(true);
      setSidebarOpen(false);

      const historySnapshot =
        sessions.find((s) => s.id === activeId)?.messages ?? [];
      const payload = [...historySnapshot, userMessage].map(
        ({ role, content }) => ({ role, content })
      );

      let finalText = "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload }),
        });

        if (!res.ok || !res.body) {
          let errorMsg = "Something went wrong. Please try again.";
          try {
            const data = await res.json();
            errorMsg = data.error ?? errorMsg;
          } catch {}
          patchDraftMessage(draftId, { content: errorMsg, error: true });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        streamBuffer.current = "";
        sourcesRef.current = [];
        let headerParsed = false;

        const flush = () => {
          const parsed = parseActions(streamBuffer.current);
          patchDraftMessage(draftId, {
            content: parsed.text,
            sources: sourcesRef.current,
            actions: parsed.actions,
          });
        };

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
                const parsedHeader = JSON.parse(headerLine);
                sourcesRef.current = Array.isArray(parsedHeader.__sources)
                  ? parsedHeader.__sources
                  : [];
              } catch {
                sourcesRef.current = [];
              }
            }
          }
          flush();
        }

        const final = parseActions(streamBuffer.current);
        finalText = final.text;
        patchDraftMessage(draftId, {
          content: final.text,
          sources: sourcesRef.current,
          actions: final.actions,
        });
      } catch {
        patchDraftMessage(draftId, {
          content: "Network error — please check your connection and retry.",
          error: true,
        });
      } finally {
        setIsLoading(false);
        if (finalText) speak(finalText);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, activeId, sessions, ttsEnabled, patchDraftMessage]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const ctor =
      typeof window !== "undefined"
        ? ((window as unknown as Record<string, unknown>)
            .SpeechRecognition as unknown) ??
          ((window as unknown as Record<string, unknown>)
            .webkitSpeechRecognition as unknown)
        : undefined;
    if (!ctor) {
      setVoiceError(
        "Is browser mein voice support nahi hai — Chrome ya Edge use karein."
      );
      setTimeout(() => setVoiceError(""), 4000);
      return;
    }
    const recognition = new (ctor as new () => RecognitionLike)();
    recognition.lang = "ur-PK";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText || finalText);
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterim("");
      recognitionRef.current = null;
      const said = finalText.trim();
      if (said) void sendMessage(said);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setInterim("");
    setIsListening(true);
    recognition.start();
  }, [isListening, sendMessage]);

  function handleNewChat() {
    const existingEmpty = sessions.find((s) => s.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
    } else {
      const fresh = newSession();
      setSessions((prev) => [fresh, ...prev]);
      setActiveId(fresh.id);
    }
    setSidebarOpen(false);
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = newSession();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        setActiveId(
          [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0].id
        );
      }
      return remaining;
    });
  }

  const messages = activeSession?.messages ?? [];
  const isEmptyChat = messages.length === 0 && !isLoading;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-zinc-50 font-sans">
      {/* ---- Sidebar ---- */}
      {sidebarOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-sm font-bold text-zinc-950 shadow-md shadow-emerald-500/20">
            {"</>"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-white">
              AI Agent
            </p>
            <p className="font-mono text-[10px] leading-none text-zinc-500">
              autonomous · gemini-powered
            </p>
          </div>
          <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-emerald-400">
            v2.0
          </span>
        </div>

        <div className="px-4 pb-3 pt-4">
          <button
            onClick={handleNewChat}
            className="group flex w-full items-center justify-between rounded-lg border border-dashed border-white/15 px-3.5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-zinc-500 transition group-hover:text-emerald-400"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Nayi Chat
            </span>
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
              ctrl+k
            </kbd>
          </button>
        </div>

        <p className="px-5 pb-1.5 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
          {"// History"}
        </p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {sortedSessions.map((session) => {
            const isActive = session.id === activeId;
            const lastMsg = session.messages[session.messages.length - 1];
            return (
              <button
                key={session.id}
                onClick={() => {
                  setActiveId(session.id);
                  setSidebarOpen(false);
                }}
                className={`group relative w-full rounded-lg px-3 py-2.5 text-left transition ${
                  isActive
                    ? "bg-emerald-400/[0.08] ring-1 ring-inset ring-emerald-400/20"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`min-w-0 flex-1 truncate text-[13px] font-medium ${
                      isActive ? "text-emerald-300" : "text-zinc-300"
                    }`}
                  >
                    {session.title}
                  </p>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
                    className="hidden shrink-0 rounded-md p-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 group-hover:block"
                    aria-label="Delete chat"
                  >
                    <TrashIcon />
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-600">
                  {lastMsg
                    ? `${relativeDay(session.updatedAt)} · ${stripForSpeech(lastMsg.content).slice(0, 32)}…`
                    : `${relativeDay(session.updatedAt)} · empty`}
                </p>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="flex items-center gap-2 font-mono text-[10px] leading-relaxed text-zinc-600">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            gemini-flash · live-search · tools[8]
          </p>
        </div>
      </aside>

      {/* ---- Main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[10px] font-bold text-zinc-950 lg:hidden">
            {"</>"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {activeSession?.title ?? "AI Agent"}
            </p>
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              online — ready for tasks
            </p>
          </div>
          <span className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] text-zinc-500 sm:block">
            fetch_webpage · open_website · run_command
          </span>
          <button
            onClick={toggleTts}
            title={
              ttsEnabled
                ? "Awaz band karein"
                : "Jawab awaz mein sunein (on karein)"
            }
            className={`rounded-lg border p-2 transition ${
              ttsEnabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {ttsEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M11 5 6.5 9H3v6h3.5L11 19V5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M11 5 6.5 9H3v6h3.5L11 19V5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m16 9 5 6m0-6-5 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          <button
            onClick={handleNewChat}
            className="hidden rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 sm:block"
          >
            + Nayi Chat
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {isEmptyChat ? (
              <div className="flex flex-col items-center pb-10 pt-14 text-center sm:pt-20">
                <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-left shadow-xl">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                    <span className="ml-3 font-mono text-[10px] text-zinc-500">
                      ai-agent — zsh
                    </span>
                  </div>
                  <div className="space-y-1 px-4 py-4 font-mono text-xs">
                    <p className="text-zinc-500">
                      <span className="text-emerald-400">$</span> whoami
                    </p>
                    <p className="text-zinc-300">
                      personal AI agent — web reader, task runner, voice mode
                    </p>
                    <p className="pt-1 text-zinc-500">
                      <span className="text-emerald-400">$</span> status
                    </p>
                    <p className="text-zinc-300">
                      <span className="animate-pulse text-emerald-400">▊</span>{" "}
                      ready — boliye ya type karein
                    </p>
                  </div>
                </div>
                <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => void sendMessage(suggestion)}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-[13px] font-medium text-zinc-700 shadow-sm transition hover:border-emerald-400/40 hover:bg-emerald-50/40"
                    >
                      <span>{suggestion}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500"
                      >
                        <path
                          d="M5 12h14m-6-6 6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2.5 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[10px] font-bold text-zinc-950 shadow-sm">
                        {"</>"}
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] ${message.role === "user" ? "items-end" : ""}`}
                    >
                      <div
                        className={`space-y-2 whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "rounded-br-md bg-zinc-900 text-zinc-100 shadow-sm"
                            : message.error
                              ? "rounded-bl-md border border-red-200 bg-red-50 text-red-700"
                              : "rounded-bl-md border border-zinc-200 bg-white text-zinc-800 shadow-sm shadow-zinc-100"
                        }`}
                      >
                        {message.content
                          ? renderMarkdown(message.content)
                          : message.role === "assistant" && (
                              <span className="inline-flex gap-1 py-1">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70 [animation-delay:150ms]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70 [animation-delay:300ms]" />
                              </span>
                            )}

                        {message.role === "assistant" &&
                          message.actions &&
                          message.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1.5">
                              {message.actions.map((action) => (
                                <a
                                  key={action.url}
                                  href={action.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-emerald-300 shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-zinc-700"
                                >
                                  → {action.label}
                                </a>
                              ))}
                            </div>
                          )}

                        {message.role === "assistant" &&
                          message.sources &&
                          message.sources.length > 0 && (
                            <details className="border-t border-zinc-100 pt-2">
                              <summary className="cursor-pointer select-none font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition hover:text-zinc-600">
                                sources({message.sources.length})
                              </summary>
                              <ul className="mt-1.5 space-y-1">
                                {message.sources.map((source, i) => (
                                  <li
                                    key={source.url}
                                    className="text-xs leading-snug"
                                  >
                                    <span className="mr-1 font-mono text-[10px] text-zinc-300">
                                      [{i + 1}]
                                    </span>
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                      {source.title || source.url}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                      </div>
                      <p
                        className={`mt-1 font-mono text-[10px] text-zinc-400 ${message.role === "user" ? "text-right" : ""}`}
                      >
                        {formatTime(message.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---- Composer ---- */}
        <div className="border-t border-zinc-200 bg-white px-4 pb-4 pt-3 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {(isListening || voiceError) && (
              <div
                className={`mb-2 flex items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs ${
                  voiceError
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {!voiceError && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
                {voiceError ||
                  (interim
                    ? `> "${interim}"`
                    : "> listening… bolein (Urdu / English)")}
              </div>
            )}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
            >
              <button
                type="button"
                onClick={toggleListening}
                title="Bol kar poochein"
                className={`shrink-0 rounded-xl border p-3 transition active:scale-95 ${
                  isListening
                    ? "animate-pulse border-red-300 bg-red-50 text-red-600"
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-emerald-400 hover:text-emerald-600"
                }`}
              >
                <MicIcon active={isListening} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={1}
                placeholder={
                  isListening
                    ? "Sun raha hoon…"
                    : "Task do — ya mic dabaa kar bolein…"
                }
                className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:font-mono placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="shrink-0 rounded-xl bg-zinc-900 p-3 text-emerald-300 shadow-sm transition hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <SendIcon />
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-400">
              <span>
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1">
                  Enter
                </kbd>{" "}
                send ·{" "}
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1">
                  Shift+Enter
                </kbd>{" "}
                new line
              </span>
              <span>agent ghalat ho sakta hai — verify kar lein</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
