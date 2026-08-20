# AI Assistant — Ask Anything

A general knowledge AI assistant built with Next.js and the
[Google Gemini API](https://ai.google.dev/). It answers any question — news,
facts, how-tos, coding, writing, ideas — with clear, structured answers.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Google Gemini** `gemini-3.5-flash-lite` (free tier, high daily quota for Flash-Lite models) for LLM responses
- **Live web search** via **Brave Search API** (free: 2,000 searches/month) or
  **Tavily** (free: 1,000/month) — answers are up to date and show direct source links
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

   # Live search — pick ONE provider:
   BRAVE_SEARCH_KEY=          # https://brave.com/search/api/  (2,000/month)
   TAVILY_API_KEY=            # https://tavily.com            (1,000/month)
   SEARCH_PROVIDER=brave
   ENABLE_LIVE_SEARCH=true
   ```

3. **Enable live web search (recommended)** so answers are up to date and show
   direct source links. Note: Google shut its free Custom Search JSON API to new
   customers, so this app uses one of two free alternatives:
   - **Brave Search** (<https://brave.com/search/api/>) — recommended, 2,000
     searches/month free. Copy the API key into `BRAVE_SEARCH_KEY`.
   - **Tavily** (<https://tavily.com>) — 1,000 credits/month. Copy into
     `TAVILY_API_KEY` and set `SEARCH_PROVIDER=tavily`.
   Without a search key the assistant still answers from Gemini's own knowledge,
   just without live results/links.

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