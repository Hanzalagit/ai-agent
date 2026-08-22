# Ay Assistant — Customer-Facing AI Agent

An AI assistant that doesn't just chat — it **takes action**. Built with
Next.js and the [Google Gemini API](https://ai.google.dev/) (free tier).

It answers questions with live web search, looks up customer orders/tickets
from its own knowledge base, launches PC apps on command, and opens WhatsApp
chats with pre-filled messages — all from a simple chat box in Roman Urdu,
Urdu or English.

## What it can do right now

| Capability | Example | How |
|---|---|---|
| General Q&A + live search | "Aaj ki news kya hai?" | Gemini + Serper/Brave/Tavily |
| Weather | "Lahore ka mausam?" | Open-Meteo (no key needed) |
| Business FAQ | "Delivery kitne din ki hai?" | `customer_faq` tool → `src/data/customer-data.json` |
| Order / ticket lookup | "ORD-1001 ka status?" | `customer_lookup` tool |
| Launch PC apps | "Notepad kholo", "Chrome kholo" | `open_local_app` tool (whitelisted) |
| **Run CMD commands** | "Mera IP batao", "dir chalao", scripts | `run_command` tool (30s timeout, destructive blocked) |
| **Auto-open websites on PC** | "YouTube kholo" → browser khud khulta hai | `open_website` tool |
| WhatsApp message | "03001234567 ko hello bhejo" | wa.me URL auto-opens; aap Send dabayen |
| Link buttons (fallback) | agar auto-open band ho | `[OPEN:...]` buttons in chat |

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Google Gemini** `gemini-3.5-flash-lite` (free tier) with **function calling**
  via the direct REST API (`streamGenerateContent`, SSE) — no SDK needed
- **Live search** via Serper.dev (2,500 free) / Brave (2,000/mo) / Tavily (1,000/mo)
- Streaming API route at `/api/chat` (first line = JSON header `{__sources}`, then text)

## Getting started

1. **Get a free API key** at <https://aistudio.google.com/apikey> (no card).

2. **Configure** — copy `.env.example` to `.env.local`:

   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-3.5-flash-lite

   # Live search — pick ONE provider:
   SERPER_API_KEY=           # https://serper.dev (recommended, no card)
   SEARCH_PROVIDER=serper
   ENABLE_LIVE_SEARCH=true

   # PC agent — allows the bot to launch whitelisted apps on this machine
   LOCAL_AGENT_ENABLED=true
   ```

3. **Run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000

## Customising

- **Real Shopify orders (recommended):** add these to `.env.local` and order
  lookups answer from your LIVE store automatically (demo JSON becomes backup):

  ```
  SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
  SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxxxxxxxxxxxxx   # free, see below
  SHOPIFY_API_VERSION=2025-01
  ```

  Token kaise banayein (free): **Shopify Admin → Settings → Apps and sales
  channels → Develop apps → Allow custom app development → Create app →
  Configure Admin API scopes** (`read_orders`, `read_customers`) **→ Install
  app → Admin API access token copy karein.**
- **Your business data:** edit `src/data/customer-data.json`
  (FAQs + demo orders/tickets). FAQs are always read from here; orders come
  from Shopify when configured.
- **Whitelisted PC apps:** edit `APP_WHITELIST` in `src/lib/local-agent.ts`.
- **Persona & rules:** `buildSystemPrompt()` in `src/app/api/chat/route.ts`.
- **Suggestion chips:** `SUGGESTIONS` in `src/components/Chat.tsx`.

### Security note (PC agent)

`LOCAL_AGENT_ENABLED=true` lets anyone who can reach this server launch
whitelisted apps on the machine, and `ENABLE_SHELL_COMMANDS=true` also allows
running cmd commands with their output returned to the model. Destructive
commands (`format`, `diskpart`, `shutdown`, forced deletes...) are refused by
a blocklist, and commands time out after 30s — but this is still a powerful
capability. Fine for personal use on localhost; set both flags to `false`
before exposing the server publicly or on shared networks.

## Roadmap

- [x] Phase 1 — Tool-calling agent: FAQ, order lookup, PC app launcher,
      website auto-open, CMD commands (safe), WhatsApp links
- [x] Shopify live integration (orders + customers via Admin API)
- [ ] Phase 2 — Mobile app (Expo APK): voice input/TTS, native intents
- [ ] Phase 3 — Local LLM option (Ollama) + remote control from phone
- [ ] Phase 4 — Signed release build

## Deployment

Standard Next.js project — deploy anywhere that supports Next.js. Set
environment variables in your host; never commit `.env.local`.

## Free-tier caveat

The free Gemini tier is rate-limited daily (429 errors are surfaced as a
friendly message). For heavy traffic, enable billing or self-host a local
LLM (planned in Phase 3).
