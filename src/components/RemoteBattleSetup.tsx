import type { RemoteBattleRole } from "../domain/remoteBattle";

type RemoteBattleSetupProps = {
  roomId: string;
  role: RemoteBattleRole;
  displayName: string;
  opponentDisplayName: string;
  connectionLabel: string;
  statusText: string;
  ready: boolean;
  onBackToLobby: () => void;
};

export function RemoteBattleSetup({
  roomId,
  role,
  displayName,
  opponentDisplayName,
  connectionLabel,
  statusText,
  ready,
  onBackToLobby,
}: RemoteBattleSetupProps) {
  return (
    <div className="remote-setup">
      <div className="remote-setup-heading">
        <p>マッチング</p>
        <h2>対戦カード</h2>
      </div>
      <div className="room-summary">
        <p className="room-id-display">
          <span>部屋ID</span>
          <strong>{roomId}</strong>
        </p>
        <p className="readiness-note">
          {role === "host" ? "ホストとして参加中" : "ゲストとして参加中"}
        </p>
        <p className="readiness-note">
          自分: {displayName} / 相手: {opponentDisplayName}
        </p>
      </div>
      <div className="match-card">
        <div className="match-player match-player-self">
          <span>自分</span>
          <strong>{displayName}</strong>
        </div>
        <div className="match-versus">VS</div>
        <div className="match-player">
          <span>相手</span>
          <strong>{opponentDisplayName}</strong>
        </div>
      </div>
      <div className="connection-status" role="status">
        <span>接続状態</span>
        <strong>{connectionLabel}</strong>
        <p>{statusText}</p>
      </div>
      <p className="readiness-note">
        {ready ? "キャラクター準備完了" : "キャラクター未準備"}
      </p>
      <button type="button" className="secondary-button" onClick={onBackToLobby}>
        退出して戻る
      </button>
    </div>
  );
}
