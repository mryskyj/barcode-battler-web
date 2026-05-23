import { describe, expect, it } from "vitest";
import { createScannerBox, isFiniteScannerPoint } from "./barcodeScannerGeometry";

describe("createScannerBox", () => {
  it("maps barcode points into the preview area", () => {
    const box = createScannerBox(
      [
        { x: 100, y: 50 },
        { x: 200, y: 100 },
      ],
      {
        sourceWidth: 400,
        sourceHeight: 300,
        previewWidth: 800,
        previewHeight: 600,
      },
    );

    expect(box).toEqual({
      left: 190,
      top: 90,
      width: 220,
      height: 120,
    });
  });

  it("returns null when the layout is invalid", () => {
    expect(
      createScannerBox(
        [{ x: 12, y: 18 }],
        {
          sourceWidth: 0,
          sourceHeight: 300,
          previewWidth: 800,
          previewHeight: 600,
        },
      ),
    ).toBeNull();
  });

  it("ignores non-finite barcode points", () => {
    const box = createScannerBox(
      [
        { x: Number.NaN, y: 50 },
        { x: 100, y: 50 },
        { x: 200, y: 100 },
      ],
      {
        sourceWidth: 400,
        sourceHeight: 300,
        previewWidth: 800,
        previewHeight: 600,
      },
    );

    expect(box).toEqual({
      left: 190,
      top: 90,
      width: 220,
      height: 120,
    });
  });

  it("detects finite scanner points", () => {
    expect(isFiniteScannerPoint({ x: 1, y: 2 })).toBe(true);
    expect(isFiniteScannerPoint({ x: Number.POSITIVE_INFINITY, y: 2 })).toBe(
      false,
    );
  });
});
