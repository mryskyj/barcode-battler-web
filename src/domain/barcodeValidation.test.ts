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

  it("rejects too short input", () => {
    expect(validateBarcodeInput("123")).toEqual({
      normalizedBarcode: "123",
      isValid: false,
      message: "4文字以上で入力してください",
    });
  });

  it("accepts valid input and trims whitespace", () => {
    expect(validateBarcodeInput("  1234  ")).toEqual({
      normalizedBarcode: "1234",
      isValid: true,
      message: null,
    });
  });
});
