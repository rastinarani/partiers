import { describe, expect, it } from "vitest";
import {
  cleanString,
  isDateString,
  safeNextPath,
  validateBlockDateInput,
  validateBookingInput,
  validateChangePasswordInput,
  validateLoginInput,
  validateProfileInput,
  validateReviewInput,
  validateSignupInput,
} from "./validation";

describe("cleanString", () => {
  it("trims and returns strings within the limit", () => {
    expect(cleanString("  Nikki  ", 10)).toBe("Nikki");
    expect(cleanString("a".repeat(10), 10)).toBe("a".repeat(10));
  });

  it("rejects non-strings, blank strings and over-long strings", () => {
    expect(cleanString(42, 10)).toBeNull();
    expect(cleanString(undefined, 10)).toBeNull();
    expect(cleanString({ $gt: "" }, 10)).toBeNull();
    expect(cleanString("   ", 10)).toBeNull();
    expect(cleanString("a".repeat(11), 10)).toBeNull();
  });
});

describe("validateBookingInput", () => {
  const valid = {
    parentName: "Sam Parent",
    contact: "sam@example.com",
    childName: "Alex",
    childAge: 6,
    numberOfChildren: 10,
    date: "2026-11-14",
    time: "14:30",
    durationMinutes: 120,
    eventType: "birthday",
    location: "Riverdale, near the park",
    activities: ["games", "facePainting"],
    notes: "Loves dinosaurs",
  };

  it("accepts a valid booking", () => {
    expect(validateBookingInput(valid)).toEqual(valid);
  });

  it("coerces numeric strings and trims text", () => {
    expect(
      validateBookingInput({ ...valid, parentName: "  Sam  ", childAge: "6", numberOfChildren: "10" })
    ).toEqual({ ...valid, parentName: "Sam" });
  });

  it.each([null, undefined, "booking", 5, []])("rejects a non-object body %j", (body) => {
    expect(validateBookingInput(body)).toBeNull();
  });

  it.each([
    "parentName",
    "contact",
    "childName",
    "date",
    "time",
    "childAge",
    "numberOfChildren",
    "durationMinutes",
    "eventType",
    "location",
  ])(
    "rejects a missing %s",
    (field) => {
      const body: Record<string, unknown> = { ...valid };
      delete body[field];
      expect(validateBookingInput(body)).toBeNull();
    }
  );

  it.each(["2026-1-5", "14/11/2026", "2026-11-1x"])("rejects bad date %j", (date) => {
    expect(validateBookingInput({ ...valid, date })).toBeNull();
  });

  it.each(["24:00", "9:30", "12:60", "noon"])("rejects bad time %j", (time) => {
    expect(validateBookingInput({ ...valid, time })).toBeNull();
  });

  it.each([0, 17])("accepts child age %i", (childAge) => {
    expect(validateBookingInput({ ...valid, childAge })?.childAge).toBe(childAge);
  });

  it.each([-1, 18, 2.5, "six"])("rejects child age %j", (childAge) => {
    expect(validateBookingInput({ ...valid, childAge })).toBeNull();
  });

  it.each([1, 50])("accepts %i children", (numberOfChildren) => {
    expect(validateBookingInput({ ...valid, numberOfChildren })?.numberOfChildren).toBe(
      numberOfChildren
    );
  });

  it.each([0, 51, 1.5])("rejects %j children", (numberOfChildren) => {
    expect(validateBookingInput({ ...valid, numberOfChildren })).toBeNull();
  });

  it.each([60, 90, 120, 180, 240, "90"])("accepts duration %j", (durationMinutes) => {
    expect(validateBookingInput({ ...valid, durationMinutes })?.durationMinutes).toBe(
      Number(durationMinutes)
    );
  });

  it.each([0, 30, 150, 300, "two hours"])("rejects duration %j", (durationMinutes) => {
    expect(validateBookingInput({ ...valid, durationMinutes })).toBeNull();
  });

  it("rejects events that would run past midnight", () => {
    expect(validateBookingInput({ ...valid, time: "22:00", durationMinutes: 120 })).not.toBeNull();
    expect(validateBookingInput({ ...valid, time: "22:00", durationMinutes: 180 })).toBeNull();
  });

  it.each(["birthday", "playdate", "family", "other"])("accepts event type %j", (eventType) => {
    expect(validateBookingInput({ ...valid, eventType })?.eventType).toBe(eventType);
  });

  it.each(["wedding", "", "toString", "__proto__", 1])("rejects event type %j", (eventType) => {
    expect(validateBookingInput({ ...valid, eventType })).toBeNull();
  });

  it("rejects a blank or overlong location", () => {
    expect(validateBookingInput({ ...valid, location: "   " })).toBeNull();
    expect(validateBookingInput({ ...valid, location: "a".repeat(200) })).not.toBeNull();
    expect(validateBookingInput({ ...valid, location: "a".repeat(201) })).toBeNull();
  });

  it("treats missing activities as none and removes duplicates", () => {
    expect(validateBookingInput({ ...valid, activities: undefined })?.activities).toEqual([]);
    expect(validateBookingInput({ ...valid, activities: ["games", "games"] })?.activities).toEqual([
      "games",
    ]);
  });

  it.each([["skydiving"], "games", [{ $ne: "" }], ["constructor"]])(
    "rejects activities %j",
    (activities) => {
      expect(validateBookingInput({ ...valid, activities })).toBeNull();
    }
  );

  it.each([undefined, null, ""])("treats notes %j as empty", (notes) => {
    expect(validateBookingInput({ ...valid, notes })?.notes).toBe("");
  });

  it("rejects notes over 1000 characters or of the wrong type", () => {
    expect(validateBookingInput({ ...valid, notes: "a".repeat(1000) })?.notes).toHaveLength(1000);
    expect(validateBookingInput({ ...valid, notes: "a".repeat(1001) })).toBeNull();
    expect(validateBookingInput({ ...valid, notes: 123 })).toBeNull();
  });
});

