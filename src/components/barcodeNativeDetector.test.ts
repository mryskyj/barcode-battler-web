import { describe, expect, it, vi } from "vitest";
import {
  createNativeBarcodeDetector,
  detectNativeBarcodes,
} from "./barcodeNativeDetector";

describe("barcodeNativeDetector", () => {
  it("returns null when BarcodeDetector is unavailable", () => {
    expect(createNativeBarcodeDetector({} as typeof globalThis)).toBeNull();
  });

  it("creates a detector with EAN and UPC formats", () => {
    const Detector = vi.fn(function Detector(this: { detect: () => Promise<[]> }) {
      this.detect = async () => [];
    });

    createNativeBarcodeDetector({
      BarcodeDetector: Detector,
    } as unknown as typeof globalThis);

    expect(Detector).toHaveBeenCalledWith({
      formats: ["ean_8", "ean_13", "upc_a", "upc_e"],
    });
  });

  it("normalizes native detection results", async () => {
    const detector = {
      detect: vi.fn(async () => [
        {
          rawValue: " 4901234567894 ",
          format: "ean_13",
          cornerPoints: [{ x: 1, y: 2 }],
        },
      ]),
    };

    await expect(detectNativeBarcodes(detector, {} as CanvasImageSource)).resolves.toEqual([
      {
        rawValue: "4901234567894",
        format: "ean_13",
        points: [{ x: 1, y: 2 }],
      },
    ]);
  });
});
