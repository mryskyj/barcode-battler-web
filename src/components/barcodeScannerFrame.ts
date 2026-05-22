import type { ScannerPoint } from "./barcodeScannerGeometry";

export const SCAN_ORIENTATIONS = [0, 90, 180, 270] as const;

export type ScannerOrientation = (typeof SCAN_ORIENTATIONS)[number];

export type ScannerFrame = {
  orientation: ScannerOrientation;
  sourceWidth: number;
  sourceHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
};

export function createScannerFrame(
  sourceWidth: number,
  sourceHeight: number,
  orientation: ScannerOrientation,
  maxLongSide = 1280,
): ScannerFrame {
  const rotated = orientation === 90 || orientation === 270;
  const rotatedWidth = rotated ? sourceHeight : sourceWidth;
  const rotatedHeight = rotated ? sourceWidth : sourceHeight;
  const scale = Math.min(1, maxLongSide / Math.max(rotatedWidth, rotatedHeight));

  return {
    orientation,
    sourceWidth,
    sourceHeight,
    canvasWidth: Math.max(1, Math.round(rotatedWidth * scale)),
    canvasHeight: Math.max(1, Math.round(rotatedHeight * scale)),
    scale,
  };
}

export function drawVideoFrameToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  frame: ScannerFrame,
): CanvasRenderingContext2D {
  const context =
    canvas.getContext("2d", { willReadFrequently: true }) ??
    canvas.getContext("2d");

  if (context === null) {
    throw new Error("Could not create a Canvas element.");
  }

  canvas.width = frame.canvasWidth;
  canvas.height = frame.canvasHeight;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((frame.orientation * Math.PI) / 180);
  context.scale(frame.scale, frame.scale);
  context.drawImage(video, -frame.sourceWidth / 2, -frame.sourceHeight / 2);

  return context;
}

export function mapCanvasPointToSource(
  point: ScannerPoint,
  frame: ScannerFrame,
): ScannerPoint {
  const centerX = frame.canvasWidth / 2;
  const centerY = frame.canvasHeight / 2;
  const offsetX = (point.x - centerX) / frame.scale;
  const offsetY = (point.y - centerY) / frame.scale;
  const angle = (-frame.orientation * Math.PI) / 180;
  const rotatedX = offsetX * Math.cos(angle) - offsetY * Math.sin(angle);
  const rotatedY = offsetX * Math.sin(angle) + offsetY * Math.cos(angle);

  return {
    x: rotatedX + frame.sourceWidth / 2,
    y: rotatedY + frame.sourceHeight / 2,
  };
}
