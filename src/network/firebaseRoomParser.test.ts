import { describe, expect, it } from "vitest";
import {
  firebaseRoomDocumentToRemoteBattleRoom,
  parseFirebaseRoomDocument,
} from "./firebaseRoomParser";

const validRoom = {
  roomId: "ABCD12",
  status: "ready",
  host: {
    role: "host",
    clientId: "host-client",
    connected: true,
    character: null,
    ready: false,
    selectedCommand: null,
  },
  guest: {
    role: "guest",
    clientId: "guest-client",
    connected: true,
    character: {
      id: "guest-character",
      name: "ゲスト",
      barcode: "1234567890",
      stats: {
        hp: 120,
        power: 30,
        defense: 20,
        speed: 10,
      },
    },
    ready: true,
    selectedCommand: "attack",
  },
  battle: {
    round: 1,
    host: null,
    guest: null,
    log: ["接続完了"],
    winner: null,
  },
  updatedAt: 1000,
};

describe("parseFirebaseRoomDocument", () => {
  it("parses a valid room document", () => {
    expect(parseFirebaseRoomDocument(validRoom)).toEqual(validRoom);
  });

  it("rejects invalid room status", () => {
    expect(() =>
      parseFirebaseRoomDocument({
        ...validRoom,
        status: "unknown",
      }),
    ).toThrow("room.status must be one of");
  });

  it("rejects invalid selected commands", () => {
    expect(() =>
      parseFirebaseRoomDocument({
        ...validRoom,
        guest: {
          ...validRoom.guest,
          selectedCommand: "wait",
        },
      }),
    ).toThrow("room.guest.selectedCommand must be one of");
  });
});

describe("firebaseRoomDocumentToRemoteBattleRoom", () => {
  it("converts Firebase room documents to app room state", () => {
    const room = firebaseRoomDocumentToRemoteBattleRoom(
      parseFirebaseRoomDocument(validRoom),
    );

    expect(room.guest?.character?.stats.hp).toBe(120);
    expect(room.guest?.selectedCommand).toBe("attack");
    expect(room.battle.log).toEqual(["接続完了"]);
  });
});
