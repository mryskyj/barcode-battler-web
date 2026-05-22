import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import {
  ChecksumException,
  DecodeHintType,
  FormatException,
  NotFoundException,
} from "@zxing/library";
import {
  getVisibleCandidatePoints,
  updateBarcodeCandidateTrack,
  type BarcodeCandidateTrack,
} from "./barcodeScannerCandidates";
import {
  createScannerBox,
  type ScannerBox,
  type ScannerPoint,
} from "./barcodeScannerGeometry";
import {
  SCAN_ORIENTATIONS,
  createScannerFrame,
  drawVideoFrameToCanvas,
  mapCanvasPointToSource,
  type ScannerFrame,
} from "./barcodeScannerFrame";
import { createBarcodeScannerHints } from "./barcodeScannerReader";
import { createBarcodeScannerLogger } from "./barcodeScannerLogging";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

type ScannerResultPoint = {
  getX: () => number;
  getY: () => number;
};

type ScannerDebugEntry = {
  id: number;
  event: string;
  details: string;
};

const CAMERA_UNAVAILABLE_MESSAGE =
  "この端末ではカメラ読み取りを使えません";
const SCAN_INTERVAL_MS = 120;
const SCAN_MAX_LONG_SIDE = 1280;
const logScannerEvent = createBarcodeScannerLogger(import.meta.env.DEV);

