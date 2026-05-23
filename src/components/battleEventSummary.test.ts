import { describe, expect, it } from "vitest";
import { createBattleEventSummary } from "./battleEventSummary";

describe("createBattleEventSummary", () => {
  it("extracts damage from a battle log entry", () => {
    expect(
      createBattleEventSummary("ホストの「たたかう」。28ダメージ。"),
    ).toEqual({
      type: "damage",
      title: "-28",
      detail: "ダメージ",
      damage: 28,
      guarded: false,
    });
  });

  it("marks guarded damage", () => {
    expect(
      createBattleEventSummary(
        "ゲストの「ひっさつ」。12ダメージ。 相手のまもりでダメージ軽減。",
      ),
    ).toMatchObject({
      type: "damage",
      title: "-12",
      detail: "ダメージ軽減",
      guarded: true,
    });
  });

  it("summarizes non-damage command results", () => {
    expect(createBattleEventSummary("ホストの「ひっさつ」は外れた")).toEqual({
      type: "miss",
      title: "MISS",
      detail: "攻撃失敗",
    });
    expect(createBattleEventSummary("ゲストは「ためる」で力をためた")).toEqual({
      type: "charge",
      title: "CHARGE",
      detail: "次の攻撃アップ",
    });
    expect(createBattleEventSummary("ホストは「まもる」で身を守った")).toEqual({
      type: "guard",
      title: "GUARD",
      detail: "防御態勢",
    });
  });

  it("returns null for empty or initial logs", () => {
    expect(createBattleEventSummary(null)).toBeNull();
    expect(createBattleEventSummary("")).toBeNull();
    expect(createBattleEventSummary("バトル開始")).toBeNull();
  });
});
