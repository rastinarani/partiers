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

- Public booking page: custom month calendar, time picker (9:00 AM–10:00 PM,
  30-minute slots), parent/child details, number of children, notes. Saves as
  `pending`.
- Reviews page: approved reviews plus a form; new reviews wait for approval.
- About page with Nikki's and Manna's bios (photos are initials placeholders).
- Customer accounts (demo): `/signup`, `/login`, `/account`. Accounts are not
  yet linked to bookings.
- Admin area: `/admin/login` (email + password, `admins` collection),
  dashboard to confirm/decline bookings and approve/reject reviews, and a
  confirmed-bookings calendar.
- Vibrant violet/rose/amber theme, mobile-friendly layout.

**Known gaps:** customers can't see their bookings; nothing stops two
bookings at the same time; no animations or loading states; no emails; no
rate limiting; no automated tests.

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

### [ ] 2.4 Blocked dates

- Admins can mark dates as unavailable (vacations, school events) from the
  admin calendar. Those dates appear disabled on the public calendar, and the
  API rejects them.
- **Done when:** a blocked date can't be booked through the page or the API.

---

## Phase 3 — Admin tools

The admin login page already exists. **Admin credentials are deliberately
not set up yet** — see 3.4.

### [ ] 3.1 Dashboard tabs and search

- Tabs for Pending / Confirmed / Declined / Cancelled with counts; a search
  box (parent name, child name, contact); upcoming bookings sorted by date.
- **Done when:** finding one booking among 30 test bookings takes seconds.

### [ ] 3.2 Booking detail page

- `/admin/bookings/[id]`: every detail, the status history, private admin
  notes (only admins can see them), and confirm/decline/cancel actions.
- **Done when:** notes persist and never appear in customer-facing pages or
  APIs.

### [ ] 3.3 Remove spam

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

### [ ] 4.1 Animation setup

- Install `motion`; create a few reusable pieces (`FadeIn`,
  `StaggerChildren`) in `src/components/motion/`; add a global
  reduced-motion setting.
- **Done when:** with "Reduce motion" enabled in macOS accessibility
  settings, nothing slides or bounces.

### [ ] 4.2 Page and section entrances

- Hero text and buttons fade/slide in, review cards stagger in, the About
  cards lift slightly on hover, and the calendar animates when changing
  months.
- Keep it subtle: short (150–400 ms), and nothing that delays reading.
- **Done when:** the site feels lively but still loads instantly.

### [ ] 4.3 Multi-step booking wizard

- Turn the long booking form into steps: **Date → Time → Event details →
  Your info → Review & send**, with a progress bar, Back/Next buttons,
  animated transitions and per-step validation.
- Keep the URL or state so a refresh doesn't lose everything.
- **Done when:** a booking can be completed on a phone without scrolling past
  fields you haven't reached yet.

### [ ] 4.4 Delightful feedback

- Confetti when a booking is sent (`canvas-confetti`, off with reduced
  motion), toast notifications for admin actions and errors, button press
  states, and star ratings that pop on hover.
- **Done when:** every action gives clear, quick feedback.

### [ ] 4.5 Loading and optimistic updates

- `loading.tsx` skeletons for data pages; admin status changes update
  instantly and roll back with an error toast if the server fails.
- **Done when:** a slow network (test with browser dev tools throttling) never
  shows a blank or frozen screen.

---

## Phase 5 — Professional polish

### [ ] 5.1 A real home page

- Above or below the booking area, add: packages/services (e.g. "Party
  host", "Activity hour", "Full party" with what's included), "How it works"
  in three steps, a testimonials strip from approved reviews, and an FAQ
  accordion (ages, group sizes, payment, cancellation).
- Write friendly, specific copy; no lorem ipsum.
- **Done when:** a first-time visitor understands the offer without the About
  page.

### [ ] 5.2 Mobile menu and footer

- A hamburger menu with an animated drawer on small screens; a richer footer
  (contact email, area served, links).
- **Done when:** the nav never wraps or crowds on a 360 px wide screen.

### [ ] 5.3 Error and empty pages

- Designed `not-found.tsx`, `error.tsx` (with a retry button), and friendly
  empty states everywhere.
- **Done when:** a random URL and a forced server error both show on-brand
  pages.

### [ ] 5.4 SEO and sharing

- Per-page titles and descriptions, an Open Graph image (`opengraph-image`),
  app icon, `sitemap.ts` and `robots.ts` (keep `/admin` and `/account` out).
- **Done when:** pasting the site link into a chat app shows a nice preview
  card.

### [ ] 5.5 Accessibility pass

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

### [ ] 7.1 Rate limiting

- Limit login, signup, booking and review submissions per IP (e.g. using a
  MongoDB collection with a TTL index, so no extra service is needed).
- **Done when:** 20 quick failed logins get a friendly "try again later".

### [ ] 7.2 Spam protection

- A hidden honeypot field plus a minimum fill time on the public forms.
- **Done when:** a scripted submission that fills every field instantly is
  rejected without telling the bot why.

### [ ] 7.3 Session hardening

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

## Progress log

Add one line per finished step: date, step, commit, notes.

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
