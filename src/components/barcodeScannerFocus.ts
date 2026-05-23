type FocusCapableTrack = MediaStreamTrack & {
  applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
  getCapabilities?: () => MediaTrackCapabilities;
};

type FocusPoint = {
  x: number;
  y: number;
};

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  pointsOfInterest?: boolean;
};

const FOCUS_POINT_TIMEOUT_MS = 900;

export type ScannerFocusResult =
  | { applied: true; point: FocusPoint | null }
  | { applied: false; reason: string };

export async function applyContinuousCameraFocus(
  stream: MediaStream,
): Promise<ScannerFocusResult> {
  const track = getFocusTrack(stream);

  if (track === null) {
    return { applied: false, reason: "no-video-track" };
  }

  const capabilities = getFocusCapabilities(track);
  if (!capabilities?.focusMode?.includes("continuous")) {
    return { applied: false, reason: "continuous-focus-unsupported" };
  }

  await track.applyConstraints?.({
    advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
  });

  return { applied: true, point: null };
}

export async function focusCameraAtPoint(
  stream: MediaStream,
  point: FocusPoint,
): Promise<ScannerFocusResult> {
  const track = getFocusTrack(stream);

  if (track === null) {
    return { applied: false, reason: "no-video-track" };
  }

  const capabilities = getFocusCapabilities(track);
  if (!capabilities?.focusMode?.includes("single-shot")) {
    return { applied: false, reason: "single-shot-focus-unsupported" };
  }

  const focusConstraints: MediaTrackConstraints = {
    advanced: [
      {
        focusMode: "single-shot",
        pointsOfInterest: [clampFocusPoint(point)],
      } as MediaTrackConstraintSet,
    ],
  };

  await track.applyConstraints?.(focusConstraints);

  return { applied: true, point: clampFocusPoint(point) };
}

export function createFocusPointFromPreviewEvent(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  preview: Pick<DOMRect, "left" | "top" | "width" | "height">,
): FocusPoint {
  return clampFocusPoint({
    x: (event.clientX - preview.left) / preview.width,
    y: (event.clientY - preview.top) / preview.height,
  });
}

export function getFocusPointTimeoutMs() {
  return FOCUS_POINT_TIMEOUT_MS;
}

function getFocusTrack(stream: MediaStream): FocusCapableTrack | null {
  return (stream.getVideoTracks()[0] as FocusCapableTrack | undefined) ?? null;
}

function getFocusCapabilities(track: FocusCapableTrack): FocusCapabilities | undefined {
  return track.getCapabilities?.() as FocusCapabilities | undefined;
}

function clampFocusPoint(point: FocusPoint): FocusPoint {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}
