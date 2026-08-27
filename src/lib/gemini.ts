import type { GeminiPart, GeminiContent, StreamRoundResult } from "./types";

export const MAX_TOOL_ROUNDS = 4;

export type GeminiStreamOptions = {
  apiKey: string;
  model: string;
  systemInstruction: string;
  contents: GeminiContent[];
  tools: object[];
};

/**
 * Calls Gemini streamGenerateContent over SSE, forwards every text part to
 * the client controller as it arrives, and returns the aggregated parts so
 * function-call turns can be echoed back verbatim (thought signatures etc.).
 */
export async function streamGeminiRound(
  opts: GeminiStreamOptions,
  onText: (t: string) => void
): Promise<StreamRoundResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:streamGenerateContent?alt=sse`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": opts.apiKey,
    },
    body: JSON.stringify({
      contents: opts.contents,
      systemInstruction: { parts: [{ text: opts.systemInstruction }] },
      tools: [{ functionDeclarations: opts.tools }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    const err = new Error(
      `[Gemini ${res.status}] ${detail.slice(0, 500) || "request failed"}`
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  const parts: GeminiPart[] = [];

  const processChunkJson = (json: {
    candidates?: {
      content?: { parts?: GeminiPart[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  }) => {
    if (json.promptFeedback?.blockReason) {
      throw new Error(
        `Blocked by safety filter: ${json.promptFeedback.blockReason}`
      );
    }
    const candidateParts = json.candidates?.[0]?.content?.parts ?? [];
    for (const part of candidateParts) {
      parts.push(part);
      if (typeof part.text === "string" && part.text.length > 0) {
        onText(part.text);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });

    let nlIndex: number;
    while ((nlIndex = sseBuffer.indexOf("\n")) !== -1) {
      const line = sseBuffer.slice(0, nlIndex).trim();
      sseBuffer = sseBuffer.slice(nlIndex + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        processChunkJson(JSON.parse(payload));
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("Blocked by safety")
        ) {
          throw err;
        }
        // Ignore malformed keep-alive fragments.
      }
    }
  }

  const tail = sseBuffer.trim();
  if (tail.startsWith("data:")) {
    const payload = tail.slice(5).trim();
    if (payload && payload !== "[DONE]") {
      try {
        processChunkJson(JSON.parse(payload));
      } catch {
        /* ignore */
      }
    }
  }

  return { parts };
}

export function isFunctionCall(parts: GeminiPart[]): boolean {
  return parts.some(
    (p) => p.functionCall && typeof p.functionCall === "object"
  );
}

export function extractFunctionCalls(
  parts: GeminiPart[]
): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  for (const part of parts) {
    const call = part.functionCall as
      | { name?: string; args?: Record<string, unknown> }
      | undefined;
    if (call?.name) {
      calls.push({ name: call.name, args: call.args ?? {} });
    }
  }
  return calls;
}

export function createFunctionResponseParts(
  name: string,
  outcome: Record<string, unknown>
): GeminiPart {
  return {
    functionResponse: {
      name,
      response: outcome,
    },
  };
}
