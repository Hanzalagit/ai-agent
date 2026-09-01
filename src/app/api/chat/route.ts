import { ChatRequestSchema, sanitizeInput } from "@/lib/validation";
import { buildSystemPrompt, buildTenantSystemPrompt } from "@/lib/prompts";
import { getToolDeclarations, executeTool, performSearch, performWeather } from "@/lib/tools";
import {
  streamGeminiRound,
  isFunctionCall,
  extractFunctionCalls,
  createFunctionResponseParts,
  MAX_TOOL_ROUNDS,
} from "@/lib/gemini";
import { generateConversationSummary, classifyIntent } from "@/lib/memory";
import { checkRateLimit } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/analytics";
import { analyzeSentiment } from "@/lib/sentiment";
import { upsertCustomer } from "@/lib/crm";
import { getTenantById, getTenantBySlug } from "@/lib/tenant";
import {
  searchTenantProducts,
  getTenantProducts,
  getTenantFaqs,
  getTenantBusiness,
  getTenantKnowledge,
  searchTenantKnowledge,
  incrementMessageCount,
  getMessageCount,
} from "@/lib/tenant-data";
import type { GeminiContent, GeminiPart } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function answerTenantFaq(
  tenantId: string,
  question: string
): { found: boolean; question?: string; answer?: string } {
  const faqs = getTenantFaqs(tenantId);
  const q = question.toLowerCase();

  for (const faq of faqs) {
    const matchScore = faq.keywords.reduce((score, kw) => {
      return score + (q.includes(kw.toLowerCase()) ? 1 : 0);
    }, 0);
    if (matchScore > 0) {
      return { found: true, question: faq.question, answer: faq.answer };
    }
  }
  return { found: false };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  // Check for tenant context
  const tenantId = request.headers.get("x-tenant-id") || request.headers.get("x-api-key");
  const tenant = tenantId ? (getTenantById(tenantId) || getTenantBySlug(tenantId)) : null;

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

  // Check tenant message limit
  if (tenant) {
    const currentCount = getMessageCount(tenant.id);
    const maxMessages = tenant.limits?.maxMessages ?? 100;
    if (maxMessages !== -1 && currentCount >= maxMessages) {
      return Response.json(
        { error: `Monthly message limit reached (${maxMessages}). Upgrade your plan to continue.` },
        { status: 403 }
      );
    }
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
  const lastUserImage =
    [...messages].reverse().find((m) => m.role === "user")?.image ?? null;

  function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], base64: match[2] };
  }

  // Sanitize input
  const sanitizedQuery = sanitizeInput(lastUserMessage);

  // Analyze sentiment and classify intent
  const sentiment = analyzeSentiment(lastUserMessage);
  const intent = classifyIntent(lastUserMessage);

  // Track message event
  trackEvent({
    type: "message",
    tenantId: tenant?.id,
    data: {
      intent: intent.type,
      sentiment: sentiment.label,
      sentimentScore: sentiment.score,
      hasImage: !!lastUserImage,
    },
  });

  // Track sentiment
  trackEvent({
    type: "sentiment",
    tenantId: tenant?.id,
    data: {
      score: sentiment.score,
      label: sentiment.label,
      confidence: sentiment.confidence,
    },
  });

  // Upsert customer CRM entry (if phone detected)
  const phoneMatch = lastUserMessage.match(/\b(\d{4,5})\b/);
  if (phoneMatch) {
    const interaction = {
      id: `INT-${Date.now()}`,
      type: "chat" as const,
      summary: lastUserMessage.slice(0, 100),
      sentiment: sentiment.score,
      timestamp: new Date().toISOString(),
    };
    upsertCustomer({ tenantId: tenant?.id, phone: phoneMatch[0], interaction });
  }

  // Perform search and weather in parallel
  const [searchResults, weather] = await Promise.all([
    performSearch(sanitizedQuery),
    performWeather(sanitizedQuery),
  ]);

  // Generate conversation summary for context
  const conversationSummary = generateConversationSummary(
    messages.slice(0, -1)
  );

  // Tenant-specific context
  let tenantContext = "";
  if (tenant) {
    const business = getTenantBusiness(tenant.id);
    const faqResult = answerTenantFaq(tenant.id, lastUserMessage);
    const allFaqs = getTenantFaqs(tenant.id);
    const matchedProducts = searchTenantProducts(tenant.id, lastUserMessage);
    const allProducts = getTenantProducts(tenant.id);
    const matchedKnowledge = searchTenantKnowledge(tenant.id, lastUserMessage);
    const allKnowledge = getTenantKnowledge(tenant.id);

    tenantContext = `
# TENANT BUSINESS INFO
Business: ${tenant.name}
Hours: ${business.hours || "Not set"}
City: ${business.city || "Not set"}
WhatsApp: ${business.whatsapp || "Not set"}

# ALL FAQs (complete list)
${allFaqs.length > 0 ? allFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") : "No FAQs added yet."}

# BEST FAQ MATCH (for this query)
${faqResult.found ? `Matched Q: ${faqResult.question}\nMatched A: ${faqResult.answer}` : "No direct FAQ match for this query."}

# ALL TENANT PRODUCTS (complete catalog)
${allProducts.length > 0 ? allProducts.map((p) => `- ${p.name} (${p.category}) - Rs. ${p.pricePKR} - ${p.stock}${p.description ? ` - ${p.description}` : ""}`).join("\n") : "No products added yet."}

# MATCHING PRODUCTS (for this query)
${matchedProducts.length > 0 ? matchedProducts.map((p) => `- ${p.name} (${p.category}) - Rs. ${p.pricePKR}`).join("\n") : "No matching products for this query."}

# ALL KNOWLEDGE BASE ENTRIES (complete list)
${allKnowledge.length > 0 ? allKnowledge.map((k) => `- [${k.category}] ${k.title}: ${k.content}`).join("\n") : "No knowledge entries added yet."}

# MATCHING KNOWLEDGE (for this query)
${matchedKnowledge.length > 0 ? matchedKnowledge.map((k) => `- ${k.title}: ${k.content.slice(0, 200)}`).join("\n") : "No matching knowledge for this query."}
`;
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

  // Build last user message parts — include image if present
  const lastUserParts: GeminiPart[] = [{ text: lastUserMessage }];
  if (lastUserImage) {
    const parsed = parseDataUrl(lastUserImage);
    if (parsed) {
      lastUserParts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.base64,
        },
      });
    }
  }
  contents.push({ role: "user", parts: lastUserParts });

  const encoder = new TextEncoder();
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

  // Build system prompt - tenant-aware or default
  const systemPrompt = tenant
    ? buildTenantSystemPrompt(tenant, searchResults, weather, conversationSummary, tenantContext)
    : buildSystemPrompt(searchResults, weather, conversationSummary);

  try {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ __sources: searchResults }) + "\n")
        );

        // Increment message count on successful start
        if (tenant) {
          incrementMessageCount(tenant.id);
        }

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
                systemInstruction: systemPrompt,
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
              const toolStart = Date.now();
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
              const toolDuration = Date.now() - toolStart;
              trackEvent({
                type: "tool_call",
                tenantId: tenant?.id,
                data: {
                  tool: call.name,
                  duration: toolDuration,
                  query: call.args.query ?? call.args.question ?? "",
                  success: !outcome.error,
                },
              });
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
