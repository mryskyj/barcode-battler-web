export type RankingEntry = {
  profileKey: string;
  displayName: string;
  wins: number;
  losses: number;
  battles: number;
  lastPlayedAt: number;
  updatedAt: number;
};

export type RankingBattleResult = "win" | "loss" | "draw";

export function updateRankingEntry(
  currentEntry: RankingEntry | null,
  profileKey: string,
  displayName: string,
  result: RankingBattleResult,
  now: number,
): RankingEntry {
  const baseEntry = currentEntry ?? createEmptyRankingEntry(profileKey, displayName);

  return {
    ...baseEntry,
    displayName,
    wins: baseEntry.wins + (result === "win" ? 1 : 0),
    losses: baseEntry.losses + (result === "loss" ? 1 : 0),
    battles: baseEntry.battles + 1,
    lastPlayedAt: now,
    updatedAt: now,
  };
}

export function sortRankingEntries(entries: RankingEntry[]): RankingEntry[] {
  return [...entries].sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    if (right.battles !== left.battles) {
      return right.battles - left.battles;
    }

    return right.lastPlayedAt - left.lastPlayedAt;
  });
}

export function parseRankingEntry(value: unknown): RankingEntry | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const entry = value as Partial<RankingEntry>;
  if (
    typeof entry.profileKey !== "string" ||
    typeof entry.displayName !== "string" ||
    !isValidCount(entry.wins) ||
    !isValidCount(entry.losses) ||
    !isValidCount(entry.battles) ||
    !isValidTimestamp(entry.lastPlayedAt) ||
    !isValidTimestamp(entry.updatedAt)
  ) {
    return null;
  }

  const displayNameValidation = validatePlayerDisplayName(entry.displayName);
  if (!displayNameValidation.isValid) {
    return null;
  }

  return {
    profileKey: entry.profileKey,
    displayName: displayNameValidation.displayName,
    wins: entry.wins,
    losses: entry.losses,
    battles: entry.battles,
    lastPlayedAt: entry.lastPlayedAt,
    updatedAt: entry.updatedAt,
  };
}

function createEmptyRankingEntry(
  profileKey: string,
  displayName: string,
): RankingEntry {
  return {
    profileKey,
    displayName,
    wins: 0,
    losses: 0,
    battles: 0,
    lastPlayedAt: 0,
    updatedAt: 0,
  };
}

function isValidCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
import { validatePlayerDisplayName } from "./playerProfile";
