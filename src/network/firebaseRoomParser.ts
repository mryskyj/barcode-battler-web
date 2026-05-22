import type { Combatant } from "../domain/battleTypes";
import type { Character, CharacterStats } from "../domain/character";
import type {
  RemoteBattleParticipant,
  RemoteBattleRoom,
  RemoteBattleSnapshot,
} from "../domain/remoteBattle";
import type {
  FirebaseBattleDocument,
  FirebaseCharacterDocument,
  FirebaseCombatantDocument,
  FirebaseParticipantDocument,
  FirebaseRoomDocument,
} from "./firebaseRoomDocument";

const BATTLE_COMMANDS = ["attack", "charge", "guard", "special"] as const;
const REMOTE_ROLES = ["host", "guest"] as const;
const ROOM_STATUSES = ["waiting", "ready", "playing", "finished", "closed"] as const;
const WINNERS = ["host", "guest", "draw"] as const;

export function parseFirebaseRoomDocument(value: unknown): FirebaseRoomDocument {
  const object = requireRecord(value, "room");

  return {
    roomId: requireString(object.roomId, "room.roomId"),
    status: requireOneOf(object.status, ROOM_STATUSES, "room.status"),
    host: parseParticipantDocument(object.host, "room.host"),
    guest: isMissingNullable(object.guest)
      ? null
      : parseParticipantDocument(object.guest, "room.guest"),
    battle: parseBattleDocument(object.battle, "room.battle"),
    updatedAt: requireNumber(object.updatedAt, "room.updatedAt"),
  };
}

export function firebaseRoomDocumentToRemoteBattleRoom(
  document: FirebaseRoomDocument,
): RemoteBattleRoom {
  return {
    roomId: document.roomId,
    status: document.status,
    host: participantDocumentToRemoteParticipant(document.host),
    guest:
      document.guest === null
        ? null
        : participantDocumentToRemoteParticipant(document.guest),
    battle: battleDocumentToRemoteSnapshot(document.battle),
    updatedAt: document.updatedAt,
  };
}

function parseParticipantDocument(
  value: unknown,
  path: string,
): FirebaseParticipantDocument {
  const object = requireRecord(value, path);

  return {
    role: requireOneOf(object.role, REMOTE_ROLES, `${path}.role`),
    clientId: requireString(object.clientId, `${path}.clientId`),
    connected: requireBoolean(object.connected, `${path}.connected`),
    character: isMissingNullable(object.character)
      ? null
      : parseCharacterDocument(object.character, `${path}.character`),
    ready: requireBoolean(object.ready, `${path}.ready`),
    selectedCommand: isMissingNullable(object.selectedCommand)
      ? null
      : requireOneOf(object.selectedCommand, BATTLE_COMMANDS, `${path}.selectedCommand`),
  };
}

function parseBattleDocument(value: unknown, path: string): FirebaseBattleDocument {
  const object = requireRecord(value, path);

  return {
    round: requireNumber(object.round, `${path}.round`),
    host: isMissingNullable(object.host)
      ? null
      : parseCombatantDocument(object.host, `${path}.host`),
    guest: isMissingNullable(object.guest)
      ? null
      : parseCombatantDocument(object.guest, `${path}.guest`),
    log: isMissingNullable(object.log)
      ? []
      : requireStringArray(object.log, `${path}.log`),
    winner: isMissingNullable(object.winner)
      ? null
      : requireOneOf(object.winner, WINNERS, `${path}.winner`),
  };
}

function parseCombatantDocument(
  value: unknown,
  path: string,
): FirebaseCombatantDocument {
  const object = requireRecord(value, path);

  return {
    character: parseCharacterDocument(object.character, `${path}.character`),
    currentHp: requireNumber(object.currentHp, `${path}.currentHp`),
    charged: requireBoolean(object.charged, `${path}.charged`),
    guarding: requireBoolean(object.guarding, `${path}.guarding`),
  };
}

function parseCharacterDocument(
  value: unknown,
  path: string,
): FirebaseCharacterDocument {
  const object = requireRecord(value, path);

  return {
    id: requireString(object.id, `${path}.id`),
    name: requireString(object.name, `${path}.name`),
    barcode: requireString(object.barcode, `${path}.barcode`),
    stats: parseCharacterStats(object.stats, `${path}.stats`),
  };
}

function parseCharacterStats(value: unknown, path: string): CharacterStats {
  const object = requireRecord(value, path);

  return {
    hp: requireNumber(object.hp, `${path}.hp`),
    power: requireNumber(object.power, `${path}.power`),
    defense: requireNumber(object.defense, `${path}.defense`),
    speed: requireNumber(object.speed, `${path}.speed`),
  };
}

function participantDocumentToRemoteParticipant(
  document: FirebaseParticipantDocument,
): RemoteBattleParticipant {
  return {
    role: document.role,
    clientId: document.clientId,
    connected: document.connected,
    character:
      document.character === null ? null : characterDocumentToCharacter(document.character),
    ready: document.ready,
    selectedCommand: document.selectedCommand,
  };
}

function battleDocumentToRemoteSnapshot(
  document: FirebaseBattleDocument,
): RemoteBattleSnapshot {
  return {
    round: document.round,
    host:
      document.host === null ? null : combatantDocumentToCombatant(document.host),
    guest:
      document.guest === null ? null : combatantDocumentToCombatant(document.guest),
    log: document.log,
    winner: document.winner,
  };
}

function combatantDocumentToCombatant(document: FirebaseCombatantDocument): Combatant {
  return {
    character: characterDocumentToCharacter(document.character),
    currentHp: document.currentHp,
    charged: document.charged,
    guarding: document.guarding,
  };
}

function characterDocumentToCharacter(document: FirebaseCharacterDocument): Character {
  return {
    id: document.id,
    name: document.name,
    barcode: document.barcode,
    stats: document.stats,
  };
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function isMissingNullable(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }

  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }

  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }

  return value;
}

function requireStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${path} must be a string array`);
  }

  return value;
}

function requireOneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new Error(`${path} must be one of: ${values.join(", ")}`);
  }

  return value;
}
