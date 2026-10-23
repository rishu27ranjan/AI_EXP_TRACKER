# RupeeWise

RupeeWise is a mobile-friendly personal finance tracker built around a configurable monthly savings target (₹65,000 by default). It includes private accounts, expenses, budgets, deterministic forecasts, Diwali planning, shared groups and settlements, notifications, phone verification, optional SMS, analytics, and a Money Coach backed by Gemini.

## Requirements and setup

- Node.js 20+
- MongoDB Atlas or a local MongoDB server
- Optional Gemini API key for AI Money Coach responses
- Optional Twilio or MSG91 credentials for SMS

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` and a long random `AUTH_SECRET`.
3. Optionally set `GEMINI_API_KEY` and `GEMINI_MODEL`.
4. Run `npm install`, then `npm run dev` and register an account.

Without Gemini, the coach falls back to deterministic guidance. SMS requires a configured provider, a verified phone number, and enabled preferences. The reminder endpoint is `POST /api/jobs/reminders`; schedule it with an external cron service using `Authorization: Bearer <JOB_SECRET>`. Keep that secret private. SMS quiet hours and the user's timezone are respected by this job.

## Features

- Expense tracking, custom categories, upcoming obligations, monthly category budgets, Diwali sinking fund, and spending analytics.
- Backend finance engine for savings, safe-to-spend, projections, shared personal shares, cash outflow, receivables, payables, and settlement plans. LLM responses do not calculate financial values.
- Shared groups, invitation links, equal/exact/percentage/share splits, multiple payers, settlement requests, settlement history, and manually initiated reminders.
- In-app notifications, notification preferences, phone OTP verification, SMS provider adapters, and a deduplicated scheduled reminder endpoint.

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

Sessions use signed HTTP-only cookies, passwords and OTPs are hashed, API input is validated, and records are scoped to the authenticated user. MongoDB indexes are initialized by the database layer. Set MongoDB Atlas network access and a least-privilege database user for deployment. Never commit `.env.local`; `.env.example` contains placeholders only. Configure an external scheduler and secrets manager for production. Review SMS provider templates and local sender requirements before enabling delivery.

## API groups

Auth routes are under `/api/auth`. Finance routes include `/api/expenses`, `/api/dashboard`, `/api/budget`, `/api/forecast`, `/api/upcoming-expenses`, `/api/diwali`, and `/api/analytics`. Shared routes are under `/api/groups` and `/api/shared-expenses`. Notifications and preferences are under `/api/notifications` and `/api/notification-preferences`; phone verification is under `/api/phone`. The scheduled job is `/api/jobs/reminders`.
