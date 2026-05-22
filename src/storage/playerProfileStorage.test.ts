import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPlayerProfile,
  loadPlayerProfile,
  savePlayerProfile,
} from "./playerProfileStorage";

describe("playerProfileStorage", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("returns null when no profile is saved", () => {
    expect(loadPlayerProfile(storage)).toBeNull();
  });

  it("saves and loads a player profile", () => {
    const profile = savePlayerProfile(" Alice ", storage, () => "profile-key");

    expect(profile).toEqual({
      profileKey: "profile-key",
      displayName: "Alice",
    });
    expect(loadPlayerProfile(storage)).toEqual(profile);
  });

  it("keeps the existing profile key when updating the display name", () => {
    savePlayerProfile("Alice", storage, () => "profile-key");

    expect(savePlayerProfile("Bob", storage, () => "next-key")).toEqual({
      profileKey: "profile-key",
      displayName: "Bob",
    });
  });

  it("ignores corrupt stored data", () => {
    storage.setItem("barcodeBattler.playerProfile", "{");

    expect(loadPlayerProfile(storage)).toBeNull();
  });

  it("clears a saved player profile", () => {
    savePlayerProfile("Alice", storage, () => "profile-key");

    clearPlayerProfile(storage);

    expect(loadPlayerProfile(storage)).toBeNull();
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
