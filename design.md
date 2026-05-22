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

### 読み取り結果バリデーション

カメラ読み取りは誤検出が起きるため、ZXingの読み取り結果をそのまま入力欄へ反映しない。バーコードバトラーの実機が主に対象にしていたJAN/EAN/UPC系だけをPhase 4の採用対象にし、`Result.getText()` と `Result.getBarcodeFormat()` を受け取って受け入れ可否を判定する。

- 検証処理はReactへ依存しない `src/domain/scannedBarcodeValidation.ts` に置く
- `BarcodeScanner` / `useBarcodeScanner` は検証済みの文字列だけを `onDetected` に渡す
- 検証に失敗した読み取り結果はユーザー向けエラーにせず、デバッグログへ `scan-result-rejected` として残し、次フレームの読み取りを続ける
- 手入力の `validateBarcodeInput` は既存どおり最小文字数と空文字チェックを担当し、カメラ読み取り固有の形式チェックとは分ける
- ZXingの読み取り対象フォーマットもPhase 4では `EAN_8`、`EAN_13`、`UPC_A`、`UPC_E` に絞る
- ISBNは `EAN_13` として読み取られる `978` / `979` 始まりの13桁として扱う

#### 受け入れルール

- `EAN_8`: 数字8桁、GS1チェックデジット一致
- `EAN_13`: 数字13桁、GS1チェックデジット一致
- `UPC_A`: 数字12桁、GS1チェックデジット一致
- `UPC_E`: 数字6桁または8桁を候補として扱う。実装時はUPC-E展開規則を確認し、GTIN-12へ展開してチェックデジットを検証する
- それ以外の形式: Phase 4では不採用。`CODE_39`、`CODE_93`、`CODABAR`、`CODE_128`、`ITF`、`RSS_14`、`RSS_EXPANDED` は読み取れても入力へ反映しない

#### GS1チェックデジット

GTIN-8、GTIN-12、GTIN-13はGS1のチェックデジット方式で検証する。右端のチェックデジットを除いた数字列に対して、右から交互に3、1の重みを掛け、合計を10の倍数へ切り上げた差分がチェックデジットと一致することを確認する。

#### Phase 5以降の拡張候補

バーコードバトラー再現よりも現代的な利便性を優先する場合、Phase 5以降で以下を追加検討する。

- `CODE_39`: 大文字英字、数字、スペース、`.`、`-`、`+`、`$`、`/`、`%`
- `CODE_93`: Code 39系の文字種と拡張ASCII表現
- `CODABAR`: 数字、`-`、`$`、`:`、`/`、`.`、`+`、開始・終了文字 `A` / `B` / `C` / `D`
- `CODE_128`: ASCII範囲。GS1-128として扱う場合はAI構造も確認する
- `ITF`: ITF-14などの物流系GTIN
- `RSS_14` / `RSS_EXPANDED`: GS1 DataBar系

#### 参考仕様

- GS1 General Specifications: GTIN-8 / GTIN-12 / GTIN-13 / GTIN-14、EAN/UPC、ITF-14、GS1 DataBar、チェックデジット
- GS1 Check Digit Calculator: GS1キーのチェックデジット確認
- GS1 US ITF-14: ITF-14はGTINを14桁形式でエンコードする
- GS1 GS1-128 format: GS1-128はFNC1、AI、データ、シンボルチェック文字を含み、48データ文字を超えない
- KEYENCE CODE 128: CODE 128は128個のASCII文字を表現できる
- Cognex Code 39: Code 39は43文字の基本文字種を持つ
- Dynamsoft Code 93: Code 93はCode 39より高密度で47文字を扱う
- STRICH Codabar: Codabarは数字、6つの記号、A-Dの開始・終了文字を扱う
- Barcode Battler II signal notes: EAN-13 / EAN-8 の出力形式
- 地域別のBarcode Battler II整理情報: 日本版・欧州版はEAN、北米版はUPC

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
- カメラ読み取り結果の形式別検証は `scannedBarcodeValidation.ts` に置く

## Phase 5: 通信対戦向けプロフィールとランキング

