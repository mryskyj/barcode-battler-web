import { describe, expect, it, vi } from "vitest";
import { createBarcodeScannerLogger } from "./barcodeScannerLogging";

describe("barcodeScannerLogging", () => {
  it("writes debug output when enabled", () => {
    const debug = vi.fn();
    const logger = createBarcodeScannerLogger(true, { debug });

    logger("scan-start", { ready: true });

    expect(debug).toHaveBeenCalledWith("[BarcodeScanner] scan-start", {
      ready: true,
    });
  });

  it("stays silent when disabled", () => {
    const debug = vi.fn();
    const logger = createBarcodeScannerLogger(false, { debug });

    logger("scan-start", { ready: true });

    expect(debug).not.toHaveBeenCalled();
  });
});
