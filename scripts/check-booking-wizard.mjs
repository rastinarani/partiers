import assert from "node:assert/strict";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
const baseURL = process.env.PARTIERS_TEST_URL ?? "http://localhost:3000";
if (
  !uri ||
  !/^partiers_test_[a-f0-9]+$/.test(process.env.MONGODB_DB ?? "") ||
  !["localhost", "127.0.0.1"].includes(new URL(uri).hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
)
  throw new Error("Run with npm run test:isolated -- booking (temporary local database required).");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
const fixtureId = new ObjectId();
const contact = `wizard-${fixtureId}@example.invalid`;
const day = new Date();
day.setDate(1);
day.setMonth(day.getMonth() + 1);
const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-01`;
let browser;
try {
  const db = client.db(process.env.MONGODB_DB || "partiers");
  await db.collection("bookings").insertOne({
    _id: fixtureId,
    date,
    time: "10:00",
    durationMinutes: 120,
    status: "confirmed",
    parentName: "Temporary availability fixture",
    contact,
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    timezoneId: "America/Vancouver",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "choose an available date",
  );
  await page.getByRole("button", { name: "Next month" }).click();
  await page
    .locator('[data-motion="entrance"].grid button:not([disabled])')
    .filter({ hasText: /^1$/ })
    .click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Time", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Start time")).toBeEnabled();
  assert.equal(
    await page
      .getByLabel("Start time")
      .locator('option[value="10:00"]')
      .isDisabled(),
    true,
  );
  await page.getByLabel("Start time").selectOption("12:00");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "kind of event",
  );
  await page.getByLabel("What kind of event?").selectOption("birthday");
  await page.getByLabel("Address or general area").fill("Temporary test park");
  await page.getByText("Games", { exact: true }).click();
  await page
    .getByLabel("Anything we should know?", { exact: false })
    .fill("Test party theme");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "your name",
  );
  await page.getByLabel("Your name", { exact: true }).fill("Wizard check");
  await page.getByLabel("Phone or email").fill(contact);
  await page.getByLabel("Child's name", { exact: true }).fill("Sample child");
  await page.getByLabel("Child's age", { exact: true }).fill("18");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "0 to 17",
  );
  await page.getByLabel("Child's age", { exact: true }).fill("0");
  await page.getByLabel("Number of children").fill("50");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review & send", exact: true }),
  ).toBeVisible();
  await expect(page.locator("dl")).toContainText(contact);
  await expect(page.locator("dl")).toContainText("Test party theme");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review & send", exact: true }),
  ).toBeVisible();
  await expect(page.locator("dl")).toContainText(
    "Sample child (0) · 50 children",
  );
  await page.getByRole("button", { name: "Edit your info" }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "Wizard check",
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Address or general area")).toHaveValue(
    "Temporary test park",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // A failed request must keep the complete draft and allow retrying.
  await page.route("**/api/bookings", (route) =>
    route.fulfill({ status: 500, json: { error: "Temporary test failure" } }),
  );
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Temporary test failure",
  );
  await expect(page.locator("dl")).toContainText(contact);
  await page.unroute("**/api/bookings");
  // If availability changes at send time, the form returns to Time with details intact.
  await page.route("**/api/bookings", (route) =>
    route.fulfill({
      status: 409,
      json: { error: "That time was just taken." },
    }),
  );
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(
    page.getByRole("heading", { name: "Time", exact: true }),
  ).toBeVisible();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "just taken",
  );
  await page.unroute("**/api/bookings");
  await expect(page.getByLabel("Start time")).toBeEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/bookings") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send booking request" }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const { id, referenceCode } = await response.json();
  await expect(
    page.getByRole("heading", { name: "Request sent!" }),
  ).toBeVisible();
  await expect(page.getByText(referenceCode, { exact: true })).toBeVisible();
  await page.waitForFunction(() => {
    const canvas = document.querySelector("[data-booking-celebration]");
    if (!canvas) return false;
    return canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height)
      .data.some((value, index) => index % 4 === 3 && value > 0);
  });
  const stored = await db
    .collection("bookings")
    .findOne({ _id: new ObjectId(id) });
  assert.equal(stored.status, "pending");
  assert.equal(stored.date, date);
  assert.equal(stored.childAge, 0);
  assert.equal(stored.numberOfChildren, 50);
  assert.equal(stored.notes, "Test party theme");
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("partiers-booking-draft:v1:guest"),
    ),
    null,
  );
  await page.getByRole("button", { name: "Submit another request" }).click();
  await expect(
    page.getByRole("heading", { name: "Date", exact: true }),
  ).toBeVisible();
  // Clear-draft cancellation and confirmation.
  await page.getByRole("button", { name: "Next month" }).click();
  await page
    .locator('[data-motion="entrance"].grid button:not([disabled])')
    .filter({ hasText: /^1$/ })
    .click();
  await page.getByRole("button", { name: "Clear draft", exact: true }).click();
  await page.getByRole("button", { name: "Keep draft" }).click();
  assert.notEqual(
    await page.evaluate(() =>
      sessionStorage.getItem("partiers-booking-draft:v1:guest"),
    ),
    null,
  );
  await page.getByRole("button", { name: "Clear draft", exact: true }).click();
  await page.getByRole("button", { name: "Yes, clear draft" }).click();
  assert.equal(
    await page.evaluate(() =>
      sessionStorage.getItem("partiers-booking-draft:v1:guest"),
    ),
    null,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  await context.close();
  const reduced = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 360, height: 800 },
  });
  const edge = await reduced.newPage();
  await edge.addInitScript(() => {
    window.motionSeen = false;
    function sample() {
      for (const el of document.querySelectorAll("[data-motion]")) {
        const transform = getComputedStyle(el).transform;
        if (transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)")
          window.motionSeen = true;
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await edge.route("**/api/availability?*", (route) =>
    route.fulfill({ status: 500, json: { error: "Temporary lookup failure" } }),
  );
  await edge.goto(baseURL);
  await edge.getByRole("button", { name: "Next month" }).click();
  await edge
    .locator('[data-motion="entrance"].grid button:not([disabled])')
    .filter({ hasText: /^1$/ })
    .click();
  await edge.getByRole("button", { name: "Next", exact: true }).click();
  await expect(edge.getByLabel("Start time")).toBeDisabled();
  await expect(
    edge.getByRole("button", { name: "Retry availability" }),
  ).toBeVisible();
  await edge.unroute("**/api/availability?*");
  await edge.route("**/api/availability?*", (route) =>
    route.fulfill({ json: { taken: [], blocked: true } }),
  );
  await edge.getByRole("button", { name: "Retry availability" }).click();
  await expect(
    edge.getByText("This date is unavailable. Go back and pick another day."),
  ).toBeVisible();
  await expect(edge.getByLabel("Start time")).toBeDisabled();
  await edge.getByRole("button", { name: "Next", exact: true }).click();
  await expect(edge.locator("form").getByRole("alert")).toContainText(
    "not available",
  );
  assert.equal(
    await edge.evaluate(() => window.motionSeen),
    false,
    "Wizard steps stay still with reduced motion",
  );
  await edge.unroute("**/api/availability?*");
  await edge.evaluate(
    ({ date, contact }) =>
      sessionStorage.setItem(
        "partiers-booking-draft:v1:guest",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          step: 4,
          values: {
            date,
            time: "12:00",
            durationMinutes: 120,
            eventType: "birthday",
            location: "Test park",
            activities: [],
            notes: "",
            parentName: "Sample",
            contact,
            childName: "Sample",
            childAge: "6",
            numberOfChildren: "1",
          },
        }),
      ),
    { date, contact },
  );
  await edge.route("**/api/bookings", (route) =>
    route.fulfill({ status: 201, json: { referenceCode: "PT-TEST" } }),
  );
  await edge.reload();
  await edge.getByRole("button", { name: "Send booking request" }).click();
  await expect(
    edge.getByRole("heading", { name: "Request sent!" }),
  ).toBeVisible();
  assert.equal(
    await edge.locator("[data-booking-celebration]").count(),
    0,
    "No confetti with reduced motion",
  );
  await reduced.close();
  console.log(
    "PASS: five-step guest booking, validation, overlap slots, Back/Edit, refresh persistence, send failure/conflict recovery, real save/reference, draft cleanup, failed/blocked availability, reduced-motion steps/confetti, celebration pixels and 360px layout.",
  );
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      await client
        .db(process.env.MONGODB_DB || "partiers")
        .collection("bookings")
        .deleteMany({ $or: [{ _id: fixtureId }, { contact }] });
    } finally {
      await client.close();
    }
  }
}
