import { useCallback, useEffect, useRef, useState } from "react";
import { BattleLog } from "./components/BattleLog";
import { CommandButtons } from "./components/CommandButtons";
import { CombatantPanel } from "./components/CombatantPanel";
import { PlayerProfileForm } from "./components/PlayerProfileForm";
import { RankingBoard } from "./components/RankingBoard";
import { RemoteBattleLobby } from "./components/RemoteBattleLobby";
import { RemoteBattleSetup } from "./components/RemoteBattleSetup";
import {
  type BattleCommand,
  type Combatant,
} from "./domain/battle";
import { validateBarcodeInput } from "./domain/barcodeValidation";
import { createCharacter } from "./domain/character";
import type { PlayerProfile } from "./domain/playerProfile";
import type { RankingBattleResult, RankingEntry } from "./domain/ranking";
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
  createFirebaseRankingRepository,
  type FirebaseRankingRepository,
} from "./network/firebaseRankingRepository";
import {
  createCharacterReadyUpdate,
  createCommandSelectionUpdate,
  createRemoteBattleStartUpdate,
} from "./network/firebaseRoomUpdates";
import {
  loadPlayerProfile,
  savePlayerProfile,
} from "./storage/playerProfileStorage";

type RemoteSession = {
  roomId: string;
  role: RemoteBattleRole;
};

type AppProps = {
  remoteRepository?: FirebaseRoomRepository;
  rankingRepository?: FirebaseRankingRepository;
  remoteClientId?: string;
  now?: () => number;
  random?: () => number;
};

