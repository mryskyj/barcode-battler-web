import type { Character } from "../domain/character";
import type { RemoteBattleRole } from "../domain/remoteBattle";
import type { FirebaseCharacterDocument } from "./firebaseRoomDocument";

export type FirebaseRoomUpdate = Record<string, unknown>;

export function characterToFirebaseDocument(
  character: Character,
): FirebaseCharacterDocument {
  return {
    id: character.id,
    name: character.name,
    barcode: character.barcode,
    stats: {
      hp: character.stats.hp,
      power: character.stats.power,
      defense: character.stats.defense,
      speed: character.stats.speed,
    },
  };
}

export function createCharacterReadyUpdate(
  role: RemoteBattleRole,
  character: Character,
  now: number,
): FirebaseRoomUpdate {
  return {
    [`${role}/character`]: characterToFirebaseDocument(character),
    [`${role}/ready`]: true,
    updatedAt: now,
  };
}
