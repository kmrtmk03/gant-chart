# 引き継ぎ資料

フェーズごとにセッション（と AI エージェント）を切り替えて進めるための引き継ぎ資料。
**新しいセッションは、作業を始める前にこのファイルを最初に読むこと。** フェーズが終わるたびに「進捗」と「次のセッションへの申し送り」を更新する。

- 最終更新: 2026-10-29（フェーズ 5 の実装完了。更新: Claude Sonnet 5.5）

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
| 2 | [3-phase2-https-pwa-basic-auth.md](3-phase2-https-pwa-basic-auth.md) | Sonnet 5.5 | ✅ 完了（PR #3 を `develop` にマージ済み） |
| 3 | [4-phase3-data-layer.md](4-phase3-data-layer.md) | Opus 5.5 | ✅ 完了（PR #4 を `develop` にマージ済み） |
| 4 | [5-phase4-date-layout-utils.md](5-phase4-date-layout-utils.md) | Sonnet 5.5 | ✅ 完了（PR #5 を `develop` にマージ済み） |
| 5 | [6-phase5-chart-layout.md](6-phase5-chart-layout.md) | Sonnet 5.5 | ✅ 実装完了（ユーザーの確認待ち。下記 4 章） |
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
  - `feat/pwa-basic-auth`: フェーズ 2 で使った作業ブランチ（PR #3 で `develop` にマージ済み）
  - `feat/gantt-data-layer`: フェーズ 3 の作業ブランチ（PR #4 で `develop` にマージ済み）
  - `feat/gantt-utils`: フェーズ 4 の作業ブランチ（PR #5 で `develop` にマージ済み）
  - `feat/gantt-layout`: フェーズ 5 の作業ブランチ（`develop` から作成。PR は未作成）
- フェーズごとの扱い: フェーズごとに `develop` から作業用ブランチを切り（ブランチ名は各フェーズのプラン）、PR は `develop` 宛てにフェーズごとに出す

---

## 4. フェーズ 5 の完了状況

フェーズ 5 は実装完了（ブランチ `feat/gantt-layout`）。フェーズ 6 は未着手。

### フェーズ 5 の確認結果

- `pnpm lint` / `typecheck` / `test`（168 件）/ `build` が成功（`/` は静的にプリレンダリングされる）
- ブラウザ（`pnpm dev:http`）で確認済み: 空の状態 →「サンプルデータを入れる」→ 担当者 → 案件の 2 階層と帯、今日の線、土日祝の色分け、月またぎ、期間の外にはみ出す帯の角（切れた側は丸めない）、折りたたみ、◀ / ▶ での期間移動、横スクロールしても左リストと日付ヘッダーが残る
- **未確認**: 縦スクロール（サンプルデータが少なく画面に収まったため。同じ `position: sticky` の仕組み）、「今日」ボタンの動作、スマホ幅の見た目

### フェーズ 6 以降への申し送り（画面）

- 構成: `GanttChart`（`page.tsx` から置く唯一のコンポーネント）→ `useGanttPage`（`useMembers` / `useProjects` / `useTimelineRange` / `useCollapsedMembers` を束ねる）。コンポーネントは `components/`、フックは `hooks/`、サンプルデータは `devSeed.ts`
- 画面は 1 つのスクロール領域（`.scroller`）の中に CSS Grid で左リスト（`MemberList`）と右タイムライン（`Timeline`）を並べ、日付ヘッダー・左リスト・左上の角を `position: sticky` で固定している。`Timeline` は本体（背景・今日の線・帯）だけで、日付ヘッダーは `TimelineDateHeader` が別に受け持つ。**行の並びと高さは `MemberList` と `Timeline` で同じ**（`MEMBER_ROW_HEIGHT` / `PROJECT_ROW_HEIGHT`）。行を足すときは両方を直す
- **今日の日付は `useSyncExternalStore` で取っている**（サーバー側は null）。`cacheComponents` が有効なため、レンダリング中に `new Date()` を読むと静的シェルに焼き込まれる。日付をレンダリング中に読む処理を足すときは `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md` を読むこと。データの読み込みは `useEffect` 内（クライアント側）で行っている
- `useMembers` / `useProjects` は読み込みと `reloadMembers` / `reloadProjects` だけを持つ。フェーズ 6・7 で追加・編集・削除の操作をここに足す（repository はコンポーネントの外で 1 回だけ作り、`useGanttPage.ts` の先頭で生成して引数で渡している）
- 「案件を追加」「担当者を管理」ボタンの処理は、`useGanttPage` の `addProject` / `manageMembers`（今は空の関数で `TODO:` が付いている）を差し替える。`ProjectBar` はまだクリックできない（フェーズ 6 でサイドパネルを開く、フェーズ 8 でドラッグを足す）
- 「サンプルデータを入れる（開発用）」は担当者が 0 人のときの空の画面にだけ出る（本番ビルドでは出ない）。再度入れたいときはブラウザの localStorage（`gantt:*`）を消す
- `gantt.utils.ts` に追加した関数: `getDayColumns` / `getMonthSegments` / `formatYearMonth` / `groupProjectsByMember`（担当者ごとの案件のまとまり。開始日順）/ `toError`。型は `IDayColumn` / `IMonthSegment` / `IMemberGroup`
- `isRangeOverlapping` は引き続きどこからも呼ばれていない（`getBarLayout` が `null` を返すことで代用している）。使わないなら、フェーズ 9 で削除を検討する
- スタイル: 土日祝の文字色のうち祝日の赤は `TimelineDateHeader.module.scss` に生の色コード（`#e5575b`）を書いてしまっている。`--color-bar-red` と同じ値なので、必要なら `_tokens.scss` に `$color-holiday-text` を足して置き換える
- 開発サーバーを Basic 認証なしで起動するには `BASIC_AUTH_USER= BASIC_AUTH_PASSWORD= pnpm dev:http`（`.env.local` に値があると 401 になるため）

