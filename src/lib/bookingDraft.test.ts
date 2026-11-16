import { describe, expect, it } from "vitest";
import {
  decodeBookingDraft,
  emptyBookingDraft,
  encodeBookingDraft,
} from "./bookingDraft";
import { validateBookingStep } from "./validation";
const now = Date.parse("2026-11-15T12:00:00Z");
const today = "2026-11-15";
const complete = {
  ...emptyBookingDraft().values,
  date: "2026-12-01",
  time: "12:00",
  eventType: "birthday" as const,
  location: "Park",
  parentName: "Jamie",
  contact: "jamie@example.invalid",
  childName: "Alex",
  childAge: "6",
  numberOfChildren: "5",
};
describe("booking drafts", () => {
  it("round-trips partial and complete drafts, including the current step", () => {
    for (const state of [
      emptyBookingDraft("Jamie", "a@example.invalid"),
      { step: 4, values: complete },
    ]) {
      expect(
        decodeBookingDraft(encodeBookingDraft(state, now), today, now),
      ).toEqual(state);
    }
  });
  it("rejects damaged, obsolete, expired, future and oversized data", () => {
    for (const raw of [
      null,
      "garbage",
      "null",
      "a".repeat(20001),
      JSON.stringify({ version: 2 }),
      encodeBookingDraft({ step: 0, values: complete }, now - 86400001),
      encodeBookingDraft({ step: 0, values: complete }, now + 1),
    ])
      expect(decodeBookingDraft(raw, today, now)).toBeNull();
  });
  it("rejects unsupported options, injected objects, and impossible step numbers", () => {
    const saved = JSON.parse(
      encodeBookingDraft({ step: 4, values: complete }, now),
    );
    for (const change of [
      { time: {} },
      { activities: ["unknown"] },
      { durationMinutes: 75 },
      { eventType: "unknown" },
    ])
      expect(
        decodeBookingDraft(
          JSON.stringify({ ...saved, values: { ...saved.values, ...change } }),
          today,
          now,
        ),
      ).toBeNull();
    for (const step of [-1, 5, 1.5, "4"])
      expect(
        decodeBookingDraft(JSON.stringify({ ...saved, step }), today, now),
      ).toBeNull();
  });
  it("drops unexpected fields rather than trusting stored metadata", () => {
    const saved = JSON.parse(
      encodeBookingDraft({ step: 4, values: complete }, now),
    );
    const restored = decodeBookingDraft(
      JSON.stringify({
        ...saved,
        values: { ...saved.values, userId: "forged", status: "confirmed" },
      }),
      today,
      now,
    );
    expect(restored?.values).toEqual(complete);
  });
  it("returns to the first incomplete step and rewinds expired event dates", () => {
    expect(
      decodeBookingDraft(
        encodeBookingDraft(
          { step: 4, values: { ...complete, location: "" } },
          now,
        ),
        today,
        now,
      )?.step,
    ).toBe(2);
    expect(
      decodeBookingDraft(
        encodeBookingDraft(
          { step: 4, values: { ...complete, date: "2026-11-14" } },
          now,
        ),
        today,
        now,
      )?.step,
    ).toBe(0);
  });
});
describe("booking step validation", () => {
  it("allows a complete request and boundary values", () => {
    for (let step = 0; step < 4; step++)
      expect(validateBookingStep(step, complete, today)).toBeNull();
    expect(
      validateBookingStep(
        3,
        { ...complete, childAge: "0", numberOfChildren: "50" },
        today,
      ),
    ).toBeNull();
  });
  it("rejects missing, impossible or past dates", () => {
    for (const date of ["", "2026-02-30", "2026-13-01", "2026-11-14"])
      expect(
        validateBookingStep(0, { ...complete, date }, today),
      ).not.toBeNull();
  });
  it("rejects unsupported start times and events extending beyond midnight", () => {
    for (const time of ["", "08:30", "22:30", "10:15"])
      expect(
        validateBookingStep(1, { ...complete, time }, today),
      ).not.toBeNull();
    expect(
      validateBookingStep(
        1,
        { ...complete, time: "22:00", durationMinutes: 180 },
        today,
      ),
    ).not.toBeNull();
  });
  it("requires event details and valid child and parent details", () => {
    expect(
      validateBookingStep(2, { ...complete, location: "   " }, today),
    ).not.toBeNull();
    expect(
      validateBookingStep(2, { ...complete, eventType: "" }, today),
    ).not.toBeNull();
    for (const change of [
      { parentName: " " },
      { contact: "" },
      { childName: "" },
      { childAge: "" },
      { childAge: "18" },
      { childAge: "1.5" },
      { numberOfChildren: "0" },
      { numberOfChildren: "51" },
    ])
      expect(
        validateBookingStep(3, { ...complete, ...change }, today),
      ).not.toBeNull();
  });
});
