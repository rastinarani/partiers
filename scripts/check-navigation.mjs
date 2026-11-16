import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";

const baseURL = process.env.PARTIERS_TEST_URL;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
assert.ok(baseURL && uri && /^partiers_test_[a-f0-9]+$/.test(dbName ?? ""), "Run with npm run test:isolated -- navigation.");
for (const url of [baseURL, uri]) assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const client = new MongoClient(uri);
const browser = await chromium.launch();
const id = new ObjectId();
const name = "Alexandria".repeat(12);
try {
  // A password-less customer fixture exercises account links without creating credentials.
  await client.db(dbName).collection("users").insertOne({ _id: id, name, email: "navigation@example.invalid" });
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/about`);
    await page.waitForLoadState("networkidle");
    const opener = page.getByRole("button", { name: "Open menu" });
    const dialog = page.getByRole("dialog", { name: "Explore Partiers" });
    await expect(opener).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation", exact: true })).toBeHidden();
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link", { name: "Log in" })).toBeFocused();
    for (let index = 0; index < 7; index++) {
      await page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true, "Focus stays in the menu");
    }
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await expect(dialog.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login?next=%2Fabout");
    if (reducedMotion === "no-preference") await page.screenshot({ path: "/tmp/partiers-mobile-menu.png" });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(opener).toHaveAttribute("aria-expanded", "false");
    await opener.click();
    await dialog.getByRole("link", { name: "Reviews", exact: true }).click();
    await page.waitForURL(`${baseURL}/reviews`);
    await expect(dialog).toBeHidden();
    await opener.click();
    await page.mouse.click(3, 400);
    await expect(dialog).toBeHidden();
    await opener.click();
    await page.setViewportSize({ width: 900, height: 800 });
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Main navigation", exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    const key = (purpose) => createHmac("sha256", process.env.ADMIN_SESSION_SECRET).update(`partiers:session:v1:${purpose}`).digest();
    const revision = createHmac("sha256", key("revision")).update(JSON.stringify(["", ""])).digest("hex");
    const payload = Buffer.from(JSON.stringify({ id: id.toString(), role: "user", revision, expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 })).toString("base64url");
    const signature = createHmac("sha256", key("user")).update(payload).digest("hex");
    await context.addCookies([{ name: "partiers_user_session", value: `${payload}.${signature}`, url: baseURL }]);
    await page.reload();
    await expect(page.getByRole("link", { name: `My account: ${name}` }).first()).toHaveAttribute("href", "/account");
    for (const width of [640, 360]) {
      await page.setViewportSize({ width, height: 800 });
      if (width === 360) {
        await opener.click();
        await expect(dialog.getByRole("link", { name: `My account: ${name}` })).toBeVisible();
        await page.waitForTimeout(300);
        assert.equal(await dialog.evaluate((element) => element.scrollWidth <= innerWidth), true);
        if (reducedMotion === "reduce")
          assert.equal(await page.locator('[data-motion="drawer"]').evaluate((element) => getComputedStyle(element).transform), "none");
        await page.keyboard.press("Escape");
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "No horizontal overflow");
    }
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Serving Metro Vancouver");
    await expect(footer.getByRole("link", { name: "nikkitheawsome@gmail.com" })).toHaveAttribute("href", "mailto:nikkitheawsome@gmail.com");
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("PASS: 360px/desktop navigation, long account names, login return path, focus trap/restore, Escape, outside click, route/resize close, footer and reduced motion.");
} finally {
  await browser.close();
  await client.db(dbName).collection("users").deleteOne({ _id: id });
  await client.close();
}
