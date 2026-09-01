<div align="center">

# AI Agent SaaS Platform

**Multi-tenant AI customer service platform powered by Google Gemini.**

Embeddable chat widget, admin dashboard, tenant management, and real-time AI responses.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Google Gemini](https://img.shields.io/badge/Powered_by-Gemini-8E75B2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
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

### Integrations
| Feature | Description |
|---|---|
| WhatsApp Business API | Send/receive messages, webhooks, broadcast campaigns |
| Email Notifications | Ticket created/updated notifications |
| Campaign Manager | Real message broadcasting to contacts |
| Shopify Integration | Live order/customer data |

### Platform
| Feature | Description |
|---|---|
| Multi-tenant | Multiple businesses on one deployment |
| Admin dashboard | Overview, analytics, tickets, campaigns, knowledge |
| Embeddable widget | iframe-based chat for any website |
| Plan management | Starter / Growth / Business tiers |
| Landing page | Professional marketing page with pricing |
| Checkout flow | Plan selection and payment |
| SQLite Database | Persistent data storage with migration support |

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

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | AI agent core (send messages) |
| `/api/health` | GET | Health check |
| `/api/admin/auth` | POST | Admin login |
| `/api/admin/tenants` | GET/POST/PUT/DELETE | Tenant management |
| `/api/admin/analytics` | GET | Analytics data |
| `/api/admin/tickets` | GET/POST/PUT/DELETE | Ticket management |
| `/api/admin/campaigns` | GET/POST/PUT | Campaign management |
| `/api/admin/crm` | GET/POST | Customer CRM |
| `/api/tenant/products` | GET/POST/PUT/DELETE | Product management |
| `/api/tenant/faqs` | GET/POST/PUT/DELETE | FAQ management |
| `/api/tenant/whatsapp` | GET/POST/PUT | WhatsApp configuration |
| `/api/tenant/email` | GET/POST/PUT | Email configuration |
| `/api/whatsapp` | GET/POST | WhatsApp webhook |

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
| `DATABASE_URL` | `file:./dev.db` | SQLite database path |
| `SHOPIFY_STORE_DOMAIN` | — | Optional: live order/customer data |
| `SHOPIFY_ADMIN_API_TOKEN` | — | Shopify Admin API token |

## Database

The platform uses **SQLite** with better-sqlite3 for persistent data storage.

### Tables
- `users` - User accounts
- `organizations` - Tenant businesses
- `agents` - AI agent configurations
- `conversations` / `messages` - Chat history
- `contacts` - Customer CRM
- `tickets` - Support tickets
- `orders` - Customer orders
- `campaigns` - Marketing campaigns
- `knowledge_sources` - Knowledge base
- `products` - Tenant products
- `faqs` - Tenant FAQs
- `business_info` - Tenant business details
- `message_counts` - Monthly message tracking
- `audit_logs` - Analytics events

### Migration
```bash
# Migrate data from JSON files to database
npx tsx src/lib/db/migrate.ts
```

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

## WhatsApp Integration

1. Create a WhatsApp Business account
2. Get credentials from [Meta for Developers](https://developers.facebook.com)
3. Configure in admin dashboard or via API:
```bash
POST /api/tenant/whatsapp
{
  "phoneNumberId": "your-phone-number-id",
  "accessToken": "your-access-token",
  "businessAccountId": "your-business-account-id"
}
```
4. Set webhook URL: `https://your-domain.com/api/whatsapp?tenant_id=your-tenant-id`

## Security

- Server-side middleware protects `/admin` routes
- Cookie-based session authentication
- Admin session verification on all admin API routes
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
│   │   ├── tenant/         # Tenant API routes
│   │   └── whatsapp/       # WhatsApp webhook
│   ├── chat/               # Chat UI
│   ├── checkout/           # Plan checkout
│   ├── dashboard/          # Tenant dashboard
│   ├── embed/              # Embeddable widget
│   ├── landing/            # Marketing page
│   └── login/              # Tenant auth
├── components/             # React components
├── lib/
│   ├── db/                 # Database client, schema, migration
│   ├── tenant.ts           # Tenant management
│   ├── auth/               # Authentication
│   ├── admin-auth.ts       # Admin authentication
│   ├── campaign.ts         # Campaign manager
│   ├── crm.ts              # Customer CRM
│   ├── email.ts            # Email notifications
│   ├── whatsapp.ts         # WhatsApp integration
│   ├── analytics.ts        # Analytics tracking
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
- [x] WhatsApp Business API integration
- [x] SQLite database with migration
- [x] Email notifications
- [x] Campaign manager with real sending
- [x] CRM features with database
- [ ] Payment integration (Stripe)
- [ ] Mobile app (Expo APK)

## License

MIT — see [LICENSE](LICENSE).

<div align="center">
<sub>Built with Next.js 16 · React 19 · Google Gemini · Tailwind CSS 4 · SQLite</sub>
</div>
