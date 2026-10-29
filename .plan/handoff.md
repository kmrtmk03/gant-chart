# 引き継ぎ資料

フェーズごとにセッション（と AI エージェント）を切り替えて進めるための引き継ぎ資料。
**新しいセッションは、作業を始める前にこのファイルを最初に読むこと。** フェーズが終わるたびに「進捗」と「次のセッションへの申し送り」を更新する。

- 最終更新: 2026-10-29（フェーズ 1 の実装完了。更新: Claude Sonnet 5.5）

---

## 1. 読む順番

1. このファイル
2. [AGENTS.md](../AGENTS.md)（全エージェント共通の規約。Claude は [CLAUDE.md](../CLAUDE.md) 経由で読み込まれる）
3. [1-gantt-chart-mvp.md](1-gantt-chart-mvp.md)（全体プラン。0 章の確定事項と前提、2 章のデータ設計は必読）
4. これから担当するフェーズのプラン（下の「進捗」の表を参照）

要件の原文は [指示下書き/下書きメモ.md](../指示下書き/下書きメモ.md)。全体プランに反映済みなので、通常は読まなくてよい。

---

## 2. 進捗

| フェーズ | プラン | 担当 | 状態 |
| --- | --- | --- | --- |
| 準備 | 全体プラン・AGENTS.md・CLAUDE.md | Opus 5.5 | ✅ 完了 |
| 1 | [2-phase1-project-setup.md](2-phase1-project-setup.md) | Sonnet 5.5 | ✅ 実装完了（ユーザーの確認待ち。下記 4 章） |
| 2 | [3-phase2-https-pwa-basic-auth.md](3-phase2-https-pwa-basic-auth.md) | Sonnet 5.5 | ⬜ 未着手 |
| 3 | [4-phase3-data-layer.md](4-phase3-data-layer.md) | Opus 5.5 | ⬜ 未着手 |
| 4 | [5-phase4-date-layout-utils.md](5-phase4-date-layout-utils.md) | Sonnet 5.5 | ⬜ 未着手 |
| 5 | [6-phase5-chart-layout.md](6-phase5-chart-layout.md) | Sonnet 5.5 | ⬜ 未着手 |
| 6 | [7-phase6-project-side-panel.md](7-phase6-project-side-panel.md) | Sonnet 5.5 | ⬜ 未着手 |
| 7 | [8-phase7-member-management.md](8-phase7-member-management.md) | Sonnet 5.5 | ⬜ 未着手 |
| 8 | [9-phase8-bar-drag.md](9-phase8-bar-drag.md) | Opus 5.5 | ⬜ 未着手 |
| 9 | [10-phase9-polish-review.md](10-phase9-polish-review.md) | Sonnet 5.5 / Codex | ⬜ 未着手 |

---

## 3. リポジトリの状態

- GitHub: https://github.com/kmrtmk03/gant-chart（`origin`。owner は `kmrtmk03`、repo は `gant-chart`）
- ブランチ
  - `main`: フェーズ 1 の PR（#1）をマージ済み。直接作業しない
  - `develop`: 開発のベースブランチ（2026-10-29 に `main` から作成）。作業用ブランチはここから切り、PR のマージ先もここにする
  - `feat/gantt-chart-mvp`: フェーズ 1 で使った作業ブランチ（マージ済み）
- フェーズごとの扱い: フェーズごとに `develop` から作業用ブランチを切り（ブランチ名は各フェーズのプラン）、PR は `develop` 宛てにフェーズごとに出す

---

## 4. フェーズ 2 の着手状況

フェーズ 1 は完了（`pnpm lint` / `typecheck` / `test` / `format:check` / `build` 成功、`npm install` は EBADDEVENGINES で停止、`@use "tokens"` は globals.scss で動作確認済み）。フェーズ 2 は未着手。

### フェーズ 2 への申し送り（フェーズ 1 で分かったこと）

- `pnpm dev`（`--experimental-https`）は mkcert の `-install` が**パスワード入力（sudo）を要する**ため、自動実行では失敗して HTTP にフォールバックする（`certificates/` は空）。フェーズ 2 では、ユーザーに `brew install mkcert` と `mkcert -install` の実行を依頼するか、手順を相談する
- `packageManager` フィールドは削除し、`devEngines.packageManager`（`version: 11.5.2`）に統一した。両方あると pnpm が警告を出すため（プランからの変更点）
- `.prettierignore` に `AGENTS.md` / `CLAUDE.md` を追加した（`next dev` が書き戻すブロックを Prettier が整形してしまうため）
- `vitest.config.ts` は `.mts` にした（CommonJS 扱いの警告を避けるため）
- `pnpm-workspace.yaml` の `@parcel/watcher` は `true` にした。`engineStrict: true` も追加済み
- Sass は `sassOptions.loadPaths`（`src/styles`）で `@use "tokens"` を解決する

---

## 5. 調べて分かったこと（再調査しなくてよい）

### 環境

| 項目 | 値 |
| --- | --- |
| Node.js | v24.22.1 |
| pnpm | 11.5.2（`packageManager` に記載済み） |
| npm | 11.19.1（`devEngines` を検査できる） |
| yarn | 入っていない |
| Corepack | 0.36.0 |
| mkcert | 入っていない（`next dev --experimental-https` が自動で用意する想定。失敗したら `brew install mkcert` をユーザーに依頼） |

### Next.js 16.4 について（`node_modules/next/dist/docs/` で確認済み）

- `middleware.ts` は廃止され、`proxy.ts`（`export function proxy`）になった。`src/` 構成なら `src/proxy.ts`（`03-api-reference/03-file-conventions/proxy.md`）
- `matcher` を指定しないと、静的ファイルにも proxy が走る
- 雛形の `next.config.ts` で `cacheComponents: true` と `partialPrefetching: true` が有効。Client Component や `Suspense` の書き方は、これを前提にドキュメントで確認する
- PWA の公式ガイド（`02-guides/progressive-web-apps.md`）は `app/manifest.ts` と自前の Service Worker の組み合わせ。オフラインキャッシュまで必要なときだけ Serwist を勧めている
- ローカル HTTPS は `next dev --experimental-https`（`03-api-reference/06-cli/next.md`）
- Sass の設定は `02-guides/sass.md` にある（まだ読んでいない。フェーズ 1 で読む）
- `next dev` を起動すると、`AGENTS.md` の先頭にある `<!-- BEGIN:nextjs-agent-rules -->` 〜 `<!-- END:nextjs-agent-rules -->` のブロックが自動で書き戻される。ブロックの外は書き換えられないので、ブロックはそのまま残してコミットする

---

## 6. ユーザーの進め方の希望

- **実装を始める前に必ず確認を取る。** 「プランを作って」と言われたときに実装まで進めない（一度、確認前に雛形づくりを始めてしまい止められた）
- フェーズごとにセッションを切り替える。フェーズが終わったら、このファイルを更新してから終える
- 各フェーズの終わりにユーザーの確認を受け、OK が出たら次のフェーズへ進む
- 区切りの良いところでコミットしてよい（ユーザーの了承済み）。**push は依頼されたときだけ**行う
- 回答・成果物はすべて日本語

---

## 7. 次のセッションへの申し送り

- 次にやること: **フェーズ 2**（[3-phase2-https-pwa-basic-auth.md](3-phase2-https-pwa-basic-auth.md)）。`develop` から作業用ブランチを切って始める
- 担当: Sonnet 5.5
- 始め方: 新しいセッションで、次のように依頼すれば再開できる

  ```
  .plan/handoff.md を読んで、フェーズ 2 を進めてください。
  ```
