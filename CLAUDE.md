# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 6 · Prisma 7 with PostgreSQL (via `@prisma/adapter-pg`) · NextAuth 4 (credentials + JWT) · Tailwind 4 · Zod 4 · react-hook-form · bcryptjs.

UI copy and notification messages are in Portuguese (pt-BR). Currency defaults to BRL.

## Commands

```bash
npm run dev        # next dev
npm run build      # next build
npm run start      # next start (production)
npm run lint       # next lint (ESLint 9 + eslint-config-next)
```

Prisma (uses `prisma.config.ts`, which loads `DATABASE_URL` from `.env` via `dotenv/config`):

```bash
npx prisma generate          # regenerate client after schema edits
npx prisma migrate dev       # apply migrations locally
npx prisma migrate deploy    # apply migrations in production
npx prisma studio            # inspect DB
```

There is no JS/TS test runner configured. End‑to‑end smoke tests are Python + Playwright scripts at the repo root (`test_auth_flow*.py`, `test_initial_balance.py`) that drive a running dev server at `http://localhost:3000`. Start `npm run dev` first, then run a single test with `python test_initial_balance.py`. These scripts are `.gitignore`'d scratch files — treat them as disposable.

## Environment

Required in `.env`:
- `DATABASE_URL` — Postgres connection string (thrown from `lib/prisma.ts` if missing)
- `NEXTAUTH_SECRET` — JWT signing secret
- `NEXTAUTH_URL` — base URL for NextAuth callbacks

Path alias: `@/*` resolves to the repo root (see `tsconfig.json`).

## Architecture

### Route groups and auth boundary

`app/` uses Next.js route groups to split the auth boundary:

- `app/(protected)/**` — requires a session. Rendered inside `app/(protected)/layout.tsx` which fetches the session server‑side and wraps children with the `Sidebar`. `/admin/**` additionally requires `role === "ADMIN"`.
- `app/sign-in`, `app/sign-up`, `app/reset-password/**` — public auth pages.
- `app/api/auth/**` — NextAuth handler + custom register/forgot-password/reset-password routes.

`middleware.ts` enforces this. Its `matcher` excludes `api/auth`, Next static assets, `sign-in`, `sign-up`, and `reset-password`; every other path requires a token. Admin gating (`/admin` → redirect to `/dashboard` when role isn't `ADMIN`) is also done in this middleware, not just at the layout level.

`app/page.tsx` is a server redirect: `/dashboard` if authenticated, otherwise `/sign-in`.

### Auth model

`lib/auth.ts` defines `authOptions` with a single `credentials` provider that `bcrypt.compare`s against `User.password`. Session strategy is JWT (30 days). The `jwt` and `session` callbacks copy `id` and `role` onto the token and session — `types/next-auth.d.ts` augments the NextAuth types to make `session.user.id` and `session.user.role` typed. **When adding new fields that must survive to the client, extend both callbacks AND the declaration file.**

Rate limiting for auth endpoints lives in `lib/rate-limiter.ts` — an in-memory `Map` keyed by `ip:path`. Wrap a route with `withRateLimit('/api/auth/xxx')(handler)` and add the config entry at the top of the file. In-memory state means it resets on every server restart and doesn't work across multiple instances; swap to Redis/DB before going multi-replica.

### Server Actions pattern

Every feature under `app/(protected)/<feature>/` follows the same shape: a server component `page.tsx` and an `actions.ts` module marked `"use server"` that exports the CRUD actions the page calls. The canonical pattern is:

1. `getServerSession(authOptions)` → extract `userId`; bail with `{ success: false, error }` if missing.
2. Parse `FormData` through a Zod schema declared at the top of the file.
3. Scope every Prisma query by `userId` (including `findFirst` checks before delete/update — never trust the id alone).
4. Mutate, then `revalidatePath("/<feature>")`.
5. Return `{ success, data?, message?, error? }`. On `ZodError`, join `error.issues[].message`.

Admin actions use `requireAdmin()` (see `app/(protected)/admin/actions.ts`) which throws if the session role isn't `ADMIN` — this is the server-side backstop to the middleware check.

### Money and the transaction/balance invariant

`Account.balance` is a `Decimal(15,2)` cached on the account row. It is kept in sync with `Transaction` rows manually, not by a trigger or view. The rules:

- `lib/transactions.ts` exports `getTransactionEffect(type, amount)` → `+amount` for `INCOME`, `-amount` for `EXPENSE`. This is the single source of truth for sign; use it rather than inlining the ternary.
- All balance mutations must happen inside `prisma.$transaction` together with the `Transaction` insert/delete. See `app/(protected)/transactions/actions.ts` — `createTransaction` does `account.update({ balance: { increment: effect } })` in the same tx; `deleteTransaction` reverses with `decrement`. Update flows (not yet implemented for transactions) must reverse the old effect and apply the new one atomically.
- `Transaction.amount` is always stored positive; sign lives in `type`.
- `EXPENSE` creations guard against overdraft by comparing `amount` to the current `Number(account.balance)`.
- Prisma returns `Decimal` objects; coerce with `Number(x)` at the boundary when doing JS arithmetic.

### Prisma client

`lib/prisma.ts` instantiates `PrismaClient` with the `PrismaPg` adapter from `@prisma/adapter-pg` (Prisma 7's preview driver adapter for node-postgres). A `global.prisma` singleton is reused in development to avoid exhausting connections on HMR reloads. Import via `import { prisma } from "@/lib/prisma"`.

### Data model highlights (`prisma/schema.prisma`)

- `User` → has `role: Role` (`USER`/`ADMIN`), optional `password` (hashed), plus a 1:1 `ResetToken` for password reset.
- `Account`, `Category`, `Transaction`, `MonthlySummary`, `AuditLog` are all `userId`-scoped with `onDelete: Cascade` from `User` (except `AuditLog` which uses `SetNull`).
- `@@unique([userId, name])` on Account and `@@unique([userId, name, type])` on Category — name collisions are per-user.
- `Category.type` must match `Transaction.type` when linking — `createTransaction` validates this explicitly.
- `MonthlySummary` exists in the schema but there is no code yet that writes to it.

### Notifications / copy

`lib/notifications.ts` centralizes user-facing strings in Portuguese under `messages.success|error|warning|info.*`. Server actions return keys from `messages.error.*` as their `error` field; don't hard-code strings — add to `messages` first so the catalog stays complete.

### Reports

`lib/reports.ts` exposes `generateReport(userId, start?, end?)` which runs three `Promise.all` queries (basic totals via `groupBy`, category breakdown, monthly breakdown) and composes a `ReportData` object. `exportReportCSV` produces a CSV string from that. The API route at `app/api/reports/[year]/` and the page at `app/(protected)/reports/` consume this.
