"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Menu, Volume2, VolumeX, Sun, Moon, Plus, Trash2, Send, Mic, MicOff,
  Search, ShoppingCart, MessageSquare, Cloud, Bot, User, Sparkles, X,
  ChevronRight, Copy, Check, RotateCcw, Zap, Image, Download, Share2,
  Settings, Command, ArrowUp, Globe, FileText, Calendar, Mail, BarChart3,
  Keyboard, Lightbulb, RefreshCw, ThumbsUp, ThumbsDown, ExternalLink,
  Paperclip, Smile, ImageIcon
} from "lucide-react";

// ============= Types =============
type ChatSource = { title: string; url: string; snippet: string };
type ChatAction = { label: string; url: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  actions?: ChatAction[];
  error?: boolean;
  time: number;
  feedback?: "up" | "down" | null;
  image?: string;
};
type Session = { id: string; title: string; messages: ChatMessage[]; updatedAt: number };
type CommandItem = { icon: any; label: string; action: () => void; shortcut?: string };

// ============= Storage =============
const STORAGE_KEY = "ai-agent-v3";
const THEME_KEY = "ai-agent-theme";
const STATS_KEY = "ai-agent-stats";

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: any) => s && s.id && Array.isArray(s.messages));
  } catch { return []; }
}

function saveSessions(s: Session[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s.slice(0, 60))); } catch {}
}

function createSession(): Session {
  return { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { totalMessages: 0, totalSessions: 0, toolsUsed: 0 };
  } catch { return { totalMessages: 0, totalSessions: 0, toolsUsed: 0 }; }
}

function saveStats(stats: any) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

