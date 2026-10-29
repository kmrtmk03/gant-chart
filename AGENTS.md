<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ガントチャート プロジェクト規約（全 AI エージェント共通）

このファイルは Claude Code・Codex など、このリポジトリで作業するすべての AI エージェントが従う規約の本体。
Claude 固有の設定は `CLAUDE.md` に書き、共通の内容はこのファイルだけで管理する（二重管理しない）。

- 元にしたもの: リポジトリ所有者のグローバル設定（`~/.claude/CLAUDE.md`）。グローバル側を更新したときは、このファイルにも反映するか確認する
- 冒頭の `nextjs-agent-rules` ブロックは `next dev` が自動で書き戻すため、削除・編集しない

## 最重要原則

迷ったら、この 5 つに立ち返る。

1. 書く前に読む: 変更対象と周辺コードを理解してから実装する
2. 既存に合わせる: 自分の好みより、コードベースの既存パターンを優先する
3. スコープを守る: 依頼されたことだけを、依頼された範囲で行う
4. 終わる前に見直す: 依頼文と自分の差分を照合してから完了を宣言する
5. 正直に報告する: 検証結果・失敗・スキップした確認を、そのまま伝える

## プロジェクト概要

担当者ごとに「いつ・どの案件を作業しているか」を一目で確認・編集できる、シンプルなガントチャートサイト。身内での利用を想定する。

- 左側: 担当者（親）→ 案件（子）の 2 階層リスト。最下部に「案件を追加」ボタン
- 右側: 日単位のタイムラインに、案件の期間を帯で表示する
- 帯のクリック、または追加ボタンで右側にサイドパネルを開き、案件を追加・編集する

要件と実装プランは `.plan/` にある。作業前に、次の順で読むこと。

1. `.plan/handoff.md`（引き継ぎ資料。現在の進捗、調査済みの事実、ユーザーの進め方の希望）
2. 全体プラン（`.plan/1-gantt-chart-mvp.md`）
3. 担当するフェーズのプラン

フェーズは 1 つずつ別のセッションで進める。フェーズを終えるときは、`.plan/handoff.md` の進捗と申し送りを更新してから終える。

## 技術構成

| 用途 | 採用するもの |
| --- | --- |
| フレームワーク | Next.js 16（App Router、`src/` ディレクトリ構成）。Vite は使わない |
| 言語 | TypeScript（strict） |
| スタイル | Sass + CSS Modules（`*.module.scss`） |
| データ保存 | 開発中は localStorage。将来は Firestore（サーバー側の Firebase Admin SDK 経由のみ） |
| 認証 | Basic 認証のみ（`src/proxy.ts`）。ユーザー認証はしない |
| PWA | `app/manifest.ts` と `public/sw.js` |
| 日付処理 | date-fns、祝日判定は `@holiday-jp/holiday_jp` |
| lint / format / test | ESLint / Prettier / Vitest |
| パッケージマネージャー | pnpm のみ |

### Next.js 16 で特に注意すること

- 記憶にある Next.js の API をそのまま書かない。必ず `node_modules/next/dist/docs/` の該当ドキュメントを読んでから使う
- `middleware.ts` は廃止され、`proxy.ts`（関数名 `proxy`）に変わっている
- `next.config.ts` で `cacheComponents` が有効になっている。データ取得やキャッシュの書き方はこれを前提に確認する

## パッケージマネージャー

- **pnpm だけを使う。`npm` / `yarn` / `npx` のコマンドは実行しない**（一時的なコマンド実行は `pnpm dlx` を使う）
- 依存の追加は `pnpm add <pkg>`（開発用は `pnpm add -D <pkg>`）
- `package-lock.json` / `yarn.lock` を作らない。もし作られていたら削除し、原因を報告する

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバーを HTTPS で起動する（`https://localhost:3000`。mkcert の導入が必要） |
| `pnpm dev:http` | 開発サーバーを HTTP で起動する（`http://localhost:3000`。mkcert 不要） |
| `pnpm build` | 本番ビルド |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | 型チェック（`tsc --noEmit`） |
| `pnpm test` | Vitest による単体テスト |
| `pnpm test:watch` | Vitest をウォッチモードで実行 |
| `pnpm format` | Prettier で整形 |
| `pnpm format:check` | Prettier の整形チェック（書き換えない） |

コマンドがまだ用意されていないフェーズでは、用意されているものだけを実行し、その旨を報告する。

## ディレクトリ構成

```
src/
├── proxy.ts              # Basic 認証
├── app/                  # ルーティング（page / layout / manifest）
├── styles/               # デザイントークン（_tokens.scss）とグローバル CSS のみ
└── features/
    └── gantt/            # ガントチャート機能。UI・ロジック・型・定数はこの中で完結させる
        ├── components/
        ├── hooks/
        ├── repositories/
        ├── gantt.type.ts
        ├── gantt.constants.ts
        ├── gantt.guards.ts
        └── gantt.utils.ts
```

