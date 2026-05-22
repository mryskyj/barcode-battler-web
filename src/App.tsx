import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Combatant,
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
import {
  canJoinRemoteBattleRoom,
  canResolveRemoteBattleRound,
  createRemoteBattleRoom,
  joinRemoteBattleRoom,
  resolveRemoteBattleRound,
  type RemoteBattleRole,
  type RemoteBattleRoom,
} from "./domain/remoteBattle";
import { getRemoteSetupStatusText } from "./domain/remoteBattleStatusText";
import { createFirebaseClient } from "./network/firebaseConfig";
import type { FirebaseRoomDocument } from "./network/firebaseRoomDocument";
import {
  createFirebaseRoomRepository,
  type FirebaseRoomRepository,
  type RoomSubscription,
} from "./network/firebaseRoomRepository";
import {
  createCharacterReadyUpdate,
  createCommandSelectionUpdate,
  createRemoteBattleStartUpdate,
} from "./network/firebaseRoomUpdates";

const DEFAULT_ENEMY_BARCODE = "4512345678906";

type RemoteSession = {
  roomId: string;
  role: RemoteBattleRole;
};

type AppProps = {
  remoteRepository?: FirebaseRoomRepository;
  remoteClientId?: string;
  now?: () => number;
  random?: () => number;
};