// ============= Helpers =============
function parseActions(raw: string): { text: string; actions: ChatAction[] } {
  const pattern = /\[OPEN:([^\]|]+)\|([^\]]+)\]/g;
  const actions: ChatAction[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) actions.push({ label: match[1].trim(), url: match[2].trim() });
  return { text: raw.replace(pattern, "").trim(), actions };
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, idx) => {
    const t = line.trim();
    if (!t) return <div key={idx} className="h-2" />;
    const parts = t.split(/(\*\*[^*]+\*\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g).filter(Boolean);
    return (
      <p key={idx} className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
          if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-700 dark:text-emerald-400">{part.slice(1, -1)}</code>;
          const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">{linkMatch[1]}</a>;
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ============= Suggestions =============
const SUGGESTIONS = [
  { icon: Search, text: "What movies are playing today?", color: "from-blue-500 to-cyan-500", desc: "Real-time web data" },
  { icon: ShoppingCart, text: "Show me lipstick prices", color: "from-pink-500 to-rose-500", desc: "Product catalog search" },
  { icon: MessageSquare, text: "File a complaint", color: "from-orange-500 to-amber-500", desc: "Support ticket system" },
  { icon: Cloud, text: "Weather in Lahore?", color: "from-indigo-500 to-violet-500", desc: "Live weather data" },
];

const QUICK_REPLIES = [
  "Tell me more",
  "Summarize this",
  "Show alternatives",
  "Open in browser",
];

// ============= Main Component =============
export default function Chat() {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [stats, setStats] = useState({ totalMessages: 0, totalSessions: 0, toolsUsed: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const streamBuffer = useRef("");
  const isSharingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initialize
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemDark ? "dark" : "light");
    setThemeState(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    const loaded = loadSessions();
    const s = loaded.length > 0 ? loaded : [createSession()];
    setSessions(s);
    setActiveId(s[0].id);
    setStats(loadStats());
    setMounted(true);
  }, []);

  // Theme
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  // Save sessions
  useEffect(() => {
    if (mounted) saveSessions(sessions);
  }, [sessions, mounted]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [sessions, activeId, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [input]);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeId), [sessions, activeId]);

  // Send message
  const sendMessage = useCallback(async (text: string, image?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    if (isLoading || !activeId) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed || "What's in this image?", time: Date.now(), image };
    const draftId = crypto.randomUUID();

    setSessions((prev) => prev.map((s) => s.id === activeId ? {
      ...s,
      title: s.title === "New chat" ? (trimmed.length > 35 ? trimmed.slice(0, 35) + "..." : trimmed || "Image analysis") : s.title,
      messages: [...s.messages, userMsg, { id: draftId, role: "assistant", content: "", time: Date.now() }],
      updatedAt: Date.now(),
    } : s));
    setInput("");
    setIsLoading(true);
    setSidebarOpen(false);
    setImagePreview(null);
    setQuickRepliesVisible(false);

    // Update stats
    setStats((prev) => {
      const newStats = { ...prev, totalMessages: prev.totalMessages + 1 };
      saveStats(newStats);
      return newStats;
    });

    const history = sessions.find((s) => s.id === activeId)?.messages ?? [];
    const payload = [...history, userMsg].map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok || !res.body) {
        let errorMsg = "Something went wrong. Please try again.";
        try { const d = await res.json(); errorMsg = d.error ?? errorMsg; } catch {}
        setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: s.messages.map((m) => m.id === draftId ? { ...m, content: errorMsg, error: true } : m) } : s));
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
          if (nl !== -1) { streamBuffer.current = streamBuffer.current.slice(nl + 1); headerParsed = true; }
        }

        const parsed = parseActions(streamBuffer.current);
        setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: s.messages.map((m) => m.id === draftId ? { ...m, content: parsed.text, actions: parsed.actions } : m) } : s));
      }

      // Show quick replies after AI response completes
      setQuickRepliesVisible(true);
    } catch {
      setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: s.messages.map((m) => m.id === draftId ? { ...m, content: "Network error — check connection and retry.", error: true } : m) } : s));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeId, sessions]);

  // Feedback
  const setFeedback = useCallback((msgId: string, feedback: "up" | "down") => {
    setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: s.messages.map((m) => m.id === msgId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m) } : s));
  }, [activeId]);

  // Copy message
  const copyMessage = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Export conversation
  const exportChat = useCallback(() => {
    if (!activeSession) return;
    const content = activeSession.messages.map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${activeSession.title.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSession]);

  // Share conversation — FIXED: debounce to prevent InvalidStateError
  const shareChat = useCallback(async () => {
    if (!activeSession || isSharingRef.current) return;
    isSharingRef.current = true;
    try {
      const text = activeSession.messages.map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`).join("\n\n");
      if (navigator.share) {
        await navigator.share({ title: activeSession.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedId("shared");
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      // User cancelled or share failed — silently ignore
      if (navigator.clipboard) {
        const fallback = activeSession.messages.map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`).join("\n\n");
        await navigator.clipboard.writeText(fallback);
        setCopiedId("shared");
        setTimeout(() => setCopiedId(null), 2000);
      }
    } finally {
      setTimeout(() => { isSharingRef.current = false; }, 1000);
    }
  }, [activeSession]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser. Use Chrome or Edge.");
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

  // Image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Drag and drop image
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging.current) {
      isDragging.current = true;
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      isDragging.current = false;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    isDragging.current = false;
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Quick reply handler
  const handleQuickReply = useCallback((text: string) => {
    setQuickRepliesVisible(false);
    sendMessage(text);
  }, [sendMessage]);

  // Session management
  function handleNewChat() {
    const fresh = createSession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setSidebarOpen(false);
    setCommandOpen(false);
    setQuickRepliesVisible(false);
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) { const fresh = createSession(); setActiveId(fresh.id); return [fresh]; }
      if (id === activeId) setActiveId([...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
      return remaining;
    });
  }

  // Command palette
  const commands: CommandItem[] = [
    { icon: Plus, label: "New Chat", action: handleNewChat, shortcut: "Ctrl+K" },
    { icon: Sun, label: "Toggle Theme", action: toggleTheme, shortcut: "Ctrl+Shift+T" },
    { icon: Download, label: "Export Chat", action: exportChat },
    { icon: Share2, label: "Share Chat", action: shareChat },
    { icon: Keyboard, label: "Keyboard Shortcuts", action: () => { setShowShortcuts(true); setCommandOpen(false); } },
    { icon: BarChart3, label: `Stats: ${stats.totalMessages} messages`, action: () => {} },
    { icon: RotateCcw, label: "Clear All Data", action: () => { localStorage.clear(); window.location.reload(); } },
  ];

  const filteredCommands = commands.filter((c) => c.label.toLowerCase().includes(commandQuery.toLowerCase()));

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCommandOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "T") { e.preventDefault(); toggleTheme(); }
      if (e.key === "Escape") { setCommandOpen(false); setShowShortcuts(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleTheme]);

  useEffect(() => {
    if (commandOpen && commandInputRef.current) commandInputRef.current.focus();
  }, [commandOpen]);

  // Loading state
  if (!mounted) return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-lg font-bold text-zinc-950 shadow-2xl shadow-emerald-500/30">{"</>"}</div>
          <div className="absolute -top-1 -right-1 h-4 w-4 animate-ping rounded-full bg-emerald-400" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-1.5 w-8 animate-pulse rounded-full bg-emerald-500" />
          <div className="h-1.5 w-8 animate-pulse rounded-full bg-emerald-400 [animation-delay:150ms]" />
          <div className="h-1.5 w-8 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
        </div>
        <p className="text-xs font-mono text-zinc-400">Initializing AI Agent...</p>
      </div>
    </div>
  );

  const messages = activeSession?.messages ?? [];
  const isEmptyChat = messages.length === 0 && !isLoading;
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div
      className="flex h-dvh w-full overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm border-2 border-dashed border-emerald-400 rounded-2xl m-4 pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-emerald-600">
            <ImageIcon className="h-12 w-12 animate-bounce" />
            <p className="text-lg font-semibold">Drop image here</p>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ===== COMMAND PALETTE ===== */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCommandOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-700 px-4 py-3">
              <Command className="h-5 w-5 text-zinc-400" />
              <input ref={commandInputRef} value={commandQuery} onChange={(e) => setCommandQuery(e.target.value)} placeholder="Type a command..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" />
              <kbd className="rounded border border-zinc-200 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">ESC</kbd>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredCommands.map((cmd, i) => (
                <button key={i} onClick={cmd.action} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-700">
                  <cmd.icon className="h-4 w-4 text-zinc-400" />
                  <span className="flex-1 text-zinc-700 dark:text-zinc-300">{cmd.label}</span>
                  {cmd.shortcut && <kbd className="rounded border border-zinc-200 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">{cmd.shortcut}</kbd>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== KEYBOARD SHORTCUTS MODAL ===== */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowShortcuts(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { keys: "Ctrl + K", desc: "Command palette / New chat" },
                { keys: "Ctrl + Shift + T", desc: "Toggle theme" },
                { keys: "Enter", desc: "Send message" },
                { keys: "Shift + Enter", desc: "New line" },
                { keys: "Escape", desc: "Close modals" },
              ].map(({ keys, desc }) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</span>
                  <kbd className="rounded border border-zinc-200 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 px-2 py-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/20">
            {"</>"}
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-zinc-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">AI Agent</p>
            <p className="font-mono text-[10px] text-zinc-400">v2.0 · {stats.totalMessages} msgs</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 py-3">
          <button onClick={handleNewChat} className="group flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            New Chat
          </button>
        </div>

        {/* History */}
        <div className="px-3 pb-1">
          <p className="px-2 pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">History</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {sortedSessions.map((session) => {
            const isActive = session.id === activeId;
            return (
              <div key={session.id} className={`group relative flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all ${isActive ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <button onClick={() => { setActiveId(session.id); setSidebarOpen(false); setQuickRepliesVisible(false); }} className="min-w-0 flex-1 text-left">
                  <p className={`truncate text-[13px] font-medium ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>{session.title}</p>
                  <p className="truncate font-mono text-[10px] text-zinc-400">{relativeTime(session.updatedAt)}</p>
                </button>
                <button onClick={() => deleteSession(session.id)} className="shrink-0 rounded-lg p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 space-y-2">
          <button onClick={() => setCommandOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Command className="h-3.5 w-3.5" /> Commands
            <kbd className="ml-auto rounded border border-zinc-200 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 px-1 text-[9px]">⌘K</kbd>
          </button>
          <p className="flex items-center gap-2 font-mono text-[10px] text-zinc-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />online · 8 tools</p>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="z-10 flex items-center gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-4 py-3 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{activeSession?.title ?? "AI Agent"}</p>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">{isLoading ? "Thinking..." : "Ready"}</span>
              <span className="font-mono text-[10px] text-zinc-400">· {messages.length} messages</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={exportChat} className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Export"><Download className="h-4 w-4" /></button>
            <button onClick={shareChat} className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Share"><Share2 className="h-4 w-4" /></button>
            <button onClick={toggleTheme} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {isEmptyChat ? (
              <div className="flex flex-col items-center pb-10 pt-8 text-center">
                {/* Hero */}
                <div className="mb-8 flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-2xl font-bold text-zinc-950 shadow-2xl shadow-emerald-500/30">{"</>"}</div>
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1.5 shadow-lg"><Zap className="h-3 w-3 text-white" /></div>
                  </div>
                  <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">AI Agent</h1>
                  <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">Your autonomous AI assistant. Ask anything — real-time web data, orders, bookings, and more.</p>
                </div>

                {/* Terminal */}
                <div className="mb-8 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-left shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-700 px-4 py-2.5">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="ml-2 font-mono text-[10px] text-zinc-400">ai-agent — zsh</span>
                  </div>
                  <div className="space-y-2 px-5 py-4 font-mono text-xs">
                    <p className="text-zinc-400"><span className="text-emerald-500">~</span> <span className="text-zinc-500">$</span> whoami</p>
                    <p className="text-zinc-700 dark:text-zinc-300">Personal AI agent — web reader, task runner, voice mode</p>
                    <p className="text-zinc-400"><span className="text-emerald-500">~</span> <span className="text-zinc-500">$</span> features</p>
                    <p className="text-zinc-700 dark:text-zinc-300">Multi-modal · Voice · Real-time data · {stats.totalMessages} messages processed</p>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.text} onClick={() => void sendMessage(s.text)} className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-left shadow-sm transition-all hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5">
                      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} text-white shadow-lg`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{s.text}</p>
                      <p className="text-[10px] text-zinc-400">{s.desc}</p>
                      <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </button>
                  ))}
                </div>

                {/* Feature badges */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  {[
                    { icon: Globe, label: "Web Search" },
                    { icon: Image, label: "Multi-modal" },
                    { icon: Mic, label: "Voice I/O" },
                    { icon: FileText, label: "Documents" },
                    { icon: Calendar, label: "Scheduling" },
                    { icon: Mail, label: "Email" },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                      <Icon className="h-3 w-3" />{label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => {
                  const isLastAI = msg.role === "assistant" && idx === messages.length - 1;
                  return (
                    <div key={msg.id} className={`group flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[10px] font-bold text-zinc-950 shadow-lg shadow-emerald-500/20">{"</>"}</div>
                      )}
                      <div className={`max-w-[80%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : ""}`}>
                        {/* Image preview */}
                        {msg.image && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                            <img src={msg.image} alt="Uploaded" className="max-h-48 object-cover" />
                          </div>
                        )}
                        <div className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          msg.role === "user"
                            ? "rounded-br-md bg-gradient-to-br from-zinc-800 to-zinc-900 text-white"
                            : msg.error
                              ? "rounded-bl-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                              : "rounded-bl-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                        }`}>
                          {msg.content ? renderMarkdown(msg.content) : msg.role === "assistant" && (
                            <span className="inline-flex items-center gap-1 py-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: "0ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: "150ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: "300ms" }} />
                            </span>
                          )}

                          {/* Actions */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {msg.actions.map((a) => (
                                <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02]">
                                  <Sparkles className="h-3 w-3" />{a.label}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <details className="mt-2 border-t border-zinc-100 dark:border-zinc-700 pt-2">
                              <summary className="cursor-pointer font-mono text-[10px] text-zinc-400 hover:text-zinc-600">{msg.sources.length} sources</summary>
                              <ul className="mt-1 space-y-1">
                                {msg.sources.map((src, i) => (
                                  <li key={src.url} className="text-xs"><a href={src.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">[{i + 1}] {src.title || src.url}</a></li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>

                        {/* Meta + Feedback */}
                        <div className={`mt-1 flex items-center gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                          <span className="font-mono text-[10px] text-zinc-400">{formatTime(msg.time)}</span>
                          {msg.role === "assistant" && msg.content && (
                            <>
                              <button onClick={() => setFeedback(msg.id, "up")} className={`rounded p-0.5 transition ${msg.feedback === "up" ? "text-emerald-500" : "text-zinc-400 hover:text-emerald-500"}`} title="Helpful"><ThumbsUp className="h-3 w-3" /></button>
                              <button onClick={() => setFeedback(msg.id, "down")} className={`rounded p-0.5 transition ${msg.feedback === "down" ? "text-red-500" : "text-zinc-400 hover:text-red-500"}`} title="Not helpful"><ThumbsDown className="h-3 w-3" /></button>
                              <button onClick={() => copyMessage(msg.content, msg.id)} className="rounded p-0.5 text-zinc-400 opacity-0 transition hover:text-zinc-600 group-hover:opacity-100" title="Copy">
                                {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </>
                          )}
                        </div>

                        {/* Quick Replies — only after last AI message */}
                        {isLastAI && msg.content && !isLoading && quickRepliesVisible && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {QUICK_REPLIES.map((qr) => (
                              <button
                                key={qr}
                                onClick={() => handleQuickReply(qr)}
                                className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                              >
                                {qr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== COMPOSER ===== */}
        <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl px-4 pb-4 pt-3 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {/* Image preview */}
            {imagePreview && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2">
                <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                <button onClick={() => setImagePreview(null)} className="rounded-full p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* Voice listening indicator */}
            {isListening && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="font-mono text-[11px] text-red-600 dark:text-red-400">Listening... speak now</span>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 shadow-lg shadow-zinc-200/50 dark:shadow-zinc-900/50 focus-within:border-emerald-400 dark:focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-100 dark:focus-within:ring-emerald-500/10 transition-all">
              {/* Image upload */}
              <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600">
                <Image className="h-4 w-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>

              {/* Voice input */}
              <button onClick={toggleVoice} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${isListening ? "animate-pulse bg-red-100 dark:bg-red-900/30 text-red-500" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600"}`} title="Voice input">
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if ((input.trim() || imagePreview) && !isLoading) { sendMessage(input, imagePreview ?? undefined); setInput(""); } } }} rows={1} placeholder={isListening ? "Listening..." : "Ask me anything..."} className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500" />

              <button type="submit" onClick={() => { if ((input.trim() || imagePreview) && !isLoading) { sendMessage(input, imagePreview ?? undefined); setInput(""); } }} disabled={isLoading || (!input.trim() && !imagePreview)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.05] active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100">
                {isLoading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="font-mono text-[10px] text-zinc-400">
                <kbd className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1">Enter</kbd> send · <kbd className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1">⌘K</kbd> commands
              </p>
              <p className="font-mono text-[10px] text-zinc-400">AI can make mistakes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
