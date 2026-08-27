"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send } from "lucide-react";

type ComposerProps = {
  onSend: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
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

export function Composer({ onSend, isLoading, disabled }: ComposerProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      recognitionRef.current?.stop();
    };
  }, []);

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
        "Voice not supported in this browser — use Chrome or Edge."
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
      if (said) onSend(said);
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
  }, [isListening, onSend]);

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 pb-4 pt-3 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {/* Voice Status */}
        <AnimatePresence>
          {(isListening || voiceError) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                  : "> listening… speak (Urdu / English)")}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              onSend(input);
              setInput("");
            }
          }}
        >
          <button
            type="button"
            onClick={toggleListening}
            title="Click to speak"
            className={`shrink-0 rounded-xl border p-3 transition active:scale-95 ${
              isListening
                ? "animate-pulse border-red-300 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600"
            }`}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  onSend(input);
                  setInput("");
                }
              }
            }}
            rows={1}
            placeholder={
              isListening
                ? "Listening..."
                : "Type a task — or click mic to speak..."
            }
            disabled={disabled}
            className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition placeholder:font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-emerald-400 focus:bg-white dark:focus:bg-zinc-700 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 rounded-xl bg-zinc-900 p-3 text-emerald-300 shadow-sm transition hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Keyboard Shortcuts */}
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>
            <kbd className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1">
              Enter
            </kbd>{" "}
            send ·{" "}
            <kbd className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1">
              Shift+Enter
            </kbd>{" "}
            new line
          </span>
          <span>AI can make mistakes — verify important info</span>
        </div>
      </div>
    </div>
  );
}
