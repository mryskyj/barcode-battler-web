# design.md

## Phase 1: CPU戦MVP

1台のブラウザで、バーコード文字列から生成したプレイヤーキャラクターとCPU敵がターン制で戦える状態を目標にする。

## アーキテクチャ

- `src/domain`
  - Reactに依存しないゲームロジックを置く
  - hash、キャラクター生成、戦闘進行、CPU行動選択を担当する
- `src/components`
  - 表示と入力を担当する小さなReactコンポーネントを置く
- `src/App.tsx`
  - 画面状態を接続する薄いコンテナにする

## ドメイン設計

### キャラクター生成

- バーコード文字列を安定hashに変換する
- hash値から範囲内のステータスを決定する
- 同じバーコード文字列は常に同じステータスになる

### 戦闘

- `BattleState` にプレイヤー、敵、現在ターン、ログ、勝者を保持する
- `BattleCommand` は `attack` / `charge` / `guard` / `special`
- 乱数は `RandomSource` として注入できる
- UIからは `createBattle` と `executeTurn` を呼ぶ
- CPUは現在MVPでは単純な決定的ルールで行動する
- `guard` は通常攻撃を軽減し、`special` に対してはさらに強く軽減する

## UI設計

- モード選択
- バーコード入力フォーム
- プレイヤーと敵のステータス表示
- コマンドボタン
- 戦闘ログ
- 勝敗表示と再戦ボタン

### モード選択

- CPU戦と2人ローカル対戦を切り替える
- Phase 2ではローカル対戦の入力フローをここから分岐させる

### 2人ローカル対戦の入力

- プレイヤー1とプレイヤー2のバーコード入力欄を並べて配置する
- それぞれの入力値は独立して保持する

### 2人ローカル対戦の進行

- `src/domain/localBattle.ts` にReactへ依存しないローカル対戦状態を置く
- プレイヤー1とプレイヤー2が順番にコマンドを選び、両者が選択した時点で1ラウンドを解決する
- ラウンド内の行動順はすばやさで決め、同値の場合はプレイヤー1を先にする
- ダメージ計算はCPU戦と同じ `calculateDamage` を再利用する
- 片方がコマンド選択済みでも、相手の選択前には選んだコマンド名をログや画面に出さない
- 勝敗後は入力画面へ戻れるようにする

## Phase 3: Firebase同期対戦

GitHub Pagesで配信できる静的Webアプリのまま、別ブラウザ間で1対1の対戦を成立させる。Phase 3ではWebRTCを使わず、Firebase Realtime Databaseを部屋状態の同期先にする。

### Firebase設計

- Firebase Realtime Databaseを使う
- Firebase設定値はViteの環境変数から読み込む
- `src/network` にFirebase Realtime Databaseの読み書き処理を置く
- UIからFirebase SDKを直接操作しない
- 部屋データは `rooms/{roomId}` に置く
- 部屋IDは推測しにくい短いランダム文字列にする
- Phase 3では認証なしで開始し、Firebase Security Rulesで書き込み範囲を制限する

### 部屋データ

```txt
rooms/{roomId}
  status: "waiting" | "ready" | "playing" | "finished" | "closed"
  host:
    clientId
    connected
    character
    ready
    selectedCommand
  guest:
    clientId
    connected
    character
    ready
    selectedCommand
  battle:
    round
    player1
    player2
    log
    winner
  updatedAt
```

### クライアント通信設計

- 通信層は以下の操作を公開する
  - 部屋作成
  - 部屋参加
  - 部屋状態購読
  - キャラクター準備の書き込み
  - コマンド選択の書き込み
  - ラウンド結果の書き込み
  - 部屋退出
- Firebase上の値はアプリ内部型へ変換してからUIへ渡す
- 不正な部屋状態や欠けたデータはパース時に弾く

### 対戦同期

- ホストを権威側にする
- ホストはFirebase上で自分とゲストのコマンドが揃った時点でラウンドを解決する
- ホストは解決後に `battle` と各プレイヤーの `selectedCommand` クリアを同時に書き込む
- ゲストはコマンド送信後、Firebase上の `battle` 更新を待つ
- 既存の `calculateDamage` とコマンド解決ルールを再利用し、通信固有の状態管理と分離する
- Phase 3ではcommit/revealを実装しないため、完全な不正対策は非対象とする
- 乱数はホスト側で発生させ、結果だけを同期する

