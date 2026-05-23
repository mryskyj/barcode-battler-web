import { useCallback, useEffect, useRef, useState } from "react";
import { BattleLog } from "./components/BattleLog";
import { BattleStage } from "./components/BattleStage";
import { BarcodeForm } from "./components/BarcodeForm";
import { CommandButtons } from "./components/CommandButtons";
import { PlayerProfileForm } from "./components/PlayerProfileForm";
import { RankingBoard } from "./components/RankingBoard";
import { RemoteBattleLobby } from "./components/RemoteBattleLobby";
import { RemoteBattleSetup } from "./components/RemoteBattleSetup";
import {
  type BattleCommand,
  type Combatant,
} from "./domain/battle";
import { validateBarcodeInput } from "./domain/barcodeValidation";
import { createCharacter, type Character } from "./domain/character";
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

type AppScreen =
  | "title"
  | "profile"
  | "character"
  | "lobby"
  | "room"
  | "battle"
  | "result"
  | "ranking";

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
  const [remoteBarcode, setRemoteBarcode] = useState("");
  const [preparedCharacter, setPreparedCharacter] = useState<Character | null>(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [screen, setScreen] = useState<AppScreen>("title");
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(() =>
    loadPlayerProfile(),
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
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
  const canUseRemoteBattle = playerProfile !== null && preparedCharacter !== null;

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
    if (playerProfile === null || preparedCharacter === null) {
      setRemoteError("部屋を作る前にユーザー名とバーコードを準備してください");
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
    room.host = {
      ...room.host,
      character: preparedCharacter,
      ready: true,
    };

    try {
      setRemoteError(null);
      await getRemoteRepository().createRoom(remoteRoomToFirebaseDocument(room));
      setCreatedRoomId(roomId);
      setRemoteSession(nextSession);
      setRemoteReady(true);
      setScreen("room");
      subscribeRemoteRoom(nextSession);
    } catch (error) {
      setRemoteError(getErrorMessage(error));
    }
  }

  async function joinRemoteRoom() {
    if (playerProfile === null || preparedCharacter === null) {
      setRemoteError("部屋に参加する前にユーザー名とバーコードを準備してください");
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
      const readyJoinedRoom = {
        ...joinedRoom,
        guest:
          joinedRoom.guest === null
            ? null
            : {
                ...joinedRoom.guest,
                character: preparedCharacter,
                ready: true,
              },
      };
      await getRemoteRepository().updateRoom(
        roomId,
        remoteRoomToFirebaseDocument(readyJoinedRoom),
      );
      setJoiningRoomId(roomId);
      setRemoteSession(nextSession);
      setRemoteReady(true);
      setScreen("room");
      subscribeRemoteRoom(nextSession);
    } catch (error) {
      setRemoteError(getErrorMessage(error));
    }
  }

  function changeRemoteBarcode(nextBarcode: string) {
    setRemoteBarcode(nextBarcode);
    setPreparedCharacter(null);
    setRemoteError(null);
  }

  function prepareRemoteCharacter() {
    if (!remoteBarcodeValidation.isValid) {
      return;
    }

    const character = createCharacter(
      remoteBarcodeValidation.normalizedBarcode,
      playerProfile?.displayName ?? "プレイヤー",
    );

    setRemoteError(null);
    setRemoteBarcode(remoteBarcodeValidation.normalizedBarcode);
    setPreparedCharacter(character);
    setScreen("lobby");
  }

  function resetRemoteSession(nextScreen: AppScreen) {
    remoteSubscriptionRef.current?.();
    remoteSubscriptionRef.current = null;
    setRemoteSession(null);
    setRemoteRoom(null);
    setRemoteError(null);
    setRemoteReady(false);
    setRankingSaveError(null);
    setScreen(nextScreen);
    savedRankingResultRef.current = null;
  }

  function backToRemoteLobby() {
    resetRemoteSession("lobby");
  }

  function backToTitle() {
    resetRemoteSession("title");
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
      setScreen("character");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    }
  }

  async function showRanking() {
    setScreen("ranking");
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

  const activeScreen = getActiveScreen(screen, remoteSession, remoteRoom);

  return (
    <main className="app-shell">
      {activeScreen === "title" ? (
        <section className="screen screen-center title-screen" aria-label="タイトル">
          <TitleScreen
            profile={playerProfile}
            onStart={() =>
              setScreen(playerProfile === null ? "profile" : "character")
            }
            onEditProfile={() => setScreen("profile")}
          />
        </section>
      ) : playerProfile === null || activeScreen === "profile" ? (
        <section className="screen screen-center profile-screen" aria-label="ユーザー名入力">
          <div className="content-narrow">
            <PlayerProfileForm
              profile={playerProfile}
              storageErrorMessage={profileError}
              onSave={handleProfileSave}
            />
          </div>
        </section>
      ) : activeScreen === "ranking" ? (
        <section className="setup-panel" aria-label="ランキング画面">
          <RankingBoard
            entries={rankingEntries}
            loading={rankingLoading}
            errorMessage={rankingError}
            onBackToTitle={backToTitle}
          />
        </section>
      ) : activeScreen === "character" ? (
        <section className="screen screen-center character-screen" aria-label="キャラクター準備">
          <div className="content-narrow">
            <CharacterPrepScreen
              barcode={remoteBarcode}
              errorMessage={
                remoteBarcode.length === 0 ? null : remoteBarcodeValidation.message
              }
              canSubmit={remoteBarcodeValidation.isValid}
              onBarcodeChange={changeRemoteBarcode}
              onSubmit={prepareRemoteCharacter}
            />
          </div>
        </section>
      ) : remoteSession !== null &&
      remoteRoom !== null &&
      activeScreen === "battle" ? (
        <RemoteBattleView
          room={remoteRoom}
          role={remoteSession.role}
          errorMessage={remoteError}
          rankingErrorMessage={rankingSaveError}
          onCommand={handleRemoteCommand}
          onBackToSetup={backToRemoteLobby}
        />
      ) : remoteSession !== null &&
      remoteRoom !== null &&
      activeScreen === "result" ? (
        <ResultScreen
          room={remoteRoom}
          role={remoteSession.role}
          rankingErrorMessage={rankingSaveError}
          onShowRanking={showRanking}
          onBackToTitle={backToTitle}
        />
      ) : (
        <section className="screen screen-center lobby-screen" aria-label="対戦準備">
          {remoteSession === null ? (
            <div className="content-narrow lobby-panel">
              <ProfileStrip
                profile={playerProfile}
                onEditProfile={() => setScreen("profile")}
              />
              <p className="readiness-note">
                準備完了: {preparedCharacter?.name ?? "未準備"}
              </p>
              <RemoteBattleLobby
                createdRoomId={createdRoomId}
                joiningRoomId={joiningRoomId}
                canJoin={isValidRemoteRoomId(joiningRoomId)}
                canCreateRoom={canUseRemoteBattle}
                canJoinRoom={canUseRemoteBattle}
                disabledMessage={
                  canUseRemoteBattle
                    ? null
                    : "部屋を作る前にユーザー名とバーコードを準備してください"
                }
                errorMessage={remoteError}
                onCreateRoom={createRemoteRoom}
                onJoiningRoomIdChange={setJoiningRoomId}
                onJoinRoom={joinRemoteRoom}
                onShowRanking={showRanking}
              />
            </div>
          ) : (
            <div className="content-narrow">
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
                connectionLabel={getRemoteConnectionLabel(remoteRoom, remoteError)}
                statusText={getRemoteStatusText(
                  remoteSession.role,
                  remoteRoom,
                  remoteReady,
                  remoteError,
                )}
                ready={remoteReady}
                onBackToLobby={backToRemoteLobby}
              />
            </div>
          )}
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
    <section className="screen battle-screen" aria-label="通信対戦">
      <div className="content-medium battle-layout">
        <BattleStage
          opponentName={opponentParticipant?.displayName ?? "ゲスト"}
          opponentCombatant={role === "host" ? guestCombatant : hostCombatant}
          selfName={ownParticipant?.displayName ?? "自分"}
          selfCombatant={role === "host" ? hostCombatant : guestCombatant}
        />

        <section className="control-panel battle-hud" aria-label="通信対戦操作">
          {errorMessage === null ? null : (
            <p className="error-message">{errorMessage}</p>
          )}
          {rankingErrorMessage === null ? null : (
            <p className="field-error">{rankingErrorMessage}</p>
          )}
          {winnerText === null ? (
            <>
              <div className="battle-status-row">
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
              </div>
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
    </section>
  );
}

function CharacterPrepScreen({
  barcode,
  errorMessage,
  canSubmit,
  onBarcodeChange,
  onSubmit,
}: {
  barcode: string;
  errorMessage: string | null;
  canSubmit: boolean;
  onBarcodeChange: (barcode: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="character-prep-panel">
      <div className="character-scan-header">
        <p className="character-kicker">バーコードスキャン</p>
        <h2>キャラクターをよびだそう</h2>
        <div className="character-scan-device" aria-hidden="true">
          <span className="character-scan-beam" />
          <span className="character-scan-card" />
        </div>
      </div>
      <BarcodeForm
        barcode={barcode}
        errorMessage={errorMessage}
        canSubmit={canSubmit}
        onBarcodeChange={onBarcodeChange}
        onSubmit={onSubmit}
        submitLabel="キャラクター準備"
        label="自分のバーコード"
        scannerInitiallyOpen
        manualEntryInitiallyVisible={false}
      />
    </div>
  );
}

function TitleScreen({
  profile,
  onStart,
  onEditProfile,
}: {
  profile: PlayerProfile | null;
  onStart: () => void;
  onEditProfile: () => void;
}) {
  return (
    <div className="title-panel">
      <TitleEmblem />

      <div className="title-copy">
        <span className="title-barcode-strip title-barcode-strip-a" aria-hidden="true" />
        <span className="title-barcode-strip title-barcode-strip-b" aria-hidden="true" />
        <span className="title-barcode-strip title-barcode-strip-c" aria-hidden="true" />
        <span className="title-barcode-strip title-barcode-strip-d" aria-hidden="true" />
        <p className="title-kicker">スキャンしてたたかえ！</p>
        <h1>バーコードバトラー</h1>
      </div>

      {profile === null ? (
        <p className="title-player-card">NO PLAYER DATA</p>
      ) : (
        <div className="title-player-card">
          <span>PLAYER</span>
          <strong>{profile.displayName}</strong>
        </div>
      )}

      <div className="title-actions">
        <button type="button" className="title-start-button" onClick={onStart} aria-label="はじめる">
          START
        </button>
        {profile === null ? null : (
          <button type="button" className="quiet-button" onClick={onEditProfile}>
            ユーザー名を変更
          </button>
        )}
      </div>
    </div>
  );
}

function TitleEmblem() {
  return (
    <div className="title-emblem" aria-hidden="true">
      <div className="title-emblem-grid">
        <span className="title-summon-ring" />
        <span className="title-summon-ray" />
        <div className="title-summon-card">
          <span className="title-card-mark" />
          <span className="title-card-barcode" />
        </div>
        <span className="title-spark title-spark-a" />
        <span className="title-spark title-spark-b" />
        <span className="title-spark title-spark-c" />
      </div>
    </div>
  );
}

function ProfileStrip({
  profile,
  onEditProfile,
}: {
  profile: PlayerProfile;
  onEditProfile: () => void;
}) {
  return (
    <div className="profile-strip">
      <p className="room-id-display">
        <span>ユーザー名</span>
        <strong>{profile.displayName}</strong>
      </p>
      <button type="button" className="secondary-button" onClick={onEditProfile}>
        ユーザー名を変更
      </button>
    </div>
  );
}

function ResultScreen({
  room,
  role,
  rankingErrorMessage,
  onShowRanking,
  onBackToTitle,
}: {
  room: RemoteBattleRoom;
  role: RemoteBattleRole;
  rankingErrorMessage: string | null;
  onShowRanking: () => void;
  onBackToTitle: () => void;
}) {
  const resultText =
    room.battle.winner === "draw"
      ? "引き分け"
      : room.battle.winner === role
        ? "勝利"
        : "敗北";
  const resultTone =
    room.battle.winner === "draw"
      ? "draw"
      : room.battle.winner === role
        ? "win"
        : "loss";

  return (
    <section className="screen screen-center result-screen" aria-label="対戦結果">
      <div className="content-narrow result-layout">
        <div className={`result-panel result-panel-${resultTone}`}>
          <p>バトル終了</p>
          <strong>{resultText}</strong>
          {rankingErrorMessage === null ? null : (
            <p className="field-error">{rankingErrorMessage}</p>
          )}
          <div className="result-actions">
            <button type="button" onClick={onShowRanking}>
              ランキングを見る
            </button>
            <button type="button" className="secondary-button" onClick={onBackToTitle}>
              タイトルに戻る
            </button>
          </div>
        </div>

        <BattleLog
          entries={room.battle.log.length === 0 ? ["通信対戦終了"] : room.battle.log}
        />
      </div>
    </section>
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

function getActiveScreen(
  screen: AppScreen,
  remoteSession: RemoteSession | null,
  remoteRoom: RemoteBattleRoom | null,
): AppScreen {
  if (
    screen === "title" ||
    screen === "profile" ||
    screen === "character" ||
    screen === "ranking"
  ) {
    return screen;
  }

  if (remoteSession === null || remoteRoom === null) {
    return "lobby";
  }

  if (remoteRoom.status === "playing") {
    return "battle";
  }

  if (remoteRoom.status === "finished") {
    return "result";
  }

  return "room";
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
