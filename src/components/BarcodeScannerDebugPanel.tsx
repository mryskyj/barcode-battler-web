import type { ScannerDebugEntry } from "./barcodeScannerDebug";

type BarcodeScannerDebugPanelProps = {
  entries: ScannerDebugEntry[];
};

export function BarcodeScannerDebugPanel({
  entries,
}: BarcodeScannerDebugPanelProps) {
  return (
    <section className="barcode-scanner-debug" aria-label="バーコードスキャナーログ">
      <div className="barcode-scanner-debug-header">
        <strong>Scanner log</strong>
        <span>latest 10</span>
      </div>
      <ol className="barcode-scanner-debug-list">
        {entries.length === 0 ? (
          <li className="barcode-scanner-debug-empty">まだログはありません</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.event}</strong>
              {entry.details.length === 0 ? null : <span>{entry.details}</span>}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