describe("validateReviewInput", () => {
  const valid = { name: "Jo", comment: "Wonderful party!", rating: 5 };

  it.each([1, 5])("accepts rating %i", (rating) => {
    expect(validateReviewInput({ ...valid, rating })).toEqual({ ...valid, rating });
  });

  it.each([0, 6, 3.5, "five"])("rejects rating %j", (rating) => {
    expect(validateReviewInput({ ...valid, rating })).toBeNull();
  });

  it("rejects a missing name or comment, or a non-object body", () => {
    expect(validateReviewInput({ ...valid, name: "" })).toBeNull();
    expect(validateReviewInput({ ...valid, comment: undefined })).toBeNull();
    expect(validateReviewInput({ ...valid, comment: "a".repeat(1001) })).toBeNull();
    expect(validateReviewInput(null)).toBeNull();
  });
});

describe("validateSignupInput", () => {
  const valid = { name: "Sam", email: "sam@example.com", password: "a".repeat(8) };

  it("accepts a valid signup", () => {
    expect(validateSignupInput(valid)).toEqual(valid);
  });

  it.each(["sam", "sam@example", "sam @example.com", "@example.com"])(
    "rejects email %j",
    (email) => {
      expect(validateSignupInput({ ...valid, email })).toBeNull();
    }
  );

  it("enforces password length 8–200", () => {
    expect(validateSignupInput({ ...valid, password: "a".repeat(7) })).toBeNull();
    expect(validateSignupInput({ ...valid, password: "a".repeat(200) })).not.toBeNull();
    expect(validateSignupInput({ ...valid, password: "a".repeat(201) })).toBeNull();
  });

  it("rejects a non-string password or missing name", () => {
    expect(validateSignupInput({ ...valid, password: 12345678 })).toBeNull();
    expect(validateSignupInput({ ...valid, name: undefined })).toBeNull();
  });
});

describe("validateLoginInput", () => {
  it("accepts an email and password", () => {
    expect(validateLoginInput({ email: " sam@example.com ", password: "secret" })).toEqual({
      email: "sam@example.com",
      password: "secret",
    });
  });

  it("rejects missing or wrongly typed fields", () => {
    expect(validateLoginInput({ email: "sam@example.com" })).toBeNull();
    expect(validateLoginInput({ password: "secret" })).toBeNull();
    expect(validateLoginInput({ email: "sam@example.com", password: { $ne: "" } })).toBeNull();
    expect(validateLoginInput(null)).toBeNull();
  });
});

