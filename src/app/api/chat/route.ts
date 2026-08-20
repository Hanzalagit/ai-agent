import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchWeb, type SearchResult } from "@/lib/search";
import { getWeather, type Weather } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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

  return `You are a helpful, accurate, and unbiased general knowledge assistant.

# TODAY'S DATE
The current date is ${dateStr} and the time is ${timeStr}. Always treat this as "today" when the user asks about the current date, day of the week, or time. Do not guess a date from your training data.

${searchBlock}
${weatherBlock}

# YOUR JOB
- Answer the user's question in a helpful, accurate way.
- Base your answer primarily on the LIVE SEARCH RESULTS and LIVE WEATHER REPORT above (when present).
- Answer in the same language the user writes in.
- Keep answers clear and well-structured. Use short paragraphs or bullet points where useful.

# OPENING LINKS / APPS
When the user asks you to "open", "play", "show", "khula", "dikhao" a website, app, video, or place, add an action token at the very END of your reply like this:
[OPEN:ShortLabel|https://full-url]
Examples:
- User: "youtube kholo" -> reply briefly, then: [OPEN:Open YouTube|https://www.youtube.com]
- User: "play desi music" -> [OPEN:Play music on YouTube|https://www.youtube.com/results?search_query=desi+music]
- User: "open google maps for lahore" -> [OPEN:Open in Google Maps|https://www.google.com/maps/search/Lahore]
- User: "open facebook" -> [OPEN:Open Facebook|https://www.facebook.com]
- User: "dollar ka google search" -> [OPEN:Search on Google|https://www.google.com/search?q=usd+to+pkr+rate]
Use google.com/search?q=... for web searches and youtube.com/results?search_query=... for music/videos. You may include up to 2 OPEN tokens. Do NOT write plain "click this link" sentences for these — the interface shows the buttons.

# STYLE
- Friendly but professional.
- Always mention the specific website name in your answer when you provide a link to it.
- Do NOT write a "Sources:" section in your reply — the interface shows the source links separately below your answer.

# RULES
1. Never invent facts, statistics, prices, dates, or events. If the search results do not contain the answer, say so honestly.
2. Be careful with medical, legal, or financial questions — offer general guidance and recommend consulting a professional for decisions.
3. Refuse clearly but helpfully if asked for something harmful.`;
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
  if (/\b(weather|temperature|mausam|forecast|weatherkaisa)\b/i.test(lastUserMessage)) {
    weather = await getWeather(lastUserMessage);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    systemInstruction: buildSystemPrompt(searchResults, weather),
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