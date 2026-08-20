# AI Assistant — Ask Anything

A general knowledge AI assistant built with Next.js and the
[Google Gemini API](https://ai.google.dev/). It answers any question — news,
facts, how-tos, coding, writing, ideas — with clear, structured answers.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Google Gemini** `gemini-3.5-flash-lite` (free tier, high daily quota for Flash-Lite models) for LLM responses
- **Google Programmable Search Engine (Custom Search JSON API)** for LIVE
  Google search — answers are up to date and show direct source links (free tier: 100 searches/day)
- Server-side API route at `/api/chat` with token streaming + source links

## Getting started

1. **Get a free API key** — create one at <https://aistudio.google.com/apikey>
   (free tier, no credit card required).

2. **Set your key** — copy `.env.example` to `.env.local` and add your key:

   ```bash
   cp .env.example .env.local
   ```

   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-3.5-flash-lite
   GOOGLE_CSE_KEY=
   GOOGLE_CSE_ID=
   ENABLE_LIVE_SEARCH=true
   ```

3. **Enable live Google search (recommended)** so answers are up to date and
   show direct source links:

   1. Get a Custom Search JSON API key: <https://developers.google.com/custom-search/v1/intro>
      (first call there asks for a Search Engine ID — create the engine in step 2 first if needed)
   2. Create a Programmable Search Engine: <https://programmablesearchengine.google.com/>
      — copy the **Search engine ID** into `GOOGLE_CSE_ID`.
   3. Put the API key into `GOOGLE_CSE_KEY` and set `ENABLE_LIVE_SEARCH=true`.
   This is free for 100 queries per day. Without these keys the assistant still
   answers from Gemini's own knowledge, just without live search/links.

4. **Install & run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000

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