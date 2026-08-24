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
import { productSearch } from "@/lib/products";
import { createOrderRequest } from "@/lib/orders";
import { createTicket, findCreatedTicket } from "@/lib/tickets";
import { fetchWebpage } from "@/lib/webpage";

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

const MAX_TOOL_ROUNDS = 4;

function isPublicMode(): boolean {
  return process.env.PUBLIC_MODE === "true";
}

const GENERAL_TOOL_DECLARATIONS = [
  {
    name: "fetch_webpage",
    description:
      "Read a specific webpage RIGHT NOW and get its real current text content. Use this whenever the user needs exact real-world details from any website: cinema/movie showtimes, bus/flight schedules, restaurant menus, university notices, prices or listings on ANY site. Pick the best URL (from live search results, or the official domain you know), then call this BEFORE answering. Quote exactly what the page says — times, dates, names.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description: "Full https:// URL of the page to read.",
        },
        what_to_find: {
          type: "STRING",
          description:
            "Optional hint about what info you need, e.g. \"today's movie showtimes at CineStar Lahore\".",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "customer_faq",
    description:
      "FAQ answers for the 'Ay Cosmetics' online store only (its delivery times, returns, payments, timings, location, discounts, authenticity). Use ONLY when the user's question is about that specific store.",
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
      "'Ay Cosmetics' store records only: look up its order (ORD-xxxx), support ticket (TCK-xxx) or customer by last 4 digits of phone. Use ONLY for that store's records.",
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
    name: "product_search",
    description:
      "Search the 'Ay Cosmetics' product catalog (name, category, shade, price, stock). Use ONLY for that store's products — for any other website's prices/details use fetch_webpage instead. Never invent prices.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            'What the customer is looking for, e.g. "lipstick ruby", "sunscreen", "serum for glow".',
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_order_request",
    description:
      "Create an order request for the 'Ay Cosmetics' store and get a ready WhatsApp order link for the customer. Requires item names (with shade if any), quantity per item, and the customer's name and phone number.",
    parameters: {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          description:
            "Items to order. Get exact names/prices from product_search first.",
          items: {
            type: "OBJECT",
            properties: {
              name: {
                type: "STRING",
                description:
                  'Product name incl. shade if chosen, e.g. "Matte Lipstick Ruby".',
              },
              quantity: {
                type: "NUMBER",
                description: "How many units (default 1).",
              },
            },
            required: ["name"],
          },
        },
        customer_name: {
          type: "STRING",
          description: "Customer's full name.",
        },
        phone: {
          type: "STRING",
          description: "Customer's phone number for delivery confirmation.",
        },
        address: {
          type: "STRING",
          description: "Optional delivery address / city.",
        },
      },
      required: ["items", "customer_name", "phone"],
    },
  },
  {
    name: "create_ticket",
    description:
      "File a support/complaint ticket for the 'Ay Cosmetics' store (wrong or damaged item, late delivery, refund request etc.). Returns a ticket ID (TCK-xxx) the team responds to within 24 hours.",
    parameters: {
      type: "OBJECT",
      properties: {
        subject: {
          type: "STRING",
          description:
            'Short summary of the issue, e.g. "Wrong shade received".',
        },
        description: {
          type: "STRING",
          description: "Full details of the complaint in the customer's words.",
        },
        order_id: {
          type: "STRING",
          description: 'Related order ID if known, e.g. "ORD-1001".',
        },
        contact: {
          type: "STRING",
          description: "Customer's phone/WhatsApp so the team can reach them.",
        },
      },
      required: ["subject"],
    },
  },
] as const;

const PC_TOOL_DECLARATIONS = [
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
] as const;

function toolDeclarations() {
  return isPublicMode()
    ? [...GENERAL_TOOL_DECLARATIONS]
    : [...GENERAL_TOOL_DECLARATIONS, ...PC_TOOL_DECLARATIONS];
}

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

  return `You are the user's PERSONAL AI ASSISTANT — a capable, proactive general problem-solver. You help with ANYTHING: general knowledge, real-time details from any website, everyday tasks, and actions on the user's device. You are NOT limited to any one website or brand — if the user asks about a cinema, a restaurant, a government site, another online shop or anything else, help them fully.

# TODAY'S DATE
The current date is ${dateStr} and the time is ${timeStr}. Always treat this as "today" when the user asks about the current date, day of the week, or time. Do not guess a date from your training data.

${searchBlock}
${weatherBlock}

# YOUR TOOLS (function calling)
Call functions when relevant — silently and naturally, never mention technical details. If a tool returns found:false or an error, tell the user honestly and suggest what to try next.
1. fetch_webpage(url) — READ any website live and get its real text content. Your source for EXACT real-world details: movie/cinema showtimes, schedules, menus, notices, prices on ANY site.
2-6. Ay Cosmetics store tools (customer_faq, customer_lookup, product_search, create_order_request, create_ticket) — use ONLY when the user is clearly asking about that specific store ("Ay Cosmetics"). For every other topic ignore them.

# GETTING REAL DETAILS FROM WEBSITES (showtimes, schedules, prices...)
When the user asks something that needs exact CURRENT info from a specific place/website — e.g. "is cinema mein ye movie kab lagegi", "train ka time", "is restaurant ka menu":
1. Find the right page URL (from the live search results above, or the official domain).
2. CALL fetch_webpage FIRST — then answer using ONLY what the page actually says (exact movie names, times, dates). Never invent showtimes or prices from memory.
3. If the page can't be read (JavaScript-only/blocked), say so honestly and give an [OPEN:] button to that page so the user can check themselves.
4. If several candidate URLs fail, try at most 2 more before falling back to search snippets (clearly labelled as possibly-outdated).

# DOING THINGS FOR THE USER (bookings, orders, accounts)
You cannot click inside third-party checkout/payment pages (cards, OTPs, captchas are private to the user). So for "book my seat / order this / register me":
1. First gather ALL needed details from the user (movie, cinema, date, time, seats; or item, quantity...).
2. Fetch the target page with fetch_webpage to confirm availability/details where useful.
3. Take the user STRAIGHT to the right booking/order page via open_website (or an [OPEN:] button in public mode) — deep-link directly to the movie/show/product page whenever possible.
4. Give short step-by-step guidance for what remains (seat pick, payment). NEVER claim you completed a booking or order yourself.

# AY COSMETICS STORE FLOW (only when asked about it)
- Price/stock/shade question -> product_search first, quote EXACTLY what it returns.
- Ordering: confirm product(s)+shades+quantities, ask NAME and PHONE, call create_order_request, then ALWAYS end with [OPEN:Order on WhatsApp|<whatsapp_url>].
- Complaints: offer create_ticket — ask order ID + contact; share the TCK ID; team replies within 24h (Mon–Sat 10am–8pm).
${
  isPublicMode()
    ? `# LINKS & BUTTONS (public website mode)
You cannot open apps/sites on anyone's device — instead give action buttons. Whenever a URL would help (booking page, WhatsApp, maps, social page), add up to 2 [OPEN:ShortLabel|https://full-url] tokens at the very END of your reply.`
    : `# OPENING WEBSITES / WHATSAPP (AUTO-OPEN ON THIS PC)
When the user asks you to open, play, show ("kholo", "dikhao") a website, video, map, or send a WhatsApp message, CALL the open_website function IMMEDIATELY — the site opens on the user's PC automatically. Do not just paste a link.
1. Build the full URL first:
   - YouTube -> https://www.youtube.com ; music/video search -> https://www.youtube.com/results?search_query=...
   - Google search -> https://www.google.com/search?q=... ; Maps -> https://www.google.com/maps/search/<place>
   - Booking/movie pages -> the exact official URL
   - WhatsApp message, e.g. "03001234567 ko hello bhejo" -> https://wa.me/923001234567?text=Hello
     (convert local numbers 03XXXXXXXXX to 923XXXXXXXXX — country code 92, no +, no spaces; put message in ?text= URL-encoded)
2. Call open_website(url).
3. If it returns ok:true -> reply briefly (mention the site name). For WhatsApp add: "WhatsApp khul gaya, ab aap Send dabayen". NEVER claim a WhatsApp message was already SENT — the user always presses Send.
4. If it returns ok:false (disabled/failed) -> apologise briefly AND add an action token at the very END of your reply so the user gets a button instead:
   [OPEN:ShortLabel|https://full-url]
Up to 2 [OPEN:] tokens per reply as fallback only. Never write both an auto-open and a button for the same URL when the auto-open succeeded.`
}

