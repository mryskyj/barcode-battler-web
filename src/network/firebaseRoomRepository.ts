import type { Database } from "firebase/database";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import type { RemoteBattleRoom } from "../domain/remoteBattle";
import type { FirebaseRoomDocument } from "./firebaseRoomDocument";
import type { FirebaseRoomUpdate } from "./firebaseRoomUpdates";
import { getFirebaseRoomPath } from "./firebaseRoomDocument";
import {
  firebaseRoomDocumentToRemoteBattleRoom,
  parseFirebaseRoomDocument,
} from "./firebaseRoomParser";

export type RoomSubscription = () => void;

export type FirebaseRoomRepository = {
  createRoom: (room: FirebaseRoomDocument) => Promise<void>;
  getRoom: (roomId: string) => Promise<RemoteBattleRoom | null>;
  subscribeRoom: (
    roomId: string,
    onRoom: (room: RemoteBattleRoom | null) => void,
    onError: (error: Error) => void,
  ) => RoomSubscription;
  updateRoom: (roomId: string, values: FirebaseRoomUpdate) => Promise<void>;
  removeRoom: (roomId: string) => Promise<void>;
};

export function createFirebaseRoomRepository(
  database: Database,
): FirebaseRoomRepository {
  return {
    async createRoom(room) {
      await set(ref(database, getFirebaseRoomPath(room.roomId)), room);
    },

    async getRoom(roomId) {
      const snapshot = await get(ref(database, getFirebaseRoomPath(roomId)));

      if (!snapshot.exists()) {
        return null;
      }

      return firebaseRoomDocumentToRemoteBattleRoom(
        parseFirebaseRoomDocument(snapshot.val()),
      );
    },

    subscribeRoom(roomId, onRoom, onError) {
      return onValue(
        ref(database, getFirebaseRoomPath(roomId)),
        (snapshot) => {
          if (!snapshot.exists()) {
            onRoom(null);
            return;
          }

          onRoom(
            firebaseRoomDocumentToRemoteBattleRoom(
              parseFirebaseRoomDocument(snapshot.val()),
            ),
          );
        },
        (error) => onError(error),
      );
    },

    async updateRoom(roomId, values) {
      await update(ref(database, getFirebaseRoomPath(roomId)), values);
    },

    async removeRoom(roomId) {
      await remove(ref(database, getFirebaseRoomPath(roomId)));
    },
  };
}
