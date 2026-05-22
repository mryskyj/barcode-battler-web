import { describe, expect, it } from "vitest";
import {
  createScannerFrame,
  mapCanvasPointToSource,
} from "./barcodeScannerFrame";

describe("barcodeScannerFrame", () => {
  it("creates a rotated scan frame without upscaling", () => {
    const frame = createScannerFrame(640, 480, 90);

    expect(frame).toEqual({
      orientation: 90,
      sourceWidth: 640,
      sourceHeight: 480,
      canvasWidth: 480,
      canvasHeight: 640,
      scale: 1,
    });
  });

  it("maps canvas points back to source coordinates", () => {
    const frame = createScannerFrame(640, 480, 90);

    expect(mapCanvasPointToSource({ x: 240, y: 320 }, frame)).toEqual({
      x: 320,
      y: 240,
    });
  });
});
