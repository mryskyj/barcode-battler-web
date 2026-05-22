import { BarcodeFormat } from "@zxing/library";
import { describe, expect, it } from "vitest";
import {
  calculateGs1CheckDigit,
  expandUpcEToUpcA,
  isValidGs1CheckDigit,
  validateScannedBarcode,
} from "./scannedBarcodeValidation";

describe("scannedBarcodeValidation", () => {
  it("calculates GS1 check digits", () => {
    expect(calculateGs1CheckDigit("490123456789")).toBe(4);
    expect(calculateGs1CheckDigit("9638507")).toBe(4);
  });

  it("validates EAN-13 and EAN-8 scan results", () => {
    expect(validateScannedBarcode("4901234567894", BarcodeFormat.EAN_13)).toEqual({
      normalizedBarcode: "4901234567894",
      isValid: true,
      reason: null,
    });
    expect(validateScannedBarcode("96385074", BarcodeFormat.EAN_8).isValid).toBe(true);
  });

  it("rejects invalid check digits", () => {
    expect(validateScannedBarcode("4901234567890", BarcodeFormat.EAN_13)).toEqual({
      normalizedBarcode: "4901234567890",
      isValid: false,
      reason: "invalid-ean-13",
    });
  });

  it("validates UPC-A scan results", () => {
    expect(validateScannedBarcode("036000291452", BarcodeFormat.UPC_A).isValid).toBe(true);
    expect(isValidGs1CheckDigit("036000291452")).toBe(true);
  });

  it("expands and validates UPC-E scan results", () => {
    expect(expandUpcEToUpcA("04210007")).toBe("042000001007");
    expect(validateScannedBarcode("04210007", BarcodeFormat.UPC_E)).toEqual({
      normalizedBarcode: "04210007",
      isValid: true,
      reason: null,
    });
  });

  it("rejects UPC-E scan results with invalid check digits", () => {
    expect(validateScannedBarcode("04210005", BarcodeFormat.UPC_E)).toEqual({
      normalizedBarcode: "04210005",
      isValid: false,
      reason: "invalid-upc-e",
    });
  });

  it("rejects unsupported formats", () => {
    expect(validateScannedBarcode("ABC123", BarcodeFormat.CODE_39)).toEqual({
      normalizedBarcode: "ABC123",
      isValid: false,
      reason: "unsupported-format",
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
