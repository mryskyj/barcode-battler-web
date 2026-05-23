import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { validateScannedBarcode } from "../domain/scannedBarcodeValidation";
import { requestCameraStream } from "./barcodeScannerCamera";
import {
  getVisibleCandidatePoints,
  updateBarcodeCandidateTrack,
  type BarcodeCandidateTrack,
} from "./barcodeScannerCandidates";
import {
  CAMERA_SESSION_TIMEOUT_MS,
  CAMERA_UNAVAILABLE_MESSAGE,
  SCAN_INTERVAL_MS,
  SCAN_MAX_LONG_SIDES,
} from "./barcodeScannerConfig";
import {
  formatScannerDetails,
  isBarcodeScannerDebugEnabled,
  SCANNER_DEBUG_ENTRY_LIMIT,
  type ScannerDebugEntry,
} from "./barcodeScannerDebug";
import {
  getScannerErrorMessage,
  getScannerErrorName,
  isRecoverableScanError,
} from "./barcodeScannerErrors";
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
import {
  SCANNER_IMAGE_VARIANTS,
  applyScannerImageVariant,
} from "./barcodeScannerImage";
import {
  applyContinuousCameraFocus,
  createFocusPointFromPreviewEvent,
  focusCameraAtPoint,
  getFocusPointTimeoutMs,
} from "./barcodeScannerFocus";
import { createBarcodeScannerLogger } from "./barcodeScannerLogging";
import { createBarcodeScannerHints } from "./barcodeScannerReader";
import {
  createNativeBarcodeDetector,
  detectNativeBarcodes,
  type NativeBarcodeDetection,
} from "./barcodeNativeDetector";

type ScannerResultPoint = {
  getX: () => number;
  getY: () => number;
};

export type BarcodeScannerStatus = "loading" | "scanning" | "success" | "error";

type UseBarcodeScannerOptions = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

