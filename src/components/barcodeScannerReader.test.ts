import { DecodeHintType } from "@zxing/library";
import { describe, expect, it } from "vitest";
import {
  BARCODE_SCANNER_FORMATS,
  createBarcodeScannerHints,
} from "./barcodeScannerReader";

describe("barcodeScannerReader", () => {
  it("enables try harder scanning", () => {
    const hints = createBarcodeScannerHints();

    expect(hints.get(DecodeHintType.TRY_HARDER)).toBe(true);
  });

  it("limits scanning to common 1D formats", () => {
    const hints = createBarcodeScannerHints();

    expect(hints.get(DecodeHintType.POSSIBLE_FORMATS)).toEqual([
      ...BARCODE_SCANNER_FORMATS,
    ]);
  });
});
