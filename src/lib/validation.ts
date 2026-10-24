import { isActivity, isEventType } from "./eventOptions";
import { endsByMidnight, isDuration } from "./schedule";

// Shared server-side validation for the public booking and review forms.
// Keep this defensive: these are the only two write paths that accept
// unauthenticated input, and everything here ends up in MongoDB.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s().-]{1,30}$/;

export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

export function validateBookingInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const parentName = cleanString(b.parentName, 100);
  const contact = cleanString(b.contact, 150);
  const childName = cleanString(b.childName, 100);
  const date = cleanString(b.date, 10);
  const time = cleanString(b.time, 5);
  const notesRaw = b.notes === undefined || b.notes === null ? "" : b.notes;
  const notes = cleanString(notesRaw, 1000) ?? (notesRaw === "" ? "" : null);

  const childAge = Number(b.childAge);
  const numberOfChildren = Number(b.numberOfChildren);
  const durationMinutes = Number(b.durationMinutes);
  const eventType = b.eventType;
  const location = cleanString(b.location, 200);
  const activitiesRaw = b.activities === undefined || b.activities === null ? [] : b.activities;

  if (!parentName || !contact || !childName || !date || !time) return null;
  if (notes === null) return null;
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  if (!Number.isInteger(childAge) || childAge < 0 || childAge > 17) return null;
  if (!Number.isInteger(numberOfChildren) || numberOfChildren < 1 || numberOfChildren > 50) {
    return null;
  }
  if (!isDuration(durationMinutes) || !endsByMidnight(time, durationMinutes)) return null;
  if (!isEventType(eventType) || !location) return null;
  if (!Array.isArray(activitiesRaw) || !activitiesRaw.every(isActivity)) return null;
  const activities = [...new Set(activitiesRaw)];

  return {
    parentName,
    contact,
    childName,
    childAge,
    numberOfChildren,
    date,
    time,
    durationMinutes,
    eventType,
    location,
    activities,
    notes,
  };
}

export function validateReviewInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const name = cleanString(b.name, 100);
  const comment = cleanString(b.comment, 1000);
  const rating = Number(b.rating);

  if (!name || !comment) return null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;

  return { name, comment, rating };
}

export function validateSignupInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const name = cleanString(b.name, 100);
  const email = cleanString(b.email, 200);
  const password = typeof b.password === "string" ? b.password : null;

  if (!name || !email || !password) return null;
  if (!EMAIL_RE.test(email)) return null;
  if (password.length < 8 || password.length > 200) return null;

  return { name, email, password };
}

export function validateLoginInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const email = cleanString(b.email, 200);
  const password = typeof b.password === "string" ? b.password : null;

  if (!email || !password) return null;

  return { email, password };
}

/** Phone is optional: an empty string clears it. */
export function validateProfileInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const name = cleanString(b.name, 100);
  if (!name) return null;

  const phoneRaw = b.phone === undefined || b.phone === null ? "" : b.phone;
  if (typeof phoneRaw !== "string") return null;
  const phone = phoneRaw.trim();
  if (phone !== "") {
    if (!PHONE_RE.test(phone)) return null;
    const digits = phone.replace(/\D/g, "").length;
    if (digits < 7 || digits > 15) return null;
  }

  return { name, phone };
}

export function validateChangePasswordInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const currentPassword = typeof b.currentPassword === "string" ? b.currentPassword : null;
  const newPassword = typeof b.newPassword === "string" ? b.newPassword : null;

  if (!currentPassword || !newPassword) return null;
  if (newPassword.length < 8 || newPassword.length > 200) return null;

  return { currentPassword, newPassword };
}

/**
 * Where to send someone after login/signup. Only same-site paths are
 * allowed: "//evil.com" and "/\evil.com" are treated by browsers as other
 * sites, so anything that isn't a plain "/path" falls back to null.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 200) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\s\x00-\x1f]/.test(value)) return null;
  return value;
}
