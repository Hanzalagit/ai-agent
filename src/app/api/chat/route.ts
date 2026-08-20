import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchGoogle, type SearchResult } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildSystemPrompt(searchResults: SearchResult[]): string {
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

  return `You are a helpful, accurate, and unbiased general knowledge assistant.

# TODAY'S DATE
The current date is ${dateStr} and the time is ${timeStr}. Always treat this as "today" when the user asks about the current date, day of the week, or time. Do not guess a date from your training data.

${searchBlock}

# YOUR JOB
- Answer the user's question in a helpful, accurate way.
- IMPORTANT: Base your answer primarily on the LIVE SEARCH RESULTS above. Quote figures, facts and names from those snippets.
- Answer in the same language the user writes in.
- Keep answers clear and well-structured. Use short paragraphs or bullet points where useful.

# STYLE
- Friendly but professional.
- Do NOT write a "Sources:" section in your reply — the interface shows the source links separately below your answer.

# RULES
1. Never invent facts, statistics, prices, dates, or events. If the search results do not contain the answer, say so honestly.
2. If no search results were available, answer from your own knowledge and clearly note that live search is unavailable.
3. Be careful with medical, legal, or financial questions — offer general guidance and recommend consulting a professional for decisions.
4. Refuse clearly but helpfully if asked for something harmful.`;
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
    searchResults = await searchGoogle(lastUserMessage);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    systemInstruction: buildSystemPrompt(searchResults),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const result = await model.generateContentStream({ contents });
    const encoder = new TextEncoder();
    const header =
      JSON.stringify({ __sources: searchResults }) + "\n";
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(header));
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
    const status = (err as { status?: number }).status;
    if (status === 429) {
      return Response.json(
        {
          error:
            "The free-tier daily request limit for this Gemini API key has been reached — please try again tomorrow, or enable billing / use a fresh key from https://aistudio.google.com/apikey for more.",
        },
        { status: 429 }
      );
    }
    if (status && status >= 500) {
      return Response.json(
        { error: "Gemini is temporarily unavailable — please try again in a minute." },
        { status: 502 }
      );
    }
    return Response.json(
      { error: "Sorry, the assistant could not respond right now. Please try again shortly." },
      { status: 502 }
    );
  }
}