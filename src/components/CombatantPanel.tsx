import type { Combatant } from "../domain/battle";

type CombatantPanelProps = {
  title: string;
  combatant: Combatant;
};

export function CombatantPanel({ title, combatant }: CombatantPanelProps) {
  const { character, currentHp } = combatant;
  const maxHp = character.stats.hp;
  const hpRate = `${Math.max(0, (currentHp / maxHp) * 100)}%`;

  return (
    <section className="combatant-panel" aria-label={title}>
      <div className="combatant-heading">
        <h2>{title}</h2>
        <span>{character.name}</span>
      </div>
      <div className="hp-row">
        <span>HP</span>
        <strong>
          {currentHp} / {maxHp}
        </strong>
      </div>
      <div className="hp-bar" aria-hidden="true">
        <div style={{ width: hpRate }} />
      </div>
      <dl className="stats-grid">
        <Stat label="ちから" value={character.stats.power} />
        <Stat label="ぼうぎょ" value={character.stats.defense} />
        <Stat label="すばやさ" value={character.stats.speed} />
      </dl>
      <div className="status-flags">
        {combatant.charged ? <span>ため中</span> : null}
        {combatant.guarding ? <span>防御中</span> : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
