# Partiers

A small booking + reviews site for a kids' entertainment business (parties, family
events, get-togethers). Built with Next.js (App Router), MongoDB, and Tailwind CSS.

## Running locally

1. Make sure MongoDB is running locally. If installed with Homebrew, start it
   with `brew services start mongodb/brew/mongodb-community`.
2. Copy `.env.example` to `.env.local` and fill in the values. In a new or cloud
   workspace, do not assume this file or a local database already exists.
3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

   If a development server was already running before dependency updates,
   stop it with Ctrl+C and start it again.

4. Admin credentials are deferred in the roadmap. Do not create accounts until
   the owner chooses the credentials. The admin login page already exists;
   see [Admin auth](#admin-auth) when the owner is ready.

5. Open http://localhost:3000. The admin dashboard is at `/admin/login`.

## Safe browser checks

With dependencies, Playwright Chromium and a local MongoDB server available:

```bash
npm run test:e2e
npm run test:isolated -- sessions navigation accessibility motion seo limits spam
```

This makes a temporary source copy, starts a separate server at
http://127.0.0.1:3100, and uses a randomly named `partiers_test_…` database.
It supplies a temporary session-signing secret, never reads `.env.local`,
and removes its database and source copy afterwards. The existing server,
accounts and bookings are untouched. The `e2e` suite creates generated customer
and admin fixtures only in that disposable database and removes them afterwards.

`npm run test:e2e` runs `booking reliability e2e`: guest wizard/retry, direct API
validation/concurrent retries, and real customer/admin workflows. It includes
cross-customer permissions, admin confirmation and review moderation.
Install Chromium once with `npx playwright install chromium`.

Choose one or more checks from the command above. If port 3100 is occupied,
use `PARTIERS_TEST_PORT=3101 npm run test:isolated -- navigation`.
The default database server is `mongodb://127.0.0.1:27017`; an alternative
loopback-only server can be supplied with `PARTIERS_TEST_MONGODB_URI`.
Never use a production database for tests.

To build and check the compiled production site in the same isolated setup:

```bash
npm run test:e2e -- --production
# Optional additional focused checks:
npm run test:isolated -- --production sessions navigation accessibility seo
```

This runs a webpack production build inside the temporary source copy, then
starts it with the temporary database and secret. It does not deploy anything.

The accessibility check scans the public pages and all five booking screens,
then sends a real test booking and review using the keyboard alone. It checks
labels, contrast, calendar shortcuts, error announcements and focus. Automated
checks do not replace manual screen-reader or physical-phone testing.

Run browser checks and production builds one after another on small machines;
both need temporary disk space. MongoDB also reserves a safety margin before it
will create indexes. Generated `.next/cache` files can be rebuilt; never delete
database files to make room.

## Submission protection

The site uses MongoDB counters with automatic expiry; no extra service or
account is needed. These fixed-window limits count all attempts, including
invalid input:

| Action | Limit per client IP |
| --- | --- |
| Customer and admin sign-in combined | 10 per 15 minutes |
| Account signup | 5 per hour |
| Booking request | 10 per hour |
| Review submission | 5 per hour |

An excess request gets a friendly message and an HTTP `429` response with a
`Retry-After` header. Requests cannot proceed when the protection database is
unavailable; a generic `503` message asks the visitor to retry. Existing booking
drafts remain available after a rejected send.

On Vercel, the site uses its platform-supplied client-IP header, as documented in
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
It stores a keyed hash instead of the IP address itself. Direct local servers
ignore caller-supplied forwarding headers and share one conservative bucket.
Before moving to a different host, verify its trusted proxy/IP setup during
Phase 8; do not trust arbitrary forwarding headers on a public direct server.

`npm run test:isolated -- limits` checks concurrent requests against real local
MongoDB, the browser error, quotas, automatic-expiry index, spoofed-header
resistance and recovery without creating any accounts.

## Spam protection

Booking, review, signup and both sign-in forms include a hidden website field
that keyboard and screen-reader users skip. The server rejects requests that
fill it. Forms also receive signed, purpose-specific proofs from
`/api/form-token`; the server enforces a two-second minimum age and a one-day
expiry, so changing the browser's timestamp cannot backdate a proof.

The send button waits briefly while the form gets ready. If loading fails,
visitors can retry with their typed details and focus preserved. Rejections
use the same generic message for missing, early, expired, tampered and
honeypot-filled requests. Protection fields are excluded from stored records.
No CAPTCHA or external account is involved.

Proofs are reusable within their lifetime. This is a hurdle for simple bots;
the per-IP limits remain important against determined automation. Run
`npm run test:isolated -- spam` to check real requests and failure recovery
without creating accounts or credentials.

## Project structure

```
src/
  app/
    page.tsx                 Home page — the public booking form
    reviews/page.tsx         Public reviews list + submission form
    about/page.tsx           About Us page (edit the bios/photos here)
    admin/
      login/page.tsx         Admin login
      page.tsx               Dashboard: booking requests + review moderation
      calendar/page.tsx      Calendar of confirmed bookings
    login/page.tsx           Customer login (demo account system)
    signup/page.tsx          Customer signup
    account/page.tsx         Profile settings and the customer’s bookings
    api/
      bookings/route.ts      POST (public, create) / PATCH (admin, confirm/decline)
      reviews/route.ts       POST (public, create) / PATCH (admin, approve/reject)
      admin/login/route.ts   Checks admin email/password, sets a session cookie
      admin/logout/route.ts  Clears the session cookie
      auth/signup/route.ts   Creates a customer account (hashed password)
      auth/login/route.ts    Verifies credentials, sets a session cookie
      auth/logout/route.ts   Clears the session cookie
  components/                Reusable UI (calendar, forms, star rating, admin lists)
  lib/
    mongodb.ts                DB connection
    bookings.ts, reviews.ts   Data access functions
    admins.ts                 Admin account data access (password hashing)
    users.ts                  Customer account data access (password hashing)
    auth.ts                   Signed session claims (admin + customer)
    sessions.ts               Database session validation and revocation
    validation.ts             Server-side input validation
    types.ts                  Shared TypeScript types
proxy.ts                      Redirects unauthenticated visitors away from
                               /admin/* and /account/*
scripts/create-admin.mjs      Creates an admin account (no public signup page)
```

### Data model

**bookings** collection:

```
{
  parentName, contact, childName, childAge, numberOfChildren,
  date ("YYYY-MM-DD"), time ("HH:MM"), notes,
  status: "pending" | "confirmed" | "declined",
  createdAt, updatedAt
}
```

**reviews** collection:

```
{
  name, rating (1-5), comment,
  status: "pending" | "approved" | "rejected",
  createdAt
}
```

**admins** collection (separate from customer accounts — see below):

```
{ name, email, passwordSalt, passwordHash, sessionVersion? (logout revision), createdAt }
```

**users** collection (customer accounts — see below):

```
{ name, email, passwordSalt, passwordHash, sessionVersion? (logout revision), createdAt }
```

### Admin auth

Admins are real accounts in their own `admins` collection — completely
separate from customer `users`, so a customer account can never become an
admin account and vice versa. There's deliberately **no public admin
signup page** (a public one would let anyone make themselves an admin);
instead you create admin accounts from the command line:

```bash
npm run create-admin -- "Full Name" you@example.com "a real password"
```

Logging in at `/admin/login` checks the email/password against that
collection (passwords are salted + hashed with `scrypt`, never stored in
plain text) and sets a signed session cookie. `proxy.ts` checks its signature,
role and expiry on every `/admin/*` page (redirecting to `/admin/login` if
it is missing or invalid). Each protected page and API also validates the
session against the current admin document in MongoDB. The dashboard reads the
same cookie to show "Signed in as ..." — that's how the app knows which
admin is logged in, not just *that* someone is.

You can create more than one admin account (e.g. one each for you and
your cousin) by running `create-admin` again with different emails.

### Customer accounts

Customer accounts let parents keep track of their bookings — no
third-party auth provider, everything stored in your own MongoDB:

- Passwords are never stored in plain text. `lib/users.ts` salts and hashes
  them with `scrypt` before saving.
- Signing up (at `/signup`, unlike admin accounts) or logging in (at
  `/login`) sets a signed session cookie with a server-checked expiry.
- `/account` is gated by `proxy.ts` the same way `/admin` is, just with a
  separate cookie (`partiers_user_session` vs `partiers_admin_session`)
  and a separate collection, so the two account systems never overlap.

Customer login loads a fresh destination page after setting its cookie, so
returning after logout cannot reuse a cached signed-out destination.

Bookings made while signed in are linked to that customer, and the booking
form prefills their name and email. `/account` shows upcoming/past bookings,
allows cancellation of eligible bookings, and includes profile/password settings.
Guest booking remains available.

## Session hardening

Both cookie types expire after 30 days; the expiry is signed and checked on
requests, even if someone keeps or copies an old cookie. Admin and customer
signatures use distinct purpose-derived keys from `ADMIN_SESSION_SECRET`,
with a signed role and separate MongoDB collections. No new secret setting
is required. Cookies remain HttpOnly, SameSite=Lax and Secure in production.

Every authenticated page/API, public account navigation, booking prefill and
booking ownership check validates the current database session revision.
Proxy performs the lightweight signature/role/expiry check only. Logout
rotates a random `sessionVersion` on that identity, invalidating **all its
sessions on all devices**. Replaying an old logout cannot invalidate a later
login. Database failures leave logout retryable rather than falsely claiming
success. Password changes update the password and version atomically, clear
the current cookie and ask the customer to log in again. The revision also
covers the password hash, so changing a stored admin/customer password hash
invalidates prior sessions without needing a separate version update.

Old signed-id cookies are deliberately rejected; existing visitors must log
in again once this change is deployed. Existing account documents need no
migration: an absent version is supported until the first rotation. Requests
that already passed authorization may finish while another request logs out;
revocation applies to subsequent authorization checks.

`npm run test:isolated -- sessions` checks signup/login, copied cookies after
logout/password changes, retry behavior, expiry, tampering, legacy-cookie
rejection and protected pages/APIs using a disposable customer and random
passwords in the temporary local database. All fixtures are removed. It
creates no admin accounts; successful admin issuance/revocation and password
hash changes are checked with mock records in unit tests. This scoped check
is part of 7.3; the broader 7.4 end-to-end suite is available with `npm run test:e2e`.

## Deploying to production

### 1. MongoDB Atlas (free tier)

1. Create a free account at https://www.mongodb.com/cloud/atlas/register.
2. Create a free "M0" cluster.
3. Under **Database Access**, add a database user with a password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) —
   fine for a small hobby project reached only via your app's server.
