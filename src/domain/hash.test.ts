import { describe, expect, it } from "vitest";
import { hashString } from "./hash";

describe("hashString", () => {
  it("returns the same hash for the same string", () => {
    expect(hashString("4901234567894")).toBe(hashString("4901234567894"));
  });

  it("tends to return different hashes for different strings", () => {
    expect(hashString("4901234567894")).not.toBe(hashString("4901234567895"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const hash = hashString("barcode");

    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });
});
