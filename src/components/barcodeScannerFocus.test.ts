import { describe, expect, it, vi } from "vitest";
import {
  applyContinuousCameraFocus,
  createFocusPointFromPreviewEvent,
  focusCameraAtPoint,
} from "./barcodeScannerFocus";

describe("barcodeScannerFocus", () => {
  it("applies continuous focus when supported", async () => {
    const applyConstraints = vi.fn(async () => undefined);
    const stream = createFocusStream({
      applyConstraints,
      focusMode: ["continuous"],
    });

    await expect(applyContinuousCameraFocus(stream)).resolves.toEqual({
      applied: true,
      point: null,
    });
    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ focusMode: "continuous" }],
    });
  });

  it("applies single-shot focus to a clamped preview point", async () => {
    const applyConstraints = vi.fn(async () => undefined);
    const stream = createFocusStream({
      applyConstraints,
      focusMode: ["single-shot"],
    });

    await expect(focusCameraAtPoint(stream, { x: 1.2, y: -0.2 })).resolves.toEqual({
      applied: true,
      point: { x: 1, y: 0 },
    });
    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [
        {
          focusMode: "single-shot",
          pointsOfInterest: [{ x: 1, y: 0 }],
        },
      ],
    });
  });

  it("creates a normalized focus point from a preview event", () => {
    expect(
      createFocusPointFromPreviewEvent(
        { clientX: 150, clientY: 80 },
        { left: 50, top: 30, width: 200, height: 100 },
      ),
    ).toEqual({ x: 0.5, y: 0.5 });
  });
});

function createFocusStream({
  applyConstraints,
  focusMode,
}: {
  applyConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
  focusMode: string[];
}): MediaStream {
  return {
    getVideoTracks: () => [
      {
        applyConstraints,
        getCapabilities: () => ({ focusMode }),
      },
    ],
  } as unknown as MediaStream;
}
