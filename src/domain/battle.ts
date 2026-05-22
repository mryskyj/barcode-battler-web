import type { BattleCommand, BattleSide, BattleState, Combatant } from "./battleTypes";
import type { Character } from "./character";
import { COMMAND_LABELS } from "./commandLabels";

export type { BattleCommand, BattleSide, BattleState, Combatant } from "./battleTypes";

export type RandomSource = () => number;

export const DAMAGE_BALANCE = {
  defenseDivider: 2,
  chargeMultiplier: 1.6,
  specialMultiplier: 1.9,
  guardMultiplier: 0.4,
  specialGuardMultiplier: 0.25,
  minVariance: 0.85,
  varianceWidth: 0.3,
} as const;

export function createBattle(player: Character, enemy: Character): BattleState {
  return {
    player: createCombatant(player),
    enemy: createCombatant(enemy),
    turn: "player",
    winner: null,
    log: ["バトル開始"],
  };
}

export function executeTurn(
  state: BattleState,
  playerCommand: BattleCommand,
  random: RandomSource = Math.random,
  enemyCommand: BattleCommand = chooseEnemyCommand(state),
): BattleState {
  if (state.winner !== null) {
    return state;
  }

  const afterPlayer = resolveAction(state, "player", playerCommand, random);
  if (afterPlayer.winner !== null) {
    return afterPlayer;
  }

  return resolveAction(afterPlayer, "enemy", enemyCommand, random);
}

export function chooseEnemyCommand(state: BattleState): BattleCommand {
  const enemyHpRate = state.enemy.currentHp / state.enemy.character.stats.hp;

  if (state.enemy.charged) {
    return "attack";
  }

  if (enemyHpRate < 0.35) {
    return "guard";
  }

  if (state.enemy.character.stats.speed > state.player.character.stats.speed) {
    return "special";
  }

  return "attack";
}

function createCombatant(character: Character): Combatant {
  return {
    character,
    currentHp: character.stats.hp,
    charged: false,
    guarding: false,
  };
}

function resolveAction(
  state: BattleState,
  actorSide: BattleSide,
  command: BattleCommand,
  random: RandomSource,
): BattleState {
  const actor = cloneCombatant(state[actorSide]);
  const targetSide = actorSide === "player" ? "enemy" : "player";
  const target = cloneCombatant(state[targetSide]);
  const actorLabel = actorSide === "player" ? "プレイヤー" : "敵";
  const nextState: BattleState = {
    ...state,
    [actorSide]: actor,
    [targetSide]: target,
    turn: targetSide,
    log: [...state.log],
  };

  if (command === "charge") {
    actor.charged = true;
    actor.guarding = false;
    nextState.log.push(`${actorLabel}は「${COMMAND_LABELS.charge}」で力をためた`);
    return nextState;
  }

  if (command === "guard") {
    actor.guarding = true;
    nextState.log.push(`${actorLabel}は「${COMMAND_LABELS.guard}」で身を守った`);
    return nextState;
  }

  actor.guarding = false;

  if (command === "special" && random() >= 0.7) {
    actor.charged = false;
    nextState.log.push(`${actorLabel}の「${COMMAND_LABELS.special}」は外れた`);
    return nextState;
  }

  const damage = calculateDamage(actor, target, command, random);
  const guardText = target.guarding ? " 相手のまもりでダメージ軽減。" : "";
  actor.charged = false;
  target.guarding = false;
  target.currentHp = Math.max(0, target.currentHp - damage);
  nextState.log.push(
    `${actorLabel}の「${COMMAND_LABELS[command]}」。${damage}ダメージ。${guardText}`,
  );

  if (target.currentHp <= 0) {
    nextState.winner = actorSide;
    nextState.log.push(`${actorLabel}の勝利。バトル終了`);
  }

  return nextState;
}

export function calculateDamage(
  actor: Combatant,
  target: Combatant,
  command: BattleCommand,
  random: RandomSource,
): number {
  const baseDamage = Math.max(
    1,
    actor.character.stats.power -
      Math.floor(target.character.stats.defense / DAMAGE_BALANCE.defenseDivider),
  );
  const chargeMultiplier = actor.charged ? DAMAGE_BALANCE.chargeMultiplier : 1;
  const specialMultiplier =
    command === "special" ? DAMAGE_BALANCE.specialMultiplier : 1;
  const guardMultiplier = target.guarding
    ? command === "special"
      ? DAMAGE_BALANCE.specialGuardMultiplier
      : DAMAGE_BALANCE.guardMultiplier
    : 1;
  const variance =
    DAMAGE_BALANCE.minVariance + random() * DAMAGE_BALANCE.varianceWidth;

  return Math.max(
    1,
    Math.floor(
      baseDamage * chargeMultiplier * specialMultiplier * guardMultiplier * variance,
    ),
  );
}

function cloneCombatant(combatant: Combatant): Combatant {
  return {
    ...combatant,
  };
}
