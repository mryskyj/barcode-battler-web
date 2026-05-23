export type BattleEventSummary =
  | {
      type: "damage";
      title: string;
      detail: string;
      damage: number;
      guarded: boolean;
    }
  | {
      type: "miss" | "charge" | "guard" | "win";
      title: string;
      detail: string;
    };

const DAMAGE_PATTERN = /(\d+)ダメージ/;

export function createBattleEventSummary(
  latestLog: string | null,
): BattleEventSummary | null {
  if (latestLog === null || latestLog.length === 0 || latestLog === "バトル開始") {
    return null;
  }

  const damage = latestLog.match(DAMAGE_PATTERN);
  if (damage?.[1] !== undefined) {
    const damageValue = Number(damage[1]);
    const guarded = latestLog.includes("ダメージ軽減");

    return {
      type: "damage",
      title: `-${damageValue}`,
      detail: guarded ? "ダメージ軽減" : "ダメージ",
      damage: damageValue,
      guarded,
    };
  }

  if (latestLog.includes("外れた")) {
    return {
      type: "miss",
      title: "MISS",
      detail: "攻撃失敗",
    };
  }

  if (latestLog.includes("力をためた")) {
    return {
      type: "charge",
      title: "CHARGE",
      detail: "次の攻撃アップ",
    };
  }

  if (latestLog.includes("身を守った")) {
    return {
      type: "guard",
      title: "GUARD",
      detail: "防御態勢",
    };
  }

  if (latestLog.includes("勝利")) {
    return {
      type: "win",
      title: "FINISH",
      detail: "勝負あり",
    };
  }

  return null;
}
