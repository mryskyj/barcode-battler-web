import { BarcodeForm } from "./BarcodeForm";

type LocalBattleSetupProps = {
  player1Barcode: string;
  player1ErrorMessage: string | null;
  player1CanSubmit: boolean;
  player1Ready: boolean;
  player2Barcode: string;
  player2ErrorMessage: string | null;
  player2CanSubmit: boolean;
  player2Ready: boolean;
  onPlayer1BarcodeChange: (barcode: string) => void;
  onPlayer2BarcodeChange: (barcode: string) => void;
  onPlayer1Submit: () => void;
  onPlayer2Submit: () => void;
  canStart: boolean;
  onStart: () => void;
};

export function LocalBattleSetup({
  player1Barcode,
  player1ErrorMessage,
  player1CanSubmit,
  player1Ready,
  player2Barcode,
  player2ErrorMessage,
  player2CanSubmit,
  player2Ready,
  onPlayer1BarcodeChange,
  onPlayer2BarcodeChange,
  onPlayer1Submit,
  onPlayer2Submit,
  canStart,
  onStart,
}: LocalBattleSetupProps) {
  return (
    <div className="local-battle-setup">
      <BarcodeForm
        barcode={player1Barcode}
        errorMessage={player1ErrorMessage}
        canSubmit={player1CanSubmit}
        onBarcodeChange={onPlayer1BarcodeChange}
        onSubmit={onPlayer1Submit}
        submitLabel="プレイヤー1を準備"
        label="プレイヤー1のバーコード"
      />
      <p className="readiness-note">
        {player1Ready ? "プレイヤー1は準備完了" : "プレイヤー1は未準備"}
      </p>
      <BarcodeForm
        barcode={player2Barcode}
        errorMessage={player2ErrorMessage}
        canSubmit={player2CanSubmit}
        onBarcodeChange={onPlayer2BarcodeChange}
        onSubmit={onPlayer2Submit}
        submitLabel="プレイヤー2を準備"
        label="プレイヤー2のバーコード"
      />
      <p className="readiness-note">
        {player2Ready ? "プレイヤー2は準備完了" : "プレイヤー2は未準備"}
      </p>
      <button type="button" onClick={onStart} disabled={!canStart}>
        対戦を始める
      </button>
    </div>
  );
}
