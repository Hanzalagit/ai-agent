# AI Assistant — Ask Anything

A general knowledge AI assistant built with Next.js and the
[Google Gemini API](https://ai.google.dev/). It answers any question — news,
facts, how-tos, coding, writing, ideas — with clear, structured answers.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Google Gemini** `gemini-3.6-flash` (free tier) for LLM responses
- **Optional Google Search grounding** (paid tier) for live, up-to-date answers
- Server-side API route at `/api/chat` with token streaming

## Getting started

1. **Get a free API key** — create one at <https://aistudio.google.com/apikey>
   (free tier, no credit card required).

2. **Set your key** — copy `.env.example` to `.env.local` and add your key:

   ```bash
   cp .env.example .env.local
   ```

   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-3.6-flash
   ENABLE_GROUNDING=false
   ```

3. **Install & run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000

## Search grounding (live answers)

Google Search grounding makes answers accurate for news and current events, but
it is **not available on the free tier** — it requires enabling billing on the
Google Cloud project that owns the key. Once billing is enabled, set
`ENABLE_GROUNDING=true` in `.env.local` (and your hosting platform). Without
grounding, the assistant still answers general-knowledge questions well from the
model's own knowledge.

## Customising the assistant

- **Persona & rules:** edit the `SYSTEM_PROMPT` constant in
  `src/app/api/chat/route.ts`.
- **Quick-suggestion chips:** edit `SUGGESTIONS` in `src/components/Chat.tsx`.
- **Page copy & look:** edit `src/app/page.tsx`.

## Deployment

Standard Next.js project — deploy on any platform that supports Next.js
(Vercel, Netlify, Railway, or self-host with Docker). Set the `GEMINI_API_KEY`
environment variable in your hosting platform — never commit the real key.

## Free-tier caveat

The free Google AI Studio tier is rate-limited (roughly a few hundred requests
per day) and may use your data to improve Google products. For
production/high-volume traffic, enable billing on a Google Cloud project.