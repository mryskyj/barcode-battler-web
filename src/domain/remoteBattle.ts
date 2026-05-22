import type { BattleCommand, Combatant } from "./battleTypes";
import { calculateDamage, type RandomSource } from "./battle";
import type { Character } from "./character";
import { COMMAND_LABELS } from "./commandLabels";

export type RemoteBattleRole = "host" | "guest";

export type RemoteBattleStatus =
  | "waiting"
  | "ready"
  | "playing"
  | "finished"
  | "closed";

export type RemoteBattleWinner = RemoteBattleRole | "draw";

export type RemoteBattleParticipant = {
  role: RemoteBattleRole;
  clientId: string;
  connected: boolean;
  character: Character | null;
  ready: boolean;
  selectedCommand: BattleCommand | null;
};

export type RemoteBattleSnapshot = {
  round: number;
  host: Combatant | null;
  guest: Combatant | null;
  log: string[];
  winner: RemoteBattleWinner | null;
};

export type RemoteBattleRoom = {
  roomId: string;
  status: RemoteBattleStatus;
  host: RemoteBattleParticipant;
  guest: RemoteBattleParticipant | null;
  battle: RemoteBattleSnapshot;
  updatedAt: number;
};

export function createRemoteBattleRoom(
  roomId: string,
  hostClientId: string,
  now: number,
): RemoteBattleRoom {
  return {
    roomId,
    status: "waiting",
    host: createParticipant("host", hostClientId),
    guest: null,
    battle: createInitialBattleSnapshot(),
    updatedAt: now,
  };
}

export function canJoinRemoteBattleRoom(
  room: RemoteBattleRoom,
  guestClientId: string,
): boolean {
  if (room.status !== "waiting") {
    return false;
  }

  return room.guest === null || room.guest.clientId === guestClientId;
}

export function joinRemoteBattleRoom(
  room: RemoteBattleRoom,
  guestClientId: string,
  now: number,
): RemoteBattleRoom {
  if (!canJoinRemoteBattleRoom(room, guestClientId)) {
    return room;
  }

  return {
    ...room,
    status: "ready",
    guest: createParticipant("guest", guestClientId),
    updatedAt: now,
  };
}

export function canResolveRemoteBattleRound(room: RemoteBattleRoom): boolean {
  if (room.guest === null) {
    return false;
  }

  return (
    room.status === "playing" &&
    room.host.character !== null &&
    room.guest.character !== null &&
    room.host.selectedCommand !== null &&
    room.guest.selectedCommand !== null &&
    room.battle.winner === null
  );
}

export function resolveRemoteBattleRound(
  room: RemoteBattleRoom,
  random: RandomSource,
  now: number,
): RemoteBattleRoom {
  if (!canResolveRemoteBattleRound(room)) {
    return room;
  }

  const guest = room.guest;

  if (guest === null || room.host.character === null || guest.character === null) {
    return room;
  }

  const battle = createResolvableBattleSnapshot(room);
  const hostCommand = room.host.selectedCommand;
  const guestCommand = guest.selectedCommand;

  if (hostCommand === null || guestCommand === null) {
    return room;
  }

  battle.host.guarding = hostCommand === "guard";
  battle.guest.guarding = guestCommand === "guard";

  const firstRole = getFirstRemoteBattleRole(battle);
  const secondRole = firstRole === "host" ? "guest" : "host";
  const commands: Record<RemoteBattleRole, BattleCommand> = {
    host: hostCommand,
    guest: guestCommand,
  };

  resolveRemoteBattleAction(battle, firstRole, commands[firstRole], random);
  if (battle.winner === null) {
    resolveRemoteBattleAction(battle, secondRole, commands[secondRole], random);
  }

  clearRemoteBattleGuarding(battle);

  return {
    ...room,
    status: battle.winner === null ? "playing" : "finished",
    host: {
      ...room.host,
      selectedCommand: null,
    },
    guest: {
      ...guest,
      selectedCommand: null,
    },
    battle: {
      ...battle,
      round: room.battle.round + 1,
    },
    updatedAt: now,
  };
}

function createResolvableBattleSnapshot(
  room: RemoteBattleRoom,
): RemoteBattleSnapshot & { host: Combatant; guest: Combatant } {
  const hostCharacter = requireCharacter(room.host.character, "host");
  const guestCharacter = requireCharacter(room.guest?.character ?? null, "guest");

  return {
    round: room.battle.round,
    host: room.battle.host ?? createCombatant(hostCharacter),
    guest: room.battle.guest ?? createCombatant(guestCharacter),
    log: [...room.battle.log],
    winner: room.battle.winner,
  };
}

function resolveRemoteBattleAction(
  battle: RemoteBattleSnapshot & { host: Combatant; guest: Combatant },
  actorRole: RemoteBattleRole,
  command: BattleCommand,
  random: RandomSource,
) {
  const actor = battle[actorRole];
  const targetRole = actorRole === "host" ? "guest" : "host";
  const target = battle[targetRole];
  const actorLabel = actorRole === "host" ? "ホスト" : "ゲスト";

  if (command === "guard") {
    battle.log.push(`${actorLabel}は「${COMMAND_LABELS.guard}」で身を守った`);
    return;
  }

  if (command === "charge") {
    actor.charged = true;
    battle.log.push(`${actorLabel}は「${COMMAND_LABELS.charge}」で力をためた`);
    return;
  }

  if (command === "special" && random() >= 0.7) {
    actor.charged = false;
    battle.log.push(`${actorLabel}の「${COMMAND_LABELS.special}」は外れた`);
    return;
  }

  const damage = calculateDamage(actor, target, command, random);
  const guardText = target.guarding ? " 相手のまもりでダメージ軽減。" : "";
  actor.charged = false;
  target.currentHp = Math.max(0, target.currentHp - damage);
  battle.log.push(
    `${actorLabel}の「${COMMAND_LABELS[command]}」。${damage}ダメージ。${guardText}`,
  );

  if (target.currentHp <= 0) {
    battle.winner = actorRole;
    battle.log.push(`${actorLabel}の勝利。バトル終了`);
  }
}

function getFirstRemoteBattleRole(
  battle: RemoteBattleSnapshot & { host: Combatant; guest: Combatant },
): RemoteBattleRole {
  return battle.host.character.stats.speed >= battle.guest.character.stats.speed
    ? "host"
    : "guest";
}

function clearRemoteBattleGuarding(
  battle: RemoteBattleSnapshot & { host: Combatant; guest: Combatant },
) {
  battle.host.guarding = false;
  battle.guest.guarding = false;
}

function createParticipant(
  role: RemoteBattleRole,
  clientId: string,
): RemoteBattleParticipant {
  return {
    role,
    clientId,
    connected: true,
    character: null,
    ready: false,
    selectedCommand: null,
  };
}

function createCombatant(character: Character): Combatant {
  return {
    character,
    currentHp: character.stats.hp,
    charged: false,
    guarding: false,
  };
}

function requireCharacter(
  character: Character | null,
  role: RemoteBattleRole,
): Character {
  if (character === null) {
    throw new Error(`${role} character is required`);
  }

  return character;
}

function createInitialBattleSnapshot(): RemoteBattleSnapshot {
  return {
    round: 0,
    host: null,
    guest: null,
    log: [],
    winner: null,
  };
}