### UI設計

- モード選択に「通信対戦」を追加する
- 通信対戦では「部屋を作る」と「部屋に参加する」を選べる
- ホスト画面には部屋IDを表示する
- ゲスト画面には部屋ID入力欄を表示する
- 接続後は各ブラウザで自分のバーコード入力とコマンド選択だけを表示する
- 相手側はHP、ステータス、選択待ち/選択済み状態だけを表示し、コマンド内容は結果確定まで出さない
- Firebase接続エラー、部屋なし、満員、相手退出の状態を表示する

### 非対象

- WebRTC
- 自前のExpressサーバー
- Socket.IO
- QRコード参加
- カメラ読み取り
- 切断後の自動再接続
- commit/revealによる後出し防止
- サーバー権威型の完全な不正対策

## Phase 1.5: CPU戦MVP改善

### 入力バリデーション

- バーコード入力の検証は `src/domain/barcodeValidation.ts` に置く
- Reactコンポーネントは検証結果を表示し、無効な入力では開始処理を呼ばない
- 前後の空白は開始時に正規化する

### 戦闘ログ

- コマンドごとの結果文言はドメイン側で作る
- ログには行動者、コマンド、命中・失敗、ダメージ、勝敗を含める
- UIはログ配列を表示するだけにする

### 再戦フロー

- 勝敗後は「同じバーコードで再戦」と「入力へ戻る」を選べる
- 同じバーコードで再戦する場合は現在の入力値から再度キャラクターを生成する

### 戦闘バランス

- ダメージ計算をエクスポートして単体テストできるようにする
- 通常攻撃、ためる、まもる、必殺の倍率を明示的な定数で管理する
- 極端な短期決着を避けるため、必殺とためるの倍率を調整対象として分離する

### レスポンシブ表示

- スマホ幅では入力、コマンド、ログが縦に自然に並ぶ
- ボタンは44px以上のタップ領域を維持する
- ログは読みやすさを優先し、狭い画面では高さを抑えすぎない

## Phase 4: カメラでバーコード読み取り

バーコード入力フォームに、スマホのカメラでバーコードを読み取る補助機能を追加する。手入力はそのまま残し、カメラが使えない端末や権限拒否でも既存フローで遊べるようにする。

### カメラ設計

- `src/components/BarcodeForm.tsx` にカメラ読み取りの入口を置く
- カメラ起動、権限、読み取り状態は専用コンポーネントに分離する
- 読み取り結果は既存の `onBarcodeChange` に流し込む
- 読み取りできたら自動でカメラを止める
- 未対応ブラウザではエラーメッセージを出し、手入力を妨げない
- 小さいバーコードに対応しやすいように、高めのカメラ解像度と大きめのスキャンキャンバスを使う
- 黒以外のバーコードや薄いバーコードに対応するため、元画像に加えて輝度コントラスト補正と色チャンネル補正の候補も読み取る
- 高解像度カメラや大きいCanvasが使えない端末では、カメラ制約とスキャンキャンバスサイズを段階的に下げて継続する
- スキャナーのデバッグログは通常表示しない。開発時に `?scannerDebug=1` または `localStorage.setItem("barcodeScannerDebug", "1")` を指定した場合だけ、画面ログとコンソールログを出す

### カメラ実装の分割

- `BarcodeScanner.tsx` はカメラUIの描画を担当する
- `useBarcodeScanner.ts` はReact状態、カメラ起動、読み取りループ、検出後の通知を担当する
- `BarcodeScannerDebugPanel.tsx` はスキャナーデバッグログの表示だけを担当する
- カメラ制約とスキャン間隔は `barcodeScannerConfig.ts` に置く
- カメラ取得のフォールバックは `barcodeScannerCamera.ts` に置く
- 読み取り用画像補正は `barcodeScannerImage.ts` に置く
- Canvasフレーム作成と座標変換は `barcodeScannerFrame.ts` に置く
- スキャナーのデバッグ表示可否と詳細整形は `barcodeScannerDebug.ts` に置く
- エラー分類は `barcodeScannerErrors.ts` に置く

## Phase 5以降

Phase 5以降は、カメラ読み取りとは独立した追加機能として扱う。

- QRコード参加
- ランキング
- アカウント機能

## 非対象

- WebRTC DataChannel対戦
- 自前のExpressサーバー
- Socket.IO
