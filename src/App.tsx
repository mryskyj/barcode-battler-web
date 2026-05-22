import { useMemo, useState } from "react";
import { BarcodeForm } from "./components/BarcodeForm";
import { BattleLog } from "./components/BattleLog";
import { BattleModeSelector } from "./components/BattleModeSelector";
import { CommandButtons } from "./components/CommandButtons";
import { CombatantPanel } from "./components/CombatantPanel";
import { LocalBattleSetup } from "./components/LocalBattleSetup";
import { LocalBattleView } from "./components/LocalBattleView";
import { RemoteBattleLobby } from "./components/RemoteBattleLobby";
import { RemoteBattleSetup } from "./components/RemoteBattleSetup";
import {
  createBattle,
  executeTurn,
  type BattleCommand,
  type BattleState,
} from "./domain/battle";
import type { BattleMode } from "./domain/battleMode";
import { validateBarcodeInput } from "./domain/barcodeValidation";
import { createCharacter } from "./domain/character";
import {
  createLocalBattle,
  submitLocalBattleCommand,
  type LocalBattleState,
} from "./domain/localBattle";
import {
  createRemoteRoomId,
  isValidRemoteRoomId,
  normalizeRemoteRoomId,
} from "./domain/remoteRoomId";
import type { RemoteBattleRole } from "./domain/remoteBattle";

const DEFAULT_ENEMY_BARCODE = "4512345678906";

type RemoteSession = {
  roomId: string;
  role: RemoteBattleRole;
};

