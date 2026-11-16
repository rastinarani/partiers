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

4. Admin credentials are deferred in the roadmap. Do not create accounts until
   the owner chooses the credentials. The admin login page already exists;
   see [Admin auth](#admin-auth) when the owner is ready.

5. Open http://localhost:3000. The admin dashboard is at `/admin/login`.

## Safe browser checks

With dependencies, Playwright Chromium and a local MongoDB server available:

```bash
npm run test:isolated -- navigation booking motion seo
```

This makes a temporary source copy, starts a separate server at
http://127.0.0.1:3100, and uses a randomly named `partiers_test_…` database.
It supplies a temporary session-signing secret, never reads `.env.local`,
and removes its database and source copy afterwards. The existing server,
accounts and bookings are untouched. No admin accounts are created.

Choose one or more checks from the command above. If port 3100 is occupied,
use `PARTIERS_TEST_PORT=3101 npm run test:isolated -- navigation`.
The default database server is `mongodb://127.0.0.1:27017`; an alternative
loopback-only server can be supplied with `PARTIERS_TEST_MONGODB_URI`.
Never use a production database for tests.

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
    auth.ts                   Session cookie logic (admin + customer)
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
{ name, email, passwordSalt, passwordHash, createdAt }
```

**users** collection (customer accounts — see below):

```
{ name, email, passwordSalt, passwordHash, createdAt }
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
plain text) and sets a cookie shaped like `<adminId>.<hmac>`, signed with
`ADMIN_SESSION_SECRET`. `proxy.ts` checks that cookie on every `/admin/*`
page (redirecting to `/admin/login` if it's missing or invalid), and each
admin API route double-checks it independently. The dashboard reads the
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
  `/login`) sets a cookie shaped like `<userId>.<hmac>`.
- `/account` is gated by `proxy.ts` the same way `/admin` is, just with a
  separate cookie (`partiers_user_session` vs `partiers_admin_session`)
  and a separate collection, so the two account systems never overlap.

Bookings made while signed in are linked to that customer, and the booking
form prefills their name and email. `/account` shows upcoming/past bookings,
allows cancellation of eligible bookings, and includes profile/password settings.
Guest booking remains available.

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
`npx playwright install chromium`. The full booking/admin end-to-end suite
remains roadmap step 7.4. With the local website and MongoDB running,
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
never point them at production. Full authenticated admin tests remain step 7.4.

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

The next roadmap step is the mobile menu and footer (5.2). The owner confirmed
**nikkitheawsome@gmail.com** and **Metro Vancouver** as the public contact details.
These are recorded for that step; they have not yet been added to the footer.
