import { describe, expect, it } from "vitest";
import {
  formatScannerDetails,
  isBarcodeScannerDebugEnabled,
} from "./barcodeScannerDebug";

describe("barcodeScannerDebug", () => {
  it("keeps scanner debug enabled by default for camera investigation", () => {
    expect(
      isBarcodeScannerDebugEnabled(
        true,
        { search: "" },
        { getItem: () => null },
      ),
    ).toBe(true);
  });

  it("can disable scanner debug from query string", () => {
    expect(
      isBarcodeScannerDebugEnabled(
        true,
        { search: "?scannerDebug=0" },
        { getItem: () => null },
      ),
    ).toBe(false);
  });

  it("keeps scanner debug available in production mode", () => {
    expect(
      isBarcodeScannerDebugEnabled(
        false,
        { search: "?scannerDebug=1" },
        { getItem: () => null },
      ),
    ).toBe(true);
  });

  it("formats details without throwing", () => {
    expect(formatScannerDetails({ value: new Set(["a", "b"]) })).toBe(
      '{"value":["a","b"]}',
    );
  });
});
