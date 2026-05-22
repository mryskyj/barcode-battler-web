import type { FormEvent } from "react";

type RemoteBattleLobbyProps = {
  createdRoomId: string | null;
  joiningRoomId: string;
  canJoin: boolean;
  canUseRemoteBattle: boolean;
  disabledMessage: string | null;
  errorMessage: string | null;
  onCreateRoom: () => void;
  onJoiningRoomIdChange: (roomId: string) => void;
  onJoinRoom: () => void;
  onShowRanking: () => void;
};

export function RemoteBattleLobby({
  createdRoomId,
  joiningRoomId,
  canJoin,
  canUseRemoteBattle,
  disabledMessage,
  errorMessage,
  onCreateRoom,
  onJoiningRoomIdChange,
  onJoinRoom,
  onShowRanking,
}: RemoteBattleLobbyProps) {
  function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canJoin || !canUseRemoteBattle) {
      return;
    }

    onJoinRoom();
  }

  return (
    <div className="remote-lobby">
      <section className="remote-lobby-panel" aria-label="部屋を作る">
        <h2>部屋を作る</h2>
        {disabledMessage === null ? null : (
          <p className="field-error">{disabledMessage}</p>
        )}
        {errorMessage === null ? null : (
          <p className="field-error">{errorMessage}</p>
        )}
        <button type="button" onClick={onCreateRoom} disabled={!canUseRemoteBattle}>
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
          <button type="submit" disabled={!canJoin || !canUseRemoteBattle}>
            参加する
          </button>
        </form>
      </section>

      <section className="remote-lobby-panel" aria-label="ランキングを見る">
        <h2>ランキング</h2>
        <button type="button" className="secondary-button" onClick={onShowRanking}>
          ランキングを見る
        </button>
      </section>
    </div>
  );
}
