import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BarcodeFormat, NotFoundException } from "@zxing/library";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeForm } from "./BarcodeForm";
import { CAMERA_SESSION_TIMEOUT_MS } from "./barcodeScannerConfig";

const barcodeScannerMock = vi.hoisted(() => {
  const createValidEan13Result = () => ({
    getText: () => " 4901234567894 ",
    getBarcodeFormat: () => BarcodeFormat.EAN_13,
    getResultPoints: () => [
      {
        getX: () => 10,
        getY: () => 20,
      },
      {
        getX: () => 80,
        getY: () => 20,
      },
    ],
  });
  const decodeFromCanvas = vi.fn(createValidEan13Result);
  const reset = vi.fn();
  const BrowserMultiFormatOneDReader = vi.fn(
    function BrowserMultiFormatOneDReader() {
      return {
        decodeFromCanvas,
        reset,
      };
    },
  );

  return {
    BrowserMultiFormatOneDReader,
    createValidEan13Result,
    decodeFromCanvas,
    reset,
  };
});

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatOneDReader: barcodeScannerMock.BrowserMultiFormatOneDReader,
}));

describe("BarcodeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    barcodeScannerMock.decodeFromCanvas.mockImplementation(
      barcodeScannerMock.createValidEan13Result,
    );
    globalThis.localStorage.clear();
    Object.defineProperty(globalThis.HTMLVideoElement.prototype, "videoWidth", {
      configurable: true,
      get() {
        return 640;
      },
    });
    Object.defineProperty(globalThis.HTMLVideoElement.prototype, "videoHeight", {
      configurable: true,
      get() {
        return 480;
      },
    });
    Object.defineProperty(globalThis.HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
        rotate: vi.fn(),
        scale: vi.fn(),
        setTransform: vi.fn(),
        translate: vi.fn(),
      })),
    });
    Object.defineProperty(globalThis.HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(async () => undefined),
    });
    Object.defineProperty(globalThis.HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as HTMLMediaElement & { _srcObject?: MediaStream | null })._srcObject ?? null;
      },
      set(value) {
        (this as HTMLMediaElement & { _srcObject?: MediaStream | null })._srcObject = value;
      },
    });
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          const track = {
            stop: vi.fn(),
            getSettings: vi.fn(() => ({})),
            getCapabilities: vi.fn(() => ({})),
          };

          return {
            getVideoTracks: () => [track],
            getTracks: () => [track],
          };
        }),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("can open the camera scanner and show a detected barcode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<BarcodeFormHarness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "カメラで読み取る" }));

    await waitFor(() => {
      expect(barcodeScannerMock.decodeFromCanvas).toHaveBeenCalled();
    });

    expect(screen.queryByLabelText("バーコードスキャナーログ")).not.toBeInTheDocument();

    expect(screen.getByText("読み取り成功: 4901234567894")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "カメラを閉じる" })).not.toBeInTheDocument();
    });

    expect(screen.getByText("読み取り結果")).toBeInTheDocument();
    expect(screen.getByText("4901234567894")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "カメラを閉じる" })).not.toBeInTheDocument();
  });

  it("ignores scan results that do not match supported EAN or UPC barcodes", async () => {
    barcodeScannerMock.decodeFromCanvas.mockImplementation(() => ({
      getText: () => "ABC123",
      getBarcodeFormat: () => BarcodeFormat.CODE_39,
      getResultPoints: () => [],
    }));
    const user = userEvent.setup();

    render(<BarcodeFormHarness onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "カメラで読み取る" }));

    await waitFor(() => {
      expect(barcodeScannerMock.decodeFromCanvas).toHaveBeenCalled();
    });

    expect(screen.queryByLabelText("バーコード")).not.toBeInTheDocument();
    expect(screen.queryByText(/読み取り成功:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数字を直接入力" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "カメラを閉じる" }).length).toBeGreaterThan(0);
  });

  it("shows scanner debug logs when explicitly enabled", async () => {
    globalThis.localStorage.setItem("barcodeScannerDebug", "1");
    const user = userEvent.setup();

    render(<BarcodeFormHarness onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "カメラで読み取る" }));

    await waitFor(() => {
      expect(barcodeScannerMock.decodeFromCanvas).toHaveBeenCalled();
    });

    const logPanel = screen.getByLabelText("バーコードスキャナーログ");
    expect(within(logPanel).getByText("scan-start")).toBeInTheDocument();
  });

  it("can start with the camera scanner and keep manual entry hidden", async () => {
    const onSubmit = vi.fn();

    render(
      <BarcodeFormHarness
        onSubmit={onSubmit}
        scannerInitiallyOpen
        manualEntryInitiallyVisible={false}
      />,
    );

    expect(
      screen.getByRole("region", { name: "カメラでバーコード読み取り" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("バーコード")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(barcodeScannerMock.decodeFromCanvas).toHaveBeenCalled();
    });

    expect(await screen.findByText("読み取り結果")).toBeInTheDocument();
    expect(screen.getByText("4901234567894")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "数字を直接入力" }),
    ).not.toBeInTheDocument();
  });

  it("stops the camera scanner when switching to manual entry", async () => {
    const user = userEvent.setup();

    render(
      <BarcodeFormHarness
        onSubmit={vi.fn()}
        scannerInitiallyOpen
        manualEntryInitiallyVisible={false}
      />,
    );

    expect(
      screen.getByRole("region", { name: "カメラでバーコード読み取り" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "数字を直接入力" }));

    expect(
      screen.queryByRole("region", { name: "カメラでバーコード読み取り" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("バーコード")).toBeInTheDocument();
  });

  it("hides manual entry and keeps the manual link in the scanner when reopening the camera", async () => {
    const user = userEvent.setup();

    render(<BarcodeFormHarness onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("バーコード"), "4901234567894");
    await user.click(screen.getByRole("button", { name: "カメラで読み取る" }));

    expect(screen.queryByLabelText("バーコード")).not.toBeInTheDocument();
    expect(screen.queryByText("読み取り結果")).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "カメラでバーコード読み取り" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数字を直接入力" })).toBeInTheDocument();
  });

  it("closes the camera scanner after the session timeout", async () => {
    vi.useFakeTimers();
    barcodeScannerMock.decodeFromCanvas.mockImplementation(() => {
      throw new NotFoundException();
    });

    render(
      <BarcodeFormHarness
        onSubmit={vi.fn()}
        scannerInitiallyOpen
        manualEntryInitiallyVisible={false}
      />,
    );

    expect(
      screen.getByRole("region", { name: "カメラでバーコード読み取り" }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(CAMERA_SESSION_TIMEOUT_MS);
    });

    expect(
      screen.queryByRole("region", { name: "カメラでバーコード読み取り" }),
    ).not.toBeInTheDocument();
  });

  it("closes the camera scanner when the document becomes hidden", async () => {
    barcodeScannerMock.decodeFromCanvas.mockImplementation(() => {
      throw new NotFoundException();
    });

    render(
      <BarcodeFormHarness
        onSubmit={vi.fn()}
        scannerInitiallyOpen
        manualEntryInitiallyVisible={false}
      />,
    );

    expect(
      screen.getByRole("region", { name: "カメラでバーコード読み取り" }),
    ).toBeInTheDocument();

    Object.defineProperty(globalThis.document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    act(() => {
      globalThis.document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(
      screen.queryByRole("region", { name: "カメラでバーコード読み取り" }),
    ).not.toBeInTheDocument();
  });
});

function BarcodeFormHarness({
  manualEntryInitiallyVisible,
  onSubmit,
  scannerInitiallyOpen,
}: {
  manualEntryInitiallyVisible?: boolean;
  onSubmit: () => void;
  scannerInitiallyOpen?: boolean;
}) {
  const [barcode, setBarcode] = useState("");

  return (
    <BarcodeForm
      barcode={barcode}
      errorMessage={null}
      canSubmit={true}
      onBarcodeChange={setBarcode}
      onSubmit={onSubmit}
      scannerInitiallyOpen={scannerInitiallyOpen}
      manualEntryInitiallyVisible={manualEntryInitiallyVisible}
    />
  );
}
