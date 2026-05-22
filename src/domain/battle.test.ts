import { describe, expect, it } from "vitest";
import {
  calculateDamage,
  chooseEnemyCommand,
  createBattle,
  executeTurn,
} from "./battle";
import type { Character, CharacterStats } from "./character";

const player = createTestCharacter("player", {
  hp: 120,
  power: 30,
  defense: 10,
  speed: 20,
});
const enemy = createTestCharacter("enemy", {
  hp: 100,
  power: 20,
  defense: 10,
  speed: 10,
});

describe("createBattle", () => {
  it("initializes HP and turn state", () => {
    const state = createBattle(player, enemy);

    expect(state.player.currentHp).toBe(120);
    expect(state.enemy.currentHp).toBe(100);
    expect(state.turn).toBe("player");
    expect(state.winner).toBeNull();
  });
});

describe("executeTurn", () => {
  it("reduces HP with a normal attack", () => {
    const state = executeTurn(createBattle(player, enemy), "attack", fixedRandom(0.5), "guard");

    expect(state.enemy.currentHp).toBeLessThan(100);
  });

  it("keeps damage at least 1", () => {
    const weakPlayer = createTestCharacter("weak", {
      hp: 100,
      power: 10,
      defense: 10,
      speed: 10,
    });
    const toughEnemy = createTestCharacter("tough", {
      hp: 100,
      power: 10,
      defense: 40,
      speed: 10,
    });
    const state = executeTurn(
      createBattle(weakPlayer, toughEnemy),
      "attack",
      fixedRandom(0),
      "guard",
    );

    expect(state.enemy.currentHp).toBe(99);
  });

  it("makes the next attack stronger after charge", () => {
    const charged = executeTurn(createBattle(player, enemy), "charge", fixedRandom(0.5), "charge");
    const afterChargedAttack = executeTurn(charged, "attack", fixedRandom(0.5), "charge");
    const normalAttack = executeTurn(createBattle(player, enemy), "attack", fixedRandom(0.5), "charge");

    expect(100 - afterChargedAttack.enemy.currentHp).toBeGreaterThan(
      100 - normalAttack.enemy.currentHp,
    );
  });

  it("reduces incoming damage while guarding", () => {
    const guarded = executeTurn(createBattle(player, enemy), "guard", fixedRandom(0.5), "attack");
    const unguarded = executeTurn(createBattle(player, enemy), "charge", fixedRandom(0.5), "attack");

    expect(120 - guarded.player.currentHp).toBeLessThan(120 - unguarded.player.currentHp);
  });

  it("deals large damage when special hits", () => {
    const specialHit = executeTurn(
      createBattle(player, enemy),
      "special",
      sequenceRandom([0.2, 0.5]),
      "guard",
    );
    const normalAttack = executeTurn(createBattle(player, enemy), "attack", fixedRandom(0.5), "guard");

    expect(100 - specialHit.enemy.currentHp).toBeGreaterThan(
      100 - normalAttack.enemy.currentHp,
    );
  });

  it("logs command names and damage results", () => {
    const state = executeTurn(
      createBattle(player, enemy),
      "special",
      sequenceRandom([0.2, 0.5]),
      "guard",
    );

    expect(state.log).toContain("プレイヤーの「必殺」。47ダメージ。");
    expect(state.log).toContain("敵は「まもる」で身を守った");
  });

  it("logs special misses", () => {
    const state = executeTurn(
      createBattle(player, enemy),
      "special",
      fixedRandom(0.8),
      "guard",
    );

    expect(state.log).toContain("プレイヤーの「必殺」は外れた");
  });

  it("sets winner when HP reaches zero", () => {
    const strongPlayer = createTestCharacter("strong", {
      hp: 120,
      power: 200,
      defense: 10,
      speed: 20,
    });
    const state = executeTurn(
      createBattle(strongPlayer, enemy),
      "attack",
      fixedRandom(0.5),
      "guard",
    );

    expect(state.winner).toBe("player");
    expect(state.log).toContain("プレイヤーの勝利。バトル終了");
  });
});

describe("calculateDamage", () => {
  it("applies variance within the required damage range", () => {
    const minDamage = calculateDamage(
      createCombatant(player),
      createCombatant(enemy),
      "attack",
      fixedRandom(0),
    );
    const maxDamage = calculateDamage(
      createCombatant(player),
      createCombatant(enemy),
      "attack",
      fixedRandom(1),
    );

    expect(minDamage).toBe(21);
    expect(maxDamage).toBe(28);
  });

  it("keeps charge stronger than normal attack", () => {
    const normalDamage = calculateDamage(
      createCombatant(player),
      createCombatant(enemy),
      "attack",
      fixedRandom(0.5),
    );
    const chargedDamage = calculateDamage(
      { ...createCombatant(player), charged: true },
      createCombatant(enemy),
      "attack",
      fixedRandom(0.5),
    );

    expect(chargedDamage).toBeGreaterThan(normalDamage);
  });

  it("keeps guard effective against incoming damage", () => {
    const normalDamage = calculateDamage(
      createCombatant(enemy),
      createCombatant(player),
      "attack",
      fixedRandom(0.5),
    );
    const guardedDamage = calculateDamage(
      createCombatant(enemy),
      { ...createCombatant(player), guarding: true },
      "attack",
      fixedRandom(0.5),
    );

    expect(guardedDamage).toBeLessThan(normalDamage);
  });

  it("keeps special stronger than normal attack without doubling it too far", () => {
    const normalDamage = calculateDamage(
      createCombatant(player),
      createCombatant(enemy),
      "attack",
      fixedRandom(0.5),
    );
    const specialDamage = calculateDamage(
      createCombatant(player),
      createCombatant(enemy),
      "special",
      fixedRandom(0.5),
    );

    expect(specialDamage).toBeGreaterThan(normalDamage);
    expect(specialDamage).toBeLessThan(normalDamage * 2);
  });
});

describe("chooseEnemyCommand", () => {
  it("uses a charged attack when charged", () => {
    const state = createBattle(player, enemy);
    const chargedState = {
      ...state,
      enemy: {
        ...state.enemy,
        charged: true,
      },
    };

    expect(chooseEnemyCommand(chargedState)).toBe("attack");
  });
});

function createTestCharacter(id: string, stats: CharacterStats): Character {
  return {
    id,
    name: id,
    barcode: id,
    stats,
  };
}

function createCombatant(character: Character) {
  return {
    character,
    currentHp: character.stats.hp,
    charged: false,
    guarding: false,
  };
}

function fixedRandom(value: number) {
  return () => value;
}

function sequenceRandom(values: number[]) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}
