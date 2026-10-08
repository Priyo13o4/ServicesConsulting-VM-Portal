# AGENTS.md — VM Portal

Internal portal that replaces Outlook-based VMware VM requests: request → approval → manual creation by vCloud admins → lease expiry → extension or hard deletion. Support tickets (snapshot revert) go straight to the vCloud admins. The portal never touches vCloud: admins do all VM work by hand in the vCloud dashboard and record it here. Intranet only. Built in phases; we are in **Phase 1**.

Read before working:
- `docs/domain.md` — roles, permissions, approval routing, statuses, lifecycle rules, data model, settings
- `docs/locked-plan.md` — decisions, phases, risks (the why behind the rules)
- `docs/open-questions.md` — unanswered questions; the default each rule uses until answered
- `docs/api-contract.md` — every operation: who may call it, input, result, status change
- `docs/screens.md` — every page per role
- `docs/known-problems.md` — open bugs and limitations
- `docs/diagrams/` — Mermaid workflow diagrams

## Stack (pinned — do not upgrade or add dependencies without asking)

Next.js 16 App Router (TSX) · React 19 · Tailwind 4 + shadcn/ui · Zustand 5 · Zod 4 · PostgreSQL 17 · Drizzle ORM 0.45 (stable line, not the 1.0 beta) · Better Auth 1.7 (email + password, admin plugin) · Vitest 5 · Docker Compose. Node 24 in containers.

`cacheComponents` is intentionally **off**: every page is per-user and rendered per request. Do not turn it on.

## Commands

| Task | Command |
|---|---|
| Start local stack (app with hot reload, Postgres, Mailpit at :8025) | `npm run stack:local` |
| Apply migrations locally | `npm run local:migrate` |
| Run tests (inside the app container) | `npm run local:test` |
| Type check / lint | `npm run typecheck` · `npm run lint` |
| New migration | edit `src/db/schema/*` → `npm run db:generate -- --name <what_changed>` → `npm run local:migrate` |
| Production smoke test (real build, local settings) | `npm run stack:smoke` |
| Stop everything | `npm run stack:down` |

A task is done only when typecheck, lint and tests pass. Never run migrations or scripts against dev or prod.

## Code structure

```
src/
  app/                    Routes only: pages, layouts, route handlers. Thin — no business logic, no DB calls.
    (auth)/               login, register, reset-password, set-password, awaiting-activation
    (portal)/             signed-in pages (see docs/screens.md)
    api/                  auth handler, health, CSV exports
  modules/<feature>/      One folder per domain: auth, users, requests, approvals, queue, vms (incl. vApps),
                          tickets, notifications, workflow, settings, audit
    service.ts            Business logic. Plain TypeScript, no Next.js imports. Takes db + input, returns result.
    queries.ts            Reads, always scoped to the caller's role.
    actions.ts            "use server" actions: guard → Zod parse → service → revalidate. Thin.
    schema.ts             Zod schemas shared by the form and the action.
    components/           UI for this feature.
    store.ts + store-provider.tsx   Only if the feature needs client state (see Zustand).
    <feature>.test.ts     All tests for this module.
  db/
    schema/<group>.ts     Drizzle tables (camelCase keys; `casing: "snake_case"` maps them to the DB)
    migrations/           Generated — never edit by hand
    client.ts             getDb()
  components/ui/          shadcn generated components (add via the shadcn CLI)
  components/             Shared layout pieces (shell, nav, page header)
  lib/                    Cross-cutting helpers: env, result type, business-day dates, credential encryption
scripts/                  Bundled one-off Node scripts (migrate, seed)
docker/                   Dockerfile, nginx, Postgres init
```

Create a file only when it has real content. Not every module needs every file. Exception: every route in `docs/screens.md` already has a placeholder `page.tsx` that only renders its title; replace it when you build that page, and never add business logic to it.

## Architecture rules

1. **Business logic lives in `service.ts`**, never in pages, components or actions. Services must stay callable from a server action today and a REST route later.
2. **Every status change goes through `transition()`** in `src/modules/workflow/`. It checks the move is allowed, updates the row, writes `audit_log`, and queues the notification. Never update a `status` column directly.
3. **Authorize on the server, every time.** Every action and query starts with `requireUser()` or `requireRole()` from `src/modules/auth/guards.ts`. `proxy.ts` only does optimistic redirects to `/login`; it is not security.
4. **The approver always comes from the requester's profile.** Never accept a manager email or approver ID from a form.
5. **No business numbers in code.** Lease options, notice days, SLA days, limits, default usernames and ETAs are read from the `settings` table.
6. **Action results use one shape:** `{ ok: true, data } | { ok: false, error: { code, message } }`. Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `INVALID_TRANSITION`, `CONFLICT`.
7. **Dates:** store `timestamptz` in UTC. All business-day math goes through one helper in `src/lib/`.
8. **Server data is fetched in Server Components** via `queries.ts`. After a mutation, call `revalidatePath`. Do not add a client data-fetching library.
9. **External systems** (SMTP now, vCloud in Phase 4) sit behind one adapter module each. Their naming and shapes never reach our types or tables.
10. **VM passwords** are encrypted with `CREDENTIALS_KEY` through one helper in `src/lib/`. Never log them, never email them, never write them to `audit_log`. They are returned only by `revealVmCredentials`, and each reveal is audited.
11. **Managers never act on a report's VM.** Only the owner (and backup owner where `docs/domain.md` allows) extends, releases, raises tickets or marks a VM for reuse.

