import {
  createPlayerProfile,
  createPlayerProfileKey,
  parsePlayerProfile,
  type PlayerProfile,
} from "../domain/playerProfile";

const PLAYER_PROFILE_STORAGE_KEY = "barcodeBattler.playerProfile";

type PlayerProfileStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadPlayerProfile(
  storage: PlayerProfileStorage = globalThis.localStorage,
): PlayerProfile | null {
  const storedValue = storage.getItem(PLAYER_PROFILE_STORAGE_KEY);

  if (storedValue === null) {
    return null;
  }

  try {
    return parsePlayerProfile(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

export function savePlayerProfile(
  displayName: string,
  storage: PlayerProfileStorage = globalThis.localStorage,
  createProfileKey: () => string = defaultCreateProfileKey,
): PlayerProfile {
  const currentProfile = loadPlayerProfile(storage);
  const profileKey = currentProfile?.profileKey ?? createProfileKey();
  const result = createPlayerProfile(displayName, profileKey);

  if (result.profile === null) {
    throw new Error(result.message ?? "Invalid player profile.");
  }

  storage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(result.profile));

  return result.profile;
}

export function clearPlayerProfile(
  storage: PlayerProfileStorage = globalThis.localStorage,
): void {
  storage.removeItem(PLAYER_PROFILE_STORAGE_KEY);
}

function defaultCreateProfileKey(): string {
  return createPlayerProfileKey();
}