export function App() {
  const [mode, setMode] = useState<BattleMode>("cpu");
  const [barcode, setBarcode] = useState("4901234567894");
  const [player1Barcode, setPlayer1Barcode] = useState("4901234567894");
  const [player2Barcode, setPlayer2Barcode] = useState("4901234567895");
  const [player1Ready, setPlayer1Ready] = useState(false);
  const [player2Ready, setPlayer2Ready] = useState(false);
  const [cpuBattle, setCpuBattle] = useState<BattleState | null>(null);
  const [localBattle, setLocalBattle] = useState<LocalBattleState | null>(null);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState("");
  const [remoteSession, setRemoteSession] = useState<RemoteSession | null>(null);
  const [remoteBarcode, setRemoteBarcode] = useState("4901234567894");
  const [remoteReady, setRemoteReady] = useState(false);
  const barcodeValidation = validateBarcodeInput(barcode);
  const player1BarcodeValidation = validateBarcodeInput(player1Barcode);
  const player2BarcodeValidation = validateBarcodeInput(player2Barcode);
  const remoteBarcodeValidation = validateBarcodeInput(remoteBarcode);
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
    setLocalBattle(null);
    setCpuBattle(createBattle(player, enemy));
  }

  function startLocalBattle() {
    if (
      mode !== "local" ||
      !player1Ready ||
      !player2Ready ||
      !player1BarcodeValidation.isValid ||
      !player2BarcodeValidation.isValid
    ) {
      return;
    }

    const player1 = createCharacter(
      player1BarcodeValidation.normalizedBarcode,
      "プレイヤー1",
    );
    const player2 = createCharacter(
      player2BarcodeValidation.normalizedBarcode,
      "プレイヤー2",
    );
    setPlayer1Barcode(player1BarcodeValidation.normalizedBarcode);
    setPlayer2Barcode(player2BarcodeValidation.normalizedBarcode);
    setCpuBattle(null);
    setLocalBattle(createLocalBattle(player1, player2));
  }

  function handleCommand(command: BattleCommand) {
    setCpuBattle((current) =>
      current === null ? current : executeTurn(current, command),
    );
  }

  function handleLocalCommand(command: BattleCommand) {
    setLocalBattle((current) =>
      current === null ? current : submitLocalBattleCommand(current, command),
    );
  }

  function resetBattle() {
    setCpuBattle(null);
    setLocalBattle(null);
  }

  function changePlayer1Barcode(nextBarcode: string) {
    setPlayer1Barcode(nextBarcode);
    setPlayer1Ready(false);
  }

  function changePlayer2Barcode(nextBarcode: string) {
    setPlayer2Barcode(nextBarcode);
    setPlayer2Ready(false);
  }

  function createRemoteRoom() {
    const roomId = createRemoteRoomId();
    setCreatedRoomId(roomId);
    setRemoteSession({ roomId, role: "host" });
    setRemoteReady(false);
  }

  function joinRemoteRoom() {
    if (!isValidRemoteRoomId(joiningRoomId)) {
      return;
    }

    const roomId = normalizeRemoteRoomId(joiningRoomId);
    setJoiningRoomId(roomId);
    setRemoteSession({ roomId, role: "guest" });
    setRemoteReady(false);
  }

  function changeRemoteBarcode(nextBarcode: string) {
    setRemoteBarcode(nextBarcode);
    setRemoteReady(false);
  }

  function prepareRemoteCharacter() {
    if (remoteSession === null || !remoteBarcodeValidation.isValid) {
      return;
    }

    createCharacter(
      remoteBarcodeValidation.normalizedBarcode,
      remoteSession.role === "host" ? "ホスト" : "ゲスト",
    );
    setRemoteBarcode(remoteBarcodeValidation.normalizedBarcode);
    setRemoteReady(true);
  }

  function backToRemoteLobby() {
    setRemoteSession(null);
    setRemoteReady(false);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Barcode Battler Web</h1>
      </header>

      {cpuBattle === null && localBattle === null ? (
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
          ) : mode === "local" ? (
            <LocalBattleSetup
              player1Barcode={player1Barcode}
              player1ErrorMessage={player1BarcodeValidation.message}
              player1CanSubmit={player1BarcodeValidation.isValid}
              player1Ready={player1Ready}
              player2Barcode={player2Barcode}
              player2ErrorMessage={player2BarcodeValidation.message}
              player2CanSubmit={player2BarcodeValidation.isValid}
              player2Ready={player2Ready}
              onPlayer1BarcodeChange={changePlayer1Barcode}
              onPlayer2BarcodeChange={changePlayer2Barcode}
              onPlayer1Submit={() => setPlayer1Ready(true)}
              onPlayer2Submit={() => setPlayer2Ready(true)}
              canStart={
                player1Ready &&
                player2Ready &&
                player1BarcodeValidation.isValid &&
                player2BarcodeValidation.isValid
              }
              onStart={startLocalBattle}
            />
          ) : (
            <>
              {remoteSession === null ? (
                <RemoteBattleLobby
                  createdRoomId={createdRoomId}
                  joiningRoomId={joiningRoomId}
                  canJoin={isValidRemoteRoomId(joiningRoomId)}
                  onCreateRoom={createRemoteRoom}
                  onJoiningRoomIdChange={setJoiningRoomId}
                  onJoinRoom={joinRemoteRoom}
                />
              ) : (
                <RemoteBattleSetup
                  roomId={remoteSession.roomId}
                  role={remoteSession.role}
                  barcode={remoteBarcode}
                  errorMessage={remoteBarcodeValidation.message}
                  canSubmit={remoteBarcodeValidation.isValid}
                  ready={remoteReady}
                  onBarcodeChange={changeRemoteBarcode}
                  onSubmit={prepareRemoteCharacter}
                  onBackToLobby={backToRemoteLobby}
                />
              )}
            </>
          )}
        </section>
      ) : cpuBattle !== null ? (
        <BattleView
          battle={cpuBattle}
          onCommand={handleCommand}
          onRematch={startBattle}
          onBackToSetup={resetBattle}
        />
      ) : localBattle !== null ? (
        <LocalBattleView
          battle={localBattle}
          onCommand={handleLocalCommand}
          onBackToSetup={resetBattle}
        />
      ) : null}
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
