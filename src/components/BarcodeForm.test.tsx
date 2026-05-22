import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeForm } from "./BarcodeForm";

const barcodeScannerMock = vi.hoisted(() => {
  const controls = {
    stop: vi.fn(),
  };
  let callback:
    | ((
        result:
          | {
              getText: () => string;
              getResultPoints?: () => Array<{
                getX: () => number;
                getY: () => number;
              }>;
            }
          | undefined,
        error: Error | undefined,
        scannerControls: typeof controls,
      ) => void)
    | null = null;

  const decodeFromVideoDevice = vi.fn(async (_deviceId, _preview, nextCallback) => {
    callback = nextCallback;
    return controls;
  });
  const reset = vi.fn();
  const BrowserMultiFormatOneDReader = vi.fn(
    function BrowserMultiFormatOneDReader() {
      return {
        decodeFromVideoDevice,
        reset,
      };
    },
  );

  return {
    BrowserMultiFormatOneDReader,
    controls,
    decodeFromVideoDevice,
    getCallback: () => callback,
    reset,
  };
});

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatOneDReader: barcodeScannerMock.BrowserMultiFormatOneDReader,
}));

describe("BarcodeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can open the camera scanner and fill the input from a detected barcode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<BarcodeFormHarness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "カメラで読み取る" }));

    await waitFor(() => {
      expect(barcodeScannerMock.decodeFromVideoDevice).toHaveBeenCalled();
    });

    expect(screen.getByText("バーコードを探しています")).toBeInTheDocument();

    const callback = barcodeScannerMock.getCallback();

    expect(callback).not.toBeNull();

    await act(async () => {
      callback?.(
        {
          getText: () => " 4901234567894 ",
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
        },
        undefined,
        barcodeScannerMock.controls,
      );
    });

    expect(screen.getByText("読み取り成功: 4901234567894")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "カメラを閉じる" })).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("バーコード")).toHaveValue("4901234567894");
    expect(screen.queryByRole("button", { name: "カメラを閉じる" })).not.toBeInTheDocument();
    expect(barcodeScannerMock.controls.stop).toHaveBeenCalled();
  });
});

function BarcodeFormHarness({ onSubmit }: { onSubmit: () => void }) {
  const [barcode, setBarcode] = useState("");

  return (
    <BarcodeForm
      barcode={barcode}
      errorMessage={null}
      canSubmit={true}
      onBarcodeChange={setBarcode}
      onSubmit={onSubmit}
    />
  );
}
