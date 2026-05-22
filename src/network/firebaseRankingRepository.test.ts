import type { Database } from "firebase/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFirebaseRankingRepository,
  getFirebaseRankingEntryPath,
} from "./firebaseRankingRepository";
import type { RankingEntry } from "../domain/ranking";

const firebaseDatabaseMock = vi.hoisted(() => ({
  get: vi.fn(),
  ref: vi.fn((_database: Database, path: string) => ({ path })),
  set: vi.fn(),
}));

vi.mock("firebase/database", () => firebaseDatabaseMock);

describe("createFirebaseRankingRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sorted ranking entries", async () => {
    firebaseDatabaseMock.get.mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        a: createEntry({ profileKey: "a", wins: 1 }),
        b: createEntry({ profileKey: "b", wins: 3 }),
        invalid: { profileKey: "invalid" },
      }),
    });
    const repository = createFirebaseRankingRepository({} as Database);

    await expect(repository.getRankingEntries()).resolves.toMatchObject([
      { profileKey: "b" },
      { profileKey: "a" },
    ]);
    expect(firebaseDatabaseMock.ref).toHaveBeenCalledWith({}, "rankings");
  });

  it("returns an empty list when rankings do not exist", async () => {
    firebaseDatabaseMock.get.mockResolvedValueOnce({
      exists: () => false,
    });
    const repository = createFirebaseRankingRepository({} as Database);

    await expect(repository.getRankingEntries()).resolves.toEqual([]);
  });

  it("updates a battle result under the profile key", async () => {
    firebaseDatabaseMock.get.mockResolvedValueOnce({
      exists: () => true,
      val: () => createEntry({ wins: 1, battles: 1 }),
    });
    const repository = createFirebaseRankingRepository({} as Database);

    await expect(
      repository.updateBattleResult("profile-key", "Alice", "win", 2000),
    ).resolves.toMatchObject({
      profileKey: "profile-key",
      displayName: "Alice",
      wins: 2,
      battles: 2,
      lastPlayedAt: 2000,
    });
    expect(firebaseDatabaseMock.ref).toHaveBeenCalledWith(
      {},
      "rankings/profile-key",
    );
    expect(firebaseDatabaseMock.set).toHaveBeenCalledWith(
      { path: "rankings/profile-key" },
      expect.objectContaining({
        profileKey: "profile-key",
        displayName: "Alice",
        wins: 2,
      }),
    );
  });
});

describe("getFirebaseRankingEntryPath", () => {
  it("returns the Realtime Database path for a ranking entry", () => {
    expect(getFirebaseRankingEntryPath("profile-key")).toBe("rankings/profile-key");
  });
});

function createEntry(overrides: Partial<RankingEntry> = {}): RankingEntry {
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
