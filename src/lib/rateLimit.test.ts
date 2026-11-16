import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { MongoServerError } from "mongodb";

const store = vi.hoisted(() => ({ createIndex: vi.fn(), findOneAndUpdate: vi.fn() }));
vi.mock("./mongodb", () => ({ getDb: async () => ({ collection: () => store }) }));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_SESSION_SECRET", "unit-test-signing-secret");
  vi.stubEnv("VERCEL", "");
  store.createIndex.mockResolvedValue("expiresAt_1");
  store.findOneAndUpdate.mockResolvedValue({ count: 1 });
});
afterEach(() => vi.unstubAllEnvs());
const request = (ip = "203.0.113.1") => new Request("http://localhost/api", { headers: { "x-vercel-forwarded-for": ip, "x-forwarded-for": ip } });

it("ignores untrusted headers on direct servers and canonicalizes trusted IPv6", async () => {
  const { submissionIdentity } = await import("./rateLimit");
  expect(submissionIdentity(request())).toBe("direct-client");
  expect(submissionIdentity(request("198.51.100.9"))).toBe("direct-client");
  vi.stubEnv("VERCEL", "1");
  expect(submissionIdentity(request())).toBe("203.0.113.1");
  expect(submissionIdentity(request("2001:0DB8:0000::1"))).toBe("2001:db8::1");
  expect(submissionIdentity(request("::ffff:203.0.113.1"))).toBe("203.0.113.1");
  expect(submissionIdentity(request("forged, 203.0.113.1"))).toBe("unknown-client");
  expect(submissionIdentity(new Request("http://localhost"))).toBe("unknown-client");
});

it("hashes IPs, atomically increments an expiring bucket and denies the first excess attempt", async () => {
  const { consumeSubmissionLimit } = await import("./rateLimit");
  vi.stubEnv("VERCEL", "1");
  store.findOneAndUpdate.mockResolvedValueOnce({ count: 10 }).mockResolvedValueOnce({ count: 11 });
  expect(await consumeSubmissionLimit(request(), "login", 1_000_000)).toEqual({ allowed: true, retryAfterSeconds: 800 });
  expect(await consumeSubmissionLimit(request(), "login", 1_000_000)).toEqual({ allowed: false, retryAfterSeconds: 800 });
  const [filter, update, options] = store.findOneAndUpdate.mock.calls[0];
  expect(filter._id).toMatch(/^login:[a-f0-9]{64}:900000$/);
  expect(JSON.stringify([filter, update])).not.toContain("203.0.113.1");
  expect(update).toEqual({ $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(1_800_000) } });
  expect(options).toMatchObject({ upsert: true, returnDocument: "after" });
  expect(store.createIndex).toHaveBeenCalledExactlyOnceWith({ expiresAt: 1 }, { expireAfterSeconds: 0 });
});

it("separates actions and IPs and starts fresh at the exact window boundary without waiting for TTL cleanup", async () => {
  const { consumeSubmissionLimit } = await import("./rateLimit");
  vi.stubEnv("VERCEL", "1");
  await consumeSubmissionLimit(request(), "login", 899_999);
  await consumeSubmissionLimit(request(), "login", 900_000);
  await consumeSubmissionLimit(request("203.0.113.2"), "login", 900_000);
  await consumeSubmissionLimit(request(), "booking", 900_000);
  const ids = store.findOneAndUpdate.mock.calls.map(([filter]) => filter._id);
  expect(new Set(ids).size).toBe(4);
});

it("retries the increment after a concurrent first-insert collision", async () => {
  const { consumeSubmissionLimit } = await import("./rateLimit");
  store.findOneAndUpdate.mockRejectedValueOnce(new MongoServerError({ code: 11000, message: "duplicate key" })).mockResolvedValueOnce({ count: 2 });
  expect((await consumeSubmissionLimit(request(), "login")).allowed).toBe(true);
  expect(store.findOneAndUpdate.mock.calls[1][2]).not.toHaveProperty("upsert");
});

it("returns friendly, non-cacheable 429 responses with Retry-After", async () => {
  const { rateLimitResponse } = await import("./rateLimit");
  store.findOneAndUpdate.mockResolvedValue({ count: 100 });
  const result = await rateLimitResponse(request(), "review");
  expect(result?.status).toBe(429);
  expect(result?.headers.get("Cache-Control")).toBe("no-store");
  expect(Number(result?.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(await result?.json()).toMatchObject({ error: expect.stringContaining("try again") });
});

it("fails closed with a generic retry response and recovers after index creation fails", async () => {
  const { rateLimitResponse } = await import("./rateLimit");
  store.createIndex.mockRejectedValueOnce(new Error("private database details"));
  const result = await rateLimitResponse(request(), "signup");
  expect(result?.status).toBe(503);
  expect(await result?.text()).not.toContain("private database details");
  expect(store.findOneAndUpdate).not.toHaveBeenCalled();
  expect(await rateLimitResponse(request(), "signup")).toBeNull();
  expect(store.createIndex).toHaveBeenCalledTimes(2);
});