### フェーズ 4 の確認結果

- `pnpm lint` / `typecheck` / `test`（158 件。うち `gantt.utils.test.ts` が 41 件）/ `format:check` / `build` が成功
- プランの完了条件はすべて満たした。画面はまだないので、ブラウザでの手動確認はしていない

### フェーズ 5 以降への申し送り（日付・座標の関数）

- ファイル: `src/features/gantt/gantt.utils.ts`（関数）と `gantt.utils.test.ts`。定数は `gantt.constants.ts` に追加（`DAY_COLUMN_WIDTH` / `MEMBER_ROW_HEIGHT` = 40 / `PROJECT_ROW_HEIGHT` = 36 / `DEFAULT_RANGE_DAYS_BEFORE` / `DEFAULT_RANGE_DAYS` / `RANGE_SHIFT_DAYS` / `DRAG_THRESHOLD_PX`）。行の高さはプランに値がなかったため仮の値で、見た目を見て調整してよい
- `getBarLayout(project, rangeStart, rangeDays)` は表示期間にまったく入らない案件で **`null`** を返す（帯を描かない）。入るときは `{ left, width, isClippedStart, isClippedEnd }`
- `getTodayOffset(rangeStart, rangeDays, today?)` は今日の**列の左端**の px を返す。線を列の中央に引きたいときは `DAY_COLUMN_WIDTH / 2` を足す。表示期間の外は `null`
- `pxToDays` は半分ちょうどを 0 から遠い側に丸める（+16px → 1、-16px → -1）。`Math.round` だと負の側が非対称になるため
- `resizeProjectDates(project, "start" | "end", days)` は追い越しそうなとき反対側の端で止める（最短 1 日）。ドラッグ側で別途ガードしなくてよい
- `parseDateString` は読めない文字列と、桁数が足りない形式（"2026-1-5" など）で `RangeError` を投げる。repository と型ガードを通った値だけを渡す前提
- `isRangeOverlapping` はフェーズ 4 の時点でどこからも呼ばれていない。`getBarLayout` の範囲外判定（`null`）と条件が重なるので、フェーズ 5 で使い方が決まったら片方に揃える（PR #5 のレビュー指摘）
- 祝日名はライブラリの表記のまま（例: 2026-05-06 は「こどもの日 振替休日」）。ツールチップなどに出すときは `getHolidayName`
- `@holiday-jp/holiday_jp` は `export =` 形式のため `import holiday_jp from "..."` で読み込む（`esModuleInterop` で動作確認済み）。データに収録されている年の範囲外は祝日扱いにならない

### フェーズ 3 の確認結果

- `pnpm lint` / `typecheck` / `test`（117 件。うち型ガード 49 件・repository 40 件）/ `format:check` / `build` が成功
- プランの完了条件はすべて満たした（repository の全メソッドのテスト、型と repository だけでの追加・編集・削除、lint / typecheck / test）
- 画面はまだないので、ブラウザでの手動確認はしていない（フェーズ 5 以降で確認する）

### フェーズ 4 以降への申し送り（データ層）

- ファイル: `src/features/gantt/` の `gantt.type.ts` / `gantt.constants.ts` / `gantt.guards.ts`、`repositories/` の `ganttRepository.type.ts`（インターフェース）/ `ganttRepository.errors.ts`（エラー）/ `localStorageRepository.ts` / `createGanttRepository.ts`
- フックからは `createGanttRepository()` で取得する。`LocalStorageRepository` は `window.localStorage` を**メソッドが呼ばれた時点で**取りにいくので、生成だけならサーバー側でもエラーにならない。メソッドをサーバー側で呼ぶとエラーになるため、読み込みは `useEffect` などクライアント側で行う
- エラー: 存在しない id → `GanttNotFoundError`（`entity` と `id` を持つ）。案件の `memberId` が存在しない担当者のときも `GanttNotFoundError`。開始日 > 終了日・実在しない日付などの不正な入力 → `GanttValidationError`。保存データのスキーマがアプリより新しいとき → すべてのメソッドが `GanttUnsupportedSchemaError`（読み書きの両方を止めて元のデータを保つ。画面側では「アプリを最新にしてください」と案内する想定）
- 担当者の削除（担当者と案件の 2 キーの書き換え）は、途中で書き込みに失敗したら書き込み済みのキーを操作前の値に戻してからエラーを投げる（`writeAllOrRestore`）。復元にも失敗したときは `AggregateError`
- プランからの小さな変更点
  - `IProject.startDate` / `endDate` は `TDateString`、`color` は `TBarColor` にした（全体プランでは `string`）
  - 更新用の型は `TMemberUpdate = Partial<TMemberInput>` / `TProjectUpdate = Partial<TProjectInput>` とし、対象の `id` はメソッドの第 1 引数で渡す（プランの「`id` との組み合わせ」はインターフェースの引数で表した）
  - `isProject` は「開始日 ≦ 終了日」も検証する（帯の幅が負になるのを読み込み時点で防ぐため）
  - 帯の色の実際の値は `_tokens.scss` に `--color-bar-*` として追加した（`BAR_COLORS[key].cssVariable` で参照できる）
