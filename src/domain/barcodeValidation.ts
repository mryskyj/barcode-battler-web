export type BarcodeValidationResult = {
  normalizedBarcode: string;
  isValid: boolean;
  message: string | null;
};

const MIN_BARCODE_LENGTH = 4;

export function validateBarcodeInput(input: string): BarcodeValidationResult {
  const normalizedBarcode = input.trim();

  if (normalizedBarcode.length === 0) {
    return {
      normalizedBarcode,
      isValid: false,
      message: "バーコードを入力してください",
    };
  }

  if (normalizedBarcode.length < MIN_BARCODE_LENGTH) {
    return {
      normalizedBarcode,
      isValid: false,
      message: `${MIN_BARCODE_LENGTH}文字以上で入力してください`,
    };
  }

  return {
    normalizedBarcode,
    isValid: true,
    message: null,
  };
}
