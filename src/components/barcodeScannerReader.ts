import { DecodeHintType } from "@zxing/library";

export function createBarcodeScannerHints(): Map<DecodeHintType, unknown> {
  return new Map([[DecodeHintType.TRY_HARDER, true]]);
}
