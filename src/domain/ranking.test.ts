import { describe, expect, it } from "vitest";
import {
  parseRankingEntry,
  sortRankingEntries,
  updateRankingEntry,
  type RankingEntry,
} from "./ranking";

describe("ranking", () => {
  it("creates a ranking entry from a win result", () => {
    expect(
      updateRankingEntry(null, "profile-key", "Alice", "win", 1000),
    ).toEqual({
      profileKey: "profile-key",
      displayName: "Alice",
      wins: 1,
      losses: 0,
      battles: 1,
      lastPlayedAt: 1000,
      updatedAt: 1000,
    });
  });

  it("updates an existing ranking entry", () => {
    const currentEntry = createEntry({
      wins: 2,
      losses: 1,
      battles: 3,
      lastPlayedAt: 500,
      updatedAt: 500,
    });

    expect(
      updateRankingEntry(currentEntry, "profile-key", "Alice2", "loss", 1000),
    ).toEqual({
      profileKey: "profile-key",
      displayName: "Alice2",
      wins: 2,
      losses: 2,
      battles: 4,
      lastPlayedAt: 1000,
      updatedAt: 1000,
    });
  });

  it("counts draws as battles without changing wins or losses", () => {
    expect(
      updateRankingEntry(null, "profile-key", "Alice", "draw", 1000),
    ).toMatchObject({
      wins: 0,
      losses: 0,
      battles: 1,
    });
  });

  it("sorts ranking entries by wins, battles, and last played time", () => {
    const entries = [
      createEntry({ profileKey: "a", wins: 2, battles: 4, lastPlayedAt: 1000 }),
      createEntry({ profileKey: "b", wins: 3, battles: 3, lastPlayedAt: 900 }),
      createEntry({ profileKey: "c", wins: 2, battles: 5, lastPlayedAt: 800 }),
      createEntry({ profileKey: "d", wins: 2, battles: 5, lastPlayedAt: 1200 }),
    ];

    expect(sortRankingEntries(entries).map((entry) => entry.profileKey)).toEqual([
      "b",
      "d",
      "c",
      "a",
    ]);
  });

  it("parses valid ranking entries", () => {
    const entry = createEntry();

    expect(parseRankingEntry(entry)).toEqual(entry);
  });

  it("rejects invalid ranking entries", () => {
    expect(parseRankingEntry(null)).toBeNull();
    expect(parseRankingEntry({ ...createEntry(), wins: -1 })).toBeNull();
    expect(parseRankingEntry({ ...createEntry(), battles: 1.5 })).toBeNull();
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
