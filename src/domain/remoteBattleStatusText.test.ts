import { describe, expect, it } from "vitest";
import { getRemoteSetupStatusText } from "./remoteBattleStatusText";

describe("getRemoteSetupStatusText", () => {
  it("shows own readiness waiting before the player is ready", () => {
    expect(getRemoteSetupStatusText("host", false)).toBe(
      "自分のキャラクター準備待ち",
    );
  });

  it("shows guest waiting text for ready hosts", () => {
    expect(getRemoteSetupStatusText("host", true)).toBe(
      "ゲストの参加・準備待ち",
    );
  });

  it("shows host waiting text for ready guests", () => {
    expect(getRemoteSetupStatusText("guest", true)).toBe("ホストの準備待ち");
  });
});
