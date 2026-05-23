import { useMemo, useState } from "react";
import {
  SCANNER_DEBUG_ENTRY_LIMIT,
  type ScannerDebugEntry,
} from "./barcodeScannerDebug";

type BarcodeScannerDebugPanelProps = {
  entries: ScannerDebugEntry[];
};

export function BarcodeScannerDebugPanel({
  entries,
}: BarcodeScannerDebugPanelProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const exportText = useMemo(() => formatDebugEntriesForExport(entries), [entries]);

  async function handleCopy() {
    if (globalThis.navigator.clipboard === undefined) {
      setCopyStatus("failed");
      return;
    }

    try {
      await globalThis.navigator.clipboard.writeText(exportText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function handleDownload() {
    const blob = new Blob([exportText], { type: "application/json" });
    const url = globalThis.URL.createObjectURL(blob);
    const link = globalThis.document.createElement("a");
    link.href = url;
    link.download = `barcode-scanner-log-${new Date().toISOString()}.json`;
    link.click();
    globalThis.URL.revokeObjectURL(url);
  }

  return (
    <section className="barcode-scanner-debug" aria-label="バーコードスキャナーログ">
      <div className="barcode-scanner-debug-header">
        <strong>Scanner log</strong>
        <span>
          latest {entries.length}/{SCANNER_DEBUG_ENTRY_LIMIT}
        </span>
      </div>
      <div className="barcode-scanner-debug-actions">
        <button type="button" className="secondary-button" onClick={handleCopy}>
          ログをコピー
        </button>
        <button type="button" className="secondary-button" onClick={handleDownload}>
          JSON保存
        </button>
      </div>
      {copyStatus === "copied" ? (
        <p className="barcode-scanner-debug-status">コピーしました</p>
      ) : null}
      {copyStatus === "failed" ? (
        <p className="barcode-scanner-debug-status">コピーできませんでした</p>
      ) : null}
      <ol className="barcode-scanner-debug-list">
        {entries.length === 0 ? (
          <li className="barcode-scanner-debug-empty">まだログはありません</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.event}</strong>
              <small>{entry.createdAt}</small>
              {entry.details.length === 0 ? null : <span>{entry.details}</span>}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function formatDebugEntriesForExport(entries: ScannerDebugEntry[]): string {
  return JSON.stringify(entries, null, 2);
}