export function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateTrackRef = useRef<BarcodeCandidateTrack | null>(null);
  const candidateClearTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const successCloseTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const currentFrameRef = useRef<ScannerFrame | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const previewSizeRef = useRef({ width: 0, height: 0 });
  const debugEntryIdRef = useRef(0);

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
  const [debugEntries, setDebugEntries] = useState<ScannerDebugEntry[]>([]);
  const candidateDebugSignatureRef = useRef("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onCloseRef.current = onClose;
  }, [onClose, onDetected]);

  useEffect(() => {
    previewSizeRef.current = previewSize;
  }, [previewSize]);

  const appendDebugEntry = useCallback(
    (event: string, details?: Record<string, unknown>) => {
      logScannerEvent(event, details);

      if (!import.meta.env.DEV) {
        return;
      }

      const id = debugEntryIdRef.current + 1;
      debugEntryIdRef.current = id;
      const nextEntry: ScannerDebugEntry = {
        id,
        event,
        details: formatScannerDetails(details),
      };
      setDebugEntries((currentEntries) => [...currentEntries, nextEntry].slice(-10));
    },
    [],
  );

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
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    const video = videoElement;

    const captureCanvas = globalThis.document.createElement("canvas");
    const hints = createBarcodeScannerHints();
    hints.set(DecodeHintType.NEED_RESULT_POINT_CALLBACK, {
      foundPossibleResultPoint(point: ScannerResultPoint) {
        if (cancelled) {
          return;
        }

        const frame = currentFrameRef.current;
        if (frame === null) {
          return;
        }

        updateCandidatePreview(
          mapCanvasPointToSource(
            {
              x: point.getX(),
              y: point.getY(),
            },
            frame,
          ),
        );
      },
    });

    const reader = new BrowserMultiFormatOneDReader(hints);

    function stopScanning() {
      if (scanTimeoutRef.current !== null) {
        globalThis.clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }

    function updateCandidatePreview(point: ScannerPoint) {
      const sourceWidth = videoRef.current?.videoWidth ?? 0;
      const sourceHeight = videoRef.current?.videoHeight ?? 0;

      if (sourceWidth <= 0 || sourceHeight <= 0) {
        return;
      }

      const nextTrack = updateBarcodeCandidateTrack(
        candidateTrackRef.current,
        point,
        { width: sourceWidth, height: sourceHeight },
        Date.now(),
      );

      candidateTrackRef.current = nextTrack;

      const visiblePoints = getVisibleCandidatePoints(nextTrack, Date.now());
      setCandidatePoints(visiblePoints ?? []);
      if (visiblePoints !== null) {
        const box = createScannerBox(visiblePoints, {
          sourceWidth,
          sourceHeight,
          previewWidth: previewSizeRef.current.width,
          previewHeight: previewSizeRef.current.height,
        });
        if (box === null) {
          return;
        }

        const signature = [
          visiblePoints.length,
          Math.round(box.left),
          Math.round(box.top),
          Math.round(box.width),
          Math.round(box.height),
        ].join(":");

        if (signature !== candidateDebugSignatureRef.current) {
          candidateDebugSignatureRef.current = signature;
          appendDebugEntry("candidate-visible", {
            pointCount: visiblePoints.length,
            sourceWidth,
            sourceHeight,
            previewWidth: previewSizeRef.current.width,
            previewHeight: previewSizeRef.current.height,
            points: visiblePoints,
            box,
          });
        }
      }

      if (candidateClearTimeoutRef.current !== null) {
        globalThis.clearTimeout(candidateClearTimeoutRef.current);
      }

      candidateClearTimeoutRef.current = globalThis.setTimeout(() => {
        candidateTrackRef.current = null;
        setCandidatePoints([]);
        candidateClearTimeoutRef.current = null;
        appendDebugEntry("candidate-cleared");
      }, 240);
    }

    function scheduleNextScan() {
      if (cancelled) {
        return;
      }

      if (scanTimeoutRef.current !== null) {
        globalThis.clearTimeout(scanTimeoutRef.current);
      }

      scanTimeoutRef.current = globalThis.setTimeout(() => {
        void scanFrame();
      }, SCAN_INTERVAL_MS);
    }

    async function scanFrame() {
      if (cancelled) {
        return;
      }

      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        scheduleNextScan();
        return;
      }

      for (const orientation of SCAN_ORIENTATIONS) {
        const frame = createScannerFrame(
          video.videoWidth,
          video.videoHeight,
          orientation,
          SCAN_MAX_LONG_SIDE,
        );

        currentFrameRef.current = frame;

        try {
          drawVideoFrameToCanvas(video, captureCanvas, frame);
          const result = reader.decodeFromCanvas(captureCanvas);
          const barcode = result.getText().trim();

          if (barcode.length === 0) {
            continue;
          }

          if (candidateClearTimeoutRef.current !== null) {
            globalThis.clearTimeout(candidateClearTimeoutRef.current);
            candidateClearTimeoutRef.current = null;
          }

          candidateTrackRef.current = null;
          currentFrameRef.current = null;
          setCandidatePoints([]);

          const resultPoints = toScannerPoints(result.getResultPoints()).map((point) =>
            mapCanvasPointToSource(point, frame),
          );

          setSuccessPoints(resultPoints);
          stopScanning();
          setDetectedBarcode(barcode);
          setStatus("success");
          appendDebugEntry("scan-success", {
            barcode,
            format: String(result.getBarcodeFormat?.() ?? "unknown"),
            orientation,
            resultPointCount: resultPoints.length,
            resultPoints,
            canvasWidth: frame.canvasWidth,
            canvasHeight: frame.canvasHeight,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            previewWidth: previewSizeRef.current.width,
            previewHeight: previewSizeRef.current.height,
          });

          if (successCloseTimeoutRef.current !== null) {
            globalThis.clearTimeout(successCloseTimeoutRef.current);
          }
          successCloseTimeoutRef.current = globalThis.setTimeout(() => {
            onDetectedRef.current(barcode);
            onCloseRef.current();
            successCloseTimeoutRef.current = null;
          }, 640);

          return;
        } catch (error) {
          if (!isRetryableDecodeError(error)) {
            appendDebugEntry("scan-attempt-error", {
              orientation,
              canvasWidth: frame.canvasWidth,
              canvasHeight: frame.canvasHeight,
              errorName: getScannerErrorName(error),
              message: getScannerErrorMessage(error),
            });
            setStatus("error");
            setErrorMessage(getScannerErrorMessage(error));
            stopScanning();
            return;
          }

        }
      }

      currentFrameRef.current = null;
      scheduleNextScan();
    }

    async function startScanning() {
      try {
        setStatus("loading");
        setErrorMessage(null);
        setDetectedBarcode(null);
        candidateTrackRef.current = null;
        currentFrameRef.current = null;
        setCandidatePoints([]);
        setSuccessPoints([]);
        debugEntryIdRef.current = 0;
        setDebugEntries([]);
        candidateDebugSignatureRef.current = "";

        appendDebugEntry("scan-start", {
          tryHarder: false,
          possibleFormats:
            "CODABAR,CODE_39,CODE_93,CODE_128,EAN_8,EAN_13,ITF,RSS_14,RSS_EXPANDED,UPC_A,UPC_E",
          orientations: SCAN_ORIENTATIONS,
          scanIntervalMs: SCAN_INTERVAL_MS,
          maxLongSide: SCAN_MAX_LONG_SIDE,
        });

        const stream = await globalThis.navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        video.srcObject = stream;
        await video.play();
        const [videoTrack] = stream.getVideoTracks();
        appendDebugEntry("camera-ready", {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          previewWidth: previewSizeRef.current.width,
          previewHeight: previewSizeRef.current.height,
          trackSettings: videoTrack?.getSettings?.(),
          trackCapabilities: videoTrack?.getCapabilities?.(),
        });

        setStatus("scanning");
        void scanFrame();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(getScannerErrorMessage(error));
        appendDebugEntry("scanner-failed", {
          errorName: getScannerErrorName(error),
          message: getScannerErrorMessage(error),
        });
      }
    }

    void startScanning();

    return () => {
      cancelled = true;
      stopScanning();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      streamRef.current = null;
      currentFrameRef.current = null;
      if (candidateClearTimeoutRef.current !== null) {
        globalThis.clearTimeout(candidateClearTimeoutRef.current);
        candidateClearTimeoutRef.current = null;
      }
      if (successCloseTimeoutRef.current !== null) {
        globalThis.clearTimeout(successCloseTimeoutRef.current);
        successCloseTimeoutRef.current = null;
      }
    };
  }, [appendDebugEntry, cameraAvailable]);

  const activeBox = useMemo<ScannerBox | null>(() => {
    const points = status === "success" ? successPoints : candidatePoints;

    return createScannerBox(points, {
      sourceWidth: videoSize.width,
      sourceHeight: videoSize.height,
      previewWidth: previewSize.width,
      previewHeight: previewSize.height,
    });
  }, [
    previewSize.height,
    previewSize.width,
    candidatePoints,
    status,
    successPoints,
    videoSize.height,
    videoSize.width,
  ]);

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
      {import.meta.env.DEV ? (
        <section className="barcode-scanner-debug" aria-label="バーコードスキャナーログ">
          <div className="barcode-scanner-debug-header">
            <strong>Scanner log</strong>
            <span>latest 10</span>
          </div>
          <ol className="barcode-scanner-debug-list">
            {debugEntries.length === 0 ? (
              <li className="barcode-scanner-debug-empty">まだログはありません</li>
            ) : (
              debugEntries.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.event}</strong>
                  {entry.details.length === 0 ? null : <span>{entry.details}</span>}
                </li>
              ))
            )}
          </ol>
        </section>
      ) : null}
    </section>
  );
}

function getScannerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "カメラを起動できませんでした";
}

function getScannerErrorName(error: unknown): string {
  if (error instanceof Error && error.name.trim() !== "") {
    return error.name;
  }

  return "Error";
}

function isRetryableDecodeError(error: unknown): boolean {
  return (
    error instanceof NotFoundException ||
    error instanceof ChecksumException ||
    error instanceof FormatException
  );
}

function toScannerPoints(resultPoints: ScannerResultPoint[]): ScannerPoint[] {
  return resultPoints.map((point) => ({
    x: point.getX(),
    y: point.getY(),
  }));
}

function formatScannerDetails(details?: Record<string, unknown>): string {
  if (details === undefined) {
    return "";
  }

  try {
    return JSON.stringify(details, (_, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value.entries());
      }

      if (value instanceof Set) {
        return [...value.values()];
      }

      return value;
    });
  } catch {
    return "";
  }
}
