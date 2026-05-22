import { BarcodeForm } from "./BarcodeForm";

type LocalBattleSetupProps = {
  player1Barcode: string;
  player1ErrorMessage: string | null;
  player1CanSubmit: boolean;
  player2Barcode: string;
  player2ErrorMessage: string | null;
  player2CanSubmit: boolean;
  onPlayer1BarcodeChange: (barcode: string) => void;
  onPlayer2BarcodeChange: (barcode: string) => void;
};

export function LocalBattleSetup({
  player1Barcode,
  player1ErrorMessage,
  player1CanSubmit,
  player2Barcode,
  player2ErrorMessage,
  player2CanSubmit,
  onPlayer1BarcodeChange,
  onPlayer2BarcodeChange,
}: LocalBattleSetupProps) {
  return (
    <div className="local-battle-setup">
      <BarcodeForm
        barcode={player1Barcode}
        errorMessage={player1ErrorMessage}
        canSubmit={player1CanSubmit}
        onBarcodeChange={onPlayer1BarcodeChange}
        onSubmit={() => {}}
        submitLabel="プレイヤー1を準備"
        label="プレイヤー1のバーコード"
      />
      <BarcodeForm
        barcode={player2Barcode}
        errorMessage={player2ErrorMessage}
        canSubmit={player2CanSubmit}
        onBarcodeChange={onPlayer2BarcodeChange}
        onSubmit={() => {}}
        submitLabel="プレイヤー2を準備"
        label="プレイヤー2のバーコード"
      />
      <p className="mode-note">対戦の開始処理は次のタスクでつなぎます</p>
    </div>
  );
}
