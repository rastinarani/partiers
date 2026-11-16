import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPublicFormToken, validPublicForm, publicFormRejection } from "./publicFormProtection";
import { validatePublicFormInput, validatePublicFormKind } from "./validation";
import { MAX_PUBLIC_FORM_MS, MIN_PUBLIC_FORM_MS } from "./publicFormRules";

const now = 1_800_000_000_000;
beforeEach(() => vi.stubEnv("ADMIN_SESSION_SECRET", "unit-form-secret"));
afterEach(() => vi.unstubAllEnvs());
const body = (token: string, website: unknown = "") => ({ formToken: token, website });

it("accepts only the supported public form purposes", () => {
  for (const value of ["booking", "review", "login", "signup"])
    expect(validatePublicFormKind(value)).toBe(value);
  for (const value of [null, undefined, {}, [], "admin", "__proto__", ""])
    expect(validatePublicFormKind(value)).toBeNull();
});

it("accepts a correctly signed form only after the minimum fill time", () => {
  const token = createPublicFormToken("booking", now);
  expect(validPublicForm(body(token), "booking", now)).toBe(false);
  expect(validPublicForm(body(token), "booking", now + MIN_PUBLIC_FORM_MS - 1)).toBe(false);
  expect(validPublicForm(body(token), "booking", now + MIN_PUBLIC_FORM_MS)).toBe(true);
  expect(validPublicForm(body(token), "booking", now + MAX_PUBLIC_FORM_MS)).toBe(true);
  expect(validPublicForm(body(token), "booking", now + MAX_PUBLIC_FORM_MS + 1)).toBe(false);
});

it("rejects tampered/backdated, future, wrong-purpose and malformed tokens", () => {
  const token = createPublicFormToken("review", now);
  expect(validPublicForm(body(token.replace(String(now), String(now - 10000))), "review", now + 3000)).toBe(false);
  expect(validPublicForm(body(token), "review", now - 3000)).toBe(false);
  expect(validPublicForm(body(token), "booking", now + 3000)).toBe(false);
  for (const value of ["garbage", `${token}.extra`, token.slice(0, -1), token.slice(0, -1) + "z"])
    expect(validPublicForm(body(value), "review", now + 3000)).toBe(false);
});

it("rejects every nonempty honeypot without trimming or coercing objects", () => {
  const token = createPublicFormToken("signup", now);
  for (const website of ["https://spam.example.invalid", " ", null, {}, [], 0, false])
    expect(validPublicForm(body(token, website), "signup", now + 3000)).toBe(false);
  for (const value of [null, [], {}, { formToken: token }, { formToken: "x".repeat(201), website: "" }])
    expect(validatePublicFormInput(value)).toBeNull();
});

it("does not expose the reason for a rejection or require a database", async () => {
  const response = publicFormRejection();
  expect(response.status).toBe(400);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.text()).not.toMatch(/honeypot|token|spam|seconds|signature/i);
  const token = createPublicFormToken("login", now);
  vi.stubEnv("ADMIN_SESSION_SECRET", "");
  expect(() => createPublicFormToken("login", now)).toThrow();
  expect(validPublicForm(body(token), "login", now + 3000)).toBe(false);
});
