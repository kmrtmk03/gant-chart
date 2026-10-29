# 引き継ぎ資料

フェーズごとにセッション（と AI エージェント）を切り替えて進めるための引き継ぎ資料。
**新しいセッションは、作業を始める前にこのファイルを最初に読むこと。** フェーズが終わるたびに「進捗」と「次のセッションへの申し送り」を更新する。

- 最終更新: 2026-10-29（フェーズ 1 の開始前。作成: Claude Opus 5.5）

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
| 1 | [2-phase1-project-setup.md](2-phase1-project-setup.md) | Sonnet 5.5 | 🟡 一部着手（雛形と依存の導入のみ。下記 4 章） |
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
  - `main`: 最初のコミット（要件の下書きと全体プラン）だけ
  - `feat/gantt-chart-mvp`: 現在の作業ブランチ。`origin` を追跡している
- フェーズごとのブランチの扱い: フェーズ 1 は `feat/gantt-chart-mvp` のまま続ける（ユーザーに伝えてある）。フェーズ 2 以降で別ブランチを切るか、PR をどの単位で出すかは、まだ決めていない。フェーズ 1 の完了時にユーザーへ確認する

---

## 4. フェーズ 1 の着手状況（ここから再開する）

### 済んでいること（コミット `624c1b7`）

- `create-next-app@16.4.3` で一時フォルダに雛形を作り、次のファイルだけをコピーした
  - `package.json`（name を `gant-chart` に変更済み）/ `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `tsconfig.json` / `eslint.config.mjs` / `next.config.ts` / `.gitignore` / `src/app/favicon.ico`
- 導入済みの依存
  - dependencies: `next@16.4.3` / `react@19.3.0` / `react-dom@19.3.0` / `date-fns@4.4.0` / `@holiday-jp/holiday_jp@2.5.2`
  - devDependencies: `sass` / `prettier` / `eslint-config-prettier` / `vitest@5.0.5` / `@types/node@24`（vitest 5 が Node の型 22 以上を要求するため 20 から上げた）/ ESLint・TypeScript 関連
- 一度入れた `@serwist/next` / `serwist` は削除済み（PWA の方針変更のため。全体プラン 3 章）

### まだやっていないこと

- **`src/app/layout.tsx` と `src/app/page.tsx` がない**ので、まだ `pnpm dev` で起動できない。プランの「1. Next.js の雛形」に沿って新しく作る
  - 雛形の `layout.tsx` は `LayoutProps<"/">` という Next.js 16 の型を使っていた（`export default function RootLayout({ children }: LayoutProps<"/">)`）。同じ書き方に合わせる
- `pnpm-workspace.yaml` の `allowBuilds` に、pnpm が `'@parcel/watcher': set this to true or false` という**仮の行**を書き込んだまま。`sass` が使うファイル監視の部品なので、値を決める
- プランの 2〜8 の作業はすべて未着手（tsconfig の調整、Sass の土台、Prettier、Vitest、スクリプト、pnpm 以外の禁止、`.gitignore` の追記）

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

- 次にやること: **フェーズ 1 の残り**（上の 4 章「まだやっていないこと」）
- 担当: Sonnet 5.5
- 始め方: 新しいセッションで、次のように依頼すれば再開できる

  ```
  .plan/handoff.md を読んで、フェーズ 1 の続きを進めてください。
  ```

- フェーズ 1 を終えるときにやること
  1. プランの完了条件をすべて確認し、結果を報告する
  2. このファイルの「進捗」「4 章」「7 章」を更新する（4 章はフェーズ 2 の着手状況に書き換える）
  3. ブランチと PR の分け方（3 章）をユーザーに確認する
