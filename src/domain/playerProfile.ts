export type PlayerProfile = {
  profileKey: string;
  displayName: string;
};

export type PlayerProfileValidationResult = {
  displayName: string;
  isValid: boolean;
  message: string | null;
};

export const PLAYER_DISPLAY_NAME_MAX_LENGTH = 16;

const PROFILE_KEY_LENGTH = 16;
const PROFILE_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function validatePlayerDisplayName(
  input: string,
): PlayerProfileValidationResult {
  const displayName = input.trim();

  if (displayName.length === 0) {
    return reject(displayName, "ユーザー名を入力してください");
  }

  if (displayName.length > PLAYER_DISPLAY_NAME_MAX_LENGTH) {
    return reject(
      displayName,
      `${PLAYER_DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  }

  if (hasControlCharacter(displayName)) {
    return reject(displayName, "ユーザー名に改行や制御文字は使えません");
  }

  return {
    displayName,
    isValid: true,
    message: null,
  };
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
}

export function createPlayerProfile(
  displayNameInput: string,
  profileKey: string = createPlayerProfileKey(),
): PlayerProfileValidationResult & { profile: PlayerProfile | null } {
  const validation = validatePlayerDisplayName(displayNameInput);

  if (!validation.isValid) {
    return {
      ...validation,
      profile: null,
    };
  }

  return {
    ...validation,
    profile: {
      profileKey,
      displayName: validation.displayName,
    },
  };
}

export function createPlayerProfileKey(
  random: () => number = Math.random,
): string {
  let profileKey = "";

  for (let index = 0; index < PROFILE_KEY_LENGTH; index += 1) {
    const alphabetIndex = Math.floor(random() * PROFILE_KEY_ALPHABET.length);
    profileKey += PROFILE_KEY_ALPHABET[
      Math.min(alphabetIndex, PROFILE_KEY_ALPHABET.length - 1)
    ];
  }

  return profileKey;
}

export function parsePlayerProfile(value: unknown): PlayerProfile | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const profile = value as Partial<PlayerProfile>;
  if (typeof profile.profileKey !== "string") {
    return null;
  }

  const validation = validatePlayerDisplayName(profile.displayName ?? "");
  if (!validation.isValid) {
    return null;
  }

  return {
    profileKey: profile.profileKey,
    displayName: validation.displayName,
  };
}

function reject(
  displayName: string,
  message: string,
): PlayerProfileValidationResult {
  return {
    displayName,
    isValid: false,
    message,
  };
}
