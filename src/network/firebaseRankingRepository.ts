import type { Database } from "firebase/database";
import { get, ref, set } from "firebase/database";
import {
  parseRankingEntry,
  sortRankingEntries,
  updateRankingEntry,
  type RankingBattleResult,
  type RankingEntry,
} from "../domain/ranking";

export const FIREBASE_RANKINGS_PATH = "rankings";

export type FirebaseRankingRepository = {
  getRankingEntries: () => Promise<RankingEntry[]>;
  updateBattleResult: (
    profileKey: string,
    displayName: string,
    result: RankingBattleResult,
    now: number,
  ) => Promise<RankingEntry>;
};

export function createFirebaseRankingRepository(
  database: Database,
): FirebaseRankingRepository {
  return {
    async getRankingEntries() {
      const snapshot = await get(ref(database, FIREBASE_RANKINGS_PATH));

      if (!snapshot.exists()) {
        return [];
      }

      return parseRankingEntryCollection(snapshot.val());
    },

    async updateBattleResult(profileKey, displayName, result, now) {
      const entryRef = ref(database, getFirebaseRankingEntryPath(profileKey));
      const snapshot = await get(entryRef);
      const currentEntry = snapshot.exists()
        ? parseRankingEntry(snapshot.val())
        : null;
      const nextEntry = updateRankingEntry(
        currentEntry,
        profileKey,
        displayName,
        result,
        now,
      );

      await set(entryRef, nextEntry);

      return nextEntry;
    },
  };
}

export function getFirebaseRankingEntryPath(profileKey: string): string {
  return `${FIREBASE_RANKINGS_PATH}/${profileKey}`;
}

function parseRankingEntryCollection(value: unknown): RankingEntry[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  const entries = Object.values(value)
    .map((entry) => parseRankingEntry(entry))
    .filter((entry): entry is RankingEntry => entry !== null);

  return sortRankingEntries(entries);
}
