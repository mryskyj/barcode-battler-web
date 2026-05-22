import { describe, expect, it } from "vitest";
import {
  createRemoteRoomId,
  isValidRemoteRoomId,
  normalizeRemoteRoomId,
} from "./remoteRoomId";

describe("createRemoteRoomId", () => {
  it("creates a six-character room id", () => {
    expect(createRemoteRoomId(() => 0)).toBe("AAAAAA");
  });
});

describe("normalizeRemoteRoomId", () => {
  it("trims and uppercases room ids", () => {
    expect(normalizeRemoteRoomId(" ab12cd ")).toBe("AB12CD");
  });
});

describe("isValidRemoteRoomId", () => {
  it("accepts six-character room ids after normalization", () => {
    expect(isValidRemoteRoomId(" ab12cd ")).toBe(true);
  });

  it("rejects short room ids", () => {
    expect(isValidRemoteRoomId("abc")).toBe(false);
  });
});
