import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are a helpful, accurate, and unbiased general knowledge assistant.

# YOUR JOB
- Answer any question the user asks — general knowledge, news, facts, math, coding, writing, advice, translation, and more.
- If live web search is available, use it to make sure answers are correct and up to date (especially news, events, prices, recent changes). Otherwise answer from your training knowledge.
- If you are not fully sure about something, say so honestly instead of guessing.
- Answer in the same language the user writes in.
- Keep answers clear and well-structured. Use short paragraphs or bullet points where useful. Do not over-explain.

# STYLE
- Friendly but professional. No invented brand persona.
- Cite sources naturally (e.g., "according to Google/Reuters/…") when you used search results so the user can verify.
- When it adds value, summarise multiple sides of a topic fairly.

# RULES
1. Never invent facts, statistics, prices, or events. If search did not help, say you could not verify it.
2. Be careful with medical, legal, or financial questions — offer general guidance and recommend consulting a professional for decisions.
3. Refuse clearly but helpfully if asked for something harmful.`;

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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const enableGrounding = process.env.ENABLE_GROUNDING === "true";

  try {
    const result = await model.generateContentStream({
      contents,
      ...(enableGrounding ? { tools: [{ googleSearchRetrieval: {} }] } : {}),
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
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
      { error: "Sorry, the assistant could not respond right now. Please try again shortly." },
      { status: 502 }
    );
  }
}