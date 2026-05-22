import type { BattleCommand, BattleSide, BattleState, Combatant } from "./battleTypes";
import type { Character } from "./character";

export type { BattleCommand, BattleSide, BattleState, Combatant } from "./battleTypes";

export type RandomSource = () => number;

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
    nextState.log.push(`${actorLabel}は力をためた`);
    return nextState;
  }

  if (command === "guard") {
    actor.guarding = true;
    nextState.log.push(`${actorLabel}は身を守った`);
    return nextState;
  }

  actor.guarding = false;

  if (command === "special" && random() >= 0.7) {
    actor.charged = false;
    nextState.log.push(`${actorLabel}の必殺は外れた`);
    return nextState;
  }

  const damage = calculateDamage(actor, target, command, random);
  actor.charged = false;
  target.guarding = false;
  target.currentHp = Math.max(0, target.currentHp - damage);
  nextState.log.push(`${actorLabel}の攻撃。${damage}ダメージ`);

  if (target.currentHp <= 0) {
    nextState.winner = actorSide;
    nextState.log.push(`${actorLabel}の勝利`);
  }

  return nextState;
}

function calculateDamage(
  actor: Combatant,
  target: Combatant,
  command: BattleCommand,
  random: RandomSource,
): number {
  const baseDamage = Math.max(
    1,
    actor.character.stats.power - Math.floor(target.character.stats.defense / 2),
  );
  const chargeMultiplier = actor.charged ? 1.75 : 1;
  const specialMultiplier = command === "special" ? 2.2 : 1;
  const guardMultiplier = target.guarding ? 0.5 : 1;
  const variance = 0.85 + random() * 0.3;

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
