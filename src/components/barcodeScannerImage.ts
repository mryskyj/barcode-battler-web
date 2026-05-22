export const SCANNER_IMAGE_VARIANTS = [
  "original",
  "lumaContrast",
  "darkChannelContrast",
] as const;

export type ScannerImageVariant = (typeof SCANNER_IMAGE_VARIANTS)[number];

export function applyScannerImageVariant(
  context: CanvasRenderingContext2D,
  variant: ScannerImageVariant,
): void {
  if (variant === "original") {
    return;
  }

  const imageData = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
  enhanceScannerPixels(imageData.data, variant);
  context.putImageData(imageData, 0, 0);
}

export function enhanceScannerPixels(
  pixels: Uint8ClampedArray,
  variant: Exclude<ScannerImageVariant, "original">,
): void {
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const alpha = pixels[index + 3] ?? 255;
    const gray =
      variant === "darkChannelContrast"
        ? Math.min(red, green, blue)
        : toLuma(red, green, blue);
    const boosted = boostBarcodeContrast(gray);

    pixels[index] = boosted;
    pixels[index + 1] = boosted;
    pixels[index + 2] = boosted;
    pixels[index + 3] = alpha;
  }
}

function toLuma(red: number, green: number, blue: number): number {
  return (306 * red + 601 * green + 117 * blue + 0x200) >> 10;
}

function boostBarcodeContrast(gray: number): number {
  if (gray >= 210) {
    return 255;
  }

  if (gray <= 64) {
    return 0;
  }

  return Math.max(0, Math.min(255, Math.round((gray - 64) * 0.7)));
}
