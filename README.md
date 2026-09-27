# Partiers

A small booking + reviews site for a kids' entertainment business (parties, family
events, get-togethers). Built with Next.js (App Router), MongoDB, and Tailwind CSS.

## Running locally

1. Make sure MongoDB is running locally (this repo's dev setup already installed
   and started it via Homebrew: `brew services start mongodb/brew/mongodb-community`).
2. Copy `.env.example` to `.env.local` and fill in the values (a working
   `.env.local` for local dev already exists in this project).
3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Create an admin account (there's no public admin signup — see
   [Admin auth](#admin-auth) below):

   ```bash
   npm run create-admin -- "Your Name" you@example.com "a real password"
   ```

5. Open http://localhost:3000. The admin dashboard is at `/admin/login`.

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
    account/page.tsx         "Logged in" landing page
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

### Customer accounts (login / signup demo)

This is a working demo of a real account system for site visitors — no
third-party auth provider, everything stored in your own MongoDB:

- Passwords are never stored in plain text. `lib/users.ts` salts and hashes
  them with `scrypt` before saving.
- Signing up (at `/signup`, unlike admin accounts) or logging in (at
  `/login`) sets a cookie shaped like `<userId>.<hmac>`.
- `/account` is gated by `proxy.ts` the same way `/admin` is, just with a
  separate cookie (`partiers_user_session` vs `partiers_admin_session`)
  and a separate collection, so the two account systems never overlap.

Right now this is a self-contained demo (accounts don't yet link to
bookings or reviews) — the natural next step is to prefill the booking
form from a logged-in user's saved details, or show "your bookings" on
the account page.

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
6. Create your production admin account by running `create-admin` locally
   but pointed at your Atlas database — temporarily set `MONGODB_URI` in
   your local `.env.local` to the Atlas connection string, run the command,
   then switch `.env.local` back to your local MongoDB URI.

That's it — no payment processing to configure since bookings are paid in
person.
