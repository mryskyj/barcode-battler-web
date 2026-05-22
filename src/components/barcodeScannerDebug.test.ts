import { describe, expect, it } from "vitest";
import {
  formatScannerDetails,
  isBarcodeScannerDebugEnabled,
} from "./barcodeScannerDebug";

describe("barcodeScannerDebug", () => {
  it("keeps scanner debug disabled by default", () => {
    expect(
      isBarcodeScannerDebugEnabled(
        true,
        { search: "" },
        { getItem: () => null },
      ),
    ).toBe(false);
  });

  it("enables scanner debug from query string in dev mode", () => {
    expect(
      isBarcodeScannerDebugEnabled(
        true,
        { search: "?scannerDebug=1" },
        { getItem: () => null },
      ),
    ).toBe(true);
  });

  it("does not expose scanner debug in production mode", () => {
    expect(
      isBarcodeScannerDebugEnabled(
        false,
        { search: "?scannerDebug=1" },
        { getItem: () => "1" },
      ),
    ).toBe(false);
  });

  it("formats details without throwing", () => {
    expect(formatScannerDetails({ value: new Set(["a", "b"]) })).toBe(
      '{"value":["a","b"]}',
    );
  });
});