5. Click **Connect** on your cluster → **Drivers** → copy the connection
   string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`

### 2. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to https://vercel.com, sign in, and "Import Project" from that repo.
3. Vercel auto-detects Next.js — no build config needed.
4. Before deploying, add these environment variables in the Vercel project
   settings (Settings → Environment Variables):

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | Your Atlas connection string from above |
   | `MONGODB_DB` | `partiers` (or whatever name you want) |
   | `ADMIN_SESSION_SECRET` | A new random string — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

5. Deploy. Vercel gives you a free `*.vercel.app` URL immediately; you can
   attach a custom domain later from the same project settings.
6. Create your production admin account by running `create-admin` from
   your computer, pointed at your Atlas database with an inline
   `MONGODB_URI` (it takes priority over `.env.local`, which you don't
   need to edit):

   ```bash
   MONGODB_URI="<your Atlas connection string>" npm run create-admin -- "Full Name" you@example.com "a real password"
   ```

That's it — no payment processing to configure since bookings are paid in
person.

## Animation conventions

Reusable components live in `src/components/motion/`. `MotionProvider` is
installed in the root layout and follows `prefers-reduced-motion`, including
changes made while the page is open. Use `useReducedMotionSetting()` for new
interactive effects, and pass that current value as Motion's `reduceMotion`
transition option because the animation engine snapshots its mount-time policy.

`FadeIn` provides a short entrance without hiding server-rendered content.
`StaggerChildren` spaces entrances by 40 ms and caps the last delay at 120 ms.
Global CSS disables transitions and CSS animations when reduced motion is on.
Never require an animation to finish before a button or form can be used.

`npm test` includes component interaction tests in a simulated page. For local
browser checks, Playwright is available; install its browser with
`npx playwright install chromium`. The booking/admin end-to-end suite runs with `npm run test:e2e`. With the local website and MongoDB running,
`npm run test:motion` checks public animations in Chromium at phone size,
including reduced motion and no-JavaScript visibility. It only accepts a local
database and removes its temporary review records when finished.

## Booking wizard and local checks

The booking form has five steps. Drafts live in `sessionStorage` (this browser
tab only), expire after a day, and clear on successful submission or confirmed
Clear draft. Guests and signed-in customers use separate draft keys. No booking
exists in MongoDB until the customer presses **Send booking request** and the
server accepts it. Availability is checked again by the server.

With the local website and MongoDB running, `npm run test:booking` uses Chromium
to check the phone flow, validation, draft restoration, server-error recovery,
availability and a real test save. It removes its uniquely identified booking
fixtures in cleanup. Both browser checks reject non-local database/site URLs;
never point them at production. Authenticated admin tests are included in `npm run test:e2e`.

## Feedback

`ToastProvider` keeps admin action notices visible across navigation. Use
`useToast()` for success/error notices; errors stay until dismissed. Booking
celebration code loads only after success and skips reduced-motion users.
CSS press/star effects use `motion-safe` and the global reduced-motion guard.

## Slow pages and admin updates

Data pages use `loading.tsx` placeholders while the server is working. Loading
skeletons contain no private records and stop pulsing with reduced motion.
Admin status changes use React optimistic transitions: changes appear before the
request finishes, roll back on failure, and reconcile with the refreshed server
on success. Keep server authentication/validation in every write route.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
In environments where Turbopack cannot spawn its CSS processing helper, the
supported alternative is `npm run build -- --webpack` (the final verified build
for this session). A cached default build passed once, but rebuilding fresh CSS
still hit this environment’s process/port restriction, including an escalated retry.

## Public page checks and next step

The home page explains the existing services, booking process and FAQs, and
shows only approved reviews. Error pages offer recovery without displaying
internal error details. `npm run test:seo` checks page titles, sharing tags,
private-page indexing instructions, sitemap and generated preview/icon images
against a running local site. Live chat-app previews still need production checks.

The mobile menu and footer are complete. The footer uses the owner-confirmed
**nikkitheawsome@gmail.com** and **Metro Vancouver** public details.


## Booking retry and date rules

Business dates use `America/Vancouver` on both server and browser. Times in the
request are Vancouver wall-clock times. The server rejects impossible dates,
start times outside 09:00–22:00 or off the half hour, and events ending after
midnight. Pending requests may share a time; only confirmed events block it.
Admins may explicitly override a confirmation overlap warning.

The wizard saves a random request key with the tab's draft when sending.
Concurrent sends and unchanged retries, including after a lost response and
refresh, return the same saved receipt using a unique database index. Editing
fields starts a new request identity. Clearing the draft or choosing another
request deliberately starts a new booking. Rate limits still apply to retries.
Direct API clients should preserve an `Idempotency-Key` UUID across retries;
legacy calls without one deduplicate identical requests using the form proof.
No private booking fields are returned in the receipt.

See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for the release blockers and
next task. Local automated checks do not prove hosted database access, email
delivery or live client-IP handling.
