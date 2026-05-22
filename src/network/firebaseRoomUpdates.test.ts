import { describe, expect, it } from "vitest";
import {
  characterToFirebaseDocument,
  createCharacterReadyUpdate,
} from "./firebaseRoomUpdates";
import type { Character } from "../domain/character";

const character = {
  id: "character-id",
  name: "プレイヤー",
  barcode: "4901234567894",
  stats: {
    hp: 120,
    power: 30,
    defense: 20,
    speed: 10,
  },
} satisfies Character;

describe("characterToFirebaseDocument", () => {
  it("converts characters to Firebase-safe documents", () => {
    expect(characterToFirebaseDocument(character)).toEqual(character);
  });
});

describe("createCharacterReadyUpdate", () => {
  it("creates an update payload for the participant character readiness", () => {
    expect(createCharacterReadyUpdate("host", character, 1000)).toEqual({
      "host/character": character,
      "host/ready": true,
      updatedAt: 1000,
    });
  });
});
