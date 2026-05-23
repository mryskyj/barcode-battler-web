import { describe, expect, it } from "vitest";
import { validateBarcodeInput } from "./barcodeValidation";

describe("validateBarcodeInput", () => {
  it("rejects empty input", () => {
    expect(validateBarcodeInput("  ")).toEqual({
      normalizedBarcode: "",
      isValid: false,
      message: "バーコードを入力してください",
    });
  });

  it("rejects input that is not 8 or 13 digits", () => {
    expect(validateBarcodeInput("123")).toEqual({
      normalizedBarcode: "123",
      isValid: false,
      message: "8桁または13桁の数字で入力してください",
    });
    expect(validateBarcodeInput("123456789012")).toEqual({
      normalizedBarcode: "123456789012",
      isValid: false,
      message: "8桁または13桁の数字で入力してください",
    });
    expect(validateBarcodeInput("ABCDEFGH")).toEqual({
      normalizedBarcode: "ABCDEFGH",
      isValid: false,
      message: "8桁または13桁の数字で入力してください",
    });
  });

  it("accepts valid input and trims whitespace", () => {
    expect(validateBarcodeInput("  12345678  ")).toEqual({
      normalizedBarcode: "12345678",
      isValid: true,
      message: null,
    });
    expect(validateBarcodeInput("  4901234567894  ")).toEqual({
      normalizedBarcode: "4901234567894",
      isValid: true,
      message: null,
    });
  });
});
