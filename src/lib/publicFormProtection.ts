import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { validatePublicFormInput } from "./validation";
import { MAX_PUBLIC_FORM_MS, MIN_PUBLIC_FORM_MS, type PublicFormKind } from "./publicFormRules";

function signature(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Form protection secret unavailable.");
  return createHmac("sha256", secret).update(`public-form:${payload}`).digest("hex");
}

export function createPublicFormToken(kind: PublicFormKind, now = Date.now()) {
  const payload = `${kind}.${now}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload)}`;
}

export function validPublicForm(body: unknown, kind: PublicFormKind, now = Date.now()): boolean {
  const token = validatePublicFormInput(body);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [purpose, issuedAt, nonce, mac] = parts;
  if (purpose !== kind || !/^\d{13}$/.test(issuedAt) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) return false;
  const age = now - Number(issuedAt);
  if (age < MIN_PUBLIC_FORM_MS || age > MAX_PUBLIC_FORM_MS) return false;
  try {
    return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(signature(parts.slice(0, 3).join(".")), "hex"));
  } catch { return false; }
}

export function publicFormRejection() {
  return Response.json({ error: "We couldn’t process that request. Please try again." }, {
    status: 400, headers: { "Cache-Control": "no-store" },
  });
}
