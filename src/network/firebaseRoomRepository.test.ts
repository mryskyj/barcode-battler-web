import type { Database } from "firebase/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirebaseRoomRepository } from "./firebaseRoomRepository";
import type { FirebaseRoomDocument } from "./firebaseRoomDocument";

const firebaseDatabaseMock = vi.hoisted(() => ({
  get: vi.fn(),
  onValue: vi.fn(),
  ref: vi.fn((_database: Database, path: string) => ({ path })),
  remove: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}));

vi.mock("firebase/database", () => firebaseDatabaseMock);

const roomDocument = {
  roomId: "ABCD12",
  status: "waiting",
  host: {
    role: "host",
    clientId: "host-client",
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
} satisfies FirebaseRoomDocument;

describe("createFirebaseRoomRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates rooms under the rooms path", async () => {
    const repository = createFirebaseRoomRepository({} as Database);

    await repository.createRoom(roomDocument);

    expect(firebaseDatabaseMock.ref).toHaveBeenCalledWith({}, "rooms/ABCD12");
    expect(firebaseDatabaseMock.set).toHaveBeenCalledWith(
      { path: "rooms/ABCD12" },
      roomDocument,
    );
  });

  it("returns null when a room does not exist", async () => {
    firebaseDatabaseMock.get.mockResolvedValueOnce({
      exists: () => false,
    });
    const repository = createFirebaseRoomRepository({} as Database);

    await expect(repository.getRoom("ABCD12")).resolves.toBeNull();
  });

  it("parses room snapshots before returning them", async () => {
    firebaseDatabaseMock.get.mockResolvedValueOnce({
      exists: () => true,
      val: () => roomDocument,
    });
    const repository = createFirebaseRoomRepository({} as Database);

    const room = await repository.getRoom("ABCD12");

    expect(room?.roomId).toBe("ABCD12");
    expect(room?.host.clientId).toBe("host-client");
  });

  it("subscribes to room changes", () => {
    const unsubscribe = vi.fn();
    firebaseDatabaseMock.onValue.mockImplementationOnce((_path, onRoom) => {
      onRoom({
        exists: () => true,
        val: () => roomDocument,
      });
      return unsubscribe;
    });
    const repository = createFirebaseRoomRepository({} as Database);
    const onRoom = vi.fn();

    const result = repository.subscribeRoom("ABCD12", onRoom, vi.fn());

    expect(onRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "ABCD12",
      }),
    );
    expect(result).toBe(unsubscribe);
  });
});
