import { describe, expect, it } from "vitest";
import {
  appendScannerDebugEntry,
  formatScannerDetails,
  isBarcodeScannerDebugEnabled,
  type ScannerDebugEntry,
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

  it("drops non-important scanner entries before important entries", () => {
    const entries = [
      createEntry(1, "scan-start"),
      createEntry(2, "candidate-visible"),
    ];

    expect(
      appendScannerDebugEntry(entries, createEntry(3, "scan-success"), 2),
    ).toEqual([createEntry(1, "scan-start"), createEntry(3, "scan-success")]);
  });

  it("falls back to a normal ring buffer when every entry is important", () => {
    const entries = [
      createEntry(1, "scan-start"),
      createEntry(2, "scan-cycle-no-result"),
    ];

    expect(
      appendScannerDebugEntry(entries, createEntry(3, "scan-success"), 2),
    ).toEqual([
      createEntry(2, "scan-cycle-no-result"),
      createEntry(3, "scan-success"),
    ]);
  });
});

function createEntry(id: number, event: string): ScannerDebugEntry {
  return {
    id,
    event,
    createdAt: "2026-05-24T00:00:00.000Z",
    details: "",
  };
}
