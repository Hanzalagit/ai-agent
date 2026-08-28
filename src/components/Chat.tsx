"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import {
  Menu, Sun, Moon, Plus, Trash2, Send, Mic, MicOff,
  Search, ShoppingCart, MessageSquare, Cloud, Sparkles, X,
  ChevronRight, ChevronLeft, Copy, Check, RotateCcw, Zap, Image, Download, Share2,
  Command, Globe, FileText, Calendar, Mail, BarChart3,
  Keyboard, ThumbsUp, ThumbsDown, Sparkle, ImageIcon
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const directoryRef = useRef<HTMLDivElement>(null);

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
    const payload = [...history, userMsg].map(({ role, content, image }) => ({
      role,
      content,
      ...(image ? { image } : {}),
    }));

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
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-zinc-900/20" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="relative px-5 py-4 border-b border-zinc-100/80 dark:border-zinc-800/80">
          {/* Subtle gradient at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/50 via-teal-500/30 to-transparent" />

          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/25"
            >
              {"</>"}
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white dark:border-zinc-900 animate-pulse" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-900 dark:text-white tracking-tight">AI Agent</p>
              <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">v2.0 · {stats.totalMessages} msgs</p>
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-4 py-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewChat}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/35"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            New Chat
          </motion.button>
        </div>

        {/* History */}
        <div className="px-4 pb-1">
          <p className="px-1 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">{"// History"}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {sortedSessions.map((session) => {
            const isActive = session.id === activeId;
            return (
              <motion.div
                key={session.id}
                whileHover={{ x: 2 }}
                role="button"
                tabIndex={0}
                onClick={() => { setActiveId(session.id); setSidebarOpen(false); setQuickRepliesVisible(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setActiveId(session.id); setSidebarOpen(false); setQuickRepliesVisible(false); } }}
                className={`group relative w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5"
                    : "hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeSession"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 to-teal-500"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] font-medium ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>{session.title}</p>
                  <p className="truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{relativeTime(session.updatedAt)}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </motion.button>
              </motion.div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-100/80 dark:border-zinc-800/80 px-5 py-3 space-y-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 transition-all hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
          >
            <Command className="h-3.5 w-3.5" /> Commands
            <kbd className="ml-auto rounded border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50/50 dark:bg-zinc-800/50 px-1.5 py-0.5 text-[9px] font-mono">⌘K</kbd>
          </motion.button>
          <div className="flex items-center gap-2 px-3 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">online · 8 tools</span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        {/* ===== HEADER ===== */}
        <header className="z-10 relative bg-zinc-950 dark:bg-zinc-950">
          {/* Top gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-gradient-shift opacity-80" />

          <div
            className="flex items-center gap-3 px-4 py-3 sm:px-6 transition-all duration-300 border-b border-white/[0.06]"
            style={{
              backdropFilter: `blur(${16 + scrollProgress * 16}px) saturate(${1.2 + scrollProgress * 0.3})`,
            }}
          >
            {/* Mobile menu */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </motion.button>

            {/* AI Avatar + Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar with animated ring */}
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[10px] font-bold text-zinc-950 shadow-lg shadow-emerald-500/20">
                  {"</>"}
                </div>
                {/* Live status ring */}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-950 ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}>
                  <span className={`absolute inset-0 rounded-full ${isLoading ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping opacity-40`} />
                </span>
              </div>

              {/* Title + Status */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white tracking-tight">
                    {activeSession?.title ?? "AI Agent"}
                  </p>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    {isLoading ? "thinking" : "online"}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                  {messages.length} messages · v2.0
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={exportChat}
                className="group flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
                title="Export"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-mono text-[10px]">Export</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={shareChat}
                className="group flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
                title="Share"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-mono text-[10px]">Share</span>
              </motion.button>

              <div className="mx-1 h-5 w-px bg-white/10 hidden sm:block" />

              <motion.button
                whileHover={{ scale: 1.08, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all hover:border-emerald-400/30 hover:bg-white/10 hover:text-emerald-400 hover:shadow-md hover:shadow-emerald-500/10"
                title="Toggle theme"
              >
                <AnimatePresence mode="wait">
                  {theme === "dark" ? (
                    <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Sun className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Moon className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            const maxScroll = el.scrollHeight - el.clientHeight;
            if (maxScroll > 0) {
              setScrollProgress(el.scrollTop / maxScroll);
            }
          }}
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {isEmptyChat ? (
              <div className="flex flex-col items-center pb-10 pt-8 text-center relative">
                {/* Animated background orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-10 left-1/4 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl animate-orb-1" />
                  <div className="absolute top-20 right-1/4 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl animate-orb-2" />
                  <div className="absolute bottom-10 left-1/3 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl animate-orb-3" />
                </div>

                {/* Hero */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="mb-8 flex flex-col items-center relative z-10"
                >
                  <motion.div
                    className="relative mb-4"
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-2xl font-bold text-zinc-950 shadow-2xl shadow-emerald-500/30 animate-glow">{"</>"}</div>
                    <motion.div
                      className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1.5 shadow-lg"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Zap className="h-3 w-3 text-white" />
                    </motion.div>
                  </motion.div>
                  <motion.h1
                    className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    AI Agent
                  </motion.h1>
                  <motion.p
                    className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    Your autonomous AI assistant. Ask anything — real-time web data, orders, bookings, and more.
                  </motion.p>
                </motion.div>

                {/* Terminal */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mb-8 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-left shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 relative z-10"
                >
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
                </motion.div>

                {/* Suggestions with 3D tilt */}
                <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2 relative z-10">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                      whileHover={{ scale: 1.02, y: -4, rotateX: 5, rotateY: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => void sendMessage(s.text)}
                      className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-left shadow-sm transition-all hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 perspective"
                    >
                      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} text-white shadow-lg`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{s.text}</p>
                      <p className="text-[10px] text-zinc-400">{s.desc}</p>
                      <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </motion.button>
                  ))}
                </div>

                {/* Feature badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-8 flex flex-wrap items-center justify-center gap-2 relative z-10"
                >
                  {[
                    { icon: Globe, label: "Web Search" },
                    { icon: Image, label: "Multi-modal" },
                    { icon: Mic, label: "Voice I/O" },
                    { icon: FileText, label: "Documents" },
                    { icon: Calendar, label: "Scheduling" },
                    { icon: Mail, label: "Email" },
                  ].map(({ icon: Icon, label }, i) => (
                    <motion.span
                      key={label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.05 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:border-emerald-300 hover:text-emerald-600"
                    >
                      <Icon className="h-3 w-3" />{label}
                    </motion.span>
                  ))}
                </motion.div>

                {/* Scrollable Product Directory */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="mt-10 w-full max-w-lg relative z-10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Quick Actions</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => directoryRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => directoryRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div
                    ref={directoryRef}
                    className="flex gap-3 overflow-x-auto scroll-snap-x scrollbar-hide pb-2"
                  >
                    {[
                      { icon: Search, label: "Web Search", desc: "Real-time data", color: "from-blue-500 to-cyan-500", query: "What's trending today?" },
                      { icon: ShoppingCart, label: "Products", desc: "Browse catalog", color: "from-pink-500 to-rose-500", query: "Show me your best products" },
                      { icon: MessageSquare, label: "Support", desc: "File a ticket", color: "from-orange-500 to-amber-500", query: "I need help with my order" },
                      { icon: Cloud, label: "Weather", desc: "Live forecast", color: "from-indigo-500 to-violet-500", query: "What's the weather right now?" },
                      { icon: Calendar, label: "Schedule", desc: "Book a slot", color: "from-emerald-500 to-teal-500", query: "I want to schedule an appointment" },
                      { icon: Sparkle, label: "Creative", desc: "Write & design", color: "from-purple-500 to-fuchsia-500", query: "Help me write a creative post" },
                    ].map((item, i) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.1 + i * 0.08 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void sendMessage(item.query)}
                        className="group flex-shrink-0 w-36 snap-start rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-left shadow-sm transition-all hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5"
                      >
                        <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-white shadow-md`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{item.label}</p>
                        <p className="text-[9px] text-zinc-400">{item.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => {
                  const isLastAI = msg.role === "assistant" && idx === messages.length - 1;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.15), ease: [0.25, 0.46, 0.45, 0.94] }}
                      className={`group flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[10px] font-bold text-zinc-950 shadow-lg shadow-emerald-500/20"
                        >{"</>"}</motion.div>
                      )}
                      <div className={`max-w-[80%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : ""}`}>
                        {/* Image preview */}
                        {msg.image && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3 }}
                            className="mb-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
                          >
                            <img src={msg.image} alt="Uploaded" className="max-h-48 object-cover" />
                          </motion.div>
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
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex flex-wrap gap-2 pt-2"
                            >
                              {msg.actions.map((a) => (
                                <motion.a
                                  key={a.url}
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  whileHover={{ scale: 1.03, y: -1 }}
                                  whileTap={{ scale: 0.97 }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-white shadow-md shadow-emerald-500/25 transition-shadow hover:shadow-lg hover:shadow-emerald-500/30"
                                >
                                  <Sparkles className="h-3 w-3" />{a.label}
                                </motion.a>
                              ))}
                            </motion.div>
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
                              <motion.button
                                whileTap={{ scale: 0.7 }}
                                onClick={() => setFeedback(msg.id, "up")}
                                className={`rounded p-0.5 transition ${msg.feedback === "up" ? "text-emerald-500" : "text-zinc-400 hover:text-emerald-500"}`}
                                title="Helpful"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.7 }}
                                onClick={() => setFeedback(msg.id, "down")}
                                className={`rounded p-0.5 transition ${msg.feedback === "down" ? "text-red-500" : "text-zinc-400 hover:text-red-500"}`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </motion.button>
                              <button onClick={() => copyMessage(msg.content, msg.id)} className="rounded p-0.5 text-zinc-400 opacity-0 transition hover:text-zinc-600 group-hover:opacity-100" title="Copy">
                                {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </>
                          )}
                        </div>

                        {/* Quick Replies — only after last AI message */}
                        {isLastAI && msg.content && !isLoading && quickRepliesVisible && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="mt-2 flex flex-wrap gap-1.5"
                          >
                            {QUICK_REPLIES.map((qr, i) => (
                              <motion.button
                                key={qr}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 + i * 0.05 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleQuickReply(qr)}
                                className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                              >
                                {qr}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                       </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== COMPOSER ===== */}
        <div className="relative bg-zinc-950">
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

          <div className="px-4 pb-4 pt-3 sm:px-6 bg-zinc-950" style={{
            backdropFilter: `blur(${16 + scrollProgress * 8}px)`,
          }}>
            <div className="mx-auto w-full max-w-3xl">
              {/* Image preview */}
              <AnimatePresence>
                {imagePreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="mb-3 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-2.5 shadow-lg shadow-black/20"
                  >
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover ring-2 ring-white/10" />
                      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10" />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setImagePreview(null)}
                      className="rounded-full p-1.5 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Voice listening indicator */}
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </div>
                      <span className="font-mono text-[11px] font-medium text-red-600 dark:text-red-400">Listening — speak now</span>
                      <div className="ml-auto flex gap-0.5">
                        {[...Array(4)].map((_, i) => (
                          <motion.span
                            key={i}
                            className="w-0.5 bg-red-400 rounded-full"
                            animate={{ height: [4, 12, 4] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input container */}
              <div className="relative group">
                {/* Glow effect on focus */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-500" />

                <div className="relative flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg shadow-black/20 group-focus-within:border-emerald-500/30 transition-all duration-300">
                  {/* Image upload */}
                  <motion.label
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-all hover:bg-white/10 hover:text-emerald-400"
                  >
                    <Image className="h-4 w-4" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </motion.label>

                  {/* Voice input */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleVoice}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                      isListening
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : "text-zinc-400 hover:bg-white/10 hover:text-emerald-400"
                    }`}
                    title="Voice input"
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </motion.button>

                  {/* Text input */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if ((input.trim() || imagePreview) && !isLoading) {
                          sendMessage(input, imagePreview ?? undefined);
                          setInput("");
                        }
                      }
                    }}
                    rows={1}
                    placeholder={isListening ? "Listening..." : "Message AI Agent..."}
                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
                  />

                  {/* Send button */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: isLoading ? 1 : 1.08 }}
                    whileTap={{ scale: isLoading ? 1 : 0.9 }}
                    onClick={() => {
                      if ((input.trim() || imagePreview) && !isLoading) {
                        sendMessage(input, imagePreview ?? undefined);
                        setInput("");
                      }
                    }}
                    disabled={isLoading || (!input.trim() && !imagePreview)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/35 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 360 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="send"
                          initial={{ scale: 0, x: -5 }}
                          animate={{ scale: 1, x: 0 }}
                          exit={{ scale: 0, x: 5 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <Send className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>

              {/* Footer hints */}
              <div className="mt-2.5 flex items-center justify-between">
                <p className="font-mono text-[10px] text-zinc-500">
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">Enter</kbd>
                  <span className="mx-1">send</span>
                  <span className="text-zinc-600">·</span>
                  <kbd className="ml-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5">⌘K</kbd>
                  <span className="ml-1">commands</span>
                </p>
                <p className="font-mono text-[10px] text-zinc-600">AI can make mistakes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