describe("validateProfileInput", () => {
  it("accepts a name and phone, trimming both", () => {
    expect(validateProfileInput({ name: " Sam ", phone: " (555) 123-4567 " })).toEqual({
      name: "Sam",
      phone: "(555) 123-4567",
    });
  });

  it("allows an empty or missing phone", () => {
    expect(validateProfileInput({ name: "Sam", phone: "" })).toEqual({ name: "Sam", phone: "" });
    expect(validateProfileInput({ name: "Sam" })).toEqual({ name: "Sam", phone: "" });
  });

  it.each(["123456", "1".repeat(16), "call me", "555-1234 ext 5", "+1 555 <b>"])(
    "rejects phone %j",
    (phone) => {
      expect(validateProfileInput({ name: "Sam", phone })).toBeNull();
    }
  );

  it("accepts international numbers", () => {
    expect(validateProfileInput({ name: "Sam", phone: "+44 20 7946 0958" })).not.toBeNull();
  });

  it("rejects a missing name or wrongly typed fields", () => {
    expect(validateProfileInput({ name: "  ", phone: "" })).toBeNull();
    expect(validateProfileInput({ name: "Sam", phone: 5551234567 })).toBeNull();
    expect(validateProfileInput({ name: { $ne: "" } })).toBeNull();
    expect(validateProfileInput(null)).toBeNull();
  });
});

describe("validateChangePasswordInput", () => {
  const valid = { currentPassword: "old-password", newPassword: "a".repeat(8) };

  it("accepts valid input", () => {
    expect(validateChangePasswordInput(valid)).toEqual(valid);
  });

  it("enforces new password length 8–200", () => {
    expect(validateChangePasswordInput({ ...valid, newPassword: "a".repeat(7) })).toBeNull();
    expect(validateChangePasswordInput({ ...valid, newPassword: "a".repeat(200) })).not.toBeNull();
    expect(validateChangePasswordInput({ ...valid, newPassword: "a".repeat(201) })).toBeNull();
  });

  it("rejects missing or wrongly typed passwords", () => {
    expect(validateChangePasswordInput({ ...valid, currentPassword: "" })).toBeNull();
    expect(validateChangePasswordInput({ ...valid, currentPassword: { $ne: "" } })).toBeNull();
    expect(validateChangePasswordInput({ newPassword: valid.newPassword })).toBeNull();
  });
});

describe("safeNextPath", () => {
  it.each(["/", "/account", "/reviews?x=1#top"])("accepts %j", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\evil.com",
    "javascript:alert(1)",
    "account",
    "/ evil",
    "/\tevil",
    "",
    "/" + "a".repeat(200),
  ])("rejects %j", (path) => {
    expect(safeNextPath(path)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(safeNextPath(["/account"])).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});

describe("validateBlockDateInput", () => {
  it("accepts a date with or without a reason", () => {
    expect(validateBlockDateInput({ date: "2026-12-24", reason: " Holidays " })).toEqual({
      date: "2026-12-24",
      reason: "Holidays",
    });
    expect(validateBlockDateInput({ date: "2026-12-24" })).toEqual({
      date: "2026-12-24",
      reason: "",
    });
  });

  it("rejects bad dates and reasons", () => {
    expect(validateBlockDateInput({ date: "24/12/2026" })).toBeNull();
    expect(validateBlockDateInput({ date: { $gt: "" } })).toBeNull();
    expect(validateBlockDateInput({ date: "2026-12-24", reason: "a".repeat(101) })).toBeNull();
    expect(validateBlockDateInput({ date: "2026-12-24", reason: 5 })).toBeNull();
    expect(validateBlockDateInput(null)).toBeNull();
  });

  it("isDateString only accepts YYYY-MM-DD strings", () => {
    expect(isDateString("2026-12-24")).toBe(true);
    expect(isDateString("2026-12-24T00:00")).toBe(false);
    expect(isDateString(20261224)).toBe(false);
  });
});
