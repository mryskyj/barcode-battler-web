import { BarcodeFormat, DecodeHintType } from "@zxing/library";
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

  it("limits scanning to EAN and UPC formats", () => {
    const hints = createBarcodeScannerHints();

    expect(hints.get(DecodeHintType.POSSIBLE_FORMATS)).toEqual([
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    expect(hints.get(DecodeHintType.POSSIBLE_FORMATS)).toEqual([...BARCODE_SCANNER_FORMATS]);
  });
});
