import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, request } from "playwright";
import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";

const baseURL = process.env.PARTIERS_TEST_URL;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
assert.ok(baseURL && uri && /^partiers_test_[a-f0-9]+$/.test(dbName ?? ""), "Run with npm run test:isolated -- spam.");
for (const url of [baseURL, uri]) assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const client = new MongoClient(uri);
const api = await request.newContext({ baseURL });
const contact = "spam-guard-check@example.invalid";
const cases = [
  ["/api/auth/login", "login", { email: "no-such-account@example.invalid", password: "intentionally-incorrect" }, 401],
  ["/api/admin/login", "login", { email: "no-such-account@example.invalid", password: "intentionally-incorrect" }, 401],
  // Keep signup data invalid even if a guard regresses: never create credentials.
  ["/api/auth/signup", "signup", { name: "No account fixture" }, 400],
  ["/api/bookings", "booking", { parentName: "Spam guard check", contact, childName: "Sample child", childAge: 7, numberOfChildren: 6, date: "2099-12-05", time: "10:00", durationMinutes: 60, eventType: "birthday", location: "Test park", activities: ["games"], notes: "" }, 201],
  ["/api/reviews", "review", { name: "Spam guard check", rating: 4, comment: "Temporary check, removed afterwards." }, 201],
];
let browser;
try {
  const db = client.db(dbName);
  const accountCounts = await Promise.all(["admins", "users"].map((name) => db.collection(name).countDocuments()));
  const generic = "We couldn’t process that request. Please try again.";
  const tokens = [];
  for (const [path, kind, payload] of cases) {
    await db.collection("rateLimits").deleteMany({});
    await api.post(path, { data: {} }); // Compile before measuring an immediate send.
    const response = await api.get(`/api/form-token?form=${kind}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["cache-control"], /no-store/);
    const { token } = await response.json();
    tokens.push(token);
    const immediate = await api.post(path, { data: { ...payload, formToken: token, website: "" } });
    assert.equal(immediate.status(), 400);
    assert.equal((await immediate.json()).error, generic, `${kind} instant send is rejected generically`);
  }
  await delay(2200);
  for (const [index, [path, kind, payload, expected]] of cases.entries()) {
    await db.collection("rateLimits").deleteMany({});
    for (const extra of [
      { formToken: tokens[index], website: "https://spam.example.invalid" },
      { formToken: `${tokens[index]}.tampered`, website: "" },
      { formToken: tokens[index], website: {} },
    ]) {
      const response = await api.post(path, { data: { ...payload, ...extra } });
      assert.equal(response.status(), 400);
      assert.equal((await response.json()).error, generic);
    }
    const valid = await api.post(path, { data: { ...payload, formToken: tokens[index], website: "" } });
    assert.equal(valid.status(), expected, `${kind} legitimate filled form reaches its ordinary handler`);
  }
  for (const [collection, query] of [["bookings", { contact }], ["reviews", { name: "Spam guard check" }]]) {
    const rows = await db.collection(collection).find(query).toArray();
    assert.equal(rows.length, 1, "Only the legitimate request is stored");
    assert.equal(Object.hasOwn(rows[0], "formToken"), false);
    assert.equal(Object.hasOwn(rows[0], "website"), false);
  }
  assert.deepEqual(await Promise.all(["admins", "users"].map((name) => db.collection(name).countDocuments())), accountCounts);
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  for (const path of ["/login", "/signup", "/admin/login", "/reviews", "/"]) {
    await page.goto(`${baseURL}${path}`);
    await expect(page.locator('input[name="website"]')).toHaveAttribute("tabindex", "-1");
    await expect(page.getByRole("textbox", { name: "Company website" })).toHaveCount(0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.route("**/api/form-token?form=review", (route) => route.fulfill({ status: 503, json: { error: "Temporary failure" } }));
  await page.goto(`${baseURL}/reviews`);
  await page.getByLabel("Your name", { exact: true }).fill("Retained reviewer");
  await page.getByLabel("Comment").fill("Keep my writing while retrying.");
  await expect(page.getByRole("button", { name: "Submit review" })).toBeDisabled();
  await expect(page.locator("#leave-review").getByRole("alert")).toContainText("Your details are still here");
  await page.unroute("**/api/form-token?form=review");
  await page.getByRole("button", { name: "Retry loading form" }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Submit review" })).toBeEnabled({ timeout: 15000 });
  await expect(page.getByLabel("Comment")).toHaveValue("Keep my writing while retrying.");
  await context.close();
  console.log("PASS: instant/honeypot/tampered submissions rejected generically on all five endpoints; legitimate booking/review saved once without guard fields; no accounts created; hidden non-keyboard field, 360px layout and failed-load retry retain text/focus.");
} finally {
  await browser?.close();
  await api.dispose();
  await client.db(dbName).collection("bookings").deleteMany({ contact });
  await client.db(dbName).collection("reviews").deleteMany({ name: "Spam guard check" });
  await client.db(dbName).collection("rateLimits").deleteMany({});
  await client.close();
}
