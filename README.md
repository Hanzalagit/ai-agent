<div align="center">

# ⚡ AI Agent

**A personal AI agent that doesn't just chat — it takes action.**

Reads live websites, books what you need, runs your PC, and speaks your language.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Google Gemini](https://img.shields.io/badge/Powered_by-Gemini-8E75B2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

</div>

---

## ✨ What is this?

AI Agent is a full-stack assistant built on **Google Gemini function calling**.
Ask in **Roman Urdu, Urdu or English** — it reads real web pages for exact
details (movie showtimes, schedules, prices), places orders through WhatsApp,
files support tickets, launches apps on your PC, opens sites for you, and
remembers your conversations.

No paid APIs. No SDK lock-in. Free tier friendly.

## 🚀 Features

| | Feature | What it does |
|---|---|---|
| 🌐 | **Live webpage reading** | Fetches any URL server-side and extracts real text — exact showtimes, menus, schedules. Never invents data |
| 🔍 | **Live web search** | Real Google results via Serper / Brave / Tavily with source links |
| 🎙️ | **Voice mode** | Speak to the agent (Urdu/English) and hear replies out loud — built-in Web Speech API |
| 💬 | **Persistent chat history** | Sessions saved locally — close the tab, come back later |
| 🛒 | **Order flow** | Product catalog lookup → cart → one-tap WhatsApp order message |
| 🎫 | **Support tickets** | Complaints filed from chat with persistent ticket IDs |
| 💻 | **PC control** *(optional)* | Launch whitelisted apps, open any website, run safe CMD commands |
| 🔒 | **Deploy-safe mode** | `PUBLIC_MODE=true` strips every PC capability for public hosting |
| ☀️ | **Weather** | Open-Meteo integration, no key needed |

## 📦 Quick start

**Prerequisites:** Node.js 18+, a free [Gemini API key](https://aistudio.google.com/apikey) (no credit card).

```bash
# 1. Clone & install
git clone https://github.com/Hanzalagit/ai-agent.git
cd ai-agent
npm install

# 2. Configure
cp .env.example .env.local        # then add your GEMINI_API_KEY

# 3. Run
npm run dev                       # → http://localhost:3000
```

> Voice input requires **Chrome or Edge** (Web Speech API).

## ⚙️ Configuration

All settings live in `.env.local`. Only `GEMINI_API_KEY` is required.

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | **Required.** Free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Any Gemini model ID |
| `ENABLE_LIVE_SEARCH` | `false` | Master switch for web search |
| `SEARCH_PROVIDER` | `serper` | `serper` · `brave` · `tavily` (+ its API key var) |
| `SERPER_API_KEY` | — | Free 2,500 searches, no card → [serper.dev](https://serper.dev) |
| `PUBLIC_MODE` | `false` | **Set `true` when hosting publicly** — removes all PC tools |
| `LOCAL_AGENT_ENABLED` | `true` | Allow app launching / website auto-open on this PC |
| `ENABLE_SHELL_COMMANDS` | `true` | Allow read-only CMD commands (destructive blocked) |
| `SHOPIFY_STORE_DOMAIN` | — | Optional: live order/customer data |
| `SHOPIFY_ADMIN_API_TOKEN` | — | `shpat_…` token with `read_orders`, `read_customers` scopes |
| `SHOPIFY_API_VERSION` | `2025-01` | Shopify Admin API version |

## 💬 Example prompts

```text
CineStar Lahore mein aaj konsi movies lag rahi hain?
→ agent reads cinestar.pk live and lists real showtimes per branch

Spider-Man ki seat book kar do kal ki 8 baje wali
→ confirms details, opens the exact booking page, guides next steps

Lipstick kitne ki hai?
→ product catalog search with real prices & stock status

Mera order ORD-1001 kahan tak pohancha?
→ order lookup (Shopify live data or local records)

0300 1234567 ko hello bhejo
→ opens WhatsApp chat pre-filled — you just press Send

Notepad kholo · YouTube kholo · Mera IP batao
→ PC tools (disabled automatically in PUBLIC_MODE)
```

## 🧠 How it works

```text
┌─────────────┐   POST /api/chat    ┌──────────────────────────┐
│  Chat UI     │ ─────────────────▶ │  Gemini function calling │
│  React 19    │ ◀───────────────── │  (direct REST + SSE)     │
│  voice+store │   streamed text    └──────────┬───────────────┘
└─────────────┘                                │ tool calls
                                    ┌──────────▼───────────────────┐
                                    │ fetch_webpage  customer_faq   │
                                    │ run_command    create_ticket  │
                                    │ open_website   product_search │
                                    │ open_local_app create_order   │
                                    │               customer_lookup │
                                    └──────────────────────────────┘
```

The model decides which tools to call, the server executes them safely, and
results stream back token-by-token. Action links render as tappable buttons.

### Project structure

```text
src/
├── app/
│   ├── api/chat/route.ts     # Agent core: system prompt, tools, SSE streaming
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # App shell
├── components/Chat.tsx       # Full UI: sessions, voice, markdown, streaming
├── lib/
│   ├── webpage.ts            # Server-side page reader (HTML → text)
│   ├── products.ts           # Catalog search
│   ├── orders.ts             # Cart → WhatsApp order link
│   ├── tickets.ts            # Persistent ticket store (.runtime/)
│   ├── customer.ts           # FAQ matching + record lookups
│   ├── local-agent.ts        # PC app launcher + shell runner (whitelist)
│   ├── shopify.ts            # Live Shopify Admin API
│   ├── search.ts             # Serper / Brave / Tavily providers
│   └── weather.ts            # Open-Meteo
└── data/                     # Editable business data (FAQs, catalog, demo orders)
```

## 🔒 Security

- Destructive commands (`format`, `diskpart`, `shutdown`, …) are **blocked by
  an allow/deny list**; shell commands time out after 30 s.
- PC tools are gated behind three independent flags and removed entirely in
  `PUBLIC_MODE`.
- The webpage reader blocks private/internal network addresses (SSRF guard).
- Never commit `.env.local` — it's gitignored.

> Running publicly? Set `PUBLIC_MODE=true`. That's the whole checklist.

## 🗺️ Roadmap

- [x] Tool-calling agent — FAQ, orders, PC control, WhatsApp, Shopify
- [x] General agent — live webpage reader, bookings guidance, deploy-safe mode
- [x] Professional UI — sessions/history, voice input + TTS, markdown
- [ ] Mobile app (Expo APK): native voice, intents, phone → PC control
- [ ] Local LLM option (Ollama) — unlimited, offline
- [ ] Signed release builds

## ❓ FAQ

<details>
<summary><b>Is it really free?</b></summary>
Yes — Gemini free tier + optional free search keys. Rate limits surface as
friendly messages instead of crashes.
</details>

<details>
<summary><b>Can it complete payments/bookings end-to-end?</b></summary>
It gathers details, fetches real availability, and deep-links you to the exact
checkout page. Card entry / OTP steps stay with you by design.
</details>

<details>
<summary><b>Where are my chats stored?</b></summary>
Locally in your browser (localStorage). Nothing leaves your machine except
the messages you send to Gemini.
</details>

<details>
<summary><b>Can I use it for my own business?</b></summary>
Edit <code>src/data/customer-data.json</code> (FAQs) and
<code>products.json</code> (catalog). Orders flow into your own WhatsApp number.
</details>

## 📄 License

MIT — see [LICENSE](LICENSE).

<div align="center">
<sub>Built with Next.js 16 · React 19 · Google Gemini · Tailwind CSS 4</sub>
</div>
