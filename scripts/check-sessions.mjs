import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";

const baseURL = process.env.PARTIERS_TEST_URL;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
assert.ok(baseURL && uri && /^partiers_test_[a-f0-9]+$/.test(dbName ?? ""), "Run with npm run test:isolated -- sessions.");
for (const url of [baseURL, uri]) assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const client = new MongoClient(uri);
const db = client.db(dbName);
const users = db.collection("users");
const email = `session-${randomBytes(8).toString("hex")}@example.invalid`;
const password = randomBytes(24).toString("hex");
const newPassword = randomBytes(24).toString("hex");
const cookieName = "partiers_user_session";
let browser;
let context;
let userId;
const errors = [];

async function send(path, { method = "POST", token, body, cookie = cookieName } = {}) {
  return fetch(`${baseURL}${path}`, {
    method, redirect: "manual",
    headers: { "Content-Type": "application/json", ...(token ? { Cookie: `${cookie}=${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function issuedToken(response) {
  const header = response.headers.get("set-cookie");
  assert.ok(header?.includes("HttpOnly") && header.includes("SameSite=lax") && header.includes("Path=/") && header.includes("Max-Age=2592000"));
  if (process.env.NODE_ENV === "production") assert.ok(header.includes("Secure"));
  const token = header.match(/partiers_user_session=([^;]+)/)?.[1];
  assert.ok(token);
  return token;
}
function sign(claims, role = "user") {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const key = createHmac("sha256", process.env.ADMIN_SESSION_SECRET).update(`partiers:session:v1:${role}`).digest();
  return `${payload}.${createHmac("sha256", key).update(payload).digest("hex")}`;
}
async function protectedStatus(token, expected) {
  const response = await send("/api/account/profile", { method: "PATCH", token, body: { name: "Session check", phone: "" } });
  assert.equal(response.status, expected);
}
async function login(proof, pass = password) {
  const response = await send("/api/auth/login", { body: { email, password: pass, website: "", formToken: proof } });
  assert.equal(response.status, 200);
  return issuedToken(response);
}
async function showAccount(token) {
  await context.clearCookies();
  await context.addCookies([{ name: cookieName, value: token, url: baseURL }]);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/account`);
  await expect(page.getByRole("heading", { name: "Hi, Session check!" })).toBeVisible();
  return page;
}
try {
  const adminCount = await db.collection("admins").countDocuments();
  assert.equal(adminCount, 0, "The isolated database must have no admins; this check never creates them.");
  const signupProof = await (await fetch(`${baseURL}/api/form-token?form=signup`)).json();
  const loginProof = await (await fetch(`${baseURL}/api/form-token?form=login`)).json();
  await delay(2200);
  const signup = await send("/api/auth/signup", { body: { name: "Session check", email, password, website: "", formToken: signupProof.token } });
  assert.equal(signup.status, 200);
  const signupBody = await signup.json();
  userId = signupBody.user.id;
  assert.deepEqual(Object.keys(signupBody), ["user"], "No internal revision or token is exposed in JSON");
  const original = issuedToken(signup);
  const second = await login(loginProof.token);
  await protectedStatus(original, 200);
  await protectedStatus(second, 200);
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 900, height: 800 } });
  let page = await showAccount(original);
  // A failed logout must leave the session usable and offer a retry.
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 503, json: { error: "Temporary test failure" } }));
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "couldn’t log you out" })).toBeVisible();
  await protectedStatus(original, 200);
  await page.unroute("**/api/auth/logout");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL(`${baseURL}/login`);
  await protectedStatus(original, 401);
  await protectedStatus(second, 401);
  const afterLogout = await login(loginProof.token);
  assert.equal((await send("/api/auth/logout", { token: original })).status, 200);
  await protectedStatus(afterLogout, 200); // Old logout replay cannot revoke a new login.
  await page.close();
  page = await showAccount(afterLogout);
  const beforePasswordChange = await login(loginProof.token);
  await page.getByLabel("Current password", { exact: true }).fill("deliberately-wrong-test-password");
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("New password again", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "current password isn't right" })).toBeVisible();
  await protectedStatus(beforePasswordChange, 200);
  await page.getByLabel("Current password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await page.waitForURL(/\/login\?next=.*passwordChanged=1/);
  await expect(page.getByRole("status").filter({ hasText: "log in again with your new password" })).toBeVisible();
  await protectedStatus(afterLogout, 401);
  await protectedStatus(beforePasswordChange, 401);
  const oldLogin = await send("/api/auth/login", { body: { email, password, website: "", formToken: loginProof.token } });
  assert.equal(oldLogin.status, 401);
  const fresh = await login(loginProof.token, newPassword);
  await protectedStatus(fresh, 200);
  const claims = JSON.parse(Buffer.from(fresh.split(".")[0], "base64url").toString());
  const expired = sign({ ...claims, expiresAt: Math.floor(Date.now() / 1000) - 1 });
  const legacy = `${userId}.${createHmac("sha256", process.env.ADMIN_SESSION_SECRET).update(userId).digest("hex")}`;
  const tampered = `${fresh}.extra`;
  for (const invalid of [original, expired, legacy, tampered]) {
    await protectedStatus(invalid, 401);
    await context.clearCookies();
    await context.addCookies([{ name: cookieName, value: invalid, url: baseURL }]);
    await page.goto(`${baseURL}/account`);
    await page.waitForURL(/\/login\?next=/);
    await page.goto(`${baseURL}/`);
    await expect(page.getByText("to keep track of your bookings.").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "My account: Session check" })).toHaveCount(0);
  }
  // Every real admin surface rejects customer cookies and signed unknown-admin sessions.
  const adminToken = sign({ ...claims, role: "admin", id: new ObjectId().toString() }, "admin");
  for (const token of [fresh, adminToken]) {
    for (const [path, method] of [["/api/bookings", "PATCH"], ["/api/reviews", "PATCH"], ["/api/admin/blocked-dates", "POST"], ["/api/admin/blocked-dates", "DELETE"], [`/api/admin/bookings/${userId}/notes`, "PATCH"], [`/api/admin/bookings/${userId}`, "DELETE"], [`/api/admin/reviews/${userId}`, "DELETE"]]) {
      assert.equal((await send(path, { method, token, cookie: "partiers_admin_session", body: {} })).status, 401);
    }
    await context.clearCookies();
    await context.addCookies([{ name: "partiers_admin_session", value: token, url: baseURL }]);
    for (const path of ["/admin", "/admin/calendar", `/admin/bookings/${userId}`]) {
      await page.goto(`${baseURL}${path}`);
      await page.waitForURL(`${baseURL}/admin/login`);
    }
  }
  // Password hash changes invalidate sessions even if the version field was not rotated.
  await users.updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash: randomBytes(64).toString("hex") } });
  await protectedStatus(fresh, 401);
  await users.deleteOne({ _id: new ObjectId(userId) });
  await protectedStatus(fresh, 401);
  assert.equal(await db.collection("admins").countDocuments(), adminCount);
  assert.deepEqual(errors, []);
  console.log("PASS: isolated customer signup/login, all-session logout and password invalidation, copied-cookie replay, failed logout retry, wrong-password recovery, re-login, signed expiry/legacy/tampering rejection, guest rendering, and every admin page/API rejects customer or unknown-admin cookies. No admins created.");
} finally {
  await browser?.close();
  await users.deleteMany({ email });
  await db.collection("rateLimits").deleteMany({});
  await client.close();
}
