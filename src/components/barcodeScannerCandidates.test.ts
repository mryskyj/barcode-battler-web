import { describe, expect, it } from "vitest";
import {
  getVisibleCandidatePoints,
  updateBarcodeCandidateTrack,
  type BarcodeCandidateTrack,
} from "./barcodeScannerCandidates";

describe("barcodeScannerCandidates", () => {
  it("keeps a stable cluster when points stay close together", () => {
    let track: BarcodeCandidateTrack | null = null;

    track = updateBarcodeCandidateTrack(
      track,
      { x: 100, y: 40 },
      { width: 800, height: 600 },
      0,
    );
    track = updateBarcodeCandidateTrack(
      track,
      { x: 112, y: 44 },
      { width: 800, height: 600 },
      80,
    );
    track = updateBarcodeCandidateTrack(
      track,
      { x: 118, y: 42 },
      { width: 800, height: 600 },
      140,
    );

    expect(getVisibleCandidatePoints(track, 180)).toEqual([
      { x: 100, y: 40 },
      { x: 112, y: 44 },
      { x: 118, y: 42 },
    ]);
  });

  it("drops stale or far away points", () => {
    let track: BarcodeCandidateTrack | null = null;

    track = updateBarcodeCandidateTrack(
      track,
      { x: 100, y: 40 },
      { width: 800, height: 600 },
      0,
    );
    track = updateBarcodeCandidateTrack(
      track,
      { x: 460, y: 320 },
      { width: 800, height: 600 },
      50,
    );

    expect(getVisibleCandidatePoints(track, 100)).toBeNull();
    expect(getVisibleCandidatePoints(track, 400)).toBeNull();
  });
});
