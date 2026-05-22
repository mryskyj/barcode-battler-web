# test_plan.md

## テスト方針

ゲームロジックを中心に自動テストする。

## 単体テスト対象

### hash

- 同じ文字列は同じhashになる
- 異なる文字列は異なるhashになりやすい

### character

- 同じバーコードから同じステータスが生成される
- HPが80〜200に収まる
- ちからが10〜50に収まる
- ぼうぎょが5〜40に収まる
- すばやさが5〜35に収まる

### battle

- 通常攻撃でHPが減る
- ダメージは最低1
- ためる後の攻撃は強くなる
- まもる中は被ダメージが減る
- まもるは必殺に対して通常攻撃より強く効く
- 必殺は命中時に大ダメージ
- HPが0以下になったらwinnerが設定される

## 手動テスト

- iPhone Safari
- Android Chrome
- iPad Safari
- PC Chrome

## 実行コマンド

```bash
npm test
npm run lint
npm run typecheck
npm run build
