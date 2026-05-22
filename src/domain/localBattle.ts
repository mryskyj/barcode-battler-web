import { calculateDamage, type RandomSource } from "./battle";
import type { BattleCommand, Combatant } from "./battleTypes";
import type { Character } from "./character";
import { COMMAND_LABELS } from "./commandLabels";

export type LocalBattlePlayer = "player1" | "player2";

export type LocalBattleState = {
  player1: Combatant;
  player2: Combatant;
  selectingPlayer: LocalBattlePlayer;
  winner: LocalBattlePlayer | null;
  log: string[];
  queuedCommands: Partial<Record<LocalBattlePlayer, BattleCommand>>;
};

export function createLocalBattle(
  player1: Character,
  player2: Character,
): LocalBattleState {
  return {
    player1: createCombatant(player1),
    player2: createCombatant(player2),
    selectingPlayer: "player1",
    winner: null,
    log: ["2人ローカル対戦開始"],
    queuedCommands: {},
  };
}

export function submitLocalBattleCommand(
  state: LocalBattleState,
  command: BattleCommand,
  random: RandomSource = Math.random,
): LocalBattleState {
  if (state.winner !== null) {
    return state;
  }

  const nextState = cloneState(state);
  nextState.queuedCommands[state.selectingPlayer] = command;

  if (state.selectingPlayer === "player1") {
    nextState.selectingPlayer = "player2";
    nextState.log.push("プレイヤー1はコマンドを選択した");
    return nextState;
  }

  nextState.log.push("プレイヤー2はコマンドを選択した");
  return resolveLocalBattleRound(nextState, random);
}

function resolveLocalBattleRound(
  state: LocalBattleState,
  random: RandomSource,
): LocalBattleState {
  const player1Command = state.queuedCommands.player1;
  const player2Command = state.queuedCommands.player2;

  if (player1Command === undefined || player2Command === undefined) {
    return state;
  }

  const nextState = cloneState(state);
  nextState.queuedCommands = {};
  nextState.selectingPlayer = "player1";
  nextState.player1.guarding = player1Command === "guard";
  nextState.player2.guarding = player2Command === "guard";

  const firstPlayer = getFirstPlayer(nextState);
  const secondPlayer = firstPlayer === "player1" ? "player2" : "player1";
  const commands: Record<LocalBattlePlayer, BattleCommand> = {
    player1: player1Command,
    player2: player2Command,
  };

  resolveLocalBattleAction(nextState, firstPlayer, commands[firstPlayer], random);
  if (nextState.winner !== null) {
    clearGuarding(nextState);
    return nextState;
  }

  resolveLocalBattleAction(nextState, secondPlayer, commands[secondPlayer], random);
  clearGuarding(nextState);
  return nextState;
}

function resolveLocalBattleAction(
  state: LocalBattleState,
  actorPlayer: LocalBattlePlayer,
  command: BattleCommand,
  random: RandomSource,
) {
  const actor = state[actorPlayer];
  const targetPlayer = actorPlayer === "player1" ? "player2" : "player1";
  const target = state[targetPlayer];
  const actorLabel = getPlayerLabel(actorPlayer);

  if (command === "guard") {
    state.log.push(`${actorLabel}は「${COMMAND_LABELS.guard}」で身を守った`);
    return;
  }

  if (command === "charge") {
    actor.charged = true;
    state.log.push(`${actorLabel}は「${COMMAND_LABELS.charge}」で力をためた`);
    return;
  }

  if (command === "special" && random() >= 0.7) {
    actor.charged = false;
    state.log.push(`${actorLabel}の「${COMMAND_LABELS.special}」は外れた`);
    return;
  }

  const damage = calculateDamage(actor, target, command, random);
  const guardText = target.guarding ? " 相手のまもりでダメージ軽減。" : "";
  actor.charged = false;
  target.currentHp = Math.max(0, target.currentHp - damage);
  state.log.push(
    `${actorLabel}の「${COMMAND_LABELS[command]}」。${damage}ダメージ。${guardText}`,
  );

  if (target.currentHp <= 0) {
    state.winner = actorPlayer;
    state.log.push(`${actorLabel}の勝利。バトル終了`);
  }
}

function getFirstPlayer(state: LocalBattleState): LocalBattlePlayer {
  return state.player1.character.stats.speed >= state.player2.character.stats.speed
    ? "player1"
    : "player2";
}

function getPlayerLabel(player: LocalBattlePlayer): string {
  return player === "player1" ? "プレイヤー1" : "プレイヤー2";
}

function clearGuarding(state: LocalBattleState) {
  state.player1.guarding = false;
  state.player2.guarding = false;
}

function createCombatant(character: Character): Combatant {
  return {
    character,
    currentHp: character.stats.hp,
    charged: false,
    guarding: false,
  };
}

function cloneCombatant(combatant: Combatant): Combatant {
  return {
    ...combatant,
  };
}

function cloneState(state: LocalBattleState): LocalBattleState {
  return {
    ...state,
    player1: cloneCombatant(state.player1),
    player2: cloneCombatant(state.player2),
    log: [...state.log],
    queuedCommands: { ...state.queuedCommands },
  };
}
