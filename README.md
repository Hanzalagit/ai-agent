<div align="center">

# AI Agent SaaS Platform

**Multi-tenant AI customer service platform powered by Google Gemini.**

Embeddable chat widget, admin dashboard, tenant management, and real-time AI responses.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Google Gemini](https://img.shields.io/badge/Powered_by-Gemini-8E75B2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

</div>

---

## What is this?

AI Agent SaaS is a **multi-tenant customer service platform** built on Google Gemini function calling. Businesses can create accounts, customize their AI agent, and embed it on any website.

Customers interact via an embeddable chat widget that supports **Roman Urdu, Urdu, and English** — with real-time product search, order management, support tickets, and WhatsApp integration.

## Features

### Core AI
| Feature | Description |
|---|---|
| Live webpage reading | Fetches any URL server-side and extracts real text |
| Live web search | Real Google results via Serper / Brave / Tavily |
| Voice mode | Speech-to-text and text-to-speech (Chrome/Edge) |
| Persistent chat history | Sessions saved in browser |
| Weather | Open-Meteo integration, no key needed |

### Business Tools
| Feature | Description |
|---|---|
| Product catalog | Search products with real prices and stock |
| Order flow | Product lookup → cart → WhatsApp order message |
| Support tickets | Complaints filed with auto-routing and priority |
| Customer FAQ | Smart FAQ matching from business data |
| Knowledge base | Detailed product guides and policies |
| Sentiment analysis | Detect customer emotions for better responses |
| Loyalty program | Reward customers with points |
| Agent handoff | Escalate to human agent when needed |

### Platform
| Feature | Description |
|---|---|
| Multi-tenant | Multiple businesses on one deployment |
| Admin dashboard | Overview, analytics, tickets, campaigns, knowledge |
| Embeddable widget | iframe-based chat for any website |
| Plan management | Starter / Growth / Business tiers |
| Landing page | Professional marketing page with pricing |
| Checkout flow | Plan selection and payment |

## Quick start

**Prerequisites:** Node.js 18+, a free [Gemini API key](https://aistudio.google.com/apikey).

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

## Routes

| Route | Description |
|---|---|
| `/` | Chat UI |
| `/login` | Tenant registration / login |
| `/dashboard` | Tenant dashboard |
| `/admin` | Super admin panel (requires login) |
| `/admin/login` | Admin login |
| `/landing` | Marketing landing page |
| `/checkout` | Plan selection and payment |
| `/embed` | Embeddable chat widget |
| `/chat` | Standalone chat page |

## Configuration

All settings live in `.env.local`. Only `GEMINI_API_KEY` is required.

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | **Required.** Free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Any Gemini model ID |
| `ENABLE_LIVE_SEARCH` | `false` | Master switch for web search |
| `SEARCH_PROVIDER` | `serper` | `serper` · `brave` · `tavily` |
| `SERPER_API_KEY` | — | Free 2,500 searches → [serper.dev](https://serper.dev) |
| `PUBLIC_MODE` | `true` | Set `true` for public hosting — removes PC tools |
| `LOCAL_AGENT_ENABLED` | `true` | Allow app launching on this PC |
| `ENABLE_SHELL_COMMANDS` | `true` | Allow CMD commands (destructive blocked) |
| `ADMIN_EMAIL` | — | Super admin login email |
| `ADMIN_PASSWORD` | — | Super admin login password |
| `SHOPIFY_STORE_DOMAIN` | — | Optional: live order/customer data |
| `SHOPIFY_ADMIN_API_TOKEN` | — | Shopify Admin API token |

## Embed on any website

```html
<iframe 
  src="https://your-domain.com/embed?tenant=your-slug" 
  width="400" 
  height="520" 
  frameborder="0"
  style="position:fixed; bottom:20px; right:20px; z-index:9999;">
</iframe>
```

## Security

- Server-side middleware protects `/admin` routes
- Cookie-based session authentication
- Destructive commands blocked by allow/deny list
- Shell commands timeout after 30s
- PC tools removed entirely in `PUBLIC_MODE`
- SSRF guard blocks private/internal network addresses
- No-cache headers prevent cached admin pages
- `.env.local` is gitignored

## Project structure

```text
src/
├── app/
│   ├── admin/              # Super admin dashboard
│   ├── api/
│   │   ├── admin/          # Admin API routes
│   │   ├── auth/           # Tenant authentication
│   │   ├── chat/           # AI agent core
│   │   └── tenant/         # Tenant API routes
│   ├── chat/               # Chat UI
│   ├── checkout/           # Plan checkout
│   ├── dashboard/          # Tenant dashboard
│   ├── embed/              # Embeddable widget
│   ├── landing/            # Marketing page
│   └── login/              # Tenant auth
├── components/             # React components
├── lib/
│   ├── tenant.ts           # Tenant management
│   ├── auth.ts             # Authentication
│   ├── admin-auth.ts       # Admin authentication
│   ├── campaign.ts         # Campaign manager
│   ├── crm.ts              # Customer CRM
│   ├── sentiment.ts        # Sentiment analysis
│   ├── ticket-router.ts    # Smart ticket routing
│   ├── knowledge-base.ts   # Knowledge base
│   └── ...                 # Other modules
└── data/                   # Business data (FAQs, products)
```

## Roadmap

- [x] Multi-tenant SaaS platform
- [x] Admin dashboard with analytics
- [x] Embeddable chat widget
- [x] Authentication system
- [x] Landing page and checkout
- [ ] WhatsApp Business API integration
- [ ] Real database (PostgreSQL/MongoDB)
- [ ] Email notifications
- [ ] Payment integration (Stripe)
- [ ] Mobile app (Expo APK)

## License

MIT — see [LICENSE](LICENSE).

<div align="center">
<sub>Built with Next.js 16 · React 19 · Google Gemini · Tailwind CSS 4</sub>
</div>