export function useBarcodeScanner({
  onDetected,
  onClose,
}: UseBarcodeScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateTrackRef = useRef<BarcodeCandidateTrack | null>(null);
  const candidateClearTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const successCloseTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const cameraSessionTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const focusPointTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const currentFrameRef = useRef<ScannerFrame | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const previewSizeRef = useRef({ width: 0, height: 0 });
  const debugEntryIdRef = useRef(0);
  const candidateDebugSignatureRef = useRef("");
  const scanCycleCountRef = useRef(0);

  const cameraAvailable =
    typeof globalThis.navigator !== "undefined" &&
    globalThis.navigator.mediaDevices?.getUserMedia !== undefined;
  const [status, setStatus] = useState<BarcodeScannerStatus>(
    cameraAvailable ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    cameraAvailable ? null : CAMERA_UNAVAILABLE_MESSAGE,
  );
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [candidatePoints, setCandidatePoints] = useState<ScannerPoint[]>([]);
  const [successPoints, setSuccessPoints] = useState<ScannerPoint[]>([]);
  const [focusPoint, setFocusPoint] = useState<ScannerPoint | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [debugEntries, setDebugEntries] = useState<ScannerDebugEntry[]>([]);
  const scannerDebugEnabled = useMemo(
    () => isBarcodeScannerDebugEnabled(import.meta.env.DEV),
    [],
  );
  const logScannerEvent = useMemo(
    () => createBarcodeScannerLogger(scannerDebugEnabled),
    [scannerDebugEnabled],
  );

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

      if (!scannerDebugEnabled) {
        return;
      }

      const id = debugEntryIdRef.current + 1;
      debugEntryIdRef.current = id;
      const nextEntry: ScannerDebugEntry = {
        id,
        createdAt: new Date().toISOString(),
        event,
        details: formatScannerDetails(details),
      };
      setDebugEntries((currentEntries) =>
        [...currentEntries, nextEntry].slice(-SCANNER_DEBUG_ENTRY_LIMIT),
      );
    },
    [logScannerEvent, scannerDebugEnabled],
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
    const nativeDetector = createNativeBarcodeDetector();

    function stopScanning() {
      if (scanTimeoutRef.current !== null) {
        globalThis.clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }

    function closeScanner(reason: string) {
      if (cancelled) {
        return;
      }

      appendDebugEntry("scanner-closed", { reason });
      onCloseRef.current();
    }

    function handleVisibilityChange() {
      if (globalThis.document.visibilityState !== "visible") {
        closeScanner("document-hidden");
      }
    }

    function handlePageHidden() {
      closeScanner("page-hidden");
    }

    async function focusAtPreviewPoint(event: PointerEvent) {
      const preview = previewRef.current;
      const stream = streamRef.current;

      if (preview === null || stream === null) {
        return;
      }

      const point = createFocusPointFromPreviewEvent(
        event,
        preview.getBoundingClientRect(),
      );

      try {
        const result = await focusCameraAtPoint(stream, point);
        appendDebugEntry("camera-focus-requested", result);

        if (!result.applied || result.point === null) {
          return;
        }

        setFocusPoint({
          x: result.point.x * previewSizeRef.current.width,
          y: result.point.y * previewSizeRef.current.height,
        });

        if (focusPointTimeoutRef.current !== null) {
          globalThis.clearTimeout(focusPointTimeoutRef.current);
        }
        focusPointTimeoutRef.current = globalThis.setTimeout(() => {
          setFocusPoint(null);
          focusPointTimeoutRef.current = null;
        }, getFocusPointTimeoutMs());
      } catch (error) {
        appendDebugEntry("camera-focus-failed", {
          errorName: getScannerErrorName(error),
          message: getScannerErrorMessage(error),
        });
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
        appendCandidateDebugEntry(visiblePoints, sourceWidth, sourceHeight);
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

    function appendCandidateDebugEntry(
      visiblePoints: ScannerPoint[],
      sourceWidth: number,
      sourceHeight: number,
    ) {
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

      if (signature === candidateDebugSignatureRef.current) {
        return;
      }

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

      for (const maxLongSide of SCAN_MAX_LONG_SIDES) {
        for (const orientation of SCAN_ORIENTATIONS) {
          const frame = createScannerFrame(
            video.videoWidth,
            video.videoHeight,
            orientation,
            maxLongSide,
          );

          currentFrameRef.current = frame;

          try {
            const captureContext = drawVideoFrameToCanvas(
              video,
              captureCanvas,
              frame,
            );
            const originalImageData = captureContext.getImageData(
              0,
              0,
              captureCanvas.width,
              captureCanvas.height,
            );

            for (const imageVariant of SCANNER_IMAGE_VARIANTS) {
              if (imageVariant !== "original") {
                captureContext.putImageData(originalImageData, 0, 0);
                applyScannerImageVariant(captureContext, imageVariant);
              }

              if (
                await tryNativeBarcodeDetector(
                  nativeDetector,
                  captureCanvas,
                  frame,
                  imageVariant,
                )
              ) {
                return;
              }

              try {
                const result = reader.decodeFromCanvas(captureCanvas);
                const barcode = result.getText().trim();
                const validation = validateScannedBarcode(
                  barcode,
                  result.getBarcodeFormat?.(),
                );

                if (!validation.isValid) {
                  appendDebugEntry("scan-result-rejected", {
                    barcode,
                    format: String(result.getBarcodeFormat?.() ?? "unknown"),
                    reason: validation.reason,
                    orientation,
                    imageVariant,
                  });
                  continue;
                }

                handleScanSuccess(
                  validation.normalizedBarcode,
                  result,
                  frame,
                  `zxing:${imageVariant}`,
                );
                return;
              } catch (error) {
                if (!isRecoverableScanError(error)) {
                  throw error;
                }
              }
            }
          } catch (error) {
            appendDebugEntry("scan-frame-skipped", {
              orientation,
              maxLongSide,
              canvasWidth: frame.canvasWidth,
              canvasHeight: frame.canvasHeight,
              errorName: getScannerErrorName(error),
              message: getScannerErrorMessage(error),
            });
          }
        }
      }

      currentFrameRef.current = null;
      scanCycleCountRef.current += 1;
      if (scanCycleCountRef.current === 1 || scanCycleCountRef.current % 10 === 0) {
        appendDebugEntry("scan-cycle-no-result", {
          cycleCount: scanCycleCountRef.current,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          previewWidth: previewSizeRef.current.width,
          previewHeight: previewSizeRef.current.height,
          scanIntervalMs: SCAN_INTERVAL_MS,
          maxLongSides: SCAN_MAX_LONG_SIDES,
          orientations: SCAN_ORIENTATIONS,
          imageVariants: SCANNER_IMAGE_VARIANTS,
        });
      }
      scheduleNextScan();
    }

    async function tryNativeBarcodeDetector(
      nativeDetector: ReturnType<typeof createNativeBarcodeDetector>,
      source: HTMLCanvasElement,
      frame: ScannerFrame,
      imageVariant: string,
    ): Promise<boolean> {
      try {
        const results = await detectNativeBarcodes(nativeDetector, source);

        if (results.length === 0) {
          return false;
        }

        appendDebugEntry("native-detector-results", {
          count: results.length,
          orientation: frame.orientation,
          imageVariant,
          results: results.map((result) => ({
            rawValue: result.rawValue,
            format: result.format,
            pointCount: result.points.length,
          })),
        });

        for (const result of results) {
          const validation = validateScannedBarcode(result.rawValue, undefined);

          if (!validation.isValid) {
            appendDebugEntry("scan-result-rejected", {
              barcode: result.rawValue,
              format: result.format,
              reason: validation.reason,
              source: "native",
              orientation: frame.orientation,
              imageVariant,
            });
            continue;
          }

          handleScanSuccess(
            validation.normalizedBarcode,
            createNativeResultAdapter(result),
            frame,
            `native:${imageVariant}`,
          );
          return true;
        }
      } catch (error) {
        appendDebugEntry("native-detector-failed", {
          orientation: frame.orientation,
          imageVariant,
          errorName: getScannerErrorName(error),
          message: getScannerErrorMessage(error),
        });
      }

      return false;
    }

    function handleScanSuccess(
      barcode: string,
      result: {
        getBarcodeFormat?: () => unknown;
        getResultPoints: () => ScannerResultPoint[];
      },
      frame: ScannerFrame,
      imageVariant: string,
    ) {
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
        orientation: frame.orientation,
        imageVariant,
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
        scanCycleCountRef.current = 0;

        appendDebugEntry("scan-start", {
          tryHarder: true,
          possibleFormats: "EAN_8,EAN_13,UPC_A,UPC_E,native BarcodeDetector",
          nativeBarcodeDetector: nativeDetector === null ? "unavailable" : "available",
          orientations: SCAN_ORIENTATIONS,
          imageVariants: SCANNER_IMAGE_VARIANTS,
          scanIntervalMs: SCAN_INTERVAL_MS,
          maxLongSides: SCAN_MAX_LONG_SIDES,
          environment: createScannerEnvironmentDetails(),
        });

        const stream = await requestCameraStream(
          globalThis.navigator.mediaDevices,
          appendDebugEntry,
        );

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        const [videoTrack] = stream.getVideoTracks();
        try {
          appendDebugEntry(
            "camera-continuous-focus",
            await applyContinuousCameraFocus(stream),
          );
        } catch (error) {
          appendDebugEntry("camera-continuous-focus-failed", {
            errorName: getScannerErrorName(error),
            message: getScannerErrorMessage(error),
          });
        }
        appendDebugEntry("camera-ready", {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          previewWidth: previewSizeRef.current.width,
          previewHeight: previewSizeRef.current.height,
          trackLabel: videoTrack?.label,
          trackEnabled: videoTrack?.enabled,
          trackMuted: videoTrack?.muted,
          trackReadyState: videoTrack?.readyState,
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

    cameraSessionTimeoutRef.current = globalThis.setTimeout(() => {
      closeScanner("session-timeout");
    }, CAMERA_SESSION_TIMEOUT_MS);
    globalThis.document.addEventListener("visibilitychange", handleVisibilityChange);
    globalThis.addEventListener("pagehide", handlePageHidden);
    const previewElement = previewRef.current;
    previewElement?.addEventListener("pointerdown", focusAtPreviewPoint);

    void startScanning();

    return () => {
      cancelled = true;
      stopScanning();
      globalThis.document.removeEventListener("visibilitychange", handleVisibilityChange);
      globalThis.removeEventListener("pagehide", handlePageHidden);
      previewElement?.removeEventListener("pointerdown", focusAtPreviewPoint);
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
      if (cameraSessionTimeoutRef.current !== null) {
        globalThis.clearTimeout(cameraSessionTimeoutRef.current);
        cameraSessionTimeoutRef.current = null;
      }
      if (focusPointTimeoutRef.current !== null) {
        globalThis.clearTimeout(focusPointTimeoutRef.current);
        focusPointTimeoutRef.current = null;
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

  return {
    activeBox,
    debugEntries,
    detectedBarcode,
    errorMessage,
    focusPoint,
    previewRef,
    scannerDebugEnabled,
    status,
    videoRef,
  };
}

function toScannerPoints(resultPoints: ScannerResultPoint[]): ScannerPoint[] {
  return resultPoints.map((point) => ({
    x: point.getX(),
    y: point.getY(),
  }));
}

function createNativeResultAdapter(result: NativeBarcodeDetection): {
  getBarcodeFormat: () => string;
  getResultPoints: () => ScannerResultPoint[];
} {
  return {
    getBarcodeFormat: () => result.format,
    getResultPoints: () =>
      result.points.map((point) => ({
        getX: () => point.x,
        getY: () => point.y,
      })),
  };
}

function createScannerEnvironmentDetails() {
  return {
    userAgent: globalThis.navigator.userAgent,
    platform: globalThis.navigator.platform,
    language: globalThis.navigator.language,
    hardwareConcurrency: globalThis.navigator.hardwareConcurrency,
    deviceMemory: "deviceMemory" in globalThis.navigator
      ? (globalThis.navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined,
    devicePixelRatio: globalThis.devicePixelRatio,
    innerWidth: globalThis.innerWidth,
    innerHeight: globalThis.innerHeight,
    screenWidth: globalThis.screen?.width,
    screenHeight: globalThis.screen?.height,
    screenOrientation: globalThis.screen?.orientation?.type,
    isSecureContext: globalThis.isSecureContext,
    visibilityState: globalThis.document.visibilityState,
  };
}
