import assert from "node:assert/strict";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { MongoClient, ObjectId } from "mongodb";

const baseURL = process.env.PARTIERS_TEST_URL;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
assert.ok(baseURL && uri && /^partiers_test_[a-f0-9]+$/.test(dbName ?? ""), "Run with npm run test:isolated -- accessibility.");
for (const url of [baseURL, uri]) assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const client = new MongoClient(uri);
const browser = await chromium.launch();
const day = new Date();
day.setDate(1);
day.setMonth(day.getMonth() + 1);
const prefix = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`;
const contact = `keyboard-${new ObjectId()}@example.invalid`;

async function scan(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  assert.deepEqual(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), [], label);
  console.log(`PASS: accessibility scan — ${label}`);
  await page.bringToFront();
}

async function tabTo(page, target) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach ${await target.getAttribute("id") ?? await target.textContent()} with Tab.`);
}

try {
  await client.db(dbName).collection("blockedDates").insertOne({ date: `${prefix}-02`, reason: "Private test reason" });
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: "reduce", timezoneId: "America/Vancouver" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL);
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await tabTo(page, page.getByRole("button", { name: "Next", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.locator("form").getByRole("alert")).toContainText("choose an available date");
  await expect(page.locator("form").getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  await scan(page, "date validation error");
  await tabTo(page, page.getByRole("button", { name: "Next month" }));
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("grid").locator('button[tabindex="0"]')).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("grid").locator('button[tabindex="0"]')).toHaveText("3");
  await page.keyboard.press("PageDown");
  await expect(page.getByRole("grid").locator('button[tabindex="0"]')).toBeFocused();
  await page.keyboard.press("PageUp");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("grid").locator('button[aria-pressed="true"]')).toHaveText("3");
  await tabTo(page, page.getByRole("button", { name: "Next", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Time", exact: true })).toBeFocused();
  await expect(page.getByLabel("Start time")).toBeEnabled({ timeout: 20000 });
  await tabTo(page, page.getByLabel("Start time"));
  // Native dropdown popups are outside headless Chromium's event handling on
  // macOS; native type-ahead still exercises selection using only the keyboard.
  await page.keyboard.type("9:00");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Start time")).toHaveValue("09:00");
  await scan(page, "booking time");
  await tabTo(page, page.getByRole("button", { name: "Next", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Event details", exact: true })).toBeFocused();
  await tabTo(page, page.getByLabel("What kind of event?"));
  await page.keyboard.type("Birthday");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("What kind of event?")).toHaveValue("birthday");
  await tabTo(page, page.getByLabel("Address or general area"));
  await page.keyboard.type("Keyboard test park");
  await tabTo(page, page.getByRole("checkbox", { name: "Games", exact: true }));
  await page.keyboard.press("Space");
  await scan(page, "booking event details and checked activity");
  await tabTo(page, page.getByRole("button", { name: "Next", exact: true }));
  await page.keyboard.press("Enter");
  for (const [label, value] of [["Your name", "Keyboard parent"], ["Phone or email", contact], ["Child's name", "Sample child"], ["Child's age", "8"], ["Number of children", "6"]]) {
    await tabTo(page, page.getByLabel(label, { exact: true }));
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(value);
  }
  await scan(page, "booking family details");
  await tabTo(page, page.getByRole("button", { name: "Next", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Review & send", exact: true })).toBeFocused();
  await scan(page, "booking review");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Long contact fits on the review screen");
  await tabTo(page, page.getByRole("button", { name: "Send booking request" }));
  const saved = page.waitForResponse((response) => response.url().endsWith("/api/bookings") && response.request().method() === "POST");
  await page.keyboard.press("Enter");
  assert.equal((await saved).status(), 201);
  await expect(page.getByRole("heading", { name: "Request sent!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request sent!" })).toBeFocused();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Long contact fits on the confirmation screen");
  const booking = await client.db(dbName).collection("bookings").findOne({ contact });
  assert.equal(booking.date, `${prefix}-03`);
  assert.deepEqual(booking.activities, ["games"]);
  await scan(page, "booking confirmation");
  await page.screenshot({ path: "/tmp/partiers-keyboard-booking.png" });
  await page.goto(`${baseURL}/reviews`);
  await page.waitForLoadState("networkidle");
  await tabTo(page, page.getByLabel("Your name", { exact: true }));
  await page.keyboard.type("Keyboard reviewer");
  await tabTo(page, page.getByRole("radio", { name: "5 stars" }));
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "4 stars" })).toBeFocused();
  await tabTo(page, page.getByLabel("Comment"));
  await page.keyboard.type("A temporary keyboard accessibility check.");
  await expect(page.getByRole("button", { name: "Submit review" })).toBeEnabled({ timeout: 15000 });
  await tabTo(page, page.getByRole("button", { name: "Submit review" }));
  await page.route("**/api/reviews", (route) => route.fulfill({ status: 500, json: { error: "Please try again." } }));
  await page.keyboard.press("Enter");
  await expect(page.locator("#leave-review").getByRole("alert")).toHaveText("Please try again.");
  await scan(page, "review error and star input");
  await page.unroute("**/api/reviews");
  await tabTo(page, page.getByRole("button", { name: "Submit review" }));
  const reviewed = page.waitForResponse((response) => response.url().endsWith("/api/reviews") && response.request().method() === "POST");
  await page.keyboard.press("Enter");
  assert.equal((await reviewed).status(), 201);
  await expect(page.getByRole("status").filter({ hasText: "Thanks for the review!" })).toBeFocused();
  assert.equal((await client.db(dbName).collection("reviews").findOne({ name: "Keyboard reviewer" })).rating, 4);
  await scan(page, "review submitted");
  // Native modal and its navigation labels also participate in the audit.
  await tabTo(page, page.getByRole("button", { name: "Open menu" }));
  await page.keyboard.press("Enter");
  await scan(page, "mobile menu open");
  await page.keyboard.press("Escape");
  for (const path of ["/", "/reviews", "/about", "/login", "/signup", "/admin/login", "/missing-accessibility-check"]) {
    await page.goto(`${baseURL}${path}`);
    await page.waitForLoadState("networkidle");
    await scan(page, path);
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log("PASS: entire booking and review by keyboard, blocked-date skipping, calendar focus across months, error announcements, focus recovery and mobile WCAG A/AA scans. Screen-reader and physical-device testing remain manual.");
} finally {
  await browser.close();
  await client.db(dbName).collection("bookings").deleteMany({ contact });
  await client.db(dbName).collection("reviews").deleteMany({ name: "Keyboard reviewer" });
  await client.db(dbName).collection("blockedDates").deleteOne({ date: `${prefix}-02` });
  await client.close();
}
