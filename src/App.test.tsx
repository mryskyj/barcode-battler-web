import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { RankingEntry } from "./domain/ranking";
import {
  createRemoteBattleRoom,
  joinRemoteBattleRoom,
  type RemoteBattleRoom,
} from "./domain/remoteBattle";
import { firebaseRoomDocumentToRemoteBattleRoom } from "./network/firebaseRoomParser";
import type { FirebaseRankingRepository } from "./network/firebaseRankingRepository";
import type { FirebaseRoomRepository } from "./network/firebaseRoomRepository";

describe("App", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the app title", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Barcode Battler Web" }),
    ).toBeInTheDocument();
  });

  it("shows remote battle controls as the primary flow", () => {
    render(<App />);

    expect(screen.getByRole("region", { name: "プロフィール" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "部屋を作る" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "部屋に参加する" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "ランキングを見る" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "部屋を作る" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "参加する" })).toBeDisabled();
    expect(screen.getByText("通信対戦の前にユーザー名を保存してください")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "CPU戦" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "2人ローカル対戦" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "通信対戦" })).not.toBeInTheDocument();
  });

  it("saves and updates the player display name", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("ユーザー名"), " Alice ");
    await user.click(screen.getByRole("button", { name: "ユーザー名を保存" }));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(globalThis.localStorage.getItem("barcodeBattler.playerProfile")).toContain(
      "\"displayName\":\"Alice\"",
    );

    await user.clear(screen.getByLabelText("ユーザー名"));
    await user.type(screen.getByLabelText("ユーザー名"), "Bob");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows remote battle room creation and join controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await saveDisplayName(user, "Alice");

    expect(screen.getByRole("region", { name: "部屋を作る" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "部屋に参加する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "部屋を作る" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "参加する" })).toBeDisabled();
  });

  it("shows rankings from Firebase", async () => {
    const user = userEvent.setup();
    render(
      <App
        rankingRepository={createTestRankingRepository([
          createRankingEntry({ profileKey: "alice", displayName: "Alice", wins: 3 }),
          createRankingEntry({ profileKey: "bob", displayName: "Bob", wins: 1 }),
        ])}
      />,
    );

    await user.click(screen.getByRole("button", { name: "ランキングを見る" }));

    expect(await screen.findByRole("region", { name: "ランキング" })).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("3勝")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows remote character setup after creating a room", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByText("ホストとして参加中")).toBeInTheDocument();
    expect(screen.getByText("自分: Alice / 相手: ゲスト")).toBeInTheDocument();
    expect(screen.getByText("相手待ち")).toBeInTheDocument();
    expect(screen.getByText("ゲストの参加待ち")).toBeInTheDocument();
    expect(screen.getByLabelText("自分のバーコード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeEnabled();
  });

  it("shows room creation errors in the lobby", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createFailingRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByText("permission denied")).toBeInTheDocument();
  });

  it("marks the remote character as ready", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(await screen.findByRole("button", { name: "キャラクター準備" }));

    expect(screen.getByText("キャラクター準備完了")).toBeInTheDocument();
    expect(screen.getByText("ゲストの参加・準備待ち")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeDisabled();
  });

  it("can leave remote setup and return to room selection", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(await screen.findByRole("button", { name: "退出して戻る" }));

    expect(screen.getByRole("region", { name: "部屋を作る" })).toBeInTheDocument();
  });

  it("keeps remote setup controls available for compact layouts", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByRole("status")).toHaveTextContent("相手待ち");
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "退出して戻る" })).toBeEnabled();
  });

  it("normalizes remote room ids before joining", async () => {
    const user = userEvent.setup();
    render(
      <App
        remoteRepository={createTestRemoteRepository([
          createRemoteBattleRoom("AB12CD", "host-client", 1000, "Alice"),
        ])}
      />,
    );

    await saveDisplayName(user, "Bob");
    await user.type(screen.getByLabelText("部屋ID"), " ab12cd ");
    await user.click(screen.getByRole("button", { name: "参加する" }));

    expect(await screen.findByText("AB12CD")).toBeInTheDocument();
    expect(screen.getByText("ゲストとして参加中")).toBeInTheDocument();
    expect(screen.getByText("自分: Bob / 相手: Alice")).toBeInTheDocument();
  });

  it("shows remote barcode validation while preparing a character", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.clear(await screen.findByLabelText("自分のバーコード"));
    await user.type(screen.getByLabelText("自分のバーコード"), "123");

    expect(screen.getByText("4文字以上で入力してください")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeDisabled();
  });

  it("shows an error when ranking result saving fails", async () => {
    const user = userEvent.setup();
    render(
      <App
        remoteRepository={createFinishedOnSubscribeRepository()}
        rankingRepository={createFailingRankingRepository()}
      />,
    );

    await saveDisplayName(user, "Alice");
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(
      await screen.findByText("ランキング保存に失敗しました: network down"),
    ).toBeInTheDocument();
  });
});

