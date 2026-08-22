import { searchWeb, type SearchResult } from "@/lib/search";
import { getWeather, type Weather } from "@/lib/weather";
import {
  answerFaq,
  customerLookup,
  listFaqTopics,
} from "@/lib/customer";
import {
  isLocalAgentEnabled,
  isShellEnabled,
  listKnownApps,
  openLocalApp,
  openWebsite,
  runShellCommand,
} from "@/lib/local-agent";
import {
  isShopifyConfigured,
  shopifyCustomerLookup,
  shopifyOrderLookup,
} from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiPart = Record<string, unknown>;

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

const MAX_TOOL_ROUNDS = 3;

const FUNCTION_DECLARATIONS = [
  {
    name: "customer_faq",
    description:
      "Look up an answer in the business FAQ knowledge base (delivery times, returns, payments, timings, location, discounts, authenticity). Use this whenever the user asks about the business, its products or policies.",
    parameters: {
      type: "OBJECT",
      properties: {
        question: {
          type: "STRING",
          description: "The customer's question, in English or Roman Urdu.",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "customer_lookup",
    description:
      "Look up an order, support ticket or customer record by ID (or last 4 digits of phone for customers). Examples: order ORD-1001, ticket TCK-201, customer 4455.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          description: 'What to look up: "order", "ticket" or "customer".',
          enum: ["order", "ticket", "customer"],
        },
        id: {
          type: "STRING",
          description:
            'The ID to look up, e.g. "ORD-1001", "TCK-201" or last-4 digits "4455".',
        },
      },
      required: ["type", "id"],
    },
  },
  {
    name: "run_command",
    description:
      "Run a Windows Command Prompt (cmd) command on this PC and return its output. Use for system tasks: file/folder listing, ipconfig, tasklist, ping, running scripts, git status in the project folder etc. Prefer safe read-only commands. Destructive commands are blocked automatically. 30s timeout.",
    parameters: {
      type: "OBJECT",
      properties: {
        command: {
          type: "STRING",
          description:
            'The cmd command to run, e.g. "dir", "ipconfig", "tasklist | findstr chrome".',
        },
        working_directory: {
          type: "STRING",
          description:
            "Optional absolute folder path to run the command in. Defaults to the project folder.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "open_website",
    description:
      "Open a website/URL in the default browser of this PC immediately (YouTube, Google, Maps, wa.me WhatsApp links etc.). Call this whenever the user asks to open/play/show any website or send a WhatsApp message.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description:
            "Full URL to open. For WhatsApp use https://wa.me/<number>?text=<url-encoded message>.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "open_local_app",
    description:
      "Open a whitelisted application directly on this PC (Windows). Use only when the user asks to open/launch an installed program like notepad, calculator, chrome, vscode, spotify, whatsapp desktop etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        app: {
          type: "STRING",
          description: `Name of the app to launch. Known apps: ${listKnownApps().join(", ")}.`,
        },
      },
      required: ["app"],
    },
  },
];

