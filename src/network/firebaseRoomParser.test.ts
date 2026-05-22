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
    displayName: "Alice",
    connected: true,
    character: null,
    ready: false,
    selectedCommand: null,
  },
  guest: {
    role: "guest",
    clientId: "guest-client",
    displayName: "Bob",
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

  it("treats missing nullable fields as null because Realtime Database omits null values", () => {
    const parsed = parseFirebaseRoomDocument({
      roomId: "ABCD12",
      status: "waiting",
      host: {
        role: "host",
        clientId: "host-client",
        connected: true,
        ready: false,
      },
      battle: {
        round: 0,
        log: [],
      },
      updatedAt: 1000,
    });

    expect(parsed.host.character).toBeNull();
    expect(parsed.host.displayName).toBe("ホスト");
    expect(parsed.host.selectedCommand).toBeNull();
    expect(parsed.guest).toBeNull();
    expect(parsed.battle.host).toBeNull();
    expect(parsed.battle.guest).toBeNull();
    expect(parsed.battle.log).toEqual([]);
    expect(parsed.battle.winner).toBeNull();
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
    expect(room.host.displayName).toBe("Alice");
    expect(room.guest?.displayName).toBe("Bob");
    expect(room.guest?.selectedCommand).toBe("attack");
    expect(room.battle.log).toEqual(["接続完了"]);
  });
});
