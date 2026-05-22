import type { BattleCommand } from "./battle";

export const COMMAND_LABELS = {
  attack: "たたかう",
  charge: "ためる",
  guard: "まもる",
  special: "必殺",
} satisfies Record<BattleCommand, string>;

export const BATTLE_COMMANDS = Object.keys(COMMAND_LABELS) as BattleCommand[];
