type ScannerLogger = Pick<Console, "debug">;

export function createBarcodeScannerLogger(
  enabled: boolean,
  logger: ScannerLogger = globalThis.console,
): (event: string, details?: Record<string, unknown>) => void {
  return (event, details) => {
    if (!enabled) {
      return;
    }

    logger.debug(`[BarcodeScanner] ${event}`, details ?? {});
  };
}
