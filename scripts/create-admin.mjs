// Creates an admin account directly in MongoDB. There is no public admin
// signup page on purpose — anyone hitting an API route could otherwise
// make themselves an admin. Run this locally (or paste it into a one-off
// script wherever your production DB is reachable from) instead.
//
// Usage:
//   npm run create-admin -- "Full Name" you@example.com "a real password"

import { MongoClient } from "mongodb";
import { randomBytes, scryptSync } from "node:crypto";

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error('Usage: npm run create-admin -- "Full Name" you@example.com "password"');
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "partiers";

if (!uri) {
  console.error(
    "MONGODB_URI is not set. Run this with --env-file=.env.local (already wired up via `npm run create-admin`)."
  );
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const normalizedEmail = email.toLowerCase();

  const existing = await db.collection("admins").findOne({ email: normalizedEmail });
  if (existing) {
    console.error(`An admin with email ${normalizedEmail} already exists.`);
    process.exit(1);
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  await db.collection("admins").insertOne({
    name,
    email: normalizedEmail,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  });

  console.log(`Created admin account for ${normalizedEmail}. They can now log in at /admin/login.`);
} finally {
  await client.close();
}
