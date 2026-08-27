"use client";

import { motion } from "framer-motion";
import type { ChatMessage, ChatSource, ChatAction } from "@/lib/sessions";

type MessageBubbleProps = {
  message: ChatMessage;
  isLast?: boolean;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function SourcesList({ sources }: { sources: ChatSource[] }) {
  return (
    <details className="border-t border-zinc-100 pt-2">
      <summary className="cursor-pointer select-none font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition hover:text-zinc-600">
        sources({sources.length})
      </summary>
      <ul className="mt-1.5 space-y-1">
        {sources.map((source, i) => (
          <li key={source.url} className="text-xs leading-snug">
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
  );
}

function ActionButtons({ actions }: { actions: ChatAction[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1.5">
      {actions.map((action) => (
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
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500/70 [animation-delay:300ms]" />
    </span>
  );
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[10px] font-bold text-zinc-950 shadow-sm">
          {"</>"}
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[78%] ${isUser ? "items-end" : ""}`}
      >
        <div
          className={`space-y-2 whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-md bg-zinc-900 dark:bg-emerald-600 text-zinc-100 shadow-sm"
              : message.error
                ? "rounded-bl-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "rounded-bl-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm shadow-zinc-100 dark:shadow-zinc-900"
          }`}
        >
          {message.content
            ? renderMarkdown(message.content)
            : !isUser && <TypingIndicator />}

          {!isUser &&
            message.actions &&
            message.actions.length > 0 && (
              <ActionButtons actions={message.actions} />
            )}

          {!isUser &&
            message.sources &&
            message.sources.length > 0 && (
              <SourcesList sources={message.sources} />
            )}
        </div>
        <p
          className={`mt-1 font-mono text-[10px] text-zinc-400 ${
            isUser ? "text-right" : ""
          }`}
        >
          {formatTime(message.time)}
        </p>
      </div>
    </motion.div>
  );
}
