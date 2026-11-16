import assert from "node:assert/strict";
import { chromium } from "playwright";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri || !["localhost", "127.0.0.1"].includes(new URL(uri).hostname)) {
  throw new Error(
    "This check only uses a local MongoDB database. Start the local site and load its local environment first.",
  );
}
const baseURL = process.env.PARTIERS_TEST_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
  throw new Error("Local website required.");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
const ids = Array.from({ length: 5 }, () => new ObjectId());
let browser;
try {
  const db = client.db(process.env.MONGODB_DB || "partiers");
  await db.collection("reviews").insertMany(
    ids.map((_id, index) => ({
      _id,
      name: `Motion check ${_id}`,
      rating: 5,
      comment: `Temporary review ${index + 1}`,
      status: index === 3 ? "pending" : "approved",
      createdAt: new Date().toISOString(),
      ...(index === 4 ? { deletedAt: new Date() } : {}),
    })),
  );
  browser = await chromium.launch({ headless: true });
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      reducedMotion,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
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
    await page.goto(`${baseURL}/about`);
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.evaluate(() => window.motionSeen),
      reducedMotion === "no-preference",
      "About entrance follows the motion preference",
    );
    const card = page.locator('[data-motion="hover"]').first();
    await card.hover();
    await page.waitForTimeout(250);
    const lifted = await card.evaluate(
      (el) => new DOMMatrix(getComputedStyle(el).transform).m42 < -2,
    );
    assert.equal(
      lifted,
      reducedMotion === "no-preference",
      "About hover follows the motion preference",
    );
    await page.goto(`${baseURL}/reviews`);
    await page.waitForLoadState("networkidle");
    for (const id of ids.slice(0, 3))
      assert.equal(
        await page.getByText(`Motion check ${id}`, { exact: true }).isVisible(),
        true,
      );
    assert.equal(
      await page.evaluate(() => window.motionSeen),
      reducedMotion === "no-preference",
      "Reviews animate only when permitted",
    );
    await page.goto(baseURL);
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Activities for your kind of get-together",
        })
        .isVisible(),
      true,
    );
    for (const id of ids.slice(0, 3))
      assert.equal(
        await page.getByText(`Motion check ${id}`, { exact: true }).isVisible(),
        true,
      );
    for (const id of ids.slice(3))
      assert.equal(
        await page.getByText(`Motion check ${id}`, { exact: true }).count(),
        0,
      );
    const question = page.getByText("Do I need to pay when I book?", {
      exact: true,
    });
    const faq = page
      .locator("details")
      .filter({ hasText: "Do I need to pay when I book?" });
    await question.focus();
    await page.keyboard.press("Enter");
    assert.equal(await faq.getAttribute("open"), "");
    await page.keyboard.press("Enter");
    assert.equal(await faq.getAttribute("open"), null);
    await page
      .getByRole("link", { name: "Plan your party", exact: true })
      .click();
    await page.waitForURL((url) => url.hash === "#booking");
    await page.getByRole("button", { name: "Next month" }).click();
    const day = page
      .locator('[data-motion="entrance"].grid button:not([disabled])')
      .first();
    await day.click();
    assert.equal(
      await day.getAttribute("aria-pressed"),
      "true",
      "Calendar remains immediately usable",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "No horizontal overflow on a phone",
    );
    if (reducedMotion === "reduce")
      assert.equal(
        await page.evaluate(() => window.motionSeen),
        false,
        "No sliding in reduced mode",
      );
    assert.deepEqual(errors, [], "No browser errors");
    await context.close();
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto(`${baseURL}/about`);
  assert.equal(
    await page.getByRole("heading", { name: "About Us" }).isVisible(),
    true,
  );
  assert.equal(
    await page
      .locator('[data-motion="entrance"]')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  await noJs.close();
  console.log(
    "PASS: public entrances, review stagger, About hover, calendar use, reduced motion, phone layout and no-JavaScript content.",
  );
} finally {
  try {
    await browser?.close();
  } finally {
    try {
      await client
        .db(process.env.MONGODB_DB || "partiers")
        .collection("reviews")
        .deleteMany({ _id: { $in: ids } });
    } finally {
      await client.close();
    }
  }
}
