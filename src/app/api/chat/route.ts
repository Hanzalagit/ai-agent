import { ChatRequestSchema, sanitizeInput } from "@/lib/validation";
import { buildSystemPrompt } from "@/lib/prompts";
import { getToolDeclarations, executeTool, performSearch, performWeather } from "@/lib/tools";
import {
  streamGeminiRound,
  isFunctionCall,
  extractFunctionCalls,
  createFunctionResponseParts,
  MAX_TOOL_ROUNDS,
} from "@/lib/gemini";
import { generateConversationSummary } from "@/lib/memory";
import { checkRateLimit } from "@/lib/rate-limit";
import type { GeminiContent, SearchResult, Weather } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  // Rate limiting
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rateLimitResult = checkRateLimit(clientIp);
  if (!rateLimitResult.allowed) {
    return Response.json(
      {
        error: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
      },
      { status: 429 }
    );
  }

  // Validate request body
  let messages;
  try {
    const body = await request.json();
      const result = ChatRequestSchema.safeParse(body);
      if (!result.success) {
        throw new Error(result.error.issues.map((i) => i.message).join(", "));
      }
    messages = result.data.messages;
  } catch {
    return Response.json(
      { error: "Invalid request body. Expected { messages }." },
      { status: 400 }
    );
  }

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Sanitize input
  const sanitizedQuery = sanitizeInput(lastUserMessage);

  // Perform search and weather in parallel
  const [searchResults, weather] = await Promise.all([
    performSearch(sanitizedQuery),
    performWeather(sanitizedQuery),
  ]);

  // Generate conversation summary for context
  const conversationSummary = generateConversationSummary(
    messages.slice(0, -1)
  );

  // Conversation state must begin with a user turn; leading assistant
  // messages (e.g. the UI welcome bubble) are skipped.
  const historyMessages = messages.slice(0, -1);
  while (historyMessages.length > 0 && historyMessages[0].role === "assistant") {
    historyMessages.shift();
  }

  const contents: GeminiContent[] = historyMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  contents.push({ role: "user", parts: [{ text: lastUserMessage }] });

  const encoder = new TextEncoder();
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

  try {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ __sources: searchResults }) + "\n")
        );

        let closed = false;
        const safeClose = () => {
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        };

        try {
          let rounds = 0;
          while (true) {
            const { parts } = await streamGeminiRound(
              {
                apiKey,
                model,
                systemInstruction: buildSystemPrompt(
                  searchResults,
                  weather,
                  conversationSummary
                ),
                contents,
                tools: getToolDeclarations(),
              },
              (t) => {
                if (!closed) controller.enqueue(encoder.encode(t));
              }
            );

            if (!isFunctionCall(parts) || rounds >= MAX_TOOL_ROUNDS) break;
            rounds += 1;

            // Echo the model's function-call parts VERBATIM — they may
            // carry required metadata such as thought signatures.
            contents.push({ role: "model", parts });

            const responseParts = [];
            const functionCalls = extractFunctionCalls(parts);
            for (const call of functionCalls) {
              let outcome: Record<string, unknown>;
              try {
                outcome = await executeTool(call.name, call.args);
              } catch (err) {
                outcome = {
                  error:
                    err instanceof Error
                      ? err.message
                      : "Tool execution failed.",
                };
              }
              responseParts.push(
                createFunctionResponseParts(call.name, outcome)
              );
            }
            contents.push({ role: "user", parts: responseParts });
          }

          safeClose();
        } catch (err) {
          console.error("Chat stream error:", err);
          const status = (err as { status?: number }).status ?? 0;
          const detail =
            err instanceof Error ? err.message : "Unknown stream error.";
          let friendly =
            "Sorry, the assistant could not respond right now. Please try again shortly.";
          if (status === 429) {
            friendly =
              "The free-tier daily limit for this Gemini key is reached — try again tomorrow or use a fresh key.";
          } else if (status >= 500) {
            friendly =
              "Gemini is temporarily unavailable — please try again in a minute.";
          }
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(friendly));
            } catch {
              /* ignore */
            }
          }
          console.error("Detail:", detail);
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    return Response.json(
      {
        error:
          "Sorry, the assistant could not respond right now. Please try again shortly.",
      },
      { status: 502 }
    );
  }
}
