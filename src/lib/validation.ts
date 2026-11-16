import { isActivity, isEventType } from "./eventOptions";
import { endsByMidnight, isDuration } from "./schedule";
import { PUBLIC_FORM_KINDS, type PublicFormKind } from "./publicFormRules";

// Validate public form fields before business logic or database writes.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s().-]{1,30}$/;

export function validatePublicFormKind(value: unknown): PublicFormKind | null {
  return typeof value === "string" && PUBLIC_FORM_KINDS.includes(value as PublicFormKind)
    ? value as PublicFormKind : null;
}

export function validatePublicFormInput(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  return value.website === "" && typeof value.formToken === "string"
    && value.formToken.length > 0 && value.formToken.length <= 200 ? value.formToken : null;
}

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
  if (!isDateString(date) || !TIME_RE.test(time) || time < "09:00" || time > "22:00"
    || !["00", "30"].includes(time.slice(3))) return null;
  if (b.childAge === "" || b.childAge === null || typeof b.childAge === "boolean") return null;
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

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Admin: block a date, with an optional private note. */
export function validateBlockDateInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (!isDateString(b.date)) return null;
  const reasonRaw = b.reason === undefined || b.reason === null ? "" : b.reason;
  const reason = cleanString(reasonRaw, 100) ?? (reasonRaw === "" ? "" : null);
  if (reason === null) return null;

  return { date: b.date, reason };
}

export function validateAdminNotesInput(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  const notes = (body as Record<string, unknown>).adminNotes;
  if (typeof notes !== "string" || notes.length > 5000) return null;
  return { adminNotes: notes.trim() };
}

export function validateAdminBookingStatusInput(body: unknown): {
  id: string; status: "confirmed" | "declined" | "cancelled"; force: boolean;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.id !== "string" || !/^[a-f\d]{24}$/i.test(b.id)) return null;
  if (b.status !== "confirmed" && b.status !== "declined" && b.status !== "cancelled") return null;
  if (b.force !== undefined && typeof b.force !== "boolean") return null;
  return { id: b.id, status: b.status, force: b.force === true };
}

/** Client step checks; the booking API still validates the entire request. */
export function validateBookingStep(
  step: number,
  draft: import("./types").BookingDraft,
  today: string,
): string | null {
  if (step === 0) {
    const date = new Date(`${draft.date}T12:00:00Z`);
    if (
      !DATE_RE.test(draft.date) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== draft.date ||
      draft.date < today
    ) {
      return "Please choose an available date today or later.";
    }
  }
  if (step === 1) {
    if (
      !TIME_RE.test(draft.time) ||
      draft.time < "09:00" ||
      draft.time > "22:00" ||
      !["00", "30"].includes(draft.time.slice(3))
    )
      return "Please choose a start time.";
    if (
      !isDuration(draft.durationMinutes) ||
      !endsByMidnight(draft.time, draft.durationMinutes)
    )
      return "Please choose a duration that ends by midnight.";
  }
  if (step === 2) {
    if (!isEventType(draft.eventType))
      return "Please choose what kind of event it is.";
    if (!cleanString(draft.location, 200))
      return "Please enter an address or general area (up to 200 characters).";
    if (draft.notes.length > 1000)
      return "Please keep your notes to 1,000 characters.";
    if (!draft.activities.every(isActivity))
      return "Please choose activities from the list.";
  }
  if (step === 3) {
    if (!cleanString(draft.parentName, 100))
      return "Please enter your name (up to 100 characters).";
    if (!cleanString(draft.contact, 150))
      return "Please enter a phone number or email (up to 150 characters).";
    if (!cleanString(draft.childName, 100))
      return "Please enter your child's name (up to 100 characters).";
    if (
      draft.childAge.trim() === "" ||
      !Number.isInteger(Number(draft.childAge)) ||
      Number(draft.childAge) < 0 ||
      Number(draft.childAge) > 17
    )
      return "Please enter a child's age from 0 to 17.";
    if (
      draft.numberOfChildren.trim() === "" ||
      !Number.isInteger(Number(draft.numberOfChildren)) ||
      Number(draft.numberOfChildren) < 1 ||
      Number(draft.numberOfChildren) > 50
    )
      return "Please enter between 1 and 50 children.";
  }
  return null;
}
