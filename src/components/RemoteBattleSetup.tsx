import { BarcodeForm } from "./BarcodeForm";
import type { RemoteBattleRole } from "../domain/remoteBattle";

type RemoteBattleSetupProps = {
  roomId: string;
  role: RemoteBattleRole;
  displayName: string;
  opponentDisplayName: string;
  barcode: string;
  errorMessage: string | null;
  connectionLabel: string;
  statusText: string;
  canSubmit: boolean;
  ready: boolean;
  onBarcodeChange: (barcode: string) => void;
  onSubmit: () => void;
  onBackToLobby: () => void;
};

export function RemoteBattleSetup({
  roomId,
  role,
  displayName,
  opponentDisplayName,
  barcode,
  errorMessage,
  connectionLabel,
  statusText,
  canSubmit,
  ready,
  onBarcodeChange,
  onSubmit,
  onBackToLobby,
}: RemoteBattleSetupProps) {
  return (
    <div className="remote-setup">
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
      <div className="connection-status" role="status">
        <span>接続状態</span>
        <strong>{connectionLabel}</strong>
        <p>{statusText}</p>
      </div>

      <BarcodeForm
        barcode={barcode}
        errorMessage={errorMessage}
        canSubmit={canSubmit && !ready}
        onBarcodeChange={onBarcodeChange}
        onSubmit={onSubmit}
        submitLabel="キャラクター準備"
        label="自分のバーコード"
      />
      <p className="readiness-note">
        {ready ? "キャラクター準備完了" : "キャラクター未準備"}
      </p>
      <button type="button" className="secondary-button" onClick={onBackToLobby}>
        退出して戻る
      </button>
    </div>
  );
}
