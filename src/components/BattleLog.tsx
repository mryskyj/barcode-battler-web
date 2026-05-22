type BattleLogProps = {
  entries: string[];
};

export function BattleLog({ entries }: BattleLogProps) {
  return (
    <section className="battle-log" aria-label="戦闘ログ">
      <h2>ログ</h2>
      <ol>
        {entries
          .slice()
          .reverse()
          .map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
      </ol>
    </section>
  );
}
