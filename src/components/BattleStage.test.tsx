import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Combatant } from "../domain/battle";
import { BattleStage } from "./BattleStage";

describe("BattleStage", () => {
  it("shows the latest damage as a stage event", () => {
    render(
      <BattleStage
        opponentName="相手"
        opponentCombatant={createCombatant("相手キャラ", 80)}
        selfName="自分"
        selfCombatant={createCombatant("自分キャラ", 120)}
        latestLog="ホストの「たたかう」。28ダメージ。"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("-28");
    expect(screen.getByRole("status")).toHaveTextContent("ダメージ");
  });

  it("does not show an event for the initial battle log", () => {
    render(
      <BattleStage
        opponentName="相手"
        opponentCombatant={createCombatant("相手キャラ", 80)}
        selfName="自分"
        selfCombatant={createCombatant("自分キャラ", 120)}
        latestLog="バトル開始"
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

function createCombatant(name: string, currentHp: number): Combatant {
  return {
    character: {
      id: name,
      name,
      barcode: "4901234567894",
      stats: {
        hp: 120,
        power: 30,
        defense: 12,
        speed: 18,
      },
    },
    currentHp,
    charged: false,
    guarding: false,
  };
}
