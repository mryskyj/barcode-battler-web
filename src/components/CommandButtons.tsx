import type { BattleCommand } from "../domain/battle";
import { BATTLE_COMMANDS, COMMAND_LABELS } from "../domain/commandLabels";

type CommandButtonsProps = {
  disabled: boolean;
  onCommand: (command: BattleCommand) => void;
};

export function CommandButtons({ disabled, onCommand }: CommandButtonsProps) {
  return (
    <div className="command-grid" aria-label="コマンド">
      {BATTLE_COMMANDS.map((command) => (
        <button
          key={command}
          type="button"
          disabled={disabled}
          onClick={() => onCommand(command)}
        >
          {COMMAND_LABELS[command]}
        </button>
      ))}
    </div>
  );
}
