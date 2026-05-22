import { describe, expect, it } from "vitest";
import { createLocalBattle, submitLocalBattleCommand } from "./localBattle";
import type { Character } from "./character";

const player1 = createTestCharacter("player1", {
  hp: 120,
  power: 30,
  defense: 10,
  speed: 20,
});

const player2 = createTestCharacter("player2", {
  hp: 120,
  power: 24,
  defense: 10,
  speed: 10,
});

describe("createLocalBattle", () => {
  it("starts with player1 selecting a command", () => {
    const state = createLocalBattle(player1, player2);

    expect(state.selectingPlayer).toBe("player1");
    expect(state.winner).toBeNull();
    expect(state.log).toEqual(["2人ローカル対戦開始"]);
  });
});

describe("submitLocalBattleCommand", () => {
  it("queues player1 command without revealing the command label", () => {
    const state = submitLocalBattleCommand(
      createLocalBattle(player1, player2),
      "special",
      fixedRandom(0.5),
    );

    expect(state.selectingPlayer).toBe("player2");
    expect(state.queuedCommands.player1).toBe("special");
    expect(state.log).toContain("プレイヤー1はコマンドを選択した");
    expect(state.log.join(" ")).not.toContain("必殺");
  });

  it("resolves a round after player2 selects a command", () => {
    const afterPlayer1 = submitLocalBattleCommand(
      createLocalBattle(player1, player2),
      "attack",
      fixedRandom(0.5),
    );
    const state = submitLocalBattleCommand(afterPlayer1, "charge", fixedRandom(0.5));

    expect(state.selectingPlayer).toBe("player1");
    expect(state.queuedCommands).toEqual({});
    expect(state.player2.currentHp).toBeLessThan(player2.stats.hp);
    expect(state.player2.charged).toBe(true);
    expect(state.log).toContain("プレイヤー2はコマンドを選択した");
    expect(state.log.some((entry) => entry.includes("プレイヤー1の「たたかう」"))).toBe(
      true,
    );
  });

  it("uses speed order when both commands are ready", () => {
    const fasterPlayer2 = createTestCharacter("faster", {
      hp: 120,
      power: 24,
      defense: 10,
      speed: 40,
    });
    const afterPlayer1 = submitLocalBattleCommand(
      createLocalBattle(player1, fasterPlayer2),
      "attack",
      fixedRandom(0.5),
    );
    const state = submitLocalBattleCommand(afterPlayer1, "attack", fixedRandom(0.5));
    const firstAttackLog = state.log.find((entry) => entry.includes("たたかう"));

    expect(firstAttackLog).toContain("プレイヤー2");
  });

  it("applies guard during the same round even when the guarding player is slower", () => {
    const afterPlayer1 = submitLocalBattleCommand(
      createLocalBattle(player1, player2),
      "attack",
      fixedRandom(0.5),
    );
    const state = submitLocalBattleCommand(afterPlayer1, "guard", fixedRandom(0.5));

    expect(state.player2.currentHp).toBe(player2.stats.hp - 10);
    expect(state.log.some((entry) => entry.includes("ダメージ軽減"))).toBe(true);
  });

  it("keeps winner after a lethal action", () => {
    const strongPlayer1 = createTestCharacter("strong", {
      hp: 120,
      power: 200,
      defense: 10,
      speed: 20,
    });
    const afterPlayer1 = submitLocalBattleCommand(
      createLocalBattle(strongPlayer1, player2),
      "attack",
      fixedRandom(0.5),
    );
    const state = submitLocalBattleCommand(afterPlayer1, "attack", fixedRandom(0.5));

    expect(state.winner).toBe("player1");
    expect(state.log).toContain("プレイヤー1の勝利。バトル終了");
  });
});

function createTestCharacter(id: string, stats: Character["stats"]): Character {
  return {
    id,
    name: id,
    barcode: id,
    stats,
  };
}

function fixedRandom(value: number) {
  return () => value;
}
