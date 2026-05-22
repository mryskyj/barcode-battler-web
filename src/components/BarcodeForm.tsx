import { useState } from "react";
import type { FormEvent } from "react";
import { validateBarcodeInput } from "../domain/barcodeValidation";
import { BarcodeScanner } from "./BarcodeScanner";

type BarcodeFormProps = {
  barcode: string;
  errorMessage: string | null;
  canSubmit: boolean;
  onBarcodeChange: (barcode: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  label?: string;
};

export function BarcodeForm({
  barcode,
  errorMessage,
  canSubmit,
  onBarcodeChange,
  onSubmit,
  submitLabel = "生成して戦う",
  label = "バーコード",
}: BarcodeFormProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit();
  }

  function handleCameraOpen() {
    setScannerError(null);
    setScannerOpen(true);
  }

  function handleCameraClose() {
    setScannerOpen(false);
    setScannerError(null);
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
        {errorMessage === null ? null : (
          <p className="field-error" id="barcode-error">
            {errorMessage}
          </p>
        )}
        {scannerError === null ? null : (
          <p className="field-error">{scannerError}</p>
        )}
        <div className="barcode-actions">
          <button type="submit" disabled={!canSubmit}>
            {submitLabel}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={scannerOpen ? handleCameraClose : handleCameraOpen}
          >
            {scannerOpen ? "カメラを閉じる" : "カメラで読み取る"}
          </button>
        </div>
      </form>
      {scannerOpen ? (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={handleCameraClose}
        />
      ) : null}
    </div>
  );
}
