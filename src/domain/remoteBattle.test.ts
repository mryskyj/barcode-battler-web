import { describe, expect, it } from "vitest";
import {
  canJoinRemoteBattleRoom,
  canResolveRemoteBattleRound,
  createRemoteBattleRoom,
  joinRemoteBattleRoom,
  resolveRemoteBattleRound,
} from "./remoteBattle";
import type { Character } from "./character";

describe("createRemoteBattleRoom", () => {
  it("creates a waiting room with a connected host", () => {
    const room = createRemoteBattleRoom("ABCD12", "host-client", 1000, "Alice");

    expect(room).toMatchObject({
      roomId: "ABCD12",
      status: "waiting",
      host: {
        role: "host",
        clientId: "host-client",
        displayName: "Alice",
        connected: true,
        character: null,
        ready: false,
        selectedCommand: null,
      },
      guest: null,
      battle: {
        round: 0,
        host: null,
        guest: null,
        log: [],
        winner: null,
      },
      updatedAt: 1000,
    });
  });
});

describe("canJoinRemoteBattleRoom", () => {
  it("allows a guest to join a waiting room", () => {
    const room = createRemoteBattleRoom("ABCD12", "host-client", 1000);

    expect(canJoinRemoteBattleRoom(room, "guest-client")).toBe(true);
  });

  it("rejects a new guest after another guest joined", () => {
    const room = joinRemoteBattleRoom(
      createRemoteBattleRoom("ABCD12", "host-client", 1000),
      "guest-client",
      2000,
      "Bob",
    );

    expect(canJoinRemoteBattleRoom(room, "other-client")).toBe(false);
  });
});

describe("joinRemoteBattleRoom", () => {
  it("sets the guest and moves the room to ready", () => {
    const room = joinRemoteBattleRoom(
      createRemoteBattleRoom("ABCD12", "host-client", 1000),
      "guest-client",
      2000,
      "Bob",
    );

    expect(room.status).toBe("ready");
    expect(room.guest).toMatchObject({
      role: "guest",
      clientId: "guest-client",
      displayName: "Bob",
      connected: true,
    });
    expect(room.updatedAt).toBe(2000);
  });
});

describe("canResolveRemoteBattleRound", () => {
  it("waits until both players have selected commands", () => {
    const room = createPlayingRoom();

    expect(canResolveRemoteBattleRound(room)).toBe(false);
    expect(
      canResolveRemoteBattleRound({
        ...room,
        host: {
          ...room.host,
          selectedCommand: "attack",
        },
        guest:
          room.guest === null
            ? null
            : {
                ...room.guest,
                selectedCommand: "guard",
              },
      }),
    ).toBe(true);
  });
});

describe("resolveRemoteBattleRound", () => {
  it("resolves a round as host authority and clears selected commands", () => {
    const room = createCommandReadyRoom("attack", "guard");
    const resolved = resolveRemoteBattleRound(room, fixedRandom(0.5), 3000);

    expect(resolved.battle.round).toBe(1);
    expect(resolved.host.selectedCommand).toBeNull();
    expect(resolved.guest?.selectedCommand).toBeNull();
    expect(resolved.battle.guest?.currentHp).toBe(110);
    expect(resolved.battle.log.some((entry) => entry.includes("ホストの「たたかう」"))).toBe(
      true,
    );
    expect(resolved.updatedAt).toBe(3000);
  });

  it("finishes the room when a player wins", () => {
    const room = createCommandReadyRoom("attack", "attack", {
      hostPower: 200,
    });
    const resolved = resolveRemoteBattleRound(room, fixedRandom(0.5), 3000);

    expect(resolved.status).toBe("finished");
    expect(resolved.battle.winner).toBe("host");
    expect(resolved.battle.log).toContain("ホストの勝利。バトル終了");
  });
});

function createPlayingRoom() {
  const joined = joinRemoteBattleRoom(
    createRemoteBattleRoom("ABCD12", "host-client", 1000),
    "guest-client",
    2000,
  );

  return {
    ...joined,
    status: "playing" as const,
    host: {
      ...joined.host,
      character: createTestCharacter("host", {
        hp: 120,
        power: 30,
        defense: 10,
        speed: 20,
      }),
      ready: true,
    },
    guest:
      joined.guest === null
        ? null
        : {
            ...joined.guest,
            character: createTestCharacter("guest", {
              hp: 120,
              power: 24,
              defense: 10,
              speed: 10,
            }),
            ready: true,
          },
  };
}

function createCommandReadyRoom(
  hostCommand: "attack" | "charge" | "guard" | "special",
  guestCommand: "attack" | "charge" | "guard" | "special",
  options: { hostPower?: number } = {},
) {
  const room = createPlayingRoom();

  return {
    ...room,
    host: {
      ...room.host,
      character: createTestCharacter("host", {
        hp: 120,
        power: options.hostPower ?? 30,
        defense: 10,
        speed: 20,
      }),
      selectedCommand: hostCommand,
    },
    guest:
      room.guest === null
        ? null
        : {
            ...room.guest,
            selectedCommand: guestCommand,
          },
  };
}

function createTestCharacter(id: string, stats: Character["stats"]): Character {
  return {
    id,
    name: id,
    barcode: id,
    stats,
  };
}

function fixedRandom(value: number) {
  return () => value;
}
