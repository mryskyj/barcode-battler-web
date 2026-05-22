import { BarcodeScannerDebugPanel } from "./BarcodeScannerDebugPanel";
import { useBarcodeScanner } from "./useBarcodeScanner";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const {
    activeBox,
    debugEntries,
    detectedBarcode,
    errorMessage,
    previewRef,
    scannerDebugEnabled,
    status,
    videoRef,
  } = useBarcodeScanner({ onDetected, onClose });

  return (
    <section className="barcode-scanner" aria-label="カメラでバーコード読み取り">
      <div className="barcode-scanner-header">
        <strong>カメラで読み取り</strong>
        <button type="button" className="secondary-button" onClick={onClose}>
          カメラを閉じる
        </button>
      </div>
      <div ref={previewRef} className={`barcode-scanner-preview barcode-scanner-preview-${status}`}>
        <div className="barcode-scanner-overlay" aria-hidden="true">
          {activeBox === null ? null : (
            <span
              className={`barcode-scanner-target barcode-scanner-target-${
                status === "success" ? "success" : "searching"
              }`}
              style={{
                left: `${activeBox.left}px`,
                top: `${activeBox.top}px`,
                width: `${activeBox.width}px`,
                height: `${activeBox.height}px`,
              }}
            />
          )}
          {status === "success" ? (
            <div className="barcode-scanner-success-banner" aria-hidden="true">
              <span>読み取り成功</span>
              <strong>{detectedBarcode ?? ""}</strong>
            </div>
          ) : null}
        </div>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="バーコード読み取り映像"
        />
      </div>
      <p
        className={`mode-note barcode-scanner-status barcode-scanner-status-${status}`}
        role="status"
        aria-live="polite"
      >
        {status === "loading"
          ? "カメラを起動しています"
          : status === "scanning"
            ? activeBox === null
              ? "バーコードを探しています"
              : "バーコード候補を追跡中"
            : status === "success"
              ? `読み取り成功: ${detectedBarcode ?? ""}`
              : "カメラを起動できませんでした"}
      </p>
      {errorMessage === null ? null : <p className="field-error">{errorMessage}</p>}
      {scannerDebugEnabled ? (
        <BarcodeScannerDebugPanel entries={debugEntries} />
      ) : null}
    </section>
  );
}
