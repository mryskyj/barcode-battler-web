import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import {
  createScannerBox,
  type ScannerBox,
  type ScannerPoint,
} from "./barcodeScannerGeometry";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

type ScannerControls = {
  stop: () => void;
};

type ScannerResultPoint = {
  getX: () => number;
  getY: () => number;
};

const CAMERA_UNAVAILABLE_MESSAGE =
  "この端末ではカメラ読み取りを使えません";

export function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const successCloseTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const candidateClearTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const cameraAvailable =
    typeof globalThis.navigator !== "undefined" &&
    globalThis.navigator.mediaDevices?.getUserMedia !== undefined;
  const [status, setStatus] = useState<"loading" | "scanning" | "success" | "error">(
    cameraAvailable ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    cameraAvailable ? null : CAMERA_UNAVAILABLE_MESSAGE,
  );
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [candidatePoints, setCandidatePoints] = useState<ScannerPoint[]>([]);
  const [successPoints, setSuccessPoints] = useState<ScannerPoint[]>([]);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onCloseRef.current = onClose;
  }, [onClose, onDetected]);

  useLayoutEffect(() => {
    const video = videoRef.current;

    if (video === null) {
      return;
    }

    const updateVideoSize = () => {
      setVideoSize({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    updateVideoSize();
    video.addEventListener("loadedmetadata", updateVideoSize);
    video.addEventListener("resize", updateVideoSize);

    return () => {
      video.removeEventListener("loadedmetadata", updateVideoSize);
      video.removeEventListener("resize", updateVideoSize);
    };
  }, []);

  useLayoutEffect(() => {
    const preview = previewRef.current;

    if (preview === null) {
      return;
    }

    const updatePreviewSize = () => {
      const rect = preview.getBoundingClientRect();
      setPreviewSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updatePreviewSize();

    if (typeof globalThis.ResizeObserver !== "undefined") {
      const observer = new globalThis.ResizeObserver(updatePreviewSize);
      observer.observe(preview);

      return () => {
        observer.disconnect();
      };
    }

    globalThis.addEventListener("resize", updatePreviewSize);

    return () => {
      globalThis.removeEventListener("resize", updatePreviewSize);
    };
  }, []);

  useEffect(() => {
    if (!cameraAvailable) {
      return;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatOneDReader(
      new Map([
        [
          DecodeHintType.NEED_RESULT_POINT_CALLBACK,
          {
            foundPossibleResultPoint(point: ScannerResultPoint) {
              if (cancelled) {
                return;
              }

              queueCandidatePoint(point);
            },
          },
        ],
      ]),
    );

    function queueCandidatePoint(point: ScannerResultPoint) {
      setCandidatePoints((currentPoints) => [
        ...currentPoints.slice(-3),
        {
          x: point.getX(),
          y: point.getY(),
        },
      ]);

      if (candidateClearTimeoutRef.current !== null) {
        globalThis.clearTimeout(candidateClearTimeoutRef.current);
      }

      candidateClearTimeoutRef.current = globalThis.setTimeout(() => {
        setCandidatePoints([]);
        candidateClearTimeoutRef.current = null;
      }, 260);
    }

    async function startScanning() {
      try {
        setStatus("loading");
        setErrorMessage(null);
        setCandidatePoints([]);
        setSuccessPoints([]);

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

            if (candidateClearTimeoutRef.current !== null) {
              globalThis.clearTimeout(candidateClearTimeoutRef.current);
            }

            setSuccessPoints(
              result.getResultPoints().map((point) => ({
                x: point.getX(),
                y: point.getY(),
              })),
            );
            scannerControls.stop();
            setDetectedBarcode(barcode);
            setStatus("success");
            if (successCloseTimeoutRef.current !== null) {
              globalThis.clearTimeout(successCloseTimeoutRef.current);
            }
            successCloseTimeoutRef.current = globalThis.setTimeout(() => {
              onDetectedRef.current(barcode);
              onCloseRef.current();
              successCloseTimeoutRef.current = null;
            }, 640);
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
      if (successCloseTimeoutRef.current !== null) {
        globalThis.clearTimeout(successCloseTimeoutRef.current);
      }
      if (candidateClearTimeoutRef.current !== null) {
        globalThis.clearTimeout(candidateClearTimeoutRef.current);
      }
      controlsRef.current = null;
    };
  }, [cameraAvailable]);

  const activeBox = useMemo<ScannerBox | null>(() => {
    const points = status === "success" ? successPoints : candidatePoints;

    return createScannerBox(points, {
      sourceWidth: videoSize.width,
      sourceHeight: videoSize.height,
      previewWidth: previewSize.width,
      previewHeight: previewSize.height,
    });
  }, [
    candidatePoints,
    previewSize.height,
    previewSize.width,
    status,
    successPoints,
    videoSize.height,
    videoSize.width,
  ]);

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
      <div ref={previewRef} className={`barcode-scanner-preview barcode-scanner-preview-${status}`}>
        <div className="barcode-scanner-overlay" aria-hidden="true">
          <span
            className={`barcode-scanner-searching-frame${
              activeBox === null && status !== "success"
                ? " barcode-scanner-searching-frame-visible"
                : ""
            }`}
          />
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
      <p className={`mode-note barcode-scanner-status barcode-scanner-status-${status}`} role="status" aria-live="polite">
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