export function App({
  remoteRepository,
  rankingRepository,
  remoteClientId,
  now = () => Date.now(),
  random = Math.random,
}: AppProps = {}) {
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState("");
  const [remoteSession, setRemoteSession] = useState<RemoteSession | null>(null);
  const [remoteRoom, setRemoteRoom] = useState<RemoteBattleRoom | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteBarcode, setRemoteBarcode] = useState("4901234567894");
  const [remoteReady, setRemoteReady] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(() =>
    loadPlayerProfile(),
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
  const [rankingVisible, setRankingVisible] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingSaveError, setRankingSaveError] = useState<string | null>(null);
  const remoteSubscriptionRef = useRef<RoomSubscription | null>(null);
  const savedRankingResultRef = useRef<string | null>(null);
  const remoteRepositoryRef = useRef<FirebaseRoomRepository | null>(
    remoteRepository ?? null,
  );
  const rankingRepositoryRef = useRef<FirebaseRankingRepository | null>(
    rankingRepository ?? null,
  );
  const remoteClientIdRef = useRef(remoteClientId ?? createBrowserClientId());
  const remoteBarcodeValidation = validateBarcodeInput(remoteBarcode);

  const getRemoteRepository = useCallback(() => {
    if (remoteRepositoryRef.current === null) {
      remoteRepositoryRef.current = createFirebaseRoomRepository(
        createFirebaseClient().database,
      );
    }

    return remoteRepositoryRef.current;
  }, []);

  const getRankingRepository = useCallback(() => {
    if (rankingRepositoryRef.current === null) {
      rankingRepositoryRef.current = createFirebaseRankingRepository(
        createFirebaseClient().database,
      );
    }

    return rankingRepositoryRef.current;
  }, []);

  const saveRankingResult = useCallback(
    async (profile: PlayerProfile, result: RankingBattleResult) => {
      try {
        setRankingSaveError(null);
        await getRankingRepository().updateBattleResult(
          profile.profileKey,
          profile.displayName,
          result,
          now(),
        );
      } catch (error) {
        setRankingSaveError(`ランキング保存に失敗しました: ${getErrorMessage(error)}`);
      }
    },
    [getRankingRepository, now],
  );

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

  useEffect(() => {
    if (
      remoteSession === null ||
      remoteRoom === null ||
      remoteRoom.status !== "finished" ||
      remoteRoom.battle.winner === null ||
      playerProfile === null
    ) {
      return;
    }

    const resultKey = [
      remoteRoom.roomId,
      remoteRoom.battle.round,
      remoteSession.role,
      remoteRoom.battle.winner,
    ].join(":");

    if (savedRankingResultRef.current === resultKey) {
      return;
    }

    savedRankingResultRef.current = resultKey;
    const rankingResult = getRankingBattleResult(
      remoteSession.role,
      remoteRoom.battle.winner,
    );

    void saveRankingResult(playerProfile, rankingResult);
  }, [playerProfile, remoteRoom, remoteSession, saveRankingResult]);

  async function createRemoteRoom() {
    if (playerProfile === null) {
      setProfileError("通信対戦の前にユーザー名を保存してください");
      return;
    }

    const roomId = createRemoteRoomId();
    const nextSession = { roomId, role: "host" as const };
    const room = createRemoteBattleRoom(
      roomId,
      remoteClientIdRef.current,
      now(),
      playerProfile.displayName,
    );

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
    if (playerProfile === null) {
      setProfileError("通信対戦の前にユーザー名を保存してください");
      return;
    }

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
        playerProfile.displayName,
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
    setRankingSaveError(null);
    savedRankingResultRef.current = null;
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

  function handleProfileSave(displayName: string) {
    try {
      const profile = savePlayerProfile(displayName);
      setPlayerProfile(profile);
      setProfileError(null);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    }
  }

  async function showRanking() {
    setRankingVisible(true);
    setRankingLoading(true);
    setRankingError(null);

    try {
      setRankingEntries(await getRankingRepository().getRankingEntries());
    } catch (error) {
      setRankingError(getErrorMessage(error));
    } finally {
      setRankingLoading(false);
    }
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
          rankingErrorMessage={rankingSaveError}
          onCommand={handleRemoteCommand}
          onBackToSetup={backToRemoteLobby}
        />
      ) : (
        <section className="setup-panel" aria-label="キャラクター生成">
          <PlayerProfileForm
            profile={playerProfile}
            storageErrorMessage={profileError}
            onSave={handleProfileSave}
          />
          {remoteSession === null ? (
            <RemoteBattleLobby
              createdRoomId={createdRoomId}
              joiningRoomId={joiningRoomId}
              canJoin={isValidRemoteRoomId(joiningRoomId)}
              canUseRemoteBattle={playerProfile !== null}
              disabledMessage={
                playerProfile === null
                  ? "通信対戦の前にユーザー名を保存してください"
                  : null
              }
              errorMessage={remoteError}
              onCreateRoom={createRemoteRoom}
              onJoiningRoomIdChange={setJoiningRoomId}
              onJoinRoom={joinRemoteRoom}
              onShowRanking={showRanking}
            />
          ) : (
            <RemoteBattleSetup
              roomId={remoteSession.roomId}
              role={remoteSession.role}
              displayName={getRemoteParticipantDisplayName(
                remoteRoom,
                remoteSession.role,
              )}
              opponentDisplayName={getRemoteParticipantDisplayName(
                remoteRoom,
                remoteSession.role === "host" ? "guest" : "host",
              )}
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
          {rankingVisible ? (
            <RankingBoard
              entries={rankingEntries}
              loading={rankingLoading}
              errorMessage={rankingError}
              onRefresh={showRanking}
            />
          ) : null}
        </section>
      )}
    </main>
  );
}

function RemoteBattleView({
  room,
  role,
  errorMessage,
  rankingErrorMessage,
  onCommand,
  onBackToSetup,
}: {
  room: RemoteBattleRoom;
  role: RemoteBattleRole;
  errorMessage: string | null;
  rankingErrorMessage: string | null;
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
          <CombatantPanel title={room.host.displayName} combatant={hostCombatant} />
        )}
        {guestCombatant === null ? null : (
          <CombatantPanel
            title={room.guest?.displayName ?? "ゲスト"}
            combatant={guestCombatant}
          />
        )}
      </div>

      <section className="control-panel" aria-label="通信対戦操作">
        {errorMessage === null ? null : (
          <p className="error-message">{errorMessage}</p>
        )}
        {rankingErrorMessage === null ? null : (
          <p className="field-error">{rankingErrorMessage}</p>
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

function getRemoteParticipantDisplayName(
  room: RemoteBattleRoom | null,
  role: RemoteBattleRole,
): string {
  const participant = role === "host" ? room?.host : room?.guest;

  return participant?.displayName ?? (role === "host" ? "ホスト" : "ゲスト");
}

function getRankingBattleResult(
  role: RemoteBattleRole,
  winner: RemoteBattleRoom["battle"]["winner"],
): RankingBattleResult {
  if (winner === "draw") {
    return "draw";
  }

  return winner === role ? "win" : "loss";
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
