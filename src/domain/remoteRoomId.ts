const ROOM_ID_LENGTH = 6;
const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRemoteRoomId(random: () => number = Math.random): string {
  let roomId = "";

  for (let index = 0; index < ROOM_ID_LENGTH; index += 1) {
    const alphabetIndex = Math.floor(random() * ROOM_ID_ALPHABET.length);
    roomId += ROOM_ID_ALPHABET[Math.min(alphabetIndex, ROOM_ID_ALPHABET.length - 1)];
  }

  return roomId;
}

export function normalizeRemoteRoomId(roomId: string): string {
  return roomId.trim().toUpperCase();
}

export function isValidRemoteRoomId(roomId: string): boolean {
  return normalizeRemoteRoomId(roomId).length === ROOM_ID_LENGTH;
}
