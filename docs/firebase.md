# Firebase設定

Phase 3の通信対戦は、GitHub Pagesで配信する静的WebアプリからFirebase Realtime Databaseへ接続して同期する。

## Firebaseプロジェクト

1. Firebase Consoleでプロジェクトを作成する
2. Webアプリを追加する
3. Realtime Databaseを作成する
4. Firebase設定値を `.env.local` に保存する

## 環境変数

`.env.example` を参考に `.env.local` を作成する。

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

`.env.local` はコミットしない。

## Realtime Databaseの使い方

- 部屋データは `rooms/{roomId}` に保存する
- Phase 3では認証なしで開始し、部屋IDを知っている2人だけが使う前提にする
- クライアントコードからFirebase SDKを直接呼ばず、`src/network` のラッパー経由で読み書きする

## Realtime Database Rules

開発確認後は、Firebase ConsoleのRealtime Database Rulesへ `database.rules.json` の内容を貼り付けて公開する。

このルールで制限すること:

- ルートや `rooms` 一覧は読めない
- `rooms/{roomId}` だけ読める
- `rankings` はランキング表示のため一覧を読める
- `rankings/{profileKey}` はプロフィールキー単位で集計形式を検証する
- 部屋IDは `A-Z` と `0-9` の6文字だけ許可する
- ルーム、参加者、キャラクター、バトル状態の最低限の型を検証する
- 参加者の表示名は1〜16文字の文字列として検証する
- 未知のトップレベルフィールドを書けないようにする

Phase 3では認証なしのため、このルールは完全な不正対策ではない。部屋IDを知っている人は同じ部屋へ読み書きできる。公開範囲を広げる場合は、Firebase Authentication、App Check、commit/reveal、またはサーバー権威型の導入を検討する。

## ローカル確認

```bash
npm run dev
```

Firebase設定値が未設定の場合、通信対戦機能の初期化時にエラーにする。Phase 5以降の通常導線は通信対戦を前提にするため、ローカル確認でもFirebase設定値を用意する。
