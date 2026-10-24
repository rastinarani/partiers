import { describe, expect, it } from "vitest";
import { generateReferenceCode, REFERENCE_CODE_RE } from "./referenceCode";

describe("generateReferenceCode", () => {
  it("makes PT- codes without look-alike characters", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateReferenceCode();
      expect(code).toMatch(REFERENCE_CODE_RE);
      expect(code.slice(3)).not.toMatch(/[01OIL]/);
    }
  });

  it("varies between calls", () => {
    const codes = new Set(Array.from({ length: 200 }, generateReferenceCode));
    expect(codes.size).toBeGreaterThan(190);
  });
});
