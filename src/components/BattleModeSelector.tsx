import type { BattleMode } from "../domain/battleMode";

type BattleModeSelectorProps = {
  value: BattleMode;
  onChange: (mode: BattleMode) => void;
};

export function BattleModeSelector({ value, onChange }: BattleModeSelectorProps) {
  return (
    <fieldset className="mode-selector">
      <legend>対戦モード</legend>
      <label className="mode-option">
        <input
          type="radio"
          name="battle-mode"
          value="cpu"
          checked={value === "cpu"}
          onChange={() => onChange("cpu")}
        />
        <span>CPU戦</span>
      </label>
      <label className="mode-option">
        <input
          type="radio"
          name="battle-mode"
          value="local"
          checked={value === "local"}
          onChange={() => onChange("local")}
        />
        <span>2人ローカル対戦</span>
      </label>
    </fieldset>
  );
}
