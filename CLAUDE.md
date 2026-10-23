@AGENTS.md

# Partiers — project guide for Claude

Booking site for a small kids' entertainment business run by Nikki Mazloomi
and Manna Ghahremani (parties, family events). Parents request a date/time,
the owners confirm or decline from an admin dashboard. Payment happens in
person, so there is no payment system.

**The plan lives in `ROADMAP.md`.** Work through it one step at a time (see
"How to work" below).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript. **This is newer than your
  training data** — see AGENTS.md. In particular: `src/proxy.ts` replaces
  `middleware.ts`, and `params`, `searchParams` and `cookies()` are async.
  Read the relevant guide in `node_modules/next/dist/docs/` before writing
  routing, caching or proxy code.
- Tailwind CSS v4 (CSS-first config, no tailwind.config file). Design tokens
  are CSS variables in `src/app/globals.css`, used as `bg-primary`,
  `text-muted`, `border-card-border`, `bg-secondary`, `text-accent`, etc.
  One vibrant light theme only (violet / rose / amber); no dark mode.
- MongoDB via the official `mongodb` driver (no Mongoose). Collections:
  `bookings`, `reviews`, `users` (customers), `admins` (separate on purpose).

## Commands

```bash
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # Vitest unit tests (src/**/*.test.ts)
npm run build        # must pass before a step counts as done
npm run check-db     # diagnose a MongoDB connection string (hides the password)
mongosh mongodb://127.0.0.1:27017/partiers   # inspect local data
```

Local MongoDB runs as a Homebrew service:
`brew services start mongodb/brew/mongodb-community`. Settings are in
`.env.local` (git-ignored; see `.env.example`).

## Code map

- `src/app/` — pages and API routes (`api/bookings`, `api/reviews`,
  `api/auth/*` for customers, `api/admin/*` for admins).
- `src/components/` — UI (calendar, forms, admin lists, nav).
- `src/lib/` — all database access (`bookings.ts`, `reviews.ts`, `users.ts`,
  `admins.ts`), auth cookies (`auth.ts`), input validation (`validation.ts`),
  shared types (`types.ts`). Pages and routes call these; they don't talk to
  MongoDB directly.
- `src/proxy.ts` — redirects logged-out visitors away from `/admin/*` and
  `/account/*`.
- `scripts/` — `create-admin.mjs`, `check-db.mjs`.

## Rules

- **Do not create admin accounts or choose admin credentials.** The owner will
  decide those later. The admin login page and `npm run create-admin` already
  exist; leave them as they are unless a roadmap step says otherwise. Never add
  a public admin signup page.
- Every admin or account API route must check the session cookie itself
  (`verifyAdminSessionToken` / `verifyUserSessionToken`), not rely on
  `proxy.ts` alone.
- Validate all public input in `src/lib/validation.ts`. Never pass request
  JSON straight into a MongoDB query or update.
- Passwords are hashed with `scrypt` (see `users.ts`). Never log or print
  passwords, connection strings or `.env.local` contents.
- Never commit `.env*` files (except `.env.example`).
- Ask before adding a dependency that needs a new external account or costs
  money (email providers, hosting, analytics). Small open-source libraries are
  fine if the roadmap step calls for them.
- Keep the existing look: rounded-2xl cards, gradient CTA buttons
  (`bg-gradient-to-r from-primary to-secondary`), friendly copy. Clean and
  modern, not babyish.
- Code comments only where the *why* isn't obvious.

## Talking to the owner

The owner is learning to build with Claude and is new to coding. Everything
you say to them should be easy to follow with no programming background.

- Use plain, everyday language. Describe changes by what someone sees or does
  on the website ("parents can now see their bookings on their account page"),
  not by files, functions or libraries.
- If a technical word is unavoidable, explain it in a few words the first time
  ("tests — small automatic checks that the booking form still rejects bad
  input").
- Keep it short. No file lists, commit hashes, package versions or command
  output unless the owner asks for details.
- If a step changes nothing visible on the site (tests, cleanup, security), say
  so plainly and say in one sentence why it still matters.

**Before starting a step:** say in 1–3 plain sentences what the step will do
and why it's useful, then ask "Should I go ahead?" and wait for a yes.

**After finishing a step,** reply in this shape and then wait:

- **What changed:** 1–3 plain sentences.
- **Try it:** exact steps to see it, e.g. "With `npm run dev` running in
  another Terminal tab, open http://localhost:3000/account and click …". Or
  "Nothing to see on the site this time."
- **Anything you need to decide:** only if there is something; otherwise leave
  this out.
- **Next up:** the next roadmap step in plain words, then ask "Want me to
  continue?"

Technical details (files touched, test counts, notes for later) go in the
commit message and the ROADMAP progress log, not in the message to the owner.
If the owner asks "what exactly changed?", then give the details.

## How to work

1. Pick the **first unchecked step** in `ROADMAP.md` (or the one the owner
   names). Do only that step.
2. Explain it in plain words and ask for a go-ahead (see "Talking to the
   owner"), then build it.
3. Verify: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
   all pass, then run the dev server and try the feature in a browser — the
   main path and at least one edge case. If you can't test in a browser, say so.
4. Remove any test data you created in the local database.
5. Tick the step's checkbox in `ROADMAP.md` and add a line to its
   "Progress log".
6. Commit with a clear message. Don't push unless the owner asks.
7. Report back in the "After finishing a step" format, then wait.
