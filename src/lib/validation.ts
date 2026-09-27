// Shared server-side validation for the public booking and review forms.
// Keep this defensive: these are the only two write paths that accept
// unauthenticated input, and everything here ends up in MongoDB.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (!parentName || !contact || !childName || !date || !time) return null;
  if (notes === null) return null;
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  if (!Number.isInteger(childAge) || childAge < 0 || childAge > 17) return null;
  if (!Number.isInteger(numberOfChildren) || numberOfChildren < 1 || numberOfChildren > 50) {
    return null;
  }

  return { parentName, contact, childName, childAge, numberOfChildren, date, time, notes };
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
