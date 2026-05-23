import type { BarcodeFormat } from "@zxing/library";

export type ScannedBarcodeValidationResult = {
  normalizedBarcode: string;
  isValid: boolean;
  reason: string | null;
};

const DIGITS_ONLY = /^\d+$/;
const ALLOWED_BARCODE_PATTERN = /^\d{8}$|^\d{13}$/;

export function validateScannedBarcode(
  text: string,
  format: BarcodeFormat | null | undefined,
): ScannedBarcodeValidationResult {
  void format;
  const normalizedBarcode = text.trim();

  if (normalizedBarcode.length === 0) {
    return reject(normalizedBarcode, "empty");
  }

  if (!ALLOWED_BARCODE_PATTERN.test(normalizedBarcode)) {
    return reject(normalizedBarcode, "invalid-barcode-text");
  }

  return accept(normalizedBarcode);
}

export function isValidGs1CheckDigit(value: string): boolean {
  if (!DIGITS_ONLY.test(value) || value.length < 2) {
    return false;
  }

  return calculateGs1CheckDigit(value.slice(0, -1)) === Number(value.at(-1));
}

export function calculateGs1CheckDigit(valueWithoutCheckDigit: string): number {
  if (!DIGITS_ONLY.test(valueWithoutCheckDigit)) {
    throw new Error("GS1 check digit input must contain only digits.");
  }

  const sum = [...valueWithoutCheckDigit]
    .reverse()
    .reduce((total, digit, index) => {
      const weight = index % 2 === 0 ? 3 : 1;
      return total + Number(digit) * weight;
    }, 0);

  return (10 - (sum % 10)) % 10;
}

export function expandUpcEToUpcA(upcE: string): string | null {
  if (!DIGITS_ONLY.test(upcE) || (upcE.length !== 6 && upcE.length !== 8)) {
    return null;
  }

  const numberSystem = upcE.length === 8 ? upcE[0] : "0";
  if (numberSystem !== "0" && numberSystem !== "1") {
    return null;
  }

  const compact = upcE.length === 8 ? upcE.slice(1, 7) : upcE;
  const checkDigit = upcE.length === 8 ? upcE[7] : null;
  const manufacturerPrefix = compact.slice(0, 5);
  const productCodeLastDigit = compact[5];
  const expandedBody = expandUpcEBody(
    numberSystem,
    manufacturerPrefix,
    productCodeLastDigit,
  );

  if (expandedBody === null) {
    return null;
  }

  const expandedCheckDigit =
    checkDigit ?? String(calculateGs1CheckDigit(expandedBody));
  const expanded = `${expandedBody}${expandedCheckDigit}`;

  return isValidGs1CheckDigit(expanded) ? expanded : null;
}

function expandUpcEBody(
  numberSystem: string,
  manufacturerPrefix: string,
  productCodeLastDigit: string,
): string | null {
  const [d1, d2, d3, d4, d5] = manufacturerPrefix;

  if (
    d1 === undefined ||
    d2 === undefined ||
    d3 === undefined ||
    d4 === undefined ||
    d5 === undefined
  ) {
    return null;
  }

  if (
    productCodeLastDigit === "0" ||
    productCodeLastDigit === "1" ||
    productCodeLastDigit === "2"
  ) {
    return `${numberSystem}${d1}${d2}${productCodeLastDigit}0000${d3}${d4}${d5}`;
  }

  if (productCodeLastDigit === "3") {
    return `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`;
  }

  if (productCodeLastDigit === "4") {
    return `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`;
  }

  return `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${productCodeLastDigit}`;
}

function accept(normalizedBarcode: string): ScannedBarcodeValidationResult {
  return {
    normalizedBarcode,
    isValid: true,
    reason: null,
  };
}

function reject(
  normalizedBarcode: string,
  reason: string,
): ScannedBarcodeValidationResult {
  return {
    normalizedBarcode,
    isValid: false,
    reason,
  };
}
