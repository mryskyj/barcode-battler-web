import type { ScannerPoint } from "./barcodeScannerGeometry";

export type NativeBarcodeDetection = {
  rawValue: string;
  format: string;
  points: ScannerPoint[];
};

type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<NativeDetectedBarcode[]>;
};

type NativeDetectedBarcode = {
  rawValue: string;
  format?: string;
  cornerPoints?: ScannerPoint[];
};

type NativeBarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => NativeBarcodeDetector;

type NativeBarcodeDetectorGlobal = typeof globalThis & {
  BarcodeDetector?: NativeBarcodeDetectorConstructor;
};

const NATIVE_BARCODE_FORMATS = [
  "ean_8",
  "ean_13",
  "upc_a",
  "upc_e",
] as const;

export function createNativeBarcodeDetector(
  globalObject: NativeBarcodeDetectorGlobal = globalThis,
): NativeBarcodeDetector | null {
  const Detector = globalObject.BarcodeDetector;

  if (Detector === undefined) {
    return null;
  }

  return new Detector({ formats: [...NATIVE_BARCODE_FORMATS] });
}

export async function detectNativeBarcodes(
  detector: NativeBarcodeDetector | null,
  source: CanvasImageSource,
): Promise<NativeBarcodeDetection[]> {
  if (detector === null) {
    return [];
  }

  const results = await detector.detect(source);

  return results.map((result) => ({
    rawValue: result.rawValue.trim(),
    format: result.format ?? "unknown",
    points: result.cornerPoints ?? [],
  }));
}