function createTestRemoteRepository(
  initialRooms: RemoteBattleRoom[] = [],
): FirebaseRoomRepository {
  const rooms = new Map<string, RemoteBattleRoom>(
    initialRooms.map((room) => [room.roomId, room]),
  );
  const subscribers = new Map<string, Set<(room: RemoteBattleRoom | null) => void>>();

  function notify(roomId: string) {
    for (const subscriber of subscribers.get(roomId) ?? []) {
      subscriber(rooms.get(roomId) ?? null);
    }
  }

  return {
    async createRoom(room) {
      rooms.set(room.roomId, firebaseRoomDocumentToRemoteBattleRoom(room));
      notify(room.roomId);
    },
    async getRoom(roomId) {
      return rooms.get(roomId) ?? null;
    },
    subscribeRoom(roomId, onRoom) {
      const roomSubscribers = subscribers.get(roomId) ?? new Set();
      roomSubscribers.add(onRoom);
      subscribers.set(roomId, roomSubscribers);
      onRoom(rooms.get(roomId) ?? null);

      return () => {
        roomSubscribers.delete(onRoom);
      };
    },
    async updateRoom(roomId, values) {
      const room = rooms.get(roomId);

      if (room === undefined) {
        return;
      }

      const nextRoom = applyFirebaseUpdate(room, values);
      rooms.set(roomId, nextRoom);
      notify(roomId);
    },
    async removeRoom(roomId) {
      rooms.delete(roomId);
      notify(roomId);
    },
  };
}

function createFailingRemoteRepository(): FirebaseRoomRepository {
  return {
    async createRoom() {
      throw new Error("permission denied");
    },
    async getRoom() {
      return null;
    },
    subscribeRoom() {
      return () => undefined;
    },
    async updateRoom() {
      return undefined;
    },
    async removeRoom() {
      return undefined;
    },
  };
}

async function saveDisplayName(
  user: ReturnType<typeof userEvent.setup>,
  displayName: string,
) {
  await user.type(screen.getByLabelText("ユーザー名"), displayName);
  await user.click(screen.getByRole("button", { name: "ユーザー名を保存" }));
}

function applyFirebaseUpdate(
  room: RemoteBattleRoom,
  values: Record<string, unknown>,
): RemoteBattleRoom {
  const nextRoom = JSON.parse(JSON.stringify(room)) as Record<string, unknown>;

  for (const [path, value] of Object.entries(values)) {
    const segments = path.split("/");
    let target = nextRoom;

    for (const segment of segments.slice(0, -1)) {
      target = target[segment] as Record<string, unknown>;
    }

    target[segments[segments.length - 1]] = value;
  }

  return nextRoom as RemoteBattleRoom;
}

function createTestRankingRepository(
  initialEntries: RankingEntry[] = [],
): FirebaseRankingRepository {
  const entries = new Map<string, RankingEntry>(
    initialEntries.map((entry) => [entry.profileKey, entry]),
  );

  return {
    async getRankingEntries() {
      return [...entries.values()];
    },
    async updateBattleResult(profileKey, displayName, result, now) {
      const currentEntry = entries.get(profileKey) ?? createRankingEntry({
        profileKey,
        displayName,
        wins: 0,
        losses: 0,
        battles: 0,
        lastPlayedAt: 0,
        updatedAt: 0,
      });
      const nextEntry = {
        ...currentEntry,
        displayName,
        wins: currentEntry.wins + (result === "win" ? 1 : 0),
        losses: currentEntry.losses + (result === "loss" ? 1 : 0),
        battles: currentEntry.battles + 1,
        lastPlayedAt: now,
        updatedAt: now,
      };
      entries.set(profileKey, nextEntry);
      return nextEntry;
    },
  };
}

function createFailingRankingRepository(): FirebaseRankingRepository {
  return {
    async getRankingEntries() {
      return [];
    },
    async updateBattleResult() {
      throw new Error("network down");
    },
  };
}

function createFinishedOnSubscribeRepository(): FirebaseRoomRepository {
  let room: RemoteBattleRoom | null = null;

  return {
    async createRoom(nextRoom) {
      const createdRoom = firebaseRoomDocumentToRemoteBattleRoom(nextRoom);
      const joinedRoom = joinRemoteBattleRoom(
        createdRoom,
        "guest-client",
        createdRoom.updatedAt + 1,
        "Bob",
      );
      room = {
        ...joinedRoom,
        status: "finished",
        battle: {
          ...joinedRoom.battle,
          round: 1,
          winner: "host",
          log: ["Aliceの勝利。バトル終了"],
        },
      };
    },
    async getRoom() {
      return room;
    },
    subscribeRoom(_roomId, onRoom) {
      onRoom(room);
      return () => undefined;
    },
    async updateRoom() {
      return undefined;
    },
    async removeRoom() {
      room = null;
    },
  };
}

function createRankingEntry(overrides: Partial<RankingEntry> = {}): RankingEntry {
  return {
    profileKey: "profile-key",
    displayName: "Alice",
    wins: 1,
    losses: 0,
    battles: 1,
    lastPlayedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}
