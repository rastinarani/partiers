# Partiers Roadmap

The step-by-step plan for turning Partiers into a polished, professional
booking site. Each step is sized for **one Claude session**: build it, test
it, tick it, commit it, stop.

How to use this file with Claude Code is described in `CLAUDE.md`
("How to work"). Short version: *"Do the next unchecked step in
ROADMAP.md."*

Legend: `[ ]` to do · `[x]` done · ⏸ deferred (don't start without the
owner's go-ahead) · 🔑 needs the owner to create an account or provide a key

---

## Where things stand

**Built and working locally:**

- Public booking page: five-step wizard with saved progress, custom month calendar, time picker (9:00 AM–10:00 PM,
  30-minute slots), parent/child details, number of children, notes. Saves as
  `pending`.
- Reviews page: approved reviews plus a form; new reviews wait for approval.
- About page with Nikki's and Manna's bios (photos are initials placeholders).
- Customer accounts: `/signup`, `/login`, `/account`, with linked bookings,
  cancellation, profile editing and password changes.
- Admin area: `/admin/login` (email + password, `admins` collection),
  dashboard to confirm/decline bookings and approve/reject reviews, and a
  confirmed-bookings calendar.
- Vibrant violet/rose/amber theme, mobile-friendly layout.

**Known gaps:** emails and a full
account/admin end-to-end suite. Public animations
respect reduced motion, and local browser checks cover public pages and booking.

**Live site:** a Vercel project exists at `partiers.vercel.app`, but its
database connection string is wrong, so pages that use the database return
errors. Fixing that is Phase 8; the core app comes first.

---

## Phase 0 — Foundations

Small investments that make every later step safer.

### [x] 0.1 Add a unit test setup

- Add Vitest with a `npm test` script.
- Write tests for `src/lib/validation.ts` (valid input, each missing or
  invalid field, boundaries like age 17/18 and 0/1/50/51 children) and for the
  cookie signing in `src/lib/auth.ts` (valid token, tampered signature,
  garbage input).
- **Done when:** `npm test` passes, and CLAUDE.md's verification list includes
  `npm test`.

### [x] 0.2 Shared UI building blocks

- The same Tailwind class strings for buttons, inputs, cards and status
  badges are repeated across many files. Create small components in
  `src/components/ui/` (e.g. `Button` with primary/secondary/danger variants,
  `Input`, `Textarea`, `Card`, `StatusBadge`) and switch existing pages to use
  them.
- Remove the unused `date-fns` dependency, or use it for date formatting
  here.
- **Done when:** pages look identical to before (compare in the browser), with
  much less repeated styling.

---

## Phase 1 — Customer accounts (the core)

**How accounts work (owner's decision):** keep it simple. An email address
acts as the username, plus a password. No verification emails, no Google
sign-in, no checking that the email is real. Logging in again with the same
email and password shows that person's past and upcoming bookings.

### [x] 1.1 Link bookings to accounts

- When a logged-in customer books, store their `userId` on the booking
  (optional field; guest bookings stay allowed).
- Prefill the booking form's name and contact with the account's name and
  email when logged in.
- **Done when:** a booking made while logged in has `userId` in MongoDB, and a
  guest booking still works.

### [x] 1.2 "My bookings" on the account page

- On `/account`, list the customer's bookings: date, time, child, number of
  children, and a status badge (pending / confirmed / declined).
- Split into **Upcoming** and **Past**; show a friendly empty state with a
  "Book now" button.
- Only ever show the logged-in user's own bookings (query by `userId` on the
  server).
- **Done when:** two test accounts each see only their own bookings.

### [x] 1.3 Customers can cancel

- Add a `cancelled` status. Customers can cancel their own pending or
  confirmed upcoming bookings (with an "Are you sure?" step).
- New API route that checks the session **and** that the booking belongs to
  that user.
- Admin dashboard shows cancelled bookings with their own badge.
- **Done when:** a customer can't cancel someone else's booking, even by
  calling the API directly with another booking's id.

### [x] 1.4 Edit profile and change password

- On `/account`: edit name and phone number; change password (requires the
  current password).
- **Done when:** after changing the password, the old one no longer logs in
  and the new one does.

### [x] 1.5 Smooth login flow

- If a logged-out visitor clicks "Log in" from the booking page, send them
  back to the booking page afterwards (a safe, same-site `?next=` redirect;
  reject external URLs).
- Show a gentle "Log in to track your bookings" hint on the booking page for
  guests.
- **Done when:** login and signup return you to where you started.

---

## Phase 2 — Booking quality

### [x] 2.1 Event length and no double-booking

- Add a duration field (1, 1.5, 2, 3 or 4 hours).
- A public API returns the time ranges already taken by **confirmed**
  bookings for a given date, with no personal details.
- The time picker disables slots that would overlap, and the server rejects
  overlapping requests too (never trust the browser).
- The admin's Confirm button warns if confirming would overlap another
  confirmed booking.
- **Done when:** you can't book a slot that overlaps a confirmed booking, from
  the page or by calling the API.

### [x] 2.2 Event details

- Add event type (birthday party, playdate, family gathering, other), address
  or general area, and wanted activities (checkboxes: games, crafts, face
  painting, balloon animals, scavenger hunt).
- Show these on the admin dashboard and in "My bookings".
- **Done when:** a full booking shows every detail in both places.

### [x] 2.3 Confirmation screen

- After submitting, show a summary card of everything requested plus a short
  reference code (e.g. `PT-4F2K`), and what happens next.
- **Done when:** the reference code is saved on the booking and visible to
  both the customer and the admin.

### [x] 2.4 Blocked dates

- Admins can mark dates as unavailable (vacations, school events) from the
  admin calendar. Those dates appear disabled on the public calendar, and the
  API rejects them.
- **Done when:** a blocked date can't be booked through the page or the API.

---

## Phase 3 — Admin tools

The admin login page already exists. **Admin credentials are deliberately
not set up yet** — see 3.4.

### [x] 3.1 Dashboard tabs and search

- Tabs for Pending / Confirmed / Declined / Cancelled with counts; a search
  box (parent name, child name, contact); upcoming bookings sorted by date.
- **Done when:** finding one booking among 30 test bookings takes seconds.

### [x] 3.2 Booking detail page

- `/admin/bookings/[id]`: every detail, the status history, private admin
  notes (only admins can see them), and confirm/decline/cancel actions.
- **Done when:** notes persist and never appear in customer-facing pages or
  APIs.

### [x] 3.3 Remove spam

- Admins can delete reviews and bookings (soft delete: hidden, not erased),
  with a confirmation step.
- **Done when:** deleted items disappear everywhere but remain in the
  database with a `deletedAt` date.

### ⏸ 3.4 Admin credentials (deferred)

- Do **not** create admin accounts or pick credentials. The owner will
  provide the emails and passwords later and create the accounts with
  `npm run create-admin` (or ask Claude to run it).
- Until then, test admin features locally with a throwaway admin, and delete
  it when finished.

---

## Phase 4 — Interactivity and animation

Use the `motion` library (`import { motion } from "motion/react"`) unless
there's a strong reason not to. Every animation must respect
`prefers-reduced-motion`.

### [x] 4.1 Animation setup

- Install `motion`; create a few reusable pieces (`FadeIn`,
  `StaggerChildren`) in `src/components/motion/`; add a global
  reduced-motion setting.
- **Done when:** with "Reduce motion" enabled in macOS accessibility
  settings, nothing slides or bounces.

### [x] 4.2 Page and section entrances

- Hero text and buttons fade/slide in, review cards stagger in, the About
  cards lift slightly on hover, and the calendar animates when changing
  months.
- Keep it subtle: short (150–400 ms), and nothing that delays reading.
- **Done when:** the site feels lively but still loads instantly.

### [x] 4.3 Multi-step booking wizard

- Turn the long booking form into steps: **Date → Time → Event details →
  Your info → Review & send**, with a progress bar, Back/Next buttons,
  animated transitions and per-step validation.
- Keep the URL or state so a refresh doesn't lose everything.
- **Done when:** a booking can be completed on a phone without scrolling past
  fields you haven't reached yet.

### [x] 4.4 Delightful feedback

- Confetti when a booking is sent (`canvas-confetti`, off with reduced
  motion), toast notifications for admin actions and errors, button press
  states, and star ratings that pop on hover.
- **Done when:** every action gives clear, quick feedback.

### [x] 4.5 Loading and optimistic updates

- `loading.tsx` skeletons for data pages; admin status changes update
  instantly and roll back with an error toast if the server fails.
- **Done when:** a slow network (test with browser dev tools throttling) never
  shows a blank or frozen screen.

---

## Phase 5 — Professional polish

### [x] 5.1 A real home page

- Above or below the booking area, add: packages/services (e.g. "Party
  host", "Activity hour", "Full party" with what's included), "How it works"
  in three steps, a testimonials strip from approved reviews, and an FAQ
  accordion (ages, group sizes, payment, cancellation).
- Write friendly, specific copy; no lorem ipsum.
- **Done when:** a first-time visitor understands the offer without the About
  page.

### [x] 5.2 Mobile menu and footer

- **Inputs confirmed:** public email **nikkitheawsome@gmail.com** and service
  area **Metro Vancouver**. No further contact-detail decision is needed.
  These exact details are now in the footer.

- A hamburger menu with an animated drawer on small screens; a richer footer
  (contact email, area served, links).
- **Done when:** the nav never wraps or crowds on a 360 px wide screen.

### [x] 5.3 Error and empty pages

- Designed `not-found.tsx`, `error.tsx` (with a retry button), and friendly
  empty states everywhere.
- **Done when:** a random URL and a forced server error both show on-brand
  pages.

### [x] 5.4 SEO and sharing

- Per-page titles and descriptions, an Open Graph image (`opengraph-image`),
  app icon, `sitemap.ts` and `robots.ts` (keep `/admin` and `/account` out).
- **Done when:** pasting the site link into a chat app shows a nice preview
  card.

### [x] 5.5 Accessibility pass

- Keyboard-usable calendar (arrow keys, Enter), visible focus rings, labels
  on every input, color contrast checked, `aria-live` for form errors.
- **Done when:** the whole booking flow works with the keyboard alone.

### ⏸ 5.6 Photos

- When the owners provide photos, replace the initials on the About page with
  `next/image` (files go in `public/photos/`), and optionally add a small
  gallery.

---

## Phase 6 — Email notifications 🔑

Needs an email provider account (Resend's free tier is a good fit). **Ask the
owner before starting**, and keep the API key in `.env.local` / Vercel
settings only.

**Blocked this session (2026-11-16):** no email-provider account or API key
has been supplied. 6.1 and 6.2 remain unstarted. Continue independent Phase 7
work after 5.5; do not create an account, invent a key or change production.

### [ ] 6.1 Booking emails

- Email the parent when a request is received and when it's confirmed,
  declined or cancelled. Email the owners when a new request arrives.
- Simple branded HTML emails; failures are logged but never break the booking
  itself.
- **Done when:** each status change sends exactly one email.

### [ ] 6.2 Password reset

- "Forgot password?" link: single-use, short-lived reset link by email; the
  reset token is stored hashed. (This only helps people who signed up with a
  real email they can open, since emails aren't verified; see Phase 1.)
- **Done when:** a used or expired link is rejected.

---

## Phase 7 — Security and reliability

### [x] 7.1 Rate limiting

- Limit login, signup, booking and review submissions per IP (e.g. using a
  MongoDB collection with a TTL index, so no extra service is needed).
- **Done when:** 20 quick failed logins get a friendly "try again later".

### [x] 7.2 Spam protection

- A hidden honeypot field plus a minimum fill time on the public forms.
- **Done when:** a scripted submission that fills every field instantly is
  rejected without telling the bot why.

### [x] 7.3 Session hardening

- Session cookies carry an expiry, and logging out (or changing password)
  invalidates existing sessions (e.g. a `sessionVersion` on the user).
  Consider separate secrets for admin and customer cookies.
- **Done when:** an old copied cookie stops working after logout.

### [ ] 7.4 End-to-end tests

- Playwright tests for the golden paths: book as a guest, sign up and see "My
  bookings", admin confirms a booking, review approval.
- **Done when:** `npm run test:e2e` passes against a local dev server.

---

## Phase 8 — Go live (with the owner)

### [ ] 8.1 Fix the database connection

- In Atlas, give the database user a fresh autogenerated password (the old
  one must not be reused). Build the `mongodb+srv://` line and test it with
  `npm run check-db` before pasting it into Vercel's `MONGODB_URI`, then
  redeploy.
- **Done when:** `partiers.vercel.app/reviews` loads.

### ⏸ 8.2 Create the real admin accounts

- Only once the owner has chosen the credentials (see 3.4). Run
  `MONGODB_URI="<atlas line>" npm run create-admin -- "Name" email "password"`
  from the owner's terminal.

### [ ] 8.3 Final checks

- Run the full flow on the live site from a phone, check the Vercel logs for
  errors, and decide on hosting terms (Vercel Hobby is for non-commercial use;
  Netlify's free plan allows commercial use).

### [ ] 8.4 Custom domain (optional)

- Buy a domain and connect it in the hosting dashboard.

---

## Session handoff — 2026-11-16 (stable checkpoint)

- Completed: **0.1–3.3, 4.1–4.5, 5.1–5.5 and 7.1–7.3**. The latest
  session completed **only 7.3**, on `codex/mobile-accessibility-checkpoint`.
  Existing **[PR #1](https://github.com/rastinarani/partiers/pull/1)** targets
  `main`; keep it open, do not merge or force-push.
- **Exact next resume point: 7.4 End-to-end tests.** It remains unchecked
  and unstarted. The new `sessions` check covers the security acceptance
  criteria for 7.3; it does not implement the broader 7.4 golden-path suite.
  Do not start it without the owner's next instruction.
- Read AGENTS.md/CLAUDE.md, inspect actual Git state, and read the installed
  Next.js guides before writing code. Current project:
  `/Users/rastin/Desktop/Partiers`. Preserve other work and never assume a
  fresh environment has local MongoDB, Chromium or `.env.local`.
- **7.3 behavior:** signed role, identity, 30-day expiry and database revision;
  strict parsing rejects legacy cookies, extra segments, tampering, expired
  claims and customer/admin substitution. Admin/customer HMAC keys are
  purpose-derived from the existing secret; no deployment settings changed.
  The revision binds the password hash and a random `sessionVersion`.
- Both logout routes invalidate **all sessions for that identity**, then clear
  their own cookie. A replayed old logout cannot invalidate a later login.
  Password changes atomically update the hash/version with a conditional
  write, clear the current cookie and show a re-login message. Wrong current
  passwords preserve sessions. Conditional writes prevent stale logout or
  password requests overwriting a newer revision. Already-authorized requests
  may finish; subsequent authorization checks enforce revocation.
- **All consumers checked:** `auth.ts` handles signed claims; `sessions.ts`
  checks the current identity/revision in MongoDB. Protected account/admin
  pages and APIs, navigation, booking prefill and ownership use database
  verification. The admin calendar now checks before loading private data.
  Proxy intentionally performs only signature/role/expiry checks. Existing
  documents without a version need no migration; old cookie formats require
  re-login after deployment. Logout storage failures keep the cookie and show
  a retry message rather than falsely claiming success.
- **Verification for 7.3:** lint, typecheck, **286 unit tests**, default
  Turbopack production build with explicit local test settings, isolated
  webpack production build, and `sessions navigation accessibility booking`
  against BOTH development and compiled production servers. Session checks
  exercise real local customer signup/login, copied-cookie logout/password
  revocation, failed logout retry, wrong-password recovery, re-login, signed
  expiry/legacy/tampering rejection, guest navigation and every protected
  admin page/API's negative path. Successful admin token verification,
  invalidation and password-hash revision changes use mock records only.
- **Isolation:** random local `partiers_test_…` databases, temporary source
  snapshots and ephemeral secrets. The session check uses one disposable
  customer with random test passwords; customer data, public booking/review
  fixtures, databases, servers and snapshots are removed. No real or
  throwaway admin accounts/credentials were created. Production data/settings
  and the known live database issue remain untouched.
- Safe commands: `npm run test:isolated -- sessions navigation accessibility booking`
  and `npm run test:isolated -- --production sessions navigation accessibility booking`.
  Additional existing checks: `spam limits motion seo`. Run builds/checks
  sequentially on low-disk machines. Never delete database files or weaken
  MongoDB disk safeguards. README documents setup and both modes.
- **Owner-dependent work:** 6.1/6.2 need an email-provider account/key;
  3.4/5.6/8.2 remain deferred. Do not create admin accounts or credentials,
  buy services, change production settings or start deferred work.
- Still unverified: successful real admin login/mutations (no admin accounts
  created), broader 7.4 account/admin flows, manual screen-reader use,
  physical phones/Safari/Firefox, actual root-layout fault recovery and live
  Vercel database/edge-IP/share-preview behavior. Prior 7.1/7.2 checks and
  zero-vulnerability audit are historical results, not rerun for 7.3.

---

## Progress log

Add one line per finished step: date, step, commit, notes.

- 2026-11-16 — 7.3 Session hardening (commit: "Harden session expiry and invalidate copied cookies"):
  signed 30-day expiry, purpose-separated customer/admin signatures and
  password/version-bound database verification across every session consumer;
  added the missing admin-calendar database gate. Logout revokes all sessions
  for that identity with replay-safe conditional rotation; password changes
  update hash/version atomically, clear the cookie and require re-login.
  Failed logout remains retryable. Updated navigation fixtures and added the
  scoped isolated `sessions` check. Lint/typecheck, 286 unit tests, default
  production build, isolated webpack production build and four browser checks
  (`sessions navigation accessibility booking`) pass on development AND
  compiled production. Disposable local customer/booking/review data and all
  test servers/snapshots/databases removed; admin success paths use mocks,
  no admin accounts/credentials created, no production settings/data changed.
  Existing PR #1 updated on the same branch without merging. 7.4 and all
  deferred/owner-dependent steps remain unstarted.

- 2026-11-16 — GitHub delivery and handoff (commit: "Record verified GitHub delivery and resume instructions"):
  after interruption, verified clean local state, all four feature commits on
  the actual remote branch, and existing open PR #1 targeting main. Its title/
  description accurately record completed steps, verification and limitations;
  no duplicate or merge. Vercel checks report success; hosted runtime/database
  behavior remains unverified. PR scratch file remains outside the repository.
  No test servers on 3000/3100 or isolated source snapshots remain. Reused the
  completed 245-test/build/browser/audit results because no application code
  changed. Documentation-only follow-up; `git diff --check` passes. Next task
  remains 7.3; no feature or session-hardening work started in this follow-up.

- 2026-11-16 — 7.2 Spam protection (commit: "Protect public forms from instant and honeypot spam"):
  shared hidden honeypot on booking, reviews, signup and both sign-in forms;
  stateless server HMAC proofs have purpose, server timestamp and random nonce.
  Enforces 2s minimum age/24h expiry, strict bounded input, exact signature and
  generic non-cacheable 400 for missing/filled/early/expired/tampered envelopes.
  Rate limits run first; business validation strips all guard fields before
  storage. Validated uncached GET proof endpoint requires no database/account.
  Shared client hook delays send readiness slightly, excludes the honeypot from
  keyboard/screen readers, and recovers failed proof loading with typed values
  and focus retained. A rejected 400 refreshes proof without losing the draft.
  Five new unit tests cover boundaries, tampering/backdating/future/purpose,
  malformed input, honeypot coercion, generic errors and missing secret.
  Real HTTP/browser checks cover all five endpoints, one legitimate booking
  and review, unchanged user/admin counts, hidden field/reflow and loading retry.
  Added isolated compiled-production mode (build/start in the source snapshot).
  Lint/typecheck, 245 tests, default build, isolated webpack production build,
  full zero-alert audit, and all seven isolated browser suites pass against
  both development and production servers. Test databases/snapshots removed.
  No admin accounts/credentials, paid services or production changes. Phase 6
  remains blocked; next independent step is 7.3. Feature work stops here to
  leave time for final verification, documentation, commit, push and PR.

- 2026-11-16 — 7.1 Rate limiting (commit: "Limit repeated submissions and update vulnerable dependencies"):
  shared customer/admin login quota plus separate signup/booking/review quotas;
  HMAC-hashed client identities, canonical IPv6, Vercel-only trusted forwarding
  headers and conservative shared direct-server fallback. Atomic increment/
  upsert handles first-write collisions, fixed-window IDs reset independently
  of TTL cleanup, BSON expiry index removes stale buckets. Friendly non-cacheable
  429/Retry-After and fail-closed generic 503 run before parsing/business writes.
  Unit tests cover quotas, privacy, windows/IP/action separation, collisions,
  index recovery and all five route guards. Real isolated MongoDB/HTTP/browser
  tests cover concurrency (20 requests, exactly 10 admitted), shared login scope,
  quotas, forged headers, retry UI, index/expiry and stale-bucket recovery with
  unchanged account/content counts. Lint/typecheck, 240 tests, default build
  with compiler port permission, and all six isolated browser suites pass.
  Next.js/lint config 16.4.6 plus compatible transitive patches clear both
  production and development audit alerts: full npm audit reports zero.
  Read updated installed route/request/response guides before route edits.
  One regression run was blocked by disk space, not an application assertion;
  cleared generated compiler cache only, reran successfully, and documented
  serial verification. No admin accounts, chosen credentials, production data
  or settings changed; temporary data removed. Next independent step: 7.2.

- 2026-11-16 — 5.5 Accessibility pass (commit: "Make bookings accessible by keyboard"):
  semantic calendar grid with full date/weekday labels, one roving day tab stop,
  arrow/day/week/Home/End/PageUp/PageDown navigation across months/years,
  leap-month clamping, blocked/past-date guards and preserved admin selections.
  Added five behavior tests. Skip link, site-wide focus outlines, visible field
  borders/placeholders, shared assertive form errors, darker CTA/status/error/
  rating colors and hollow unselected stars. Activities have clear focus rings;
  booking confirmation focuses its heading, review completion focuses its
  success card, and long summary/contact text wraps on 360px screens.
  Added axe/Playwright checks for public/auth/404 pages, all booking steps,
  errors/confirmation, reviews and modal navigation; a complete real booking
  and review are sent using only Tab, typing, calendar/rating keys and Enter.
  Native select type-ahead used after diagnosing macOS headless popup-key limits.
  Lint/typecheck, 229 unit tests, webpack build and all five isolated browser
  suites pass (navigation/accessibility/booking/motion/SEO). Automated scans find
  no WCAG A/AA violations in covered states; this is not a full compliance claim.
  Visual QA caught/fixed long-contact overflow. Stabilized an existing optimistic
  retry test by waiting for its disabled button to become ready. No admin
  accounts/credentials or production data/settings touched; test data removed.
  Phase 6 blocked on provider/key; next independent work is 7.1. Baseline
  production dependency audit alerts recorded in the handoff for Phase 7.

- 2026-11-16 — 5.2 Mobile menu and footer (commit: "Add mobile navigation and contact footer"):
  responsive desktop links and animated native-dialog mobile drawer, current-page
  labels, preserved account/login return links, long-name handling, modal focus
  wrapping/restoration, Escape/outside/navigation/desktop-resize close and scroll
  lock. Drawer respects reduced motion including live preference changes.
  Footer adds the confirmed public email/area and useful booking/review/about/
  account links. No invented contact details, prices or account credentials.
  Lint/typecheck, 224 tests and webpack build pass; fresh default Turbopack build
  hits the existing sandbox port restriction. Isolated Chromium checks verified
  360px/640px/desktop, long customer name, main/edge menu interactions, footer
  details, reduced motion and the complete existing booking regression. Menu
  screenshot visually inspected. New source-snapshot browser runner uses a random
  loopback-only test database and secret, leaving the existing server and local
  data untouched; fixtures/database/source snapshot removed after checks.
  README explains cloud-safe setup and checks. Next active step: 5.5.

- 2026-11-16 — Repository checkpoint (commit: "Clarify current progress and exact resume point"):
  confirmed completed website commits already pushed and clean local state;
  corrected stale 5.2 input-pending note, retained confirmed public email/area,
  and specified resume files, behavior, verification and next-step boundaries.
  Documentation-only change; `git diff --check` passes. No application changes
  or new feature completion claims; last application verification remains the
  2026-11-15 lint/typecheck, 224 tests, webpack build and documented browser checks.

- 2026-11-15 — 5.4 SEO and sharing (commit: "Add public page metadata and sharing artwork"):
  public titles/descriptions/canonical URLs, Open Graph/Twitter card metadata,
  a generated 1200×630 Partiers preview plus 32 px and 180 px app icons.
  Sitemap includes only home/reviews/about; robots excludes admin/account/API
  and sign-in paths, with noindex metadata on private/account/auth pages.
  Existing authentication is unchanged; crawler instructions are not access
  control. Uses the existing public Vercel address recorded in this roadmap;
  no production configuration changes. Lint, typecheck, 224 tests and webpack
  build pass. `test:seo` verifies actual rendered metadata, private noindex,
  sitemap/robots, PNG content types/dimensions; preview visually inspected.
  Existing admin login remains an unchanged client component, with metadata in
  a server layout. Live chat-app preview/cache behavior awaits later production
  checks and the known live database fix; local preview generation is verified.

- 2026-11-15 — 5.3 Error and empty pages (commit: "Add friendly error recovery and empty states"):
  branded missing-page recovery, route error retry using installed Next.js 16.3
  `retry()` semantics, and a self-contained light global-error document for root
  layout failures. Error messages stay generic and never render private details.
  Full-reload home recovery intentionally works even when the router failed.
  Public reviews, admin bookings/reviews and calendar empty states explain next
  steps; existing customer/search empty states were already helpful and retained.
  Lint, typecheck, 224 tests and webpack build pass. Chromium verified actual
  random-URL 404, home navigation, a forced server error, detail suppression,
  successful retry/refetch after clearing the fault, 360 px layout and light
  appearance under dark OS preference. Temporary error page/type/flag removed.
  Root-global error component is covered by rendering checks; an actual root
  layout failure was not injected. 5.2 awaits the owner's public email/area;
  independent error work proceeded without inventing either.

- 2026-11-15 — 5.1 A real home page (commit: "Explain services and booking on the home page"):
  service cards drawn from existing event/activity choices, three booking steps,
  direct booking/activity links, three approved testimonials (or an honest review
  invitation), and native keyboard/no-JavaScript-capable FAQ disclosure controls
  covering ages, group size, activities, payment, confirmation and changes.
  Copy does not invent prices, capacity guarantees or business policies.
  Existing five-step booking/account prefill preserved. Lint, typecheck, 221
  tests and webpack build pass; Chromium verifies home content, approved-only
  reviews including pending/deleted exclusions, FAQ keyboard toggling, booking
  anchor, phone layout, reduced motion and the real guest booking flow. Fixtures
  removed and phone screenshot inspected. No credentials/settings changed.

- 2026-11-15 — 4.5 Loading and optimistic updates (commit: "Keep slow pages and admin updates responsive"):
  shared accessible skeletons for home/booking, reviews, account, admin dashboard,
  admin calendar and booking details. Placeholder pulses respect reduced motion
  and contain no customer data. React useOptimistic/useTransition makes booking
  and review status/badge/count changes immediate, keeps controls protected while
  saving, adopts refreshed server data on success and rolls back on failures.
  Booking detail cancellation/confirmation/decline follows the same pattern;
  overlap warnings, cancellation confirmation and private note drafts remain.
  Error notices survive later successes; the notice stack scrolls when needed.
  Lint, typecheck, 219 unit/component tests and final webpack production build
  pass. A cached default Turbopack build passed once, but fresh CSS builds and
  an escalated retry hit the environment’s process/port restriction.
  Chromium with network latency and an intentionally slow temporary server page
  verified streamed skeleton appearance/replacement, reduced-motion stillness,
  immediate changes before a delayed response, failed-save rollback, successful
  refresh from disposable local records, review updates and detail cancellation
  rollback. Admin responses were mocked; actual admin login/endpoints in a full
  browser session remain untested (credentials deferred), while existing API
  permission tests pass. Temporary page, generated type and fixture records
  removed. Public motion and real guest booking checks pass against both the
  development server and the finished webpack production build running locally;
  fixture cleanup was also independently checked.

- 2026-11-15 — 4.4 Delightful feedback (commit: "Add booking celebrations and clear action feedback"):
  a short, lazy-loaded canvas-confetti burst follows successful bookings; device
  reduced motion skips it, live changes stop it, and failed imports never affect
  saved requests. Root toast provider reports admin booking/review changes,
  notes, hiding and date blocks, including network/server errors; errors stay
  until dismissed and success notices expire after eight seconds. Existing
  detailed inline errors are retained. Shared buttons have gentle press feedback;
  stars pop on hover/focus, work as keyboard radios and describe read-only ratings.
  Lint, typecheck, 213 unit/component tests and webpack build pass. Chromium
  verified actual confetti pixels and absence in reduced mode through the local
  booking check; temporary sample admin UI with mocked responses verified
  success/error notices, dismissal, notes/date feedback, keyboard stars and
  normal/reduced button/star effects. Sample route and generated type removed.
  Existing API permission tests still pass; real authenticated admin browser
  actions remain unverified because admin setup is deferred. No accounts created.

- 2026-11-15 — 4.3 Multi-step booking wizard (commit: "Guide bookings through five saved steps"):
  Date → Time → Event details → Your info → Review & send, with progress,
  Back/Edit controls, short accessible entrances, step-specific validation and
  focused headings/errors. Shared summary appears before and after submission.
  Session-only drafts survive refresh for up to 24 hours, are separated by
  guest/account identity, validate/whitelist stored fields, rewind incomplete or
  stale data, and clear after success or confirmed Clear draft. Storage-disabled
  browsers remain usable with a clear notice. Availability is refetched on
  restore; failed/blocked lookups cannot enable times or silently strand the
  final send button. Failed sends retain all details; 409 returns to time
  selection and refreshes availability. Server validation/auth are preserved.
  Lint, typecheck, 208 unit/component tests and webpack build pass. Local
  Chromium `test:booking` verifies real guest save/reference, validation and
  child/count boundaries, occupied versus touching slots, Back/Edit, refresh,
  failed send, conflict recovery, draft cleanup, failed/blocked availability,
  reduced-motion steps and 360 px layout; fixtures removed afterward.
  `test:motion` still passes. Phone screenshots of Review and About inspected.
  Component tests verify guest/account draft isolation and storage failures.
  No accounts created or production settings changed.

- 2026-11-15 — 4.2 Page and section entrances (commit: "Add gentle public page and calendar animations"):
  hero and guest login links enter gently, approved review cards stagger, About
  heading enters and team cards lift 3 px on hover, and calendar day grids enter
  on month changes without delaying interaction. Reduced-motion CSS also guards
  hover transforms; calendar announces its month and selected date. Added
  `npm run test:motion`, a repeatable Playwright check limited to a loopback site
  and database; its three temporary approved reviews are removed in cleanup.
  Chromium verified normal/reduced entrances, review visibility, hover behavior,
  immediate calendar selection, 390 px layout, no-JavaScript content and no
  browser errors. Lint, typecheck, 196 unit/component tests and webpack production
  build pass. No admin accounts or production settings changed.

- 2026-11-15 — 4.1 Animation setup (commit: "Add accessible reusable animation setup"):
  installed Motion; root MotionProvider tracks device preferences live, with a
  still server snapshot. Reusable FadeIn/StaggerChildren leave content visible
  before hydration and without JavaScript, cap entrance delays, and stop/reset
  movement on preference changes. Global reduced-motion CSS disables CSS
  transitions/animations and entrance transforms. Added local component/browser
  testing tools and documented animation conventions. Lint, typecheck, 196 unit
  and component tests, webpack production build and local About HTTP check pass.
  Playwright Chromium (explicitly authorized after CUA host was unavailable)
  verified actual movement in normal mode, no movement in reduced mode, live
  preference changes, no-JavaScript visibility and no browser errors using a
  temporary sample route, removed afterward. Fixed a real hydration issue caught
  by that check: Motion snapshots its initial policy; transitions now receive
  the current preference explicitly. Physical macOS settings were simulated
  through the equivalent browser media preference. No database changes.

- 2026-11-15 — 3.3 Remove spam (commit: "Hide spam bookings and reviews without erasing records"):
  shared inline Hide/Keep confirmation on dashboard booking/review cards and
  booking details; failed requests keep the item and show an error, and
  successful detail-page hiding returns to the dashboard. Dedicated DELETE
  routes verify both the signed admin cookie and an existing admin account.
  Atomic updates add a BSON Date `deletedAt` without erasing data; repeated
  requests return 404 and preserve the original timestamp. Every booking and
  review reader excludes hidden records, covering dashboard counts/search,
  customer bookings, detail links, approved reviews, calendar and availability
  (including booking/confirmation overlap checks). Notes, moderation, admin
  status and customer cancellation writes also exclude hidden records, with
  atomic guards against deletion during another update. Lists use refreshed
  server data so deleted cards and counts disappear together. Lint, typecheck,
  all 192 unit tests and `npm run build -- --webpack` pass. Default Turbopack
  build still fails on this environment's process/port restriction, including
  an escalated retry. Local MongoDB integration verified retained fields and
  deletion dates, all readers, freed confirmed time, legacy visible records,
  ownership, repeat hiding and blocked later edits; isolated temporary database
  and temporary integration test removed. No accounts created or credentials,
  production settings or secrets changed. Running local HTTP checks returned
  401 for both logged-out DELETE endpoints. Browser access host unavailable:
  on-screen confirmation/Keep, successful hiding/redirect/count refresh and
  failure-message interactions remain unverified in a real browser; full
  authenticated browser testing also awaits the owner's admin setup. No
  unfinished implementation; next active step is 4.1 (3.4 stays deferred).

- 2026-11-14 — 3.2 Booking detail page (commit: "Add private admin booking details and status history"):
  `/admin/bookings/[id]` shows family/event details, reference, parent notes,
  status history, and a private notes editor. Dashboard cards link to it.
  Admin confirm/decline/cancel actions preserve overlap warnings; cancellation
  requires confirmation. Notes PATCH and status PATCH verify a signed session
  and a real admin account. Dedicated admin reader exposes private fields;
  shared booking readers explicitly omit notes/history. History starts at
  creation and records both admin and customer changes, with version-matched
  writes to prevent concurrent history overwrites and no duplicate events for
  repeated status requests. Older bookings show their known initial/latest
  status without inventing intervening history. Lint, typecheck, all 178 unit
  tests and `npm run build -- --webpack` pass (supported build alternative
  used because of the previously observed Turbopack environment restriction).
  Local MongoDB integration check verified note persistence/clearing, customer
  privacy, history, duplicate suppression and cancelled-booking protection;
  temporary booking and check removed. Browser checked editor cancellation
  confirmation, failed-save draft retention and logged-out detail-page redirect
  using a temporary sample page, then removed it. No admin accounts created;
  full authenticated browser flow awaits the owner's admin setup.
- 2026-11-14 — 3.1 Dashboard tabs and search (commit: "Add booking status filters and search to admin dashboard"):
  default Pending view; Pending/Confirmed/Declined/Cancelled filter tabs with
  live total counts; case-insensitive, trimmed parent/child/contact search;
  matching-result count, clear-search empty state, Upcoming soonest first and
  Past most recent first using the existing tested date helper. Successful
  status changes refresh the server-rendered dashboard summary. Lint,
  typecheck and all 156 unit tests pass. Production build passes with
  `npm run build -- --webpack`; default Turbopack build was blocked by Google
  Fonts network access, then an environment port-binding restriction.
  Browser checked the real component with 32 in-memory sample bookings:
  status counts/filtering, chronological order, parent/child/contact search,
  whitespace/case handling, no matches, clear search and cancelled state.
  Temporary sample page removed; no database test data or admin accounts
  created. Real admin login/status mutation was not exercised this session.
- 2026-10-23 — Roadmap created. Core features from the first build are in
  place (see "Where things stand").
- 2026-10-23 — 0.1 Unit test setup: Vitest (`npm test`), 68 tests for
  `validation.ts` and session signing in `auth.ts`. Bumped `@types/node` to
  ^22 (Vitest 5 peer requirement).
- 2026-10-23 — 0.2 Shared UI building blocks: `src/components/ui/` (`Button`
  + `buttonClasses`, `Input`/`Select`/`Textarea`/`Label`/`FormError`, `Card`,
  `StatusBadge`); all pages switched over; `date-fns` removed (unused).
  Rendered markup diffed before/after on every page (logged out, customer,
  admin): class lists identical. Only intentional change: the "Submit another
  request" button now matches the other primary buttons. Browser click-through
  skipped at the owner's request (Chrome extension not responding); owner will
  check visually.
- 2026-10-23 — 1.1 Link bookings to accounts: `POST /api/bookings` reads the
  customer session cookie and stores `userId` (string) when it maps to a real
  user; never taken from the request body. Home page prefills name and
  contact (email) for logged-in customers. Verified via curl: guest booking
  has no `userId`, logged-in booking has it, a forged body `userId` and a
  badly signed cookie are ignored, prefill only appears when logged in.
  Browser click-through skipped (Chrome extension not responding).
- 2026-10-23 — 1.2 My bookings: `/account` lists the customer's bookings
  (`getBookingsForUser`, queried by the session's user id) split into
  Upcoming (today or later, soonest first) and Past (most recent first) via
  `src/lib/bookingDates.ts` (+4 tests, 72 total). New `MyBookings` component
  with empty states and "Book now" links. Verified via curl with two
  accounts: each sees only its own bookings; empty state and logged-out
  redirect work. Browser click-through skipped (Chrome extension not
  responding).
- 2026-10-23 — 1.3 Customers can cancel: new `cancelled` status (grey
  badge). `POST /api/account/bookings/[id]/cancel` checks the user session;
  `cancelBookingForUser` puts owner, pending/confirmed and date >= today in
  the update filter (someone else's booking -> 404, not cancellable -> 409).
  Inline "Are you sure?" on upcoming bookings in My bookings. Admin list
  shows "Cancelled by the customer" instead of Confirm/Decline, and the admin
  PATCH refuses to change a cancelled booking (409). Verified via curl:
  logged out 401, other user 404, past/declined/already-cancelled 409, bad id
  404, own upcoming 200; admin dashboard shows the badge. Tested admin side
  with a throwaway password-less admin doc, deleted afterwards. Browser
  click-through skipped (Chrome extension not responding).
- 2026-10-23 — 1.4 Edit profile and change password: "Account settings" on
  `/account` with `ProfileForm` (name, optional phone) and
  `ChangePasswordForm` (current + new + repeat). Routes
  `PATCH /api/account/profile` and `POST /api/account/password` check the
  user session; new `validateProfileInput` (phone: 7–15 digits, common
  punctuation) and `validateChangePasswordInput` (+12 tests, 84 total).
  Users gain an optional `phone` field. Verified via curl: logged out 401,
  bad input 400, extra fields ignored, wrong current password rejected, old
  password stops working and new one logs in, other accounts unaffected.
  Note: existing sessions stay logged in after a password change; that's
  7.3. Browser click-through skipped (Chrome extension not responding).
- 2026-10-23 — 1.5 Smooth login flow: `/login` and `/signup` pages are now
  server components that read `?next=` through `safeNextPath` (same-site
  "/path" only; rejects `//`, backslashes, whitespace, absolute URLs; +14
  tests, 98 total) and pass it to `LoginForm`/`SignupForm` in
  `src/components/auth/`. The nav "Log in" link (`LoginLink`) and the
  proxy/account redirects add `next`. Guests see a "Log in or create an
  account" hint above the booking form. Verified rendered links and
  redirects via curl; the client-side push after login wasn't clicked
  through (Chrome extension not responding).
- 2026-10-23 — 2.1 Event length and no double-booking: `durationMinutes`
  (60/90/120/180/240; events must end by midnight) validated in
  `validateBookingInput`; older bookings without it count as 120 min.
  `src/lib/schedule.ts` holds the shared range maths (+23 tests).
  `GET /api/availability?date=` returns confirmed start/end times only.
  The form has a "How long?" select and disables start times that clash or
  run past midnight; `POST /api/bookings` rejects overlaps with confirmed
  bookings (409). Admin Confirm returns 409 with the clashing booking unless
  `force: true`; the list shows a "Confirm anyway?" warning. Times now
  show as ranges in admin, admin calendar and My bookings (admin calendar
  "today" also fixed to local time). Verified via curl, including touching
  ranges and the admin warning/force path.
- 2026-10-23 — 2.2 Event details: `eventType` (birthday / playdate / family /
  other), `location` (required, 200 chars) and `activities` (any of games,
  crafts, facePainting, balloonAnimals, scavengerHunt; deduplicated) in
  `src/lib/eventOptions.ts` + `validateBookingInput` (+17 tests, 151 total).
  Optional on the `Booking` type so older bookings still load. Form gets an
  event-type select, address field and activity chips; `EventDetails` shows
  them in My bookings, the admin list and the admin calendar. Verified via
  curl (stored, shown on /account and /admin; bad activities rejected).
- 2026-10-23 — 2.3 Confirmation screen: bookings get a `referenceCode`
  (`PT-` + 4 chars, no 0/O/1/I/L; `src/lib/referenceCode.ts`, +2 tests).
  `createBooking` ensures a unique partial index on `referenceCode` (plus an
  index on `userId`) and retries on a duplicate. `POST /api/bookings`
  returns the code; `BookingConfirmation` shows it with a full summary and
  "What happens next". Code shown in My bookings, the admin list and the
  admin calendar. Verified via curl: code stored and shown, duplicate code
  rejected by the index, older bookings without a code unaffected.
- 2026-10-23 — 2.4 Blocked dates: `blockedDates` collection (unique `date`,
  private `reason`) in `src/lib/blockedDates.ts`. Admin
  `POST`/`DELETE /api/admin/blocked-dates` (session checked; new
  `validateBlockDateInput`/`isDateString`, +3 tests, 156 total). Admin
  calendar (renamed "Calendar") has a block/unblock panel; blocked days are
  crossed out on both calendars. Public calendar gets future blocked dates
  only (no reasons); `/api/availability` also returns `blocked`.
  `POST /api/bookings` now rejects blocked dates (409) and past dates (400).
  Verified via curl: auth, bad input, idempotent block, reason not leaked
  to the home page, unblock re-enables booking. Browser click-through for
  all of Phase 1.5–2 skipped (Chrome extension not responding).
