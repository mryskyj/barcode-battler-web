import type { Character } from "./character";

export type BattleCommand = "attack" | "charge" | "guard" | "special";

export type BattleSide = "player" | "enemy";

export type Combatant = {
  character: Character;
  currentHp: number;
  charged: boolean;
  guarding: boolean;
};

export type BattleState = {
  player: Combatant;
  enemy: Combatant;
  turn: BattleSide;
  winner: BattleSide | null;
  log: string[];
};
