import { describe, expect, it } from "vitest";
import { enhanceScannerPixels } from "./barcodeScannerImage";

describe("barcodeScannerImage", () => {
  it("increases contrast for low contrast grayscale bars", () => {
    const pixels = new Uint8ClampedArray([
      120, 120, 120, 255,
      245, 245, 245, 255,
    ]);

    enhanceScannerPixels(pixels, "lumaContrast");

    expect([...pixels]).toEqual([
      39, 39, 39, 255,
      255, 255, 255, 255,
    ]);
  });

  it("treats saturated colored bars as dark candidates", () => {
    const pixels = new Uint8ClampedArray([
      240, 220, 20, 255,
      255, 255, 255, 255,
    ]);

    enhanceScannerPixels(pixels, "darkChannelContrast");

    expect([...pixels]).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
  });
});
