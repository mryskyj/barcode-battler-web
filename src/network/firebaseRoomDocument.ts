import type { BattleCommand } from "../domain/battleTypes";
import type {
  RemoteBattleRole,
  RemoteBattleStatus,
  RemoteBattleWinner,
} from "../domain/remoteBattle";

export const FIREBASE_ROOMS_PATH = "rooms";

export type FirebaseCharacterDocument = {
  id: string;
  name: string;
  barcode: string;
  stats: {
    hp: number;
    power: number;
    defense: number;
    speed: number;
  };
};

export type FirebaseCombatantDocument = {
  character: FirebaseCharacterDocument;
  currentHp: number;
  charged: boolean;
  guarding: boolean;
};

export type FirebaseParticipantDocument = {
  role: RemoteBattleRole;
  clientId: string;
  connected: boolean;
  character: FirebaseCharacterDocument | null;
  ready: boolean;
  selectedCommand: BattleCommand | null;
};

export type FirebaseBattleDocument = {
  round: number;
  host: FirebaseCombatantDocument | null;
  guest: FirebaseCombatantDocument | null;
  log: string[];
  winner: RemoteBattleWinner | null;
};

export type FirebaseRoomDocument = {
  roomId: string;
  status: RemoteBattleStatus;
  host: FirebaseParticipantDocument;
  guest: FirebaseParticipantDocument | null;
  battle: FirebaseBattleDocument;
  updatedAt: number;
};

export function getFirebaseRoomPath(roomId: string): string {
  return `${FIREBASE_ROOMS_PATH}/${roomId}`;
}
