import { useMemo, useState } from "react";
import { BarcodeForm } from "./components/BarcodeForm";
import { BattleLog } from "./components/BattleLog";
import { BattleModeSelector } from "./components/BattleModeSelector";
import { CommandButtons } from "./components/CommandButtons";
import { CombatantPanel } from "./components/CombatantPanel";
import { LocalBattleSetup } from "./components/LocalBattleSetup";
import {
  createBattle,
  executeTurn,
  type BattleCommand,
  type BattleState,
} from "./domain/battle";
import type { BattleMode } from "./domain/battleMode";
import { validateBarcodeInput } from "./domain/barcodeValidation";
import { createCharacter } from "./domain/character";

const DEFAULT_ENEMY_BARCODE = "4512345678906";

export function App() {
  const [mode, setMode] = useState<BattleMode>("cpu");
  const [barcode, setBarcode] = useState("4901234567894");
  const [player1Barcode, setPlayer1Barcode] = useState("4901234567894");
  const [player2Barcode, setPlayer2Barcode] = useState("4901234567895");
  const [battle, setBattle] = useState<BattleState | null>(null);
  const barcodeValidation = validateBarcodeInput(barcode);
  const player1BarcodeValidation = validateBarcodeInput(player1Barcode);
  const player2BarcodeValidation = validateBarcodeInput(player2Barcode);
  const enemy = useMemo(
    () => createCharacter(DEFAULT_ENEMY_BARCODE, "CPU"),
    [],
  );

  function startBattle() {
    if (mode !== "cpu" || !barcodeValidation.isValid) {
      return;
    }

    const player = createCharacter(
      barcodeValidation.normalizedBarcode,
      "プレイヤー",
    );
    setBarcode(barcodeValidation.normalizedBarcode);
    setBattle(createBattle(player, enemy));
  }

  function handleCommand(command: BattleCommand) {
    setBattle((current) =>
      current === null ? current : executeTurn(current, command),
    );
  }

  function resetBattle() {
    setBattle(null);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Barcode Battler Web</h1>
      </header>

      {battle === null ? (
        <section className="setup-panel" aria-label="キャラクター生成">
          <BattleModeSelector value={mode} onChange={setMode} />
          {mode === "cpu" ? (
            <BarcodeForm
              barcode={barcode}
              errorMessage={barcodeValidation.message}
              canSubmit={barcodeValidation.isValid}
              onBarcodeChange={setBarcode}
              onSubmit={startBattle}
            />
          ) : (
            <LocalBattleSetup
              player1Barcode={player1Barcode}
              player1ErrorMessage={player1BarcodeValidation.message}
              player1CanSubmit={player1BarcodeValidation.isValid}
              player2Barcode={player2Barcode}
              player2ErrorMessage={player2BarcodeValidation.message}
              player2CanSubmit={player2BarcodeValidation.isValid}
              onPlayer1BarcodeChange={setPlayer1Barcode}
              onPlayer2BarcodeChange={setPlayer2Barcode}
            />
          )}
        </section>
      ) : (
        <BattleView
          battle={battle}
          onCommand={handleCommand}
          onRematch={startBattle}
          onBackToSetup={resetBattle}
        />
      )}
    </main>
  );
}

function BattleView({
  battle,
  onCommand,
  onRematch,
  onBackToSetup,
}: {
  battle: BattleState;
  onCommand: (command: BattleCommand) => void;
  onRematch: () => void;
  onBackToSetup: () => void;
}) {
  const winnerText =
    battle.winner === null
      ? null
      : battle.winner === "player"
        ? "勝利"
        : "敗北";

  return (
    <div className="battle-layout">
      <div className="combatants-grid">
        <CombatantPanel title="プレイヤー" combatant={battle.player} />
        <CombatantPanel title="敵" combatant={battle.enemy} />
      </div>

      <section className="control-panel" aria-label="バトル操作">
        {winnerText === null ? (
          <CommandButtons disabled={false} onCommand={onCommand} />
        ) : (
          <div className="result-panel">
            <strong>{winnerText}</strong>
            <div className="result-actions">
              <button type="button" onClick={onRematch}>
                同じバーコードで再戦
              </button>
              <button type="button" className="secondary-button" onClick={onBackToSetup}>
                入力へ戻る
              </button>
            </div>
          </div>
        )}
      </section>

      <BattleLog entries={battle.log} />
    </div>
  );
}
