# AGENTS.md

## 基本方針

- 日本語で説明する
- TypeScriptで実装する
- fat main禁止
- 小さな関数・小さなコンポーネントに分割する
- テストを書いてから、または実装と同時にテストを書く
- 変更後は必ずテスト・lint・型チェックを実行する
- 失敗したら原因を説明し、最小変更で修正する

## 技術スタック

- Vite
- React
- TypeScript
- Tailwind CSS
- Node.js
- Express
- Socket.IO
- WebRTC DataChannel

## 開発順序

1. requirements.md を読む
2. design.md を作成・更新する
3. tasks.md を作成・更新する
4. tasks.md の上から順に1タスクずつ実装する
5. 各タスクごとにテストを追加する
6. テスト成功後に次へ進む

## 禁止事項

- いきなり通信対戦から作らない
- 巨大な1ファイル実装にしない
- ゲームロジックをReactコンポーネントに直書きしない
- ランダム処理をテスト不能な形で書かない