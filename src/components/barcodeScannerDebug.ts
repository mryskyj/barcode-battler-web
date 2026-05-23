export type ScannerDebugEntry = {
  id: number;
  createdAt: string;
  event: string;
  details: string;
};

export const SCANNER_DEBUG_ENTRY_LIMIT = 200;
export const SCANNER_CANDIDATE_LOG_INTERVAL_MS = 1_000;

const SCANNER_DEBUG_STORAGE_KEY = "barcodeScannerDebug";
const SCANNER_DEBUG_QUERY_KEY = "scannerDebug";
const IMPORTANT_SCANNER_DEBUG_EVENTS = new Set([
  "scan-start",
  "camera-devices",
  "camera-devices-failed",
  "camera-constraints-selected",
  "camera-ready",
  "camera-continuous-focus",
  "camera-continuous-focus-failed",
  "native-detector-results",
  "native-detector-failed",
  "scan-result-rejected",
  "scan-cycle-no-result",
  "scan-frame-skipped",
  "scan-success",
  "scanner-failed",
  "scanner-closed",
]);

export function isBarcodeScannerDebugEnabled(
  devMode: boolean,
  location: Pick<Location, "search"> | null = getCurrentLocation(),
  storage: Pick<Storage, "getItem"> | null = getLocalStorage(),
): boolean {
  void devMode;
  const queryValue = new URLSearchParams(location?.search ?? "").get(
    SCANNER_DEBUG_QUERY_KEY,
  );

  if (queryValue !== null) {
    return isEnabledValue(queryValue);
  }

  const storageValue = storage?.getItem(SCANNER_DEBUG_STORAGE_KEY);

  if (storageValue !== null && storageValue !== undefined) {
    return isEnabledValue(storageValue);
  }

  return true;
}

export function formatScannerDetails(details?: Record<string, unknown>): string {
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

export function appendScannerDebugEntry(
  entries: ScannerDebugEntry[],
  nextEntry: ScannerDebugEntry,
  limit = SCANNER_DEBUG_ENTRY_LIMIT,
): ScannerDebugEntry[] {
  const nextEntries = [...entries, nextEntry];

  if (nextEntries.length <= limit) {
    return nextEntries;
  }

  const removableIndex = nextEntries.findIndex(
    (entry) => !IMPORTANT_SCANNER_DEBUG_EVENTS.has(entry.event),
  );

  if (removableIndex >= 0) {
    return nextEntries.filter((_, index) => index !== removableIndex);
  }

  return nextEntries.slice(-limit);
}

function isEnabledValue(value: string): boolean {
  return value === "1" || value.toLowerCase() === "true";
}

function getCurrentLocation(): Pick<Location, "search"> | null {
  return typeof globalThis.location === "undefined" ? null : globalThis.location;
}

function getLocalStorage(): Pick<Storage, "getItem"> | null {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}
