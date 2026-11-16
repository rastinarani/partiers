import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { MongoServerError } from "mongodb";
import { getDb } from "./mongodb";

export const SUBMISSION_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  booking: { limit: 10, windowMs: 60 * 60 * 1000 },
  review: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
export type SubmissionAction = keyof typeof SUBMISSION_LIMITS;

interface Counter {
  _id: string;
  count: number;
  expiresAt: Date;
}
let indexReady: Promise<unknown> | undefined;

export function submissionIdentity(request: Request): string {
  // Only Vercel's edge may supply a trusted client IP. A direct server must
  // ignore spoofable forwarding headers and conservatively share one bucket.
  if (process.env.VERCEL !== "1") return "direct-client";
  const value = (request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for"))?.trim();
  if (!value || !isIP(value)) return "unknown-client";
  if (isIP(value) === 4) return value;
  if (value.toLowerCase().startsWith("::ffff:") && isIP(value.slice(7)) === 4)
    return value.slice(7);
  try { return new URL(`http://[${value}]/`).hostname.slice(1, -1); }
  catch { return "unknown-client"; }
}

export async function consumeSubmissionLimit(request: Request, action: SubmissionAction, now = Date.now()) {
  const { limit, windowMs } = SUBMISSION_LIMITS[action];
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Session secret required for submission protection.");
  const identity = createHmac("sha256", secret).update(submissionIdentity(request)).digest("hex");
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs);
  const db = await getDb();
  const collection = db.collection<Counter>("rateLimits");
  indexReady ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
    indexReady = undefined;
    throw error;
  });
  await indexReady;
  const filter = { _id: `${action}:${identity}:${windowStart}` };
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } };
  let counter;
  try {
    counter = await collection.findOneAndUpdate(filter, update, {
      upsert: true, returnDocument: "after", includeResultMetadata: false,
    });
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    // Concurrent first requests may both try to insert the same unique bucket.
    counter = await collection.findOneAndUpdate(filter, update, {
      returnDocument: "after", includeResultMetadata: false,
    });
  }
  if (!counter) throw new Error("Submission counter unavailable.");
  return { allowed: counter.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}

export async function rateLimitResponse(request: Request, action: SubmissionAction): Promise<Response | null> {
  try {
    const result = await consumeSubmissionLimit(request, action);
    if (result.allowed) return null;
    const minutes = Math.ceil(result.retryAfterSeconds / 60);
    return Response.json({ error: `Too many attempts. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.` }, {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  } catch {
    // Do not bypass protection or disclose database/connection details on failure.
    return Response.json({ error: "We couldn’t check your request right now. Please try again shortly." }, {
      status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    });
  }
}
