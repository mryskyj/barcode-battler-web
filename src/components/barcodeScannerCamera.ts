import { CAMERA_CONSTRAINTS } from "./barcodeScannerConfig";
import {
  getScannerErrorMessage,
  getScannerErrorName,
} from "./barcodeScannerErrors";

export type ScannerDebugAppender = (
  event: string,
  details?: Record<string, unknown>,
) => void;

export async function requestCameraStream(
  mediaDevices: MediaDevices,
  appendDebugEntry: ScannerDebugAppender,
): Promise<MediaStream> {
  let lastError: unknown = null;

  for (const [index, constraints] of CAMERA_CONSTRAINTS.entries()) {
    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      appendDebugEntry("camera-constraints-selected", {
        index,
        constraints,
      });
      return stream;
    } catch (error) {
      lastError = error;
      appendDebugEntry("camera-constraints-failed", {
        index,
        constraints,
        errorName: getScannerErrorName(error),
        message: getScannerErrorMessage(error),
      });
    }
  }

  throw lastError ?? new Error("カメラを起動できませんでした");
}
