import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

type ScannerControls = {
  stop: () => void;
};

const CAMERA_UNAVAILABLE_MESSAGE =
  "この端末ではカメラ読み取りを使えません";

export function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const cameraAvailable =
    typeof globalThis.navigator !== "undefined" &&
    globalThis.navigator.mediaDevices?.getUserMedia !== undefined;
  const [status, setStatus] = useState<"loading" | "scanning" | "error">(
    cameraAvailable ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    cameraAvailable ? null : CAMERA_UNAVAILABLE_MESSAGE,
  );

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onCloseRef.current = onClose;
  }, [onClose, onDetected]);

  useEffect(() => {
    if (!cameraAvailable) {
      return;
    }

    const reader = new BrowserMultiFormatOneDReader();
    let cancelled = false;

    async function startScanning() {
      try {
        setStatus("loading");
        setErrorMessage(null);

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current ?? undefined,
          (result, error, scannerControls) => {
            controlsRef.current = scannerControls;

            if (cancelled || result === undefined) {
              return;
            }

            const barcode = result.getText().trim();

            if (barcode.length === 0) {
              return;
            }

            scannerControls.stop();
            onDetectedRef.current(barcode);
            onCloseRef.current();
          },
        );

        controlsRef.current = controls;

        if (!cancelled) {
          setStatus("scanning");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(getScannerErrorMessage(error));
      }
    }

    void startScanning();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cameraAvailable]);

  return (
    <section className="barcode-scanner" aria-label="カメラでバーコード読み取り">
      <div className="barcode-scanner-header">
        <strong>カメラで読み取り</strong>
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
        >
          カメラを閉じる
        </button>
      </div>
      <div className="barcode-scanner-preview">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="バーコード読み取り映像"
        />
      </div>
      <p className="mode-note" role="status">
        {status === "loading"
          ? "カメラを起動しています"
          : status === "scanning"
            ? "バーコードを映してください"
            : "カメラを起動できませんでした"}
      </p>
      {errorMessage === null ? null : (
        <p className="field-error">{errorMessage}</p>
      )}
    </section>
  );
}

function getScannerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "カメラを起動できませんでした";
}