- 機能に固有の実装は `features/<機能名>/` に置く。共有ディレクトリ（`src/components` / `src/hooks` / `src/utils` など）は、複数の機能で実際に再利用されるまで作らない
- テストは対象ファイルと同じ場所に `*.test.ts` として置く

## データ設計のルール

- データは `members`（担当者）と `projects`（案件）の 2 つのフラットなコレクションで持つ。案件は `memberId` で担当者を参照する（Firestore にそのまま移すため）
- 日付は `"YYYY-MM-DD"` の文字列、日時は ISO 8601 の文字列で持つ。`Date` オブジェクトを保存しない
- コンポーネントから localStorage や Firestore を直接触らない。必ず `IGanttRepository` を経由する
- 将来 Firebase を使うときは、Route Handler + Firebase Admin SDK でサーバー側からだけアクセスする。Firebase の設定値やサービスアカウント情報に `NEXT_PUBLIC_` を付けず、クライアントのコードに含めない
- localStorage など外部から読んだ値は `unknown` として受け取り、型ガードで検証してから使う

## 言語

- 回答・成果物（プラン、コミットメッセージ、PR のタイトルと説明、issue コメントなど）はすべて日本語で書く
- コード内のコメントも日本語で書く

## 作業の進め方

コード編集を伴うタスクは、規模に関わらず次の順で進める。

1. **理解**: 変更対象だけでなく、呼び出し元・関連する型・定数・フック・テストなど隣接ファイルも先に読む。推測で書き始めない
2. **方針**: 変更が波及する箇所（呼び出し元、型の参照元、同じパターンを持つ別の機能）を列挙する。複数の実装方法がある場合は、既存パターンとの整合と影響範囲の小ささで比較して選び、判断が分かれる選択をしたときは採用理由を一言添える
3. **実装**: 変更は依頼されたスコープに限定し、ついでのリファクタリングや無関係な整形を混ぜない。エッジケース（`null` / `undefined` / 空配列 / 境界値 / 想定外の入力順序）を洗い出し、必要な防御を入れる
4. **自己レビュー**: 依頼文とプランを読み直して要求の取りこぼしがないか照合する。差分を通しで読み直し、消し忘れのデバッグコード・未使用 import・命名の揺れ・コメント不足がないか確認する。バグ修正では、症状の回避ではなく根本原因に対処できているか確認する
5. **検証**: `pnpm lint` / `pnpm typecheck` / `pnpm test` を実行して結果を報告する。ビルド設定・エントリー・グローバル CSS などに影響する変更は `pnpm build` でも確認する。実行しなかった検証があれば、その旨を明記する

## 不確実なとき・調査の作法

- 仕様の解釈によって成果物が大きく変わる場合は、実装前に質問する
- 解釈の揺れが小さい場合は、妥当なデフォルトを選んで進め、採用した前提を回答の冒頭で明示する
- 調べれば分かること（コードベース内の事実、コマンドの有無、設定値など）は自分で調べる
- ライブラリの API は、記憶に頼らず型定義・ドキュメント・既存の使用例を確認してから使う
- コマンドやテストが失敗したときは、エラーメッセージから原因を特定してから対処する。同じ操作を原因不明のまま繰り返さない

## 命名規則

- コンポーネント: `PascalCase`（ファイル名も `PascalCase.tsx`、1 ファイル 1 コンポーネント）
- カスタムフック: `useXxx`（ファイル名も `useXxx.ts`）
- 定数: `UPPER_SNAKE_CASE`
- イベントハンドラ: `handleXxx`
- boolean の state・判定値: `isXxx`
- interface: `IXxx`、type エイリアス・ジェネリック型パラメータ: `TXxx`
- 型ガード関数: `isXxx(value): value is T`
- ファイル接尾辞は責務ごとに揃える: `*.type.ts` / `*.constants.ts` / `*.utils.ts` / `*.guards.ts` / `*.store.ts`
- 外部（API など）から受けたデータのフィールド名は、送信元の命名をそのまま維持する。アプリ側で新しく作る名前は camelCase にする

## コーディング共通規約

- 既存コードベースの設計・命名・import 順・フォーマットに合わせる
- フォーマットは Prettier の設定を正とする（セミコロンなし、ダブルクォート、末尾カンマあり）
- 可読性を最優先する: 早期 return、浅いネスト、単一責任の関数
- マジックナンバーや文字列のハードコーディングは避け、定数化する（列幅・行の高さ・ストレージキー・色プリセットは `gantt.constants.ts`）
- エラーは握りつぶさない。`try/catch` は対処できる箇所に限定する
- JSON は `JSON.stringify` / `JSON.parse` を使い、手動で連結しない

