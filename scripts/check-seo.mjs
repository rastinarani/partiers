import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.PARTIERS_TEST_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
  throw new Error("Local website required.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [path, title] of [
    ["/", "Partiers | Kids’ party activities"],
    ["/reviews", "Family reviews | Partiers"],
    ["/about", "Meet Nikki and Manna | Partiers"],
  ]) {
    await page.goto(`${baseURL}${path}`);
    await page.waitForLoadState("networkidle");
    assert.equal(await page.title(), title);
    assert.equal(
      new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).toString(),
      new URL(path, "https://partiers.vercel.app").toString(),
    );
    assert.equal(
      await page
        .locator('meta[property="og:image"]')
        .first()
        .getAttribute("content")
        .then((value) => value.includes("/opengraph-image")),
      true,
    );
    assert.equal(
      await page.locator('meta[name="twitter:card"]').getAttribute("content"),
      "summary_large_image",
    );
    assert.equal(
      await page
        .locator('meta[name="description"]')
        .getAttribute("content")
        .then((value) => value.length > 30),
      true,
    );
  }
  for (const path of ["/login", "/signup", "/admin/login"]) {
    await page.goto(`${baseURL}${path}`);
    await page.waitForLoadState("networkidle");
    assert.match(
      await page.locator('meta[name="robots"]').getAttribute("content"),
      /noindex/,
    );
  }
  const robots = await (await page.request.get(`${baseURL}/robots.txt`)).text();
  for (const path of ["/admin", "/account", "/api/", "/login", "/signup"])
    assert.ok(robots.includes(`Disallow: ${path}`));
  const xml = await (await page.request.get(`${baseURL}/sitemap.xml`)).text();
  assert.equal((xml.match(/<loc>/g) ?? []).length, 3);
  assert.ok(
    !xml.includes("/admin") &&
      !xml.includes("/account") &&
      !xml.includes("/login"),
  );
  for (const [path, width, height] of [
    ["/opengraph-image", 1200, 630],
    ["/icon", 32, 32],
    ["/apple-icon", 180, 180],
  ]) {
    const response = await page.request.get(`${baseURL}${path}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /image\/png/);
    const bytes = await response.body();
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
    if (path === "/opengraph-image")
      await writeFile("/tmp/partiers-share-preview.png", bytes);
  }
  console.log(
    "PASS: public titles/descriptions/canonicals/share tags, private noindex, public-only sitemap, robots exclusions and generated image/icon dimensions. Live chat-app previews require the later production checks.",
  );
} finally {
  await browser.close();
}
