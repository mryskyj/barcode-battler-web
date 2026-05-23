import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BarcodeScannerDebugPanel } from "./BarcodeScannerDebugPanel";
import type { ScannerDebugEntry } from "./barcodeScannerDebug";

describe("BarcodeScannerDebugPanel", () => {
  it("shows the retained entry count and export actions", () => {
    render(<BarcodeScannerDebugPanel entries={[createEntry(1)]} />);

    expect(screen.getByText("調査ログ")).toBeInTheDocument();
    expect(screen.getByText("1/200")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログをコピー" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JSON保存" })).toBeInTheDocument();
  });

  it("copies scanner logs as JSON", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<BarcodeScannerDebugPanel entries={[createEntry(1)]} />);
    await user.click(screen.getByRole("button", { name: "ログをコピー" }));

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify([createEntry(1)], null, 2),
    );
    expect(screen.getByText("コピーしました")).toBeInTheDocument();
  });
});

function createEntry(id: number): ScannerDebugEntry {
  return {
    id,
    createdAt: "2026-05-24T00:00:00.000Z",
    event: "scan-start",
    details: "{\"width\":1080}",
  };
}
