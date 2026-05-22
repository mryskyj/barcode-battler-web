export type ScannerDebugEntry = {
  id: number;
  event: string;
  details: string;
};

const SCANNER_DEBUG_STORAGE_KEY = "barcodeScannerDebug";
const SCANNER_DEBUG_QUERY_KEY = "scannerDebug";

export function isBarcodeScannerDebugEnabled(
  devMode: boolean,
  location: Pick<Location, "search"> | null = getCurrentLocation(),
  storage: Pick<Storage, "getItem"> | null = getLocalStorage(),
): boolean {
  if (!devMode) {
    return false;
  }

  const queryValue = new URLSearchParams(location?.search ?? "").get(
    SCANNER_DEBUG_QUERY_KEY,
  );

  if (queryValue !== null) {
    return isEnabledValue(queryValue);
  }

  return isEnabledValue(storage?.getItem(SCANNER_DEBUG_STORAGE_KEY) ?? "");
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