function buildSystemPrompt(
  searchResults: SearchResult[],
  weather: Weather | null
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const searchBlock =
    searchResults.length > 0
      ? `# LIVE SEARCH RESULTS (from Google — use these as your primary source for this answer)
${searchResults
  .map(
    (r, i) =>
      `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`
  )
  .join("\n")}`
      : "# LIVE SEARCH RESULTS\nNo web search results were available for this query. Answer from your own knowledge, and say so if you are unsure about anything recent.";

  const weatherBlock = weather
    ? `# LIVE WEATHER REPORT (${weather.city}, ${weather.dateStr})
Temperature: ${weather.tempC}°C, Wind: ${weather.windKmh} km/h, Condition: ${weather.condition}.`
    : "";

  return `You are "Ay Assistant" — a helpful, accurate AI agent for Ay Cosmetics and for the user's everyday tasks. You solve problems, answer questions AND take actions.

# TODAY'S DATE
The current date is ${dateStr} and the time is ${timeStr}. Always treat this as "today" when the user asks about the current date, day of the week, or time. Do not guess a date from your training data.

${searchBlock}
${weatherBlock}

# YOUR TOOLS (function calling)
IMPORTANT CONTEXT: You are embedded for "Ay Cosmetics" — an ONLINE COSMETICS STORE. Words like "delivery", "order", "parcel", "return", "refund", "payment", "coupon", "timing" in this chat almost always refer to the STORE (product shipping/policies), NOT their everyday/medical meanings. If a question could relate to the store at all, ALWAYS call the matching tool FIRST — never answer such questions from your own knowledge.
You can call these functions when relevant — do it silently and naturally, never mention technical details:
1. customer_faq(question) — business FAQ answers (delivery times, returns, payment methods, shop timings, location, offers, authenticity). Call this for ANY question about the store or its policies.
2. customer_lookup(type, id) — order status (ORD-xxxx), support ticket (TCK-xxx), or customer lookup by last 4 digits of phone. Call this whenever the user mentions an order/ticket ID.
3. open_local_app(app) — launch an installed PC app (notepad, calculator, chrome, vscode, whatsapp, spotify...). Only use for apps on THIS PC.
4. run_command(command) — run a Windows cmd command on this PC and get its output (dir, ipconfig, tasklist, ping, scripts...). Use safe read-only commands first; explain the output to the user in their language. Never run destructive commands — these are blocked automatically anyway.
If a tool returns found:false or an error, tell the user honestly and suggest what to try next.

# OPENING WEBSITES / WHATSAPP (AUTO-OPEN ON THIS PC)
When the user asks you to open, play, show ("kholo", "dikhao") a website, video, map, or send a WhatsApp message, CALL the open_website function IMMEDIATELY — the site opens on the user's PC automatically. Do not just paste a link.
1. Build the full URL first:
   - YouTube -> https://www.youtube.com ; music/video search -> https://www.youtube.com/results?search_query=...
   - Google search -> https://www.google.com/search?q=... ; Maps -> https://www.google.com/maps/search/<place>
   - WhatsApp message, e.g. "03001234567 ko hello bhejo" -> https://wa.me/923001234567?text=Hello
     (convert local numbers 03XXXXXXXXX to 923XXXXXXXXX — country code 92, no +, no spaces; put message in ?text= URL-encoded)
2. Call open_website(url).
3. If it returns ok:true -> reply briefly (mention the site name). For WhatsApp add: "WhatsApp khul gaya, ab aap Send dabayen". NEVER claim a WhatsApp message was already SENT — the user always presses Send.
4. If it returns ok:false (disabled/failed) -> apologise briefly AND add an action token at the very END of your reply so the user gets a button instead:
   [OPEN:ShortLabel|https://full-url]
Up to 2 [OPEN:] tokens per reply as fallback only. Never write both an auto-open and a button for the same URL when the auto-open succeeded.

# STYLE
- Friendly but professional.
- Answer in the SAME language the user writes in (Roman Urdu / English / Urdu).
- Keep answers clear and well-structured. Short paragraphs or bullet points where useful.
- Always mention the specific website name when you provide a link to it.
- Do NOT write a "Sources:" section — the interface shows source links separately.

# RULES
1. Never invent facts, statistics, prices, dates, order statuses or events. If you don't know, say so honestly.
2. For order/ticket questions ALWAYS use customer_lookup first — never guess a status.
3. Be careful with medical, legal or financial questions — give general guidance and recommend a professional.
4. Refuse clearly but helpfully if asked for something harmful.`;
}

