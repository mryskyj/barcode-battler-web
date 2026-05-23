import { BarcodeFormat } from "@zxing/library";
import { describe, expect, it } from "vitest";
import {
  calculateGs1CheckDigit,
  validateScannedBarcode,
} from "./scannedBarcodeValidation";

describe("scannedBarcodeValidation", () => {
  it("calculates GS1 check digits", () => {
    expect(calculateGs1CheckDigit("490123456789")).toBe(4);
    expect(calculateGs1CheckDigit("9638507")).toBe(4);
  });

  it("accepts 13-digit and 8-digit scan text", () => {
    expect(validateScannedBarcode("4901234567894", BarcodeFormat.EAN_13)).toEqual({
      normalizedBarcode: "4901234567894",
      isValid: true,
      reason: null,
    });
    expect(validateScannedBarcode("96385074", BarcodeFormat.EAN_8).isValid).toBe(true);
  });

  it("does not reject a 13-digit scan text by check digit alone", () => {
    expect(validateScannedBarcode("4901234567890", BarcodeFormat.EAN_13)).toEqual({
      normalizedBarcode: "4901234567890",
      isValid: true,
      reason: null,
    });
  });

  it("rejects scan text that is not 8 or 13 digits", () => {
    expect(validateScannedBarcode("036000291452", BarcodeFormat.UPC_A)).toEqual({
      normalizedBarcode: "036000291452",
      isValid: false,
      reason: "invalid-barcode-text",
    });
    expect(validateScannedBarcode("12345678901234", BarcodeFormat.EAN_13)).toEqual({
      normalizedBarcode: "12345678901234",
      isValid: false,
      reason: "invalid-barcode-text",
    });
  });

  it("rejects non-numeric scan text", () => {
    expect(validateScannedBarcode("ABC123", BarcodeFormat.CODE_39)).toEqual({
      normalizedBarcode: "ABC123",
      isValid: false,
      reason: "invalid-barcode-text",
    });
  });

  it("trims but rejects empty scan results", () => {
    expect(validateScannedBarcode("  ", BarcodeFormat.EAN_13)).toEqual({
      normalizedBarcode: "",
      isValid: false,
      reason: "empty",
    });
  });
});
