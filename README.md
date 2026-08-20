# Ay Cosmetics — Customer-Facing AI Agent

A customer-facing AI assistant for **Ay Cosmetics** built with Next.js and the free
[Google Gemini API](https://ai.google.dev/). It handles:

- 🛍️ **Product inquiries** — recommend products, check stock and prices
- 📦 **Order tracking** — guide customers to track orders and handle issues
- 📅 **Bookings** — book skin consultations & makeup appointments
- ❓ **FAQs** — returns, delivery, payment policies and more

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Google Gemini** `gemini-2.5-flash` (free tier) for LLM responses
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
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. **Install & run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000

## Customising the agent

All business data lives in `src/lib/knowledge.ts`:

- Edit `products` to update the product catalogue.
- Edit `services` to change bookable services.
- Edit `storeInfo` for contact info, delivery, returns and FAQs.

The assistant's persona and rules live in `src/lib/systemPrompt.ts`.

## Deployment

The app is a standard Next.js project — deploy it on any platform that supports
Next.js (Vercel, Netlify, Railway, or self-host with Docker). For hosting on
GitHub, just push the repo and connect it to your host of choice.

Remember to set the `GEMINI_API_KEY` environment variable in your hosting
platform — never commit the real key.

## Free-tier caveat

The free Google AI Studio tier is rate-limited (approx. 10 req/min, ~250 req/day
for `gemini-2.5-flash`) and may use your data to improve Google products. For
production/high-volume traffic, enable billing on a Google Cloud project.