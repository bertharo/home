# Home Hub

A private, two-person web app for running a household — budget, calendar, to-dos,
chores, groceries, pickups, annual goals, and a shared vacation idea board.
Mobile-first, installable as a PWA, calm and minimal by design.

Built with **Next.js (App Router) + TypeScript**, **Supabase** (Postgres + Auth +
Storage), **Tailwind CSS v4**, the **Google Calendar API**, and deployed on
**Vercel**.

---

## What's inside

| Module | What it does |
| --- | --- |
| **Home dashboard** | One glance at today's calendar, your open to-dos, chores due, this month's budget, and goals that need a check-in. Opens by default. |
| **To-dos** | Shared list, assignable to either person or both, with due dates. Filter by person. |
| **Chores** | Recurring tasks (daily→yearly) with an optional 2-person rotation that alternates on each completion and auto-reschedules. |
| **Grocery** | Fast quick-add, check off as you shop, grouped by store section. |
| **Pickups & duties** | Lightweight weekly schedule of who's covering what, which day. |
| **Calendar** | Two-way Google Calendar sync for both people, unified color-coded view, month + week, and "family events" that write to both calendars. |
| **Budget** | Spreadsheet-style monthly cash flow: expense & revenue line items you edit inline, auto-computed Total Expenses / Total Revenue, a Beginning Balance that carries over from the prior month's remaining balance, Total Remaining Balance, and a cash-flow chart across months. |
| **Goals** | Individual + joint annual goals with status and progress notes; stale goals surface on the dashboard. |
| **Trip ideas** | Shared idea board with status (idea→researching→planned→booked), rough cost/timing, links, and photo uploads. |

**Design choices baked in (chosen with you up front):**

- **Supabase** for Postgres + Auth + Storage (fast to wire, generous free tier, photo storage included).
- **Manual budget entry** for v1 (no Plaid/bank sync yet — keeps scope tight).
- **No push notifications** in v1 — the dashboard surfaces what needs attention instead.
- **Magic-link auth**, no public signup, limited to exactly two provisioned accounts.

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Google Cloud](https://console.cloud.google.com) project (only needed for calendar sync)
- A [Vercel](https://vercel.com) account for deployment

---

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` as you complete the steps below.

---

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose)
3. Open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates all tables, row-level security policies, the `profiles` auto-provision trigger, and the `vacation-photos` storage bucket.

### Provision the two accounts (no public signup)

Sign-in uses magic links with `shouldCreateUser: false`, so accounts must exist first.
In **Authentication → Users → Add user**, create the two members (use "Auto Confirm").
A matching `profiles` row is created automatically by the DB trigger (first user is
blue, second is pink — adjust names/colors later in the `profiles` table if you like).

That's it for access control — sign-in uses `shouldCreateUser: false`, so **only
users you create in Supabase can ever log in** (no public signup).

> Optional extra layer: set `ALLOWED_EMAILS=a@x.com,b@y.com` to also restrict
> sign-in to specific emails. If you leave it unset, the app simply trusts
> Supabase's user list.

### Email redirect URLs

In **Authentication → URL Configuration**, add your site URL(s) to the redirect
allowlist:

- `http://localhost:3000/**`
- `https://your-app.vercel.app/**`

---

## 3. Google Calendar setup (optional but recommended)

1. In [Google Cloud Console](https://console.cloud.google.com), create/select a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **OAuth consent screen** → External → add both members' Google accounts as **Test users** (or publish the app).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI: `http://localhost:3000/api/google/callback`
     (and `https://your-app.vercel.app/api/google/callback` for production)
5. Copy the client ID/secret into `.env.local`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Each person then connects their own calendar from the in-app **Calendar** tab
("Connect mine"). If Google isn't configured, the rest of the app works fine and
the calendar tab shows a friendly setup notice.

---

## 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with a magic link, and
you'll land on the dashboard.

---

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it into Vercel (it auto-detects Next.js).
3. Add **all** environment variables from `.env.example` in the Vercel project settings.
   Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://home-hub.vercel.app`).
4. Update the Supabase redirect allowlist and the Google OAuth redirect URI to include the production URL (see steps 2 & 3).
5. Deploy.

### Install as an app on your phones

Open the deployed URL in Safari/Chrome on your phone → **Share → Add to Home
Screen**. It runs full-screen as a PWA and keeps you signed in.

---

## Architecture notes

- **Auth & session**: `@supabase/ssr` with cookie-based sessions. `src/proxy.ts`
  (Next 16's renamed middleware) refreshes the session on every request and gates
  all routes except `/login` and the auth callbacks.
- **Data access**: Server Components read data; **Server Actions** handle all
  mutations with `revalidatePath`. RLS grants both authenticated members full
  access to shared household data (attribution via `created_by`), while Google
  OAuth tokens are owner-only.
- **Google sync**: tokens are stored per user in `google_accounts`. The unified
  view reads both members' tokens via a service-role client (server-only),
  refreshing/persisting access tokens automatically. "Family events" are written
  to every connected calendar and tagged so they can be labeled in-app.
- **Budget cash flow**: `src/lib/budget.ts` sums each month's expense and revenue
  line items, then walks forward from an opening balance so every month's
  Beginning Balance = the prior month's Total Remaining Balance
  (`remaining = beginning + revenue − expenses`).

## Project structure

```
src/
  app/
    (app)/            # Authenticated shell + all module pages
      page.tsx        # Home dashboard
      todos/ chores/ grocery/ duties/
      calendar/ budget/ goals/ vacation/
    login/            # Magic-link sign-in
    auth/callback/    # PKCE exchange + allowlist enforcement
    api/google/       # OAuth connect + callback
    manifest.ts, icon.tsx, apple-icon.tsx, icons/  # PWA assets (generated)
  components/         # Shared UI (nav, forms, modal, avatar, …)
  lib/
    supabase/         # client / server / admin / middleware helpers
    google.ts         # Calendar API integration
    budget.ts         # Monthly cash-flow math
    auth.ts, types.ts, constants.ts, utils.ts
  proxy.ts            # Session refresh + route protection
supabase/schema.sql   # Full database schema + RLS + storage bucket
```

## Roadmap (v2 ideas)

- Plaid bank sync for budget
- Push / email reminders (chores, budget alerts)
- Splitting shared expenses / who-paid tracking
- Meal planning tied to the grocery list
