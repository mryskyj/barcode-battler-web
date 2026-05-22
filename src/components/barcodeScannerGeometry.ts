export type ScannerPoint = {
  x: number;
  y: number;
};

export type ScannerLayout = {
  sourceWidth: number;
  sourceHeight: number;
  previewWidth: number;
  previewHeight: number;
};

export type ScannerBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const MIN_BOX_SIZE = 48;

export function createScannerBox(
  points: ScannerPoint[],
  layout: ScannerLayout,
): ScannerBox | null {
  if (points.length === 0) {
    return null;
  }

  if (
    layout.sourceWidth <= 0 ||
    layout.sourceHeight <= 0 ||
    layout.previewWidth <= 0 ||
    layout.previewHeight <= 0
  ) {
    return null;
  }

  const scale = Math.max(
    layout.previewWidth / layout.sourceWidth,
    layout.previewHeight / layout.sourceHeight,
  );
  const visibleWidth = layout.sourceWidth * scale;
  const visibleHeight = layout.sourceHeight * scale;
  const offsetX = (layout.previewWidth - visibleWidth) / 2;
  const offsetY = (layout.previewHeight - visibleHeight) / 2;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const x = point.x * scale + offsetX;
    const y = point.y * scale + offsetY;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = Math.max(maxX - minX + 20, MIN_BOX_SIZE);
  const height = Math.max(maxY - minY + 20, MIN_BOX_SIZE);

  return {
    left: clamp(centerX - width / 2, 0, layout.previewWidth - width),
    top: clamp(centerY - height / 2, 0, layout.previewHeight - height),
    width: Math.min(width, layout.previewWidth),
    height: Math.min(height, layout.previewHeight),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