export function App({
  remoteRepository,
  remoteClientId,
  now = () => Date.now(),
  random = Math.random,
}: AppProps = {}) {
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
  const [remoteRoom, setRemoteRoom] = useState<RemoteBattleRoom | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteBarcode, setRemoteBarcode] = useState("4901234567894");
  const [remoteReady, setRemoteReady] = useState(false);
  const remoteSubscriptionRef = useRef<RoomSubscription | null>(null);
  const remoteRepositoryRef = useRef<FirebaseRoomRepository | null>(
    remoteRepository ?? null,
  );
  const remoteClientIdRef = useRef(remoteClientId ?? createBrowserClientId());
  const barcodeValidation = validateBarcodeInput(barcode);
  const player1BarcodeValidation = validateBarcodeInput(player1Barcode);
  const player2BarcodeValidation = validateBarcodeInput(player2Barcode);
  const remoteBarcodeValidation = validateBarcodeInput(remoteBarcode);
  const enemy = useMemo(
    () => createCharacter(DEFAULT_ENEMY_BARCODE, "CPU"),
    [],
  );

  const getRemoteRepository = useCallback(() => {
    if (remoteRepositoryRef.current === null) {
      remoteRepositoryRef.current = createFirebaseRoomRepository(
        createFirebaseClient().database,
      );
    }

    return remoteRepositoryRef.current;
  }, []);

  const updateRemoteRoom = useCallback(
    async (values: Record<string, unknown>) => {
      if (remoteSession === null) {
        return;
      }

      await getRemoteRepository().updateRoom(remoteSession.roomId, values);
    },
    [getRemoteRepository, remoteSession],
  );

  useEffect(() => {
    return () => {
      remoteSubscriptionRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (
      remoteSession?.role !== "host" ||
      remoteRoom === null ||
      remoteRoom.status !== "ready" ||
      remoteRoom.guest === null ||
      !remoteRoom.host.ready ||
      !remoteRoom.guest.ready
    ) {
      return;
    }

    void updateRemoteRoom(createRemoteBattleStartUpdate(now()));
  }, [remoteRoom, remoteSession, now, updateRemoteRoom]);

  useEffect(() => {
    if (
      remoteSession?.role !== "host" ||
      remoteRoom === null ||
      !canResolveRemoteBattleRound(remoteRoom)
    ) {
      return;
    }

    const resolvedRoom = resolveRemoteBattleRound(remoteRoom, random, now());
    void updateRemoteRoom(remoteRoomToFirebaseDocument(resolvedRoom));
  }, [remoteRoom, remoteSession, random, now, updateRemoteRoom]);

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

  async function createRemoteRoom() {
    const roomId = createRemoteRoomId();
    const nextSession = { roomId, role: "host" as const };
    const room = createRemoteBattleRoom(roomId, remoteClientIdRef.current, now());

    try {
      setRemoteError(null);
      await getRemoteRepository().createRoom(remoteRoomToFirebaseDocument(room));
      setCreatedRoomId(roomId);
      setRemoteSession(nextSession);
      setRemoteReady(false);
      subscribeRemoteRoom(nextSession);
    } catch (error) {
      setRemoteError(getErrorMessage(error));
    }
  }

  async function joinRemoteRoom() {
    if (!isValidRemoteRoomId(joiningRoomId)) {
      return;
    }

    const roomId = normalizeRemoteRoomId(joiningRoomId);
    const nextSession = { roomId, role: "guest" as const };

    try {
      setRemoteError(null);
      const room = await getRemoteRepository().getRoom(roomId);

      if (room === null) {
        setRemoteError("部屋が見つかりません");
        return;
      }

      if (!canJoinRemoteBattleRoom(room, remoteClientIdRef.current)) {
        setRemoteError("この部屋には参加できません");
        return;
      }

      const joinedRoom = joinRemoteBattleRoom(
        room,
        remoteClientIdRef.current,
        now(),
      );
      await getRemoteRepository().updateRoom(
        roomId,
        remoteRoomToFirebaseDocument(joinedRoom),
      );
      setJoiningRoomId(roomId);
      setRemoteSession(nextSession);
      setRemoteReady(false);
      subscribeRemoteRoom(nextSession);
    } catch (error) {
      setRemoteError(getErrorMessage(error));
    }
  }

  function changeRemoteBarcode(nextBarcode: string) {
    setRemoteBarcode(nextBarcode);
    setRemoteReady(false);
  }

  async function prepareRemoteCharacter() {
    if (remoteSession === null || !remoteBarcodeValidation.isValid) {
      return;
    }

    const character = createCharacter(
      remoteBarcodeValidation.normalizedBarcode,
      remoteSession.role === "host" ? "ホスト" : "ゲスト",
    );

    try {
      setRemoteError(null);
      await updateRemoteRoom(
        createCharacterReadyUpdate(remoteSession.role, character, now()),
      );
      setRemoteBarcode(remoteBarcodeValidation.normalizedBarcode);
      setRemoteReady(true);
    } catch (error) {
      setRemoteError(getErrorMessage(error));
    }
  }

  function backToRemoteLobby() {
    remoteSubscriptionRef.current?.();
    remoteSubscriptionRef.current = null;
    setRemoteSession(null);
    setRemoteRoom(null);
    setRemoteError(null);
    setRemoteReady(false);
  }

  async function handleRemoteCommand(command: BattleCommand) {
    if (remoteSession === null) {
      return;
    }

    try {
      setRemoteError(null);
      await updateRemoteRoom(
        createCommandSelectionUpdate(remoteSession.role, command, now()),
      );
    } catch (error) {
      setRemoteError(getErrorMessage(error));
    }
  }

  function subscribeRemoteRoom(session: RemoteSession) {
    remoteSubscriptionRef.current?.();
    remoteSubscriptionRef.current = getRemoteRepository().subscribeRoom(
      session.roomId,
      (room) => {
        setRemoteRoom(room);

        if (room === null) {
          setRemoteError("部屋が見つかりません");
          return;
        }

        const participant =
          session.role === "host" ? room.host : room.guest;
        setRemoteReady(participant?.ready ?? false);
      },
      (error) => setRemoteError(getErrorMessage(error)),
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Barcode Battler Web</h1>
      </header>

      {remoteSession !== null &&
      remoteRoom !== null &&
      (remoteRoom.status === "playing" || remoteRoom.status === "finished") ? (
        <RemoteBattleView
          room={remoteRoom}
          role={remoteSession.role}
          errorMessage={remoteError}
          onCommand={handleRemoteCommand}
          onBackToSetup={backToRemoteLobby}
        />
      ) : cpuBattle === null && localBattle === null ? (
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
                  connectionLabel={getRemoteConnectionLabel(remoteRoom, remoteError)}
                  statusText={getRemoteStatusText(
                    remoteSession.role,
                    remoteRoom,
                    remoteReady,
                    remoteError,
                  )}
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

function RemoteBattleView({
  room,
  role,
  errorMessage,
  onCommand,
  onBackToSetup,
}: {
  room: RemoteBattleRoom;
  role: RemoteBattleRole;
  errorMessage: string | null;
  onCommand: (command: BattleCommand) => void;
  onBackToSetup: () => void;
}) {
  const hostCombatant = getRemoteCombatant(room, "host");
  const guestCombatant = getRemoteCombatant(room, "guest");
  const ownParticipant = role === "host" ? room.host : room.guest;
  const opponentParticipant = role === "host" ? room.guest : room.host;
  const winnerText =
    room.battle.winner === null
      ? null
      : room.battle.winner === role
        ? "勝利"
        : room.battle.winner === "draw"
          ? "引き分け"
          : "敗北";

  return (
    <div className="battle-layout">
      <div className="combatants-grid">
        {hostCombatant === null ? null : (
          <CombatantPanel title="ホスト" combatant={hostCombatant} />
        )}
        {guestCombatant === null ? null : (
          <CombatantPanel title="ゲスト" combatant={guestCombatant} />
        )}
      </div>

      <section className="control-panel" aria-label="通信対戦操作">
        {errorMessage === null ? null : (
          <p className="error-message">{errorMessage}</p>
        )}
        {winnerText === null ? (
          <>
            <p className="readiness-note">
              {ownParticipant?.selectedCommand === null
                ? "自分のコマンド選択待ち"
                : "自分は選択済み"}
            </p>
            <p className="readiness-note">
              {opponentParticipant?.selectedCommand === null
                ? "相手の選択待ち"
                : "相手は選択済み"}
            </p>
            <CommandButtons
              disabled={ownParticipant?.selectedCommand !== null}
              onCommand={onCommand}
            />
          </>
        ) : (
          <div className="result-panel">
            <strong>{winnerText}</strong>
            <button type="button" className="secondary-button" onClick={onBackToSetup}>
              部屋選択へ戻る
            </button>
          </div>
        )}
      </section>

      <BattleLog
        entries={room.battle.log.length === 0 ? ["通信対戦開始"] : room.battle.log}
      />
    </div>
  );
}

function getRemoteCombatant(
  room: RemoteBattleRoom,
  role: RemoteBattleRole,
): Combatant | null {
  const battleCombatant = room.battle[role];

  if (battleCombatant !== null) {
    return battleCombatant;
  }

  const participant = role === "host" ? room.host : room.guest;

  if (participant === null || participant.character === null) {
    return null;
  }

  return {
    character: participant.character,
    currentHp: participant.character.stats.hp,
    charged: false,
    guarding: false,
  };
}

function getRemoteConnectionLabel(
  room: RemoteBattleRoom | null,
  errorMessage: string | null,
): string {
  if (errorMessage !== null) {
    return "接続エラー";
  }

  if (room === null) {
    return "接続準備中";
  }

  if (room.guest === null) {
    return "相手待ち";
  }

  return "接続済み";
}

function getRemoteStatusText(
  role: RemoteBattleRole,
  room: RemoteBattleRoom | null,
  ready: boolean,
  errorMessage: string | null,
): string {
  if (errorMessage !== null) {
    return errorMessage;
  }

  if (room === null) {
    return "部屋の同期を開始しています";
  }

  if (room.guest === null) {
    if (ready) {
      return getRemoteSetupStatusText(role, ready);
    }

    return role === "host" ? "ゲストの参加待ち" : "部屋への参加処理中";
  }

  if (room.host.ready && room.guest.ready) {
    return "対戦を開始します";
  }

  return getRemoteSetupStatusText(role, ready);
}

function remoteRoomToFirebaseDocument(
  room: RemoteBattleRoom,
): FirebaseRoomDocument {
  return room;
}

function createBrowserClientId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "通信処理に失敗しました";
}
