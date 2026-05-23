export type BarcodeValidationResult = {
  normalizedBarcode: string;
  isValid: boolean;
  message: string | null;
};

const ALLOWED_BARCODE_PATTERN = /^\d{8}$|^\d{13}$/;

export function validateBarcodeInput(input: string): BarcodeValidationResult {
  const normalizedBarcode = input.trim();

  if (normalizedBarcode.length === 0) {
    return {
      normalizedBarcode,
      isValid: false,
      message: "バーコードを入力してください",
    };
  }

  if (!ALLOWED_BARCODE_PATTERN.test(normalizedBarcode)) {
    return {
      normalizedBarcode,
      isValid: false,
      message: "8桁または13桁の数字で入力してください",
    };
  }

  return {
    normalizedBarcode,
    isValid: true,
    message: null,
  };
}
