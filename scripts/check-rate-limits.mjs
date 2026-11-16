import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";

const baseURL = process.env.PARTIERS_TEST_URL;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
assert.ok(baseURL && uri && /^partiers_test_[a-f0-9]+$/.test(dbName ?? ""), "Run with npm run test:isolated -- limits.");
for (const url of [baseURL, uri]) assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const client = new MongoClient(uri);
const api = await request.newContext({ baseURL });
let browser;
try {
  const db = client.db(dbName);
  const counters = db.collection("rateLimits");
  const collections = ["users", "admins", "bookings", "reviews"];
  const before = await Promise.all(collections.map((name) => db.collection(name).countDocuments()));
  await counters.deleteMany({});
  const payload = { email: "nobody-for-rate-check@example.invalid", password: "intentionally-incorrect" };
  // Both sign-in endpoints must consume the same atomic quota, even concurrently.
  const responses = await Promise.all(Array.from({ length: 20 }, (_, index) =>
    api.post(index % 2 ? "/api/admin/login" : "/api/auth/login", { data: payload })));
  assert.equal(responses.filter((response) => response.status() === 401).length, 10);
  assert.equal(responses.filter((response) => response.status() === 429).length, 10);
  const denied = responses.find((response) => response.status() === 429);
  assert.match((await denied.json()).error, /try again/);
  assert.ok(Number(denied.headers()["retry-after"]) > 0);
  assert.equal(denied.headers()["cache-control"], "no-store");
  const index = (await counters.indexes()).find((item) => item.key.expiresAt === 1);
  assert.equal(index.expireAfterSeconds, 0);
  const bucket = await counters.findOne();
  assert.equal(bucket.count, 20);
  assert.ok(bucket.expiresAt instanceof Date);
  assert.match(bucket._id, /^login:[a-f0-9]{64}:\d+$/);
  const forged = await api.post("/api/auth/login", { data: payload,
    headers: { "x-forwarded-for": "198.51.100.90", "x-vercel-forwarded-for": "198.51.100.91" } });
  assert.equal(forged.status(), 429, "Untrusted headers cannot bypass a direct server's limit");
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Email", { exact: true }).fill(payload.email);
  await page.getByLabel("Password", { exact: true }).fill(payload.password);
  await page.locator("form").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Too many attempts");
  await expect(page.locator("form").getByRole("button", { name: "Log in", exact: true })).toBeEnabled();
  for (const [path, limit] of [["/api/auth/signup", 5], ["/api/bookings", 10], ["/api/reviews", 5]]) {
    for (let attempt = 1; attempt <= limit + 1; attempt++) {
      const result = await api.post(path, { data: {} });
      assert.equal(result.status(), attempt <= limit ? 400 : 429, `${path} attempt ${attempt}`);
    }
  }
  assert.deepEqual(await Promise.all(collections.map((name) => db.collection(name).countDocuments())), before, "Rejected requests create no users, admins, bookings or reviews");
  // Old buckets do not block a new window even while cleanup has not removed them.
  const parts = bucket._id.split(":");
  await counters.deleteMany({});
  await counters.insertOne({ ...bucket, _id: `${parts[0]}:${parts[1]}:${Number(parts[2]) - 900000}`, count: 1000, expiresAt: new Date(Date.now() + 60000) });
  assert.equal((await api.post("/api/auth/login", { data: payload })).status(), 401);
  assert.equal(await counters.countDocuments(), 2);
  console.log("PASS: 20 concurrent mixed customer/admin failures admit exactly 10, friendly browser error/Retry-After, TTL index/BSON expiry, spoofed-header resistance, signup/booking/review quotas, unchanged account/content data and fresh-window recovery.");
} finally {
  await browser?.close();
  await api.dispose();
  await client.db(dbName).collection("rateLimits").deleteMany({});
  await client.close();
}
