# RupeeWise

RupeeWise is a mobile-friendly personal finance tracker built around a configurable monthly savings target (₹65,000 by default). It includes private accounts, expenses, budgets, deterministic forecasts, Diwali planning, shared groups and settlements, notifications, phone verification, optional SMS and WhatsApp, analytics, and a Money Coach backed by Gemini.

## Requirements and setup

- Node.js 20+
- MongoDB Atlas or a local MongoDB server
- Optional Gemini API key for AI Money Coach responses
- Optional Twilio or MSG91 credentials for SMS
- Optional Twilio or Meta WhatsApp credentials and an approved utility message template

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` and a long random `AUTH_SECRET`.
3. Optionally set `GEMINI_API_KEY` and `GEMINI_MODEL`.
4. Run `npm install`, then `npm run dev` and register an account.

Without Gemini, the coach falls back to deterministic guidance. SMS requires a configured provider, a verified phone number, and enabled preferences. WhatsApp reminders require a verified phone and explicit opt-in by the recipient. Configure an approved WhatsApp utility template with three body parameters, in order: amount, group name, app URL. Choose `WHATSAPP_PROVIDER=twilio` to reuse Twilio account credentials and provide its WhatsApp sender and Content SID, or `WHATSAPP_PROVIDER=meta` for the Meta Cloud API. On Vercel, `vercel.json` runs `/api/jobs/reminders` daily at 08:00 UTC; set `CRON_SECRET` in the Vercel project. Other schedulers can call the same endpoint with `POST` and `Authorization: Bearer <JOB_SECRET>`. Quiet hours and the user's timezone are respected. Payment reminders begin 48 hours after the request and repeat no sooner than every 48 hours. They stop when the requester marks the payment received, the debtor marks it paid, or the request is cancelled. Failed provider attempts are retried after a 15-minute backoff.

## Features

- Expense tracking, custom categories, upcoming obligations, monthly category budgets, Diwali sinking fund, and spending analytics.
- Backend finance engine for savings, safe-to-spend, projections, shared personal shares, cash outflow, receivables, payables, and settlement plans. LLM responses do not calculate financial values.
- Shared groups, invitation links, equal/exact/percentage/share splits, multiple payers, settlement requests, settlement history, and manually initiated reminders.
- In-app notifications, notification preferences, phone OTP verification, SMS provider adapters, WhatsApp Cloud API templates, and a deduplicated scheduled reminder endpoint.

## Commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check
- `npm test` — finance engine unit tests
- `npm run seed` — optional development seed data (requires `SEED_EMAIL` and `SEED_PASSWORD`)

## Forecast assumptions

Current savings are monthly income minus recorded personal expenses and the user's personal share of shared expenses. Shared cash paid is tracked separately from personal spending. Projections extend the observed month-to-date spending pace and account for upcoming obligations due this month. Safe-to-spend reserves the savings target, emergency buffer, actual spending, and upcoming obligations over the remaining days. Treat projections as estimates and keep upcoming obligations current. Recurring upcoming expenses are stored with recurrence details; automatic generation of future occurrences is not currently implemented.

Diwali is shown as a separate budget. Record purchases as Diwali expenses to include them in overall spending. The background endpoint currently sends daily safe-spend, savings-risk, and next-day upcoming-expense reminders; weekly/monthly reviews and Diwali-specific scheduled SMS are not implemented yet. `REDIS_URL` is reserved for a future queue worker and is not required by the current cron endpoint.

## Security and deployment

Sessions use signed HTTP-only cookies, passwords and OTPs are hashed, API input is validated, and records are scoped to the authenticated user. MongoDB indexes are initialized by the database layer. Set MongoDB Atlas network access and a least-privilege database user for deployment. Never commit `.env.local`; `.env.example` contains placeholders only.

### Deploy to Vercel

Import `rishu27ranjan/AI_EXP_TRACKER` as a Next.js project; Vercel detects the framework and uses `npm run build`. Add `MONGODB_URI`, a long random `AUTH_SECRET`, and a random `CRON_SECRET` of at least 16 characters to the Production environment. Set `APP_URL` to the production URL if WhatsApp reminders are enabled. Add `GEMINI_API_KEY` only if AI Money Coach responses are wanted. After changing environment variables, redeploy. Configure Atlas Network Access to accept connections from the deployment's egress addresses; Vercel's default function egress IPs are dynamic, so use Vercel Static IPs where available rather than a broad database allowlist. The Vercel Cron schedule in `vercel.json` runs once daily at 08:00 UTC, which is compatible with Hobby plan scheduling limits.

For SMS, configure the selected provider's credentials and approved sender/template. For Twilio WhatsApp, use `TWILIO_WHATSAPP_FROM`, an approved `TWILIO_WHATSAPP_CONTENT_SID`, and `WHATSAPP_PROVIDER=twilio`. For Meta Cloud API, set `WHATSAPP_PROVIDER=meta`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_REMINDER_TEMPLATE`; set the language/version if required. Use approved templates/senders and obtain clear user consent before enabling delivery.

## API groups

Auth routes are under `/api/auth`. Finance routes include `/api/expenses`, `/api/dashboard`, `/api/budget`, `/api/forecast`, `/api/upcoming-expenses`, `/api/diwali`, and `/api/analytics`. Shared routes are under `/api/groups` and `/api/shared-expenses`. Notifications and preferences are under `/api/notifications` and `/api/notification-preferences`; phone verification is under `/api/phone`. The scheduled job is `/api/jobs/reminders`.
