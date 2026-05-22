import { DecodeHintType } from "@zxing/library";
import { describe, expect, it } from "vitest";
import { createBarcodeScannerHints } from "./barcodeScannerReader";

describe("barcodeScannerReader", () => {
  it("enables try harder scanning", () => {
    const hints = createBarcodeScannerHints();

    expect(hints.get(DecodeHintType.TRY_HARDER)).toBe(true);
  });
});
