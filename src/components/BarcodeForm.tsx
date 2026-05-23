import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { validateBarcodeInput } from "../domain/barcodeValidation";
import { BarcodeScanner } from "./BarcodeScanner";
import { BarcodeScannerDebugPanel } from "./BarcodeScannerDebugPanel";
import {
  isBarcodeScannerDebugEnabled,
  type ScannerDebugEntry,
} from "./barcodeScannerDebug";

type BarcodeFormProps = {
  barcode: string;
  errorMessage: string | null;
  canSubmit: boolean;
  onBarcodeChange: (barcode: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  label?: string;
  scannerInitiallyOpen?: boolean;
  manualEntryInitiallyVisible?: boolean;
};

export function BarcodeForm({
  barcode,
  errorMessage,
  canSubmit,
  onBarcodeChange,
  onSubmit,
  submitLabel = "生成して戦う",
  label = "バーコード",
  scannerInitiallyOpen = false,
  manualEntryInitiallyVisible = true,
}: BarcodeFormProps) {
  const [scannerOpen, setScannerOpen] = useState(scannerInitiallyOpen);
  const [manualEntryVisible, setManualEntryVisible] = useState(
    manualEntryInitiallyVisible,
  );
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [lastScannerDebugEntries, setLastScannerDebugEntries] = useState<
    ScannerDebugEntry[]
  >([]);
  const scannerDebugEnabled = useMemo(
    () => isBarcodeScannerDebugEnabled(import.meta.env.DEV),
    [],
  );
  const showManualEntry = manualEntryVisible && !scannerOpen;
  const showScanNote =
    !manualEntryVisible && !scannerOpen && barcode.length === 0;
  const showDetectedBarcode =
    !manualEntryVisible && !scannerOpen && barcode.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit();
  }

  function handleCameraOpen() {
    setScannerError(null);
    setLastScannerDebugEntries([]);
    setManualEntryVisible(false);
    setScannerOpen(true);
  }

  function handleCameraClose() {
    setScannerOpen(false);
    setScannerError(null);
  }

  function handleManualEntryOpen() {
    setScannerOpen(false);
    setScannerError(null);
    setManualEntryVisible(true);
  }

  function handleBarcodeDetected(scannedBarcode: string) {
    const validation = validateBarcodeInput(scannedBarcode);

    if (!validation.isValid) {
      setScannerError(validation.message);
      return;
    }

    setScannerError(null);
    onBarcodeChange(validation.normalizedBarcode);
    setScannerOpen(false);
  }

  return (
    <div className="barcode-form-stack">
      <form className="barcode-form" onSubmit={handleSubmit}>
        {showManualEntry ? (
          <label className="field">
            <span>{label}</span>
            <input
              value={barcode}
              onChange={(event) => onBarcodeChange(event.target.value)}
              inputMode="numeric"
              placeholder="4901234567894"
              aria-invalid={errorMessage === null ? undefined : true}
              aria-describedby={errorMessage === null ? undefined : "barcode-error"}
            />
          </label>
        ) : showScanNote ? (
          <p className="barcode-scan-note">バーコードをカメラにかざしてください</p>
        ) : showDetectedBarcode ? (
          <p className="barcode-detected-value">
            <span>読み取り結果</span>
            <strong>{barcode}</strong>
          </p>
        ) : null}
        {errorMessage === null ? null : (
          <p className="field-error" id="barcode-error">
            {errorMessage}
          </p>
        )}
        {scannerError === null ? null : (
          <p className="field-error">{scannerError}</p>
        )}
        <div className="barcode-actions">
          {scannerOpen ? null : (
            <button type="submit" disabled={!canSubmit}>
              {submitLabel}
            </button>
          )}
          {scannerOpen ? null : (
            <button type="button" className="secondary-button" onClick={handleCameraOpen}>
              カメラで読み取る
            </button>
          )}
        </div>
      </form>
      {scannerOpen ? (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={handleCameraClose}
          onManualEntry={manualEntryVisible ? undefined : handleManualEntryOpen}
          onDebugEntriesChange={setLastScannerDebugEntries}
        />
      ) : scannerDebugEnabled && lastScannerDebugEntries.length > 0 ? (
        <BarcodeScannerDebugPanel entries={lastScannerDebugEntries} />
      ) : null}
    </div>
  );
}
