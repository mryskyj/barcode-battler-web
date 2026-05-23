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
      screen.getByRole("heading", { level: 1, name: "バーコードバトラー" }),
    ).toBeInTheDocument();
  });

  it("shows the title screen first", () => {
    render(<App />);

    expect(screen.getByRole("region", { name: "タイトル" })).toBeInTheDocument();
    expect(screen.getByText("スキャンしてたたかえ！")).toBeInTheDocument();
    expect(screen.getByText("START")).toBeInTheDocument();
    expect(screen.getByText("NO PLAYER DATA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "はじめる" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "ユーザー名入力" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "部屋を作る" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "CPU戦" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "2人ローカル対戦" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "通信対戦" })).not.toBeInTheDocument();
  });

  it("shows saved display name on the title screen", () => {
    globalThis.localStorage.setItem(
      "barcodeBattler.playerProfile",
      JSON.stringify({ profileKey: "profile-key", displayName: "Alice" }),
    );

    render(<App />);

    expect(screen.getByRole("region", { name: "タイトル" })).toBeInTheDocument();
    expect(screen.getByText("PLAYER")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("saves and updates the player display name", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "はじめる" }));

    expect(screen.getByText("プレイヤーとうろく")).toBeInTheDocument();
    expect(screen.getByText("なまえをきめよう")).toBeInTheDocument();
    expect(screen.getByText("プレイヤーカードに名前を書こう")).toBeInTheDocument();
    await user.type(screen.getByLabelText("ユーザー名"), " Alice ");
    await user.click(screen.getByRole("button", { name: "ユーザー名を保存" }));

    expect(screen.getByText("バーコードスキャン")).toBeInTheDocument();
    expect(screen.getByText("キャラクターをよびだそう")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(globalThis.localStorage.getItem("barcodeBattler.playerProfile")).toContain(
      "\"displayName\":\"Alice\"",
    );

    unmount();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "ユーザー名を変更" }));
    expect(screen.getByText("プレイヤーへんこう")).toBeInTheDocument();
    expect(screen.getByText("いまの名前")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("ユーザー名"));
    await user.type(screen.getByLabelText("ユーザー名"), "Bob");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(globalThis.localStorage.getItem("barcodeBattler.playerProfile")).toContain(
      "\"displayName\":\"Bob\"",
    );
  });

  it("shows remote battle room creation and join controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await saveDisplayName(user, "Alice");

    expect(
      screen.getByRole("region", { name: "キャラクター準備" }),
    ).toBeInTheDocument();
    expect(screen.getByText("バーコードスキャン")).toBeInTheDocument();
    expect(screen.getByText("キャラクターをよびだそう")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "カメラでバーコード読み取り" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "数字を直接入力" })).toBeInTheDocument();
    expect(screen.queryByLabelText("自分のバーコード")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "部屋を作る" })).not.toBeInTheDocument();

    await prepareCharacter(user);

    expect(screen.getByRole("region", { name: "対戦準備" })).toBeInTheDocument();
    expect(screen.getByText("バトルメニュー")).toBeInTheDocument();
    expect(screen.getByText("対戦をはじめよう")).toBeInTheDocument();
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

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "ランキングを見る" }));

    expect(await screen.findByRole("region", { name: "ランキング" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "タイトルに戻る" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "更新" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ロビーへ戻る" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "もう一回対戦" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("3勝")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("returns from rankings to the title screen", async () => {
    const user = userEvent.setup();
    render(
      <App
        remoteRepository={createFinishedOnSubscribeRepository()}
        rankingRepository={createTestRankingRepository()}
      />,
    );

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(await screen.findByRole("button", { name: "ランキングを見る" }));
    await user.click(await screen.findByRole("button", { name: "タイトルに戻る" }));

    expect(screen.getByRole("region", { name: "タイトル" })).toBeInTheDocument();
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
  });

  it("returns from battle results to the title screen", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createFinishedOnSubscribeRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(await screen.findByRole("button", { name: "タイトルに戻る" }));

    expect(screen.getByRole("region", { name: "タイトル" })).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows remote character setup after creating a room", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByText("ホストとして参加中")).toBeInTheDocument();
    expect(screen.getByText("マッチング")).toBeInTheDocument();
    expect(screen.getByText("対戦カード")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    expect(screen.getByText("自分: Alice / 相手: ゲスト")).toBeInTheDocument();
    expect(screen.getByText("相手待ち")).toBeInTheDocument();
    expect(screen.getByText("ゲストの参加・準備待ち")).toBeInTheDocument();
    expect(screen.queryByLabelText("自分のバーコード")).not.toBeInTheDocument();
  });

  it("shows room creation errors in the lobby", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createFailingRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByText("permission denied")).toBeInTheDocument();
  });

  it("marks the remote character as ready", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(screen.getByText("キャラクター準備完了")).toBeInTheDocument();
    expect(screen.getByText("ゲストの参加・準備待ち")).toBeInTheDocument();
  });

  it("can leave remote setup and return to room selection", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(await screen.findByRole("button", { name: "退出して戻る" }));

    expect(screen.getByRole("region", { name: "部屋を作る" })).toBeInTheDocument();
  });

  it("keeps remote setup controls available for compact layouts", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createTestRemoteRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByRole("status")).toHaveTextContent("相手待ち");
    expect(screen.getByRole("button", { name: "退出して戻る" })).toBeEnabled();
  });

  it("shows the remote battle as a front and back battle stage", async () => {
    const user = userEvent.setup();
    render(<App remoteRepository={createPlayingOnSubscribeRepository()} />);

    await saveDisplayName(user, "Alice");
    await prepareCharacter(user);
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(await screen.findByRole("region", { name: "バトルステージ" })).toBeInTheDocument();
    expect(screen.getByText("相手")).toBeInTheDocument();
    expect(screen.getByText("自分")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("キャラクタースロット")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "通信対戦操作" })).toBeInTheDocument();
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
    await prepareCharacter(user);
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
    await user.click(screen.getByRole("button", { name: "数字を直接入力" }));
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
    await prepareCharacter(user);
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
  await user.click(screen.getByRole("button", { name: "はじめる" }));
  await user.type(screen.getByLabelText("ユーザー名"), displayName);
  await user.click(screen.getByRole("button", { name: "ユーザー名を保存" }));
}

async function prepareCharacter(user: ReturnType<typeof userEvent.setup>) {
  const manualEntryButton = screen.queryByRole("button", {
    name: "数字を直接入力",
  });

  if (manualEntryButton !== null) {
    await user.click(manualEntryButton);
    await user.type(screen.getByLabelText("自分のバーコード"), "4901234567894");
  }

  await user.click(screen.getByRole("button", { name: "キャラクター準備" }));
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

function createPlayingOnSubscribeRepository(): FirebaseRoomRepository {
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
      const guest = joinedRoom.guest;

      room =
        guest === null || createdRoom.host.character === null
          ? joinedRoom
          : {
              ...joinedRoom,
              status: "playing",
              host: {
                ...joinedRoom.host,
                ready: true,
              },
              guest: {
                ...guest,
                character: createdRoom.host.character,
                ready: true,
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