Phase 5では通常ユーザー向けの主導線を通信対戦に絞る。CPU戦と2人ローカル対戦は開発工程上の足場として役割を終えたため、通常画面のモード選択から外し、今後の積極的なメンテナンス対象から外す。ドメインロジックと既存テストは、通信対戦で再利用している戦闘処理を壊さない範囲で残し、未使用コードの削除はPhase 6以降で扱う。

### 画面導線

- トップ画面は通信対戦の開始を主導線にする
- 既存のCPU戦、2人ローカル対戦の選択肢は通常画面から表示しない
- 通信対戦では「部屋を作る」「部屋に参加する」「ランキングを見る」を選べる
- ユーザー名が未設定の場合は、部屋作成または参加の前にプロフィール入力へ誘導する
- カメラ読み取りは通信対戦のキャラクター準備フォームから使える

### 簡易プロフィール設計

- 本格認証は実装せず、ブラウザ内にユーザー名を保存する
- 保存先は `localStorage` とする
- プロフィール処理はReactに閉じ込めず、`src/domain/playerProfile.ts` などの小さな純粋関数で検証する
- UIからlocalStorageを直接触らず、`src/storage` または小さな専用モジュールを経由する
- ユーザー名は表示名としてだけ扱い、本人確認やなりすまし防止はPhase 5の非対象にする

#### ユーザー名バリデーション

- 前後の空白は保存前に取り除く
- 空文字は不可
- 表示崩れを防ぐため最大文字数を設ける
- 改行や制御文字は不可
- 同名ユーザーは許容する

### Firebase部屋データの拡張

通信対戦画面で相手の名前を表示するため、部屋データの `host` / `guest` にプロフィール由来の表示名を追加する。

```txt
rooms/{roomId}
  host:
    clientId
    displayName
    connected
    character
    ready
    selectedCommand
  guest:
    clientId
    displayName
    connected
    character
    ready
    selectedCommand
```

- `displayName` は部屋参加時点のユーザー名を保存する
- 対戦中にローカルのユーザー名を変更しても、進行中の部屋の表示名は自動更新しない
- Firebaseから取得した表示名もパース時に検証し、不正な値は安全な代替表示にする

### ランキング設計

ランキングは通信対戦の勝敗結果だけを対象にする。CPU戦と2人ローカル対戦はランキングへ登録しない。

Firebase Realtime Databaseにはランキング集計用データを `rankings/{profileKey}` に置く。Phase 5では認証を使わないため、`profileKey` はブラウザ内で生成して保存するランダムIDとする。

```txt
rankings/{profileKey}
  displayName
  wins
  losses
  battles
  lastPlayedAt
  updatedAt
```

- `profileKey` は初回プロフィール作成時に生成し、同じブラウザ内で維持する
- 勝敗確定時に勝者、敗者それぞれの集計を更新する
- ランキング表示は勝利数の降順を基本にし、同数の場合は対戦数や最終対戦日時で補助的に並べる
- 保存失敗時は対戦結果の表示を維持し、ランキング反映に失敗したことだけを通知する
- Phase 5では強い不正対策、サーバー側検証、本人確認、複数端末での同一アカウント共有は扱わない

### 実装分割

- プロフィールの型と検証は `src/domain/playerProfile.ts` に置く
- ランキングの型、並び順、集計更新は `src/domain/ranking.ts` に置く
- localStorage読み書きはReactコンポーネントから分離する
- Firebaseランキング読み書きは `src/network` 配下に置き、UIからFirebase SDKを直接操作しない
- 通信対戦UIはプロフィール未設定、ランキング保存中、保存失敗を明示的な状態として扱う

### Phase 5の非対象

- 本格認証
- メール、SNS、Firebase Authenticationによるログイン
- 強い不正対策
- CPU戦と2人ローカル対戦の完全削除
- QRコード参加
- EAN/UPC以外のバーコード形式への拡張対応

## Phase 6以降

- QRコード参加
- EAN/UPC以外のバーコード形式への拡張対応
- CPU戦と2人ローカル対戦の未使用コード削除
- Firebase匿名認証または外部認証
- ランキングの不正対策

## 非対象

- WebRTC DataChannel対戦
- 自前のExpressサーバー
- Socket.IO
