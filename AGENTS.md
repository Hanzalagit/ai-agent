<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Project Context

## Overview
Multi-tenant AI customer service SaaS platform built on Google Gemini function calling.
- **Brand:** Urban Hive (formerly Ay Cosmetics)
- **Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Admin:** admin@urbanhive.com

## Completed Work
- Rebranded "Ay Cosmetics" → "Urban Hive" (10+ files, 20 replacements)
- Fixed admin panel security (cookie-based auth, no-cache headers)
- Fixed login autofill vulnerability (passwords visible on back button)
- Updated plan names: Starter (free), Growth (pro), Business (enterprise)
- Added CORS + CSP headers for iframe embedding
- Added password field to checkout page
- Added session-only cookies with beforeunload cleanup
- Fixed tenant list loading and creation error handling
- Added README with full SaaS documentation
- TypeScript check ✅ | Build ✅ | Pushed to GitHub

## Git Status
- **Branch:** master
- **Remote:** https://github.com/Hanzalagit/ai-agent.git
- **Last commits:**
  - `07ca6b8` - Update README with SaaS platform details
  - `f6bf246` - Real-world SaaS conversion (34 files, 7029 insertions)

## Next Steps (Priority Order)
1. Database Setup - Replace `.runtime/*.json` with real database
2. WhatsApp Business API integration
3. Email notifications for tickets/orders
4. Campaign Manager real sending
5. CRM features
6. Analytics improvements

## Key Files
- `src/middleware.ts` - Server-side admin protection
- `src/app/admin/page.tsx` - Admin dashboard
- `src/app/admin/login/page.tsx` - Admin login
- `src/app/login/page.tsx` - Tenant auth
- `src/app/embed/page.tsx` - Embeddable widget
- `src/app/checkout/page.tsx` - Plan checkout
- `src/lib/tenant.ts` - Tenant CRUD
- `src/lib/admin-auth.ts` - Admin auth
- `.env.local` - Live config (PUBLIC_MODE=true)
- `.runtime/tenants.json` - Tenant data

## User Preferences
- Speaks Urdu/Roman Urdu
- Wants ALL features real-world working (not hackathon demos)
- No beauty/cosmetics related content
- Professional SaaS platform
