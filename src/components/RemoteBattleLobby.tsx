import type { FormEvent } from "react";

type RemoteBattleLobbyProps = {
  createdRoomId: string | null;
  joiningRoomId: string;
  canJoin: boolean;
  onCreateRoom: () => void;
  onJoiningRoomIdChange: (roomId: string) => void;
  onJoinRoom: () => void;
};

export function RemoteBattleLobby({
  createdRoomId,
  joiningRoomId,
  canJoin,
  onCreateRoom,
  onJoiningRoomIdChange,
  onJoinRoom,
}: RemoteBattleLobbyProps) {
  function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canJoin) {
      return;
    }

    onJoinRoom();
  }

  return (
    <div className="remote-lobby">
      <section className="remote-lobby-panel" aria-label="部屋を作る">
        <h2>部屋を作る</h2>
        <button type="button" onClick={onCreateRoom}>
          部屋を作る
        </button>
        {createdRoomId === null ? null : (
          <p className="room-id-display">
            <span>部屋ID</span>
            <strong>{createdRoomId}</strong>
          </p>
        )}
      </section>

      <section className="remote-lobby-panel" aria-label="部屋に参加する">
        <h2>部屋に参加する</h2>
        <form className="barcode-form" onSubmit={handleJoinSubmit}>
          <label className="field">
            <span>部屋ID</span>
            <input
              value={joiningRoomId}
              onChange={(event) => onJoiningRoomIdChange(event.target.value)}
              placeholder="ABC123"
              autoCapitalize="characters"
            />
          </label>
          <button type="submit" disabled={!canJoin}>
            参加する
          </button>
        </form>
      </section>
    </div>
  );
}
