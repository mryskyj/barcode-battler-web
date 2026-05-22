import {
  ChecksumException,
  FormatException,
  NotFoundException,
} from "@zxing/library";

const CANVAS_CONTEXT_ERROR_MESSAGE = "Could not create a Canvas element.";

export function getScannerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "カメラを起動できませんでした";
}

export function getScannerErrorName(error: unknown): string {
  if (error instanceof Error && error.name.trim() !== "") {
    return error.name;
  }

  return "Error";
}

export function isRetryableDecodeError(error: unknown): boolean {
  return (
    error instanceof NotFoundException ||
    error instanceof ChecksumException ||
    error instanceof FormatException
  );
}

export function isRecoverableScanError(error: unknown): boolean {
  return (
    isRetryableDecodeError(error) ||
    getScannerErrorMessage(error) === CANVAS_CONTEXT_ERROR_MESSAGE
  );
}