async function executeFunction(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case "customer_faq": {
      const question = String(args.question ?? "");
      const faq = answerFaq(question);
      if (!faq) {
        return {
          found: false,
          known_topics: listFaqTopics(),
          message:
            "No matching FAQ entry. Tell the user honestly and offer to connect them to the team.",
        };
      }
      return { found: true, faq_question: faq.question, answer: faq.answer };
    }

    case "customer_lookup": {
      const lookupType = String(args.type ?? "");
      const lookupId = String(args.id ?? "");

      // Real store data first (Shopify), demo JSON as fallback.
      if (lookupType === "order") {
        const shopifyOrder = await shopifyOrderLookup(lookupId);
        if (shopifyOrder) return shopifyOrder;
      } else if (lookupType === "customer") {
        const shopifyCustomer = await shopifyCustomerLookup(lookupId);
        if (shopifyCustomer) return shopifyCustomer;
      }

      const localResult = customerLookup(lookupType, lookupId) as Record<
        string,
        unknown
      >;
      if (
        (lookupType === "order" || lookupType === "customer") &&
        !isShopifyConfigured() &&
        localResult.found
      ) {
        return {
          ...localResult,
          demo_data: true,
          message:
            "This is DEMO sample data — Shopify is not connected yet. Tell the user these are placeholder records; connect SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_API_TOKEN in .env.local for live orders.",
        };
      }
      return localResult;
    }

    case "run_command": {
      if (!isShellEnabled()) {
        return {
          ok: false,
          command: String(args.command ?? ""),
          exitCode: null,
          output:
            "Shell commands are disabled by ENABLE_SHELL_COMMANDS=false or LOCAL_AGENT_ENABLED=false.",
        };
      }
      return runShellCommand(
        String(args.command ?? ""),
        args.working_directory ? String(args.working_directory) : undefined
      );
    }

    case "open_website": {
      if (!isLocalAgentEnabled()) {
        return {
          ok: false,
          message:
            "Opening websites on the PC is disabled by LOCAL_AGENT_ENABLED=false. Ask the user to use the link button instead.",
        };
      }
      return openWebsite(String(args.url ?? ""));
    }

    case "open_local_app": {
      if (!isLocalAgentEnabled()) {
        return {
          ok: false,
          message:
            "Local app launching is disabled by LOCAL_AGENT_ENABLED=false.",
        };
      }
      return openLocalApp(String(args.app ?? ""));
    }

    default:
      return { error: `Unknown function "${name}".` };
  }
}

type StreamRoundResult = {
  /** All parts returned by the model this round (verbatim, incl. metadata). */
  parts: GeminiPart[];
};

/**
 * Calls Gemini streamGenerateContent over SSE, forwards every text part to
 * the client controller as it arrives, and returns the aggregated parts so
 * function-call turns can be echoed back verbatim (thought signatures etc.).
 */
async function streamGeminiRound(
  opts: {
    apiKey: string;
    model: string;
    systemInstruction: string;
    contents: GeminiContent[];
  },
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
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
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

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = body.messages;
    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      !messages.every(
        (m) =>
          typeof m?.content === "string" &&
          (m?.role === "user" || m?.role === "assistant")
      )
    ) {
      throw new Error("Invalid messages payload");
    }
  } catch {
    return Response.json(
      { error: "Invalid request body. Expected { messages }." },
      { status: 400 }
    );
  }

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  let searchResults: SearchResult[] = [];
  if (process.env.ENABLE_LIVE_SEARCH === "true") {
    searchResults = await searchWeb(lastUserMessage);
  }

  let weather: Weather | null = null;
  if (
    /\b(weather|temperature|mausam|forecast|weatherkaisa)\b/i.test(
      lastUserMessage
    )
  ) {
    weather = await getWeather(lastUserMessage);
  }

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
                  weather
                ),
                contents,
              },
              (t) => {
                if (!closed) controller.enqueue(encoder.encode(t));
              }
            );

            const hasFunctionCall = parts.some(
              (p) =>
                p.functionCall &&
                typeof p.functionCall === "object"
            );
            if (!hasFunctionCall || rounds >= MAX_TOOL_ROUNDS) break;
            rounds += 1;

            // Echo the model's function-call parts VERBATIM — they may
            // carry required metadata such as thought signatures.
            contents.push({ role: "model", parts });

            const responseParts: GeminiPart[] = [];
            for (const part of parts) {
              const call = part.functionCall as
                | { name?: string; args?: Record<string, unknown> }
                | undefined;
              if (!call?.name) continue;
              let outcome: Record<string, unknown>;
              try {
                outcome = await executeFunction(call.name, call.args ?? {});
              } catch (err) {
                outcome = {
                  error:
                    err instanceof Error
                      ? err.message
                      : "Tool execution failed.",
                };
              }
              responseParts.push({
                functionResponse: {
                  name: call.name,
                  response: outcome,
                },
              });
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