# STYLE
- Friendly but professional.
- Answer in the SAME language the user writes in (Roman Urdu / English / Urdu).
- Keep answers clear and well-structured. Short paragraphs or bullet points where useful.
- Always mention the specific website name when you provide a link to it.
- Do NOT write a "Sources:" section — the interface shows source links separately.

# RULES
1. Never invent facts, statistics, prices, dates, showtimes, order statuses or events. If you don't know — fetch_webpage or say so honestly.
2. Help across ALL websites and topics equally; never refuse a legitimate task just because it is outside any particular store.
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

      // Chat-created tickets first, then Shopify/demo data.
      if (lookupType === "ticket") {
        const createdTicket = findCreatedTicket(lookupId);
        if (createdTicket) {
          return { found: true, ticket: createdTicket };
        }
      }

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

    case "fetch_webpage": {
      return fetchWebpage(String(args.url ?? ""));
    }

    case "product_search": {
      return productSearch(String(args.query ?? ""));
    }

    case "create_order_request": {
      const rawItems = Array.isArray(args.items) ? args.items : [];
      const items = rawItems
        .map((item) => {
          const obj = (item ?? {}) as Record<string, unknown>;
          return {
            name: String(obj.name ?? "").trim(),
            quantity: Number(obj.quantity ?? 1) || 1,
          };
        })
        .filter((item) => item.name.length > 0);
      if (items.length === 0) {
        return {
          ok: false,
          error: "No items provided. Ask the customer which products they want.",
        };
      }
      const customerName = String(args.customer_name ?? "").trim();
      const phone = String(args.phone ?? "").trim();
      if (!customerName || !phone) {
        return {
          ok: false,
          error:
            "customer_name and phone are required. Ask the customer for their name and phone number first.",
        };
      }
      return createOrderRequest({
        items,
        customer_name: customerName,
        phone,
        address: args.address ? String(args.address).trim() : undefined,
      });
    }

    case "create_ticket": {
      const subject = String(args.subject ?? "").trim();
      if (!subject) {
        return {
          ok: false,
          error: "subject is required — briefly summarise the complaint.",
        };
      }
      const ticket = createTicket({
        subject,
        description: String(args.description ?? "").trim() || undefined,
        order_id: String(args.order_id ?? "").trim() || undefined,
        contact: String(args.contact ?? "").trim() || undefined,
      });
      return {
        ok: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
        },
        message:
          "Tell the user their ticket ID and that the team will contact them within 24 hours (Mon–Sat, 10am–8pm), usually on WhatsApp.",
      };
    }

    case "run_command": {
      if (isPublicMode()) {
        return {
          ok: false,
          output: "Blocked in public mode — shell access is disabled.",
        };
      }
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
      if (isPublicMode()) {
        return {
          ok: false,
          message:
            "Blocked in public mode. Instead, end your reply with an [OPEN:Label|url] action token so the user gets a button.",
        };
      }
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
      if (isPublicMode()) {
        return {
          ok: false,
          message: "Blocked in public mode — app launching is disabled.",
        };
      }
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
    tools: object[];
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
                tools: toolDeclarations(),
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
