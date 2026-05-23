import { isFiniteScannerPoint, type ScannerPoint } from "./barcodeScannerGeometry";

export type BarcodeCandidateTrack = {
  points: ScannerPoint[];
  lastSeenAt: number;
};

type SourceSize = {
  width: number;
  height: number;
};

const CANDIDATE_STALE_MS = 240;
const MIN_VISIBLE_POINTS = 3;
const MAX_TRACK_POINTS = 6;
const MIN_SPAN_PX = 12;
const MAX_CENTER_DISTANCE_RATIO = 0.08;

export function updateBarcodeCandidateTrack(
  currentTrack: BarcodeCandidateTrack | null,
  point: ScannerPoint,
  sourceSize: SourceSize,
  now: number,
): BarcodeCandidateTrack {
  if (!isFiniteScannerPoint(point)) {
    return currentTrack ?? {
      points: [],
      lastSeenAt: now,
    };
  }

  if (
    currentTrack === null ||
    currentTrack.points.length === 0 ||
    now - currentTrack.lastSeenAt > CANDIDATE_STALE_MS
  ) {
    return {
      points: [point],
      lastSeenAt: now,
    };
  }

  const centerPoint = getCenterPoint(currentTrack.points);
  const distance = getDistance(point, centerPoint);
  const maxDistance = Math.max(
    MIN_SPAN_PX,
    Math.min(sourceSize.width, sourceSize.height) * MAX_CENTER_DISTANCE_RATIO,
  );

  if (distance > maxDistance) {
    return {
      points: [point],
      lastSeenAt: now,
    };
  }

  return {
    points: [...currentTrack.points, point].slice(-MAX_TRACK_POINTS),
    lastSeenAt: now,
  };
}

export function getVisibleCandidatePoints(
  currentTrack: BarcodeCandidateTrack | null,
  now: number,
): ScannerPoint[] | null {
  if (
    currentTrack === null ||
    now - currentTrack.lastSeenAt > CANDIDATE_STALE_MS ||
    currentTrack.points.length < MIN_VISIBLE_POINTS
  ) {
    return null;
  }

  const finitePoints = currentTrack.points.filter(isFiniteScannerPoint);

  if (finitePoints.length < MIN_VISIBLE_POINTS) {
    return null;
  }

  const bounds = getBounds(finitePoints);
  if (bounds.width < MIN_SPAN_PX && bounds.height < MIN_SPAN_PX) {
    return null;
  }

  return finitePoints;
}

function getCenterPoint(points: ScannerPoint[]): ScannerPoint {
  const bounds = getBounds(points);
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

function getBounds(points: ScannerPoint[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getDistance(a: ScannerPoint, b: ScannerPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
