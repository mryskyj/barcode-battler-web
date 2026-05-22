import { BattleLog } from "./BattleLog";
import { CommandButtons } from "./CommandButtons";
import { CombatantPanel } from "./CombatantPanel";
import type { BattleCommand } from "../domain/battle";
import type { LocalBattleState } from "../domain/localBattle";

type LocalBattleViewProps = {
  battle: LocalBattleState;
  onCommand: (command: BattleCommand) => void;
  onBackToSetup: () => void;
};

export function LocalBattleView({
  battle,
  onCommand,
  onBackToSetup,
}: LocalBattleViewProps) {
  const winnerText = getWinnerText(battle);
  const turnText =
    battle.selectingPlayer === "player1"
      ? "プレイヤー1の選択"
      : "プレイヤー2の選択";

  return (
    <div className="battle-layout">
      <div className="combatants-grid">
        <CombatantPanel title="プレイヤー1" combatant={battle.player1} />
        <CombatantPanel title="プレイヤー2" combatant={battle.player2} />
      </div>

      <section className="control-panel" aria-label="バトル操作">
        {winnerText === null ? (
          <div className="turn-panel">
            <strong>{turnText}</strong>
            {battle.queuedCommands.player1 !== undefined ? (
              <p className="mode-note">プレイヤー1は選択済み</p>
            ) : null}
            <CommandButtons disabled={false} onCommand={onCommand} />
          </div>
        ) : (
          <div className="result-panel">
            <strong>{winnerText}</strong>
            <button type="button" onClick={onBackToSetup}>
              入力へ戻る
            </button>
          </div>
        )}
      </section>

      <BattleLog entries={battle.log} />
    </div>
  );
}

function getWinnerText(battle: LocalBattleState): string | null {
  if (battle.winner === null) {
    return null;
  }

  return battle.winner === "player1" ? "プレイヤー1の勝利" : "プレイヤー2の勝利";
}
