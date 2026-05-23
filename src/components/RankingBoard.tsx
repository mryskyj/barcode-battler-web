import type { RankingEntry } from "../domain/ranking";

type RankingBoardProps = {
  entries: RankingEntry[];
  loading: boolean;
  errorMessage: string | null;
  onBackToTitle: () => void;
};

export function RankingBoard({
  entries,
  loading,
  errorMessage,
  onBackToTitle,
}: RankingBoardProps) {
  return (
    <section className="ranking-panel" aria-label="ランキング">
      <div className="ranking-header">
        <p>スコアボード</p>
        <h2>ランキング</h2>
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
          {entries.map((entry, index) => (
            <li key={entry.profileKey} className="ranking-entry">
              <span className="ranking-rank">{index + 1}</span>
              <strong>{entry.displayName}</strong>
              <span className="ranking-score">{entry.wins}勝</span>
              <span>{entry.losses}敗</span>
              <span>{entry.battles}戦</span>
            </li>
          ))}
        </ol>
      )}
      <div className="ranking-actions">
        <button type="button" onClick={onBackToTitle}>
          タイトルに戻る
        </button>
      </div>
    </section>
  );
}
