"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import type { Session } from "@/lib/sessions";

type SidebarProps = {
  sessions: Session[];
  activeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
};

function relativeDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
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

export function Sidebar({
  sessions,
  activeId,
  isOpen,
  onClose,
  onSelect,
  onNewChat,
  onDelete,
}: SidebarProps) {
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
            onClick={onNewChat}
            className="group flex w-full items-center justify-between rounded-lg border border-dashed border-white/15 px-3.5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-zinc-500 transition group-hover:text-emerald-400" />
              New Chat
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
            const lastMsg =
              session.messages[session.messages.length - 1];
            return (
              <button
                key={session.id}
                onClick={() => {
                  onSelect(session.id);
                  onClose();
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
                      onDelete(session.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onDelete(session.id);
                      }
                    }}
                    className="hidden shrink-0 rounded-md p-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 group-hover:block cursor-pointer"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
    </>
  );
}
