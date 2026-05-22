import type { RankingEntry } from "../domain/ranking";

type RankingBoardProps = {
  entries: RankingEntry[];
  loading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
};

export function RankingBoard({
  entries,
  loading,
  errorMessage,
  onRefresh,
}: RankingBoardProps) {
  return (
    <section className="ranking-panel" aria-label="ランキング">
      <div className="ranking-header">
        <h2>ランキング</h2>
        <button type="button" className="secondary-button" onClick={onRefresh}>
          更新
        </button>
      </div>
      {loading ? <p className="mode-note">読み込み中</p> : null}
      {errorMessage === null ? null : (
        <p className="field-error">{errorMessage}</p>
      )}
      {!loading && entries.length === 0 ? (
        <p className="mode-note">まだランキングはありません</p>
      ) : null}
      {entries.length === 0 ? null : (
        <ol className="ranking-list">
          {entries.map((entry) => (
            <li key={entry.profileKey} className="ranking-entry">
              <strong>{entry.displayName}</strong>
              <span>{entry.wins}勝</span>
              <span>{entry.losses}敗</span>
              <span>{entry.battles}戦</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