## Zustand (client UI state only)

Follow the official Next.js pattern (zustand.docs.pmnd.rs/guides/nextjs):

- **Never put server data in a store.** Requests, VMs, approvals, users and the session come from Server Components. Copying them into a store creates stale, duplicated state.
- Use a store only for client UI state that several components share: multi-step form drafts, table filters and selection, dialogs opened from distant components. State used by one component stays in `useState`.
- **No global stores.** Each store is a factory in `modules/<feature>/store.ts` using `createStore` from `zustand/vanilla`. `store-provider.tsx` (`"use client"`) creates it once with `useRef`, shares it via context, and exports a `use<Feature>Store(selector)` hook that throws outside the provider.
- Mount the provider on the route that needs it, not in the root layout.
- State and actions are defined together and typed (`<Feature>State`, `<Feature>Actions`). No business rules in stores — validation stays in Zod schemas.
- Read with selectors (`useRequestFormStore((s) => s.step)`). Use `useShallow` when selecting several fields.
- Server Components and server actions never touch stores.

## Code rules

- **Modular.** One responsibility per file. Around 300 lines, look for a split; past 500, split it.
- **Extend before you add.** Search for an existing function, component or schema first and extend it. No duplicates, no dead code, no unused exports, no commented-out code.
- **Keep it simple.** No abstractions, layers or config for problems we do not have yet.
- **Use references, not memory.** Before writing code against a library (Next.js, Better Auth, Drizzle, Zustand, shadcn), check its current docs or official GitHub examples. For Next.js, read `node_modules/next/dist/docs/`. Name the reference you used in your response.
- **Comments:** only to explain *why* something non-obvious is done. Short and direct. No comments restating the code. No TODOs — log a known problem instead.

## Naming

| Where | Case | Example |
|---|---|---|
| Variables, functions, object keys, API JSON | camelCase | `expiresOn` |
| Components, types, interfaces, component files | PascalCase | `RequestForm.tsx`, `VmStatus` |
| Other files and folders, URLs | kebab-case | `approval-routing.ts`, `/vm-requests` |
| Postgres tables and columns | snake_case | `expires_on` |
| Status and role values, constants, env vars | SCREAMING_SNAKE | `PENDING_APPROVAL`, `SMTP_HOST` |

## Testing — test-driven for business logic

- For business logic, **write or extend the failing test first**, then the code, then make it pass.
- **Test:** approval routing (incl. `external_bu_mode` and urgent follow-up), the permission matrix, `transition()` rules, expiry and notice-stage calculation, queue assignment and take-over, reuse candidate matching, credential encryption round-trip, business-day math, user activation rules, CSV import validation, Zod schemas with real rules.
- **Do not test:** layout, styling, simple presentational components, shadcn wrappers, trivial getters, framework behaviour.
- **One test file per module** (`modules/<feature>/<feature>.test.ts`), grouped with `describe`. Add cases to the existing file instead of creating new files.
- Pure logic tests use no database. Tests that need one use `DATABASE_URL_TEST` and reset their tables in `beforeEach`.

## Known problems

- `docs/known-problems.md` is the **single** place for open bugs and limitations. No other bug lists.
- Add an entry when you find a bug you are not fixing now, ship a workaround, or leave a limitation. Entries are verbose: follow the template in the file.
- When fixed, set the status to Fixed with the date and commit. Never delete entries.

## Git

- Small, focused commits with clear messages.
- **NEVER push, force-push, or open a pull request without the user's explicit confirmation in the current conversation.**

## Files and memory

- Do not create notes, memory files, scratch docs or new markdown files unless asked.
- Change `AGENTS.md` only when a rule genuinely changes, and say so in your response.

## How to respond

Plain words. Short sentences. Explain any unavoidable technical term in a few words. No walls of text.

After a task:

```
**Summary** — 1–2 sentences: what changed and why.
**Changes** — `path` — what changed (one line each).
**Tests** — command → result. Say plainly if something was not run.
**Known problems** — entries added or updated, or "None".
**Needs you** — decisions or confirmations (push, risky changes), or "Nothing".
```

For a question: the answer first, then up to 3 bullets of why, then options if there is a real choice (recommended first).

If a request conflicts with these rules or with `docs/domain.md`, say so before doing it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
