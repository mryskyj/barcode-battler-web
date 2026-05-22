import { describe, expect, it } from "vitest";
import {
  PLAYER_DISPLAY_NAME_MAX_LENGTH,
  createPlayerProfile,
  createPlayerProfileKey,
  parsePlayerProfile,
  validatePlayerDisplayName,
} from "./playerProfile";

describe("playerProfile", () => {
  it("trims and accepts a valid display name", () => {
    expect(validatePlayerDisplayName("  Alice  ")).toEqual({
      displayName: "Alice",
      isValid: true,
      message: null,
    });
  });

  it("rejects empty display names", () => {
    expect(validatePlayerDisplayName("  ")).toEqual({
      displayName: "",
      isValid: false,
      message: "ユーザー名を入力してください",
    });
  });

  it("rejects display names that are too long", () => {
    const displayName = "a".repeat(PLAYER_DISPLAY_NAME_MAX_LENGTH + 1);

    expect(validatePlayerDisplayName(displayName)).toEqual({
      displayName,
      isValid: false,
      message: `${PLAYER_DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`,
    });
  });

  it("rejects display names with control characters", () => {
    expect(validatePlayerDisplayName("Alice\nBob")).toEqual({
      displayName: "Alice\nBob",
      isValid: false,
      message: "ユーザー名に改行や制御文字は使えません",
    });
  });

  it("creates a profile from a valid display name", () => {
    expect(createPlayerProfile(" Alice ", "profile-key")).toEqual({
      displayName: "Alice",
      isValid: true,
      message: null,
      profile: {
        profileKey: "profile-key",
        displayName: "Alice",
      },
    });
  });

  it("creates deterministic profile keys when random is injected", () => {
    expect(createPlayerProfileKey(() => 0)).toBe("AAAAAAAAAAAAAAAA");
  });

  it("parses valid profile data", () => {
    expect(
      parsePlayerProfile({
        profileKey: "profile-key",
        displayName: " Alice ",
      }),
    ).toEqual({
      profileKey: "profile-key",
      displayName: "Alice",
    });
  });

  it("rejects invalid profile data", () => {
    expect(parsePlayerProfile(null)).toBeNull();
    expect(parsePlayerProfile({ profileKey: "profile-key", displayName: "" })).toBeNull();
    expect(parsePlayerProfile({ displayName: "Alice" })).toBeNull();
  });
});
