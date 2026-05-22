import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export const BARCODE_SCANNER_FORMATS = [
  BarcodeFormat.EAN_8,
  BarcodeFormat.EAN_13,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
] as const;

export function createBarcodeScannerHints(): Map<DecodeHintType, unknown> {
  return new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [...BARCODE_SCANNER_FORMATS]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
}
