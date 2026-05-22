import type { RemoteBattleRole } from "./remoteBattle";

export function getRemoteSetupStatusText(
  role: RemoteBattleRole,
  ready: boolean,
): string {
  if (!ready) {
    return "自分のキャラクター準備待ち";
  }

  return role === "host" ? "ゲストの参加・準備待ち" : "ホストの準備待ち";
}