- **名前の必須チェックは画面側の責務**。`isMember` / `isProject` と repository は名前が文字列かどうかしか見ないので、空文字や空白だけの案件名・担当者名も保存できる。フェーズ 6（サイドパネル）・フェーズ 7（担当者管理）で、前後の空白を除いて空なら保存できないようにする
- `listProjects` は保存順（作成順）で返す。並び替えが必要なら画面側で行う
- 壊れたデータを読んだときは配列ごと捨てて空から始め、元の値をコンソールの警告に出す。次に書き込むと元のデータは上書きされる（身内利用なので許容。必要ならフェーズ 9 でバックアップを検討）
- localStorage の容量超過（`QuotaExceededError`）は握りつぶさずそのまま投げる。画面側でエラー表示するかはフェーズ 6 以降で決める
- **画面確認の注意**: ID の生成に使う `crypto.randomUUID()` は HTTPS か `localhost` でしか使えない。`pnpm dev:http` に LAN の IP で接続する（スマホ実機での確認など）と、担当者・案件の追加で `TypeError` になる。実機で確認するときは `pnpm dev`（HTTPS）を使う（`localStorageRepository.ts` の `generateId` にも `MEMO:` あり）
- テストはメモリ上の `Storage` のモックを渡す方式にした（jsdom は入れていない。`vitest.config.mts` のコメントも更新済み）

### フェーズ 2 の確認結果

- 自動で確認できたこと: `pnpm lint` / `typecheck` / `test`（21 件）/ `format:check` / `build` が成功。`https://localhost:3000` が証明書の検証エラーなしで開ける。Basic 認証は curl で、認証なし・誤り → 401（`WWW-Authenticate` 付き）、正しい資格情報 → 200、環境変数未設定 → 開発 200 / 本番 401 を確認。`manifest.webmanifest` / アイコン / `sw.js` のヘッダーとセキュリティヘッダーも確認
- ユーザーが Chrome で確認済み: 本番ビルド（`pnpm build` → `pnpm start`、`http://localhost:3000`）でインストールアイコンが表示される。`next start` には `--experimental-https` がないが、`localhost` なら HTTP でも Service Worker の登録とインストールができる
- **ユーザーの手動確認が残っている**: インストール後のアプリのウィンドウでの起動

### フェーズ 2 からの申し送り（引き続き有効）

- `src/proxy.ts` に Basic 認証を実装。解析・比較の関数（`parseBasicAuthHeader` / `isSafeEqual` / `isAuthorized`）は同じファイルから export し、`src/proxy.test.ts` でテストしている。ID とパスワードは `.env.local` の `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`（`.env.example` にひな形あり）
- **manifest とアイコンは Basic 認証の対象外**（`src/proxy.ts` の `matcher`）。ブラウザは manifest とアイコンを資格情報なしで取得するため、認証をかけるとインストールアイコンが出ない（フェーズ 2 の途中で判明。プランの当初の想定は誤りだったため修正済み）。静的ファイルを `public/` に足すときも、認証が必要かどうかを同じ観点で判断する
- PWA: `src/app/manifest.ts`、`public/sw.js`（fetch を持たない最小構成）、`src/app/ServiceWorkerRegister.tsx`（本番ビルドのときだけ登録）。アイコンは `scripts/generate-icons.mjs` で生成できる（`node scripts/generate-icons.mjs`）。デザインはシンプルな帯の図形で、希望があれば作り直す
- `typecheck` は `next typegen && tsc --noEmit`（`LayoutProps` の型が生成物のため）
- mkcert は導入済みで、`certificates/` に証明書がある（`.gitignore` 済み）
- フェーズ 1 の申し送り（`packageManager` の削除、`.prettierignore`、`vitest.config.mts`、Sass の `loadPaths` など）は引き続き有効

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

- 次にやること: **フェーズ 6**（[7-phase6-project-side-panel.md](7-phase6-project-side-panel.md)）。その前に、フェーズ 5（`feat/gantt-layout`）の確認・PR・`develop` へのマージを済ませる。`develop` から作業用ブランチを切って始める
- 担当: Sonnet 5.5
- 始め方: 新しいセッションで、次のように依頼すれば再開できる

  ```
  .plan/handoff.md を読んで、フェーズ 6 を進めてください。
  ```
