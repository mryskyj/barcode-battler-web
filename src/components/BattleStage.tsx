import type { Combatant } from "../domain/battle";
import { createBattleEventSummary } from "./battleEventSummary";

type BattleStageProps = {
  opponentName: string;
  opponentCombatant: Combatant | null;
  selfName: string;
  selfCombatant: Combatant | null;
  latestLog?: string | null;
};

export function BattleStage({
  opponentName,
  opponentCombatant,
  selfName,
  selfCombatant,
  latestLog = null,
}: BattleStageProps) {
  const eventSummary = createBattleEventSummary(latestLog);

  return (
    <section className="battle-stage" aria-label="バトルステージ">
      <BattleActor
        position="opponent"
        label="相手"
        name={opponentName}
        combatant={opponentCombatant}
      />
      <div className="battle-field">
        <span>VS</span>
        {eventSummary === null ? null : (
          <div
            className={`battle-event battle-event-${eventSummary.type}`}
            role="status"
            aria-live="polite"
          >
            <strong>{eventSummary.title}</strong>
            <small>{eventSummary.detail}</small>
          </div>
        )}
      </div>
      <BattleActor position="self" label="自分" name={selfName} combatant={selfCombatant} />
    </section>
  );
}

function BattleActor({
  position,
  label,
  name,
  combatant,
}: {
  position: "opponent" | "self";
  label: string;
  name: string;
  combatant: Combatant | null;
}) {
  const characterName = combatant?.character.name ?? "準備中";

  return (
    <div className={`battle-actor battle-actor-${position}`}>
      <div className="battle-actor-info">
        <span>{label}</span>
        <strong>{name}</strong>
        <small>{characterName}</small>
      </div>
      <CharacterSlot />
      {combatant === null ? null : <HpBar combatant={combatant} />}
    </div>
  );
}

function CharacterSlot() {
  return (
    <div className="character-slot" aria-label="キャラクタースロット">
      <span />
    </div>
  );
}

function HpBar({ combatant }: { combatant: Combatant }) {
  const maxHp = combatant.character.stats.hp;
  const hpRate = `${Math.max(0, (combatant.currentHp / maxHp) * 100)}%`;

  return (
    <div className="battle-hp">
      <div className="hp-row">
        <span>HP</span>
        <strong>
          {combatant.currentHp} / {maxHp}
        </strong>
      </div>
      <div className="hp-bar" aria-hidden="true">
        <div style={{ width: hpRate }} />
      </div>
      <dl className="stats-grid battle-stats">
        <Stat label="ちから" value={combatant.character.stats.power} />
        <Stat label="ぼうぎょ" value={combatant.character.stats.defense} />
        <Stat label="すばやさ" value={combatant.character.stats.speed} />
      </dl>
      <div className="status-flags">
        {combatant.charged ? <span>ため中</span> : null}
        {combatant.guarding ? <span>防御中</span> : null}
      </div>
    </div>
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