### コメント方針

- 関数・フック・型には JSDoc 形式（`/** */`）で役割を書く
- 呼び出し契約・副作用・注意点（「必ず呼ぶこと」など）は特に明記する
- 処理のまとまりごとに、意図や前提が伝わる短いコメントを添える（処理の言い換えにしない）
- データがどこから来てどこへ渡るか（フック間の連携、repository との関係）が分かるように書く
- interface のフィールドには、意味が自明でなければ 1 行コメントを付ける
- 暫定対応・未実装・将来の変更予定は `TODO:` / `MEMO:` を付けて残す

## TypeScript の規約

- `any` は使わない。外部からの不定データは `unknown` で受けて型ガードで絞り込む
- 型ガードには「なぜその検証が必要か」をコメントで残す
- 型アサーション（`as`）は最後の手段にする。`@ts-ignore` などで型エラーを無視しない
- `enum` は使わず Union 型を使う
- 共通のベース型があるときは、`extends` / `Omit` / 交差型で差分だけを定義する

## React の規約

- Functional Component と Hooks で実装する
- tsx は UI の記述に専念させ、ロジックは Custom Hooks へ、UI に依存しない処理は `*.utils.ts` へ切り出す
- フックは UI を返さず、状態と操作のみを返す。返す関数は `useCallback` で安定化する
- JSX 内で複雑な処理を書かず、事前に変数やフックへ切り出す
- state は必要最小限にし、派生できる値は state にしない。更新は `setState((prev) => ...)` 形式を優先する
- 不要な `useEffect` を作らない。副作用の登録と解除は同じ `useEffect` 内で完結させる
- `useMemo` は明確な根拠がある場合だけ使う
- 状態管理はページ・機能単位のフック + props で行い、props の受け渡しが深くなった場合だけ store を導入する
- 大きな機能は「ページ全体のフック（`useGanttPage`）→ 責務別のフック」と階層化する
- フックの return は関連する値・操作をグループ化し、グループごとにコメントを付ける
- state が未初期化（`null`）の間は、早期 return で更新を見送る
- import 順は `react` → 外部ライブラリ → エイリアス（`@/`）→ 相対

## スタイリング（Sass / CSS Modules）の規約

- コンポーネントのスタイルは同じ場所の `Xxx.module.scss` に書く
- 色・余白・フォントサイズなどは `src/styles/_tokens.scss` のトークンを使い、生の値を直接書かない
- グローバル CSS（`globals.scss`）にはリセットとベーススタイルだけを置き、機能固有の調整を書かない
- インラインスタイル（`style` 属性）は、帯の位置や幅など動的な値が必要な場合に限る
- 同じ見た目が複数箇所に現れたら、クラスの共通化より先にコンポーネント化を検討する

## コミット・ブランチ

- `main` で直接コミットしない。作業前に現在のブランチを確認し、作業用ブランチを切ってからコミットする
- ブランチ名は英小文字・数字・`-`・`/` のみのケバブケースで、prefix はコミットの prefix と揃える（例: `feat/gantt-drag`）
- コミットは意味のある小さな単位に分ける。性質の違う変更（feat と refactor など）は分ける
- コミットメッセージは日本語で `<prefix>: <修正内容の要約>`。prefix は `feat` / `fix` / `docs` / `style` / `refactor`
- 作業完了時は「変更内容の要約 / 検証結果 / 残課題」を報告する

## PR 説明欄のフォーマット

最低限「変更内容」と「確認リスト」の 2 つの見出しを作る。

```markdown
## 変更内容

- 何をどう変えたかを箇条書きで書く（ファイル名や型名など具体名を含める）

## 確認リスト

- [x] 実施済みの検証（例: `pnpm lint` でエラーがないことを確認）
- [ ] レビュアーや自分が後から確認すべき項目
```

- 実施していない検証をチェック済みにしない
- 対応する issue がある場合は末尾に `Closes #番号` を付ける

## 安全確認

- 破壊的な操作（ファイル削除、`git reset --hard`、force push など）は実行前に必ず許可を求める
- 自分が作成していないファイルを上書き・削除する前に、内容を確認する
- `.env*` ファイルや秘密情報をコミットしない

## AI エージェントの使い分け

| エージェント | 用途 |
| --- | --- |
| Claude Opus 5.5 | プラン作成、データ層の設計、ドラッグ操作など難しい処理、大規模リファクタリング |
| Claude Sonnet 5.5 | 通常の実装 |
| Codex | コードレビュー。Claude の使用量が 90% を超えた場合は実装も引き継ぐ |

- どのフェーズをどのエージェントが担当するかは、各フェーズのプランに書いてある
- 途中で別のエージェントに引き継ぐときは、フェーズのプランにある完了条件のうち、どこまで済んだかを報告に残す
