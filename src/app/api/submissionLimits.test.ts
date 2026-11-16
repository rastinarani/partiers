import { beforeEach, expect, it, vi } from "vitest";
import { POST as login } from "./auth/login/route";
import { POST as signup } from "./auth/signup/route";
import { POST as adminLogin } from "./admin/login/route";
import { POST as booking } from "./bookings/route";
import { POST as review } from "./reviews/route";

const guard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rateLimit", () => ({ rateLimitResponse: guard }));
beforeEach(() => guard.mockReset());

it.each([[login, "login"], [adminLogin, "login"], [signup, "signup"], [booking, "booking"], [review, "review"]] as const)("enforces the %s submission guard before parsing or storing public input", async (handler, action) => {
  const response = Response.json({ error: "Please try again later." }, { status: 429 });
  guard.mockResolvedValue(response);
  const request = new Request("http://localhost/api", { method: "POST", body: "{}" });
  const parse = vi.spyOn(request, "json");
  expect(await handler(request)).toBe(response);
  expect(guard).toHaveBeenCalledWith(request, action);
  expect(parse).not.toHaveBeenCalled();
});
