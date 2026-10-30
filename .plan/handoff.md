# 引き継ぎ資料

フェーズごとにセッション（と AI エージェント）を切り替えて進めるための引き継ぎ資料。
**新しいセッションは、作業を始める前にこのファイルを最初に読むこと。** フェーズが終わるたびに「進捗」と「次のセッションへの申し送り」を更新する。

- 最終更新: 2026-10-30（フェーズ 11 の PR #20 が `develop` にマージされた。更新: Claude Sonnet 5.5）（その前: フェーズ 10 の PR #17 が `develop` にマージされた。仕上げの前に、画面の使い勝手の調整をフェーズ 11 として追加し、プラン [12-phase11-ui-adjustments.md](12-phase11-ui-adjustments.md) を作成した。仕上げはフェーズ 12 に繰り下げた。更新: Claude Opus 5.5）

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
| 1 | [2-phase1-project-setup.md](2-phase1-project-setup.md) | Sonnet 5.5 | ✅ 完了（PR #1 を `main` にマージ済み） |
| 2 | [3-phase2-https-pwa-basic-auth.md](3-phase2-https-pwa-basic-auth.md) | Sonnet 5.5 | ✅ 完了（PR #3 を `develop` にマージ済み） |
| 3 | [4-phase3-data-layer.md](4-phase3-data-layer.md) | Opus 5.5 | ✅ 完了（PR #4 を `develop` にマージ済み） |
| 4 | [5-phase4-date-layout-utils.md](5-phase4-date-layout-utils.md) | Sonnet 5.5 | ✅ 完了（PR #5 を `develop` にマージ済み） |
| 5 | [6-phase5-chart-layout.md](6-phase5-chart-layout.md) | Sonnet 5.5 | ✅ 完了（PR #6 を `develop` にマージ済み。下記 4 章） |
| 6 | [7-phase6-project-side-panel.md](7-phase6-project-side-panel.md) | Sonnet 5.5 | ✅ 完了（PR #7 を `develop` にマージ済み。下記 4 章） |
| 7 | [8-phase7-member-management.md](8-phase7-member-management.md) | Sonnet 5.5 | ✅ 完了（PR #11 を `develop` にマージ済み。下記 4 章） |
| 7.5 | デザイン調整（プランなし。下記 4-0 章） | Opus 5.5 | ✅ 完了（PR #12 を `develop` にマージ済み） |
| 8 | [9-phase8-bar-drag.md](9-phase8-bar-drag.md) | Opus 5.5 | ✅ 完了（PR #13 を `develop` にマージ済み。下記 4-00 章） |
| 9 | [10-phase9-drag-reorder.md](10-phase9-drag-reorder.md) | Opus 5.5 | ✅ 完了（PR #15 を `develop` にマージ済み。下記 4-000 章） |
| 10 | [11-phase10-project-complete.md](11-phase10-project-complete.md) | Sonnet 5.5（実際は Opus 5.5 が担当） | ✅ 完了（PR #17 を `develop` にマージ済み。下記 4-0000 章） |
| 11 | [12-phase11-ui-adjustments.md](12-phase11-ui-adjustments.md) | Sonnet 5.5 | ✅ 完了（PR #20 を `develop` にマージ済み。下記 4-00000 章） |
| 12 | [13-phase12-polish-review.md](13-phase12-polish-review.md) | Sonnet 5.5 / Codex | ⬜ 未着手（旧フェーズ 9 → 11 → 12） |

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
  - `feat/gantt-layout`: フェーズ 5 の作業ブランチ（PR #6 で `develop` にマージ済み）
  - `feat/gantt-side-panel`: フェーズ 6 の作業ブランチ（PR #7 で `develop` にマージ済み）
  - `feat/gantt-member-management`: フェーズ 7 の作業ブランチ（PR #11 で `develop` にマージ済み）
  - `style/dark-modern-theme`: デザイン調整（ダークテーマ化）の作業ブランチ（PR #12 で `develop` にマージ済み）
  - `feat/gantt-bar-drag`: フェーズ 8 の作業ブランチ（PR #13 で `develop` にマージ済み）
  - `claude/wonderful-newton-0x0jvh`: フェーズ 9 の作業ブランチ（クラウドのセッションで指定されたブランチ名のため、プランの `feat/gantt-drag-reorder` ではない。`develop` の d9620d1 から作成。PR #15 で `develop` にマージ済み）
  - `claude/nice-brown-di5gxi`: フェーズ 10 の作業ブランチ（クラウドのセッションで指定されたブランチ名のため、プランの `feat/gantt-project-complete` ではない。`develop` の 0c752eb から作成。PR #17 で `develop` にマージ済み）
- フェーズごとの扱い: フェーズごとに `develop` から作業用ブランチを切り（ブランチ名は各フェーズのプラン）、PR は `develop` 宛てにフェーズごとに出す

---

## 4-00000. フェーズ 11 の実装状況

フェーズ 11 は完了（ブランチ `feat/gantt-ui-adjustments`、PR #20 を `develop` にマージ済み）。8 点すべて実装し、ブラウザで確認し、ユーザーの確認も済んでいる。

- 検証: `pnpm lint` / `typecheck` / `test`（280 件）/ `format:check` / `build` が成功
- ブラウザ（Playwright ではなくアプリ内ブラウザ、`pnpm dev:http`、800×600 と 1280×800）で確認済み: 土曜は青・日曜と祝日は赤、月の区切り線、文字 16px、「案件を追加」行いっぱいのクリック、空きのクリックでパネルが閉じる（帯・ボタン・ヘッダーでは閉じない。帯を空きへドラッグして離しても閉じない）、状態の欄と下部 1 段のボタン、カレンダー（クリックで開く・矢印キーと Enter で選ぶ・Esc でカレンダーだけ閉じる・外側クリックで閉じる・右寄せで終了日が収まる）
- **未確認**: 「今日」の瞬時移動の目視（コードのみ）、375px 幅の見た目、タッチ操作、完了済みの案件での状態の欄の見た目、カレンダーがパネルの高さに収まらない低い画面での挙動（フォームがスクロールして対応）
- 決めたこと
  - 文字サイズ: トークン名は残し値だけ変更（`xs` / `sm` / `md` = 16px、`lg` = 18px）。差分を小さくするため
  - 土日祝: `IDayColumn` に `isSaturday` / `isMonthStart` を追加。トークンは `$color-saturday` / `$color-saturday-text` / `$color-holiday`（日曜・祝日）/ `$color-month-divider`。`$color-weekend` は削除
  - 月の区切り: `box-shadow: inset 2px 0 0` で列の幅を変えずに描く（タイムラインと日付ヘッダーの両方）
  - 「今日」: `scrollToPosition(target, behavior)` に引数を足した。`scrollToToday` は `"instant"`、月の移動は `"smooth"`
  - パネルを閉じる: `useGanttChart.handleScrollAreaClick`。`button, a, input, select, textarea` の中なら閉じない（帯のデータ属性は不要だった）
  - サイドパネル: 「状態」の欄をフォーム最上部に置き、見出しの札は廃止。下部は削除／キャンセル・保存の 1 段で、項目の領域（`.body`）だけがスクロールする
  - カレンダー: `react-day-picker` 10.0.2（`@daypicker/react` が新しい名前で、README はこちらを勧めているが API は同じ。ユーザーの承認はこの名前）。`components/DateField/`。既定の `style.css` を読み込み、`--rdp-*` と `button` の既定スタイルを `DateField.module.scss` で上書き。**Esc は `event.nativeEvent.stopImmediatePropagation()` で止める**（Next.js は React のルートを `document` に置くため、`stopPropagation` ではパネルの document リスナーが止まらなかった）。ボタンの検証エラー表示は `aria-invalid` ではなく `data-invalid`（lint の a11y 警告のため）
- PR #20 のレビュー対応（6 件。セルフレビュー 4 件と追加の 2 件）
  - 375px・360px 幅でヘッダーがはみ出していた（16px にしたため）: 480px 以下でバーの左右の余白と ◀ 今日 ▶ の余白を詰め、400px 以下でさらに詰めた。375px・360px で `scrollWidth` がビューポートと一致することを確認
  - Tab でカレンダーの外へ出ても開いたままだった、その後の Esc でパネルが閉じる: `DateField` のルートに `onBlur` を付け、移り先がルートの外のノードのときだけ閉じる（移り先が null のときは閉じない）
  - 保存・削除の実行中に、空きのクリック・✕・別の案件の帯・「案件を追加」でパネルが閉じる／切り替わる: `useSidePanel` の `runWhileBusy` の中は、開く・閉じる・切り替えをすべて受け付けない（ref で持つ）。成功後の閉じる処理は `runWhileBusy` が終わってから呼ぶ。**遅い保存は再現できないため、実行中の抑止そのものは画面では確かめていない**（失敗時にパネルが開いたままエラーが出ること、その後に閉じられること、通常の保存で閉じることは確認済み）
  - 文字サイズのトークンを `$font-size-base`（16px）と `$font-size-lg`（18px）にまとめ、`xs` / `sm` / `md` の参照を置き換えた
- 動作確認のため、ブラウザの localStorage のサンプルを変更した（「Web サイト改修 v2」を 11/3〜11/9 に）。戻すには `gantt:*` を消して「サンプルデータを入れる」
- 作業中に開発サーバー（`pnpm dev` の HTTPS、Basic 認証あり）をユーザーの許可を得て止めた。再開はユーザーが行う

## 4-0000. フェーズ 10 の完了状況

フェーズ 10 は完了（ブランチ `claude/nice-brown-di5gxi`、PR #17 を `develop` にマージ済み）。プランの完了条件はすべて満たし、ユーザーの確認も済んでいる。

### フェーズ 10 の確認結果

- `pnpm lint` / `typecheck` / `test`（279 件）/ `format:check` / `build` が成功
- ブラウザ（クラウドのセッションの Playwright + `pnpm dev:http`。1280×800、マウス）で確認済み:
  - スキーマ 2 のデータ（completedAt のない案件 4 件）を読むと、全件が未完了（`completedAt: null`）として表示され、バージョン 3 として保存される
  - サイドパネルで案件名を変えてから「完了にする」→ 名前の変更と完了が 1 回で保存され、パネルが閉じ、左のリスト・帯から消える。担当者行の件数も表示している件数（3件）になる。ヘッダーのボタンが「完了済みを表示（1）」になる
  - 完了済みを隠したまま、末尾の D を先頭へドラッグ → 保存された並びは `D, A, B（完了）, C`（プランの例のとおり）
  - 「完了済みを表示」を押すと `aria-pressed="true"` になり主色の見た目になる。完了済みの案件が ✓ 付き・薄い文字で左のリストに出て、帯は透明度 0.4 になる
  - 完了済みの案件を開くと見出しの横に「完了済み（10/30）」、フッターに「未完了に戻す」が出る。そのまま「表示しない」に切り替えてもパネルは開いたまま。「未完了に戻す」でパネルが閉じ、表示しない状態でも再び表示される
  - 再読み込みすると、完了の状態は残り、切り替えボタンは「表示しない」に戻る
  - 担当者の管理ダイアログの削除の確認は、完了済みを隠していても完了済みを含めた件数（「案件 3 件も一緒に削除されます」）になる
  - 確認中に見つけた問題を修正済み: サイドパネル（`position: fixed; top: 0`）がヘッダーの右端の切り替えボタンを覆い、パネルを開いたまま切り替えられなかった（パネルをヘッダーの下から出すようにした。`$header-height` を `_tokens.scss` に追加）。フッターにボタンが 4 つ並ぶと「保存」が折り返したため、「完了にする / 未完了に戻す」をほかのボタンの上の 1 行に置いた
- PR #17 のセルフレビュー対応（4 件。各コメントに返信済み）: 375px でヘッダーがはみ出していた（480px 以下はボタンを「完了済み（N）」に縮め、タイトルを隠す。`$breakpoint-narrow` を追加）/ 完了済みの帯は編集中・ドラッグ中だけ元の濃さに戻す / 完了済みの件数は担当者が見つかる案件だけで数える / 並び替えた案件が手元の一覧に見つからないときは保存せず「案件の一覧が古くなっています。…」を出す
- **未確認**: タッチ操作、スマホ幅のヘッダー以外の見た目、まとめ帯の完了済みの見た目（透明度 0.15）の目視での調整、完了の保存に失敗したときのパネル内のエラー表示（保存と同じ `runSubmit` を通しているので同じ表示になる想定）

### フェーズ 11 以降への申し送り（完了）

- フェーズ 11 でサイドパネルの「完了にする / 未完了に戻す」の置き場所と、見出しの札を「状態」の欄へ移す予定（[12-phase11-ui-adjustments.md](12-phase11-ui-adjustments.md) の 7 章）。下の動き（`onSubmit(input, isCompleted?)`・保存と同じ検証）は変えない

- データ: `IProject.completedAt`（ISO 8601 か null）。`TProjectInput` に含めず、`TProjectUpdate` の `isCompleted?: boolean` で切り替える（true: 未完了なら今の日時、すでに完了なら変えない / false: null / 省略: 変えない）。日時を付けるのは repository（`resolveCompletedAt`）。`isProject` は completedAt が null か日時の文字列であることを求める
- 移行: `localStorageMigrations.ts` の `migrateSchemaV2ToV3`（`SCHEMA_MIGRATIONS` の `2:`）。「バージョン 2 の案件」は sortOrder が数値であることだけで確かめる（今の isProject は使わない）。壊れたデータは書き換えない
- 表示の切り替え: `hooks/useCompletedVisibility.ts`（保存しない）。`useGanttPage` が `allMemberGroups`（完了済みを含む全体）と `memberGroups`（画面に出すもの。隠すときは `excludeCompletedProjects` で 1 か所で取り除く）を返す。**担当者の管理ダイアログには `allMemberGroups` を渡している**（削除の件数・並び替えの全 id のため）。`completedVisibility`（`isVisible` / `completedCount` / `toggle`）を公開し、`GanttHeader` の右端のトグル（`aria-pressed`）に渡す。文言は `GanttHeader/ganttHeader.utils.ts` の `formatCompletedToggleLabel`
- 並び替え: `useDragReorder` の `onReorder` に、動かした id（`movedId`）を 2 つ目の引数として足した（並びの比較だけでは、隣どうしの入れ替えでどちらを動かしたか決められず、隠れた案件の置き場所が変わるため）。`useGanttPage.handleReorderProjects(memberId, orderedVisibleIds, movedId)` が `moveIdAmongVisible`（`gantt.utils.ts`）で全体の並びに戻してから `reorderProjects` に渡す。管理ダイアログは 2 つ目の引数を使わない
- サイドパネル: `onSubmit(input, isCompleted?)`。`useProjectForm.handleToggleCompleted` が保存と同じ検証を通し、`isCompleted` を付けて 1 回で保存する。見出しの札は `formatCompletedLabel`（端末のタイムゾーンで M/d）。パネルは `top: $header-height`（ヘッダーの下）から出すようにした
- 見た目のトークン: `$color-success` / `$color-success-soft`（✓・札）、`$opacity-completed-bar`（0.4）/ `$opacity-completed-summary-bar`（0.15）/ `$opacity-completed-text`（0.55）、`$header-height`（52px）。帯の `title` の末尾に「【完了済み】」を付けた
- 完了済みの案件も、帯のドラッグ・クリック・並べ替えは未完了と同じようにできる（特別な扱いはしていない）

## 4-000. フェーズ 9 の完了状況

フェーズ 9 は完了（ブランチ `claude/wonderful-newton-0x0jvh`、PR #15 を `develop` にマージ済み）。プランの完了条件はすべて満たし、ユーザーの確認も済んでいる。フェーズ 10 は未着手。

### フェーズ 9 の確認結果

- `pnpm lint` / `typecheck` / `test`（255 件。うち `dragReorder.utils.test.ts` が 22 件、`localStorageRepository.test.ts` に並び替え・移行のテストを追加）/ `format:check` / `build` が成功
- ブラウザ（クラウドのセッションの Playwright + `pnpm dev:http`。1280×800、マウス）で確認済み:
  - 案件のつかみをドラッグすると同じ担当者の中で並べ替えられ、localStorage の `sortOrder` が更新され、再読み込みしても残る。右のタイムラインの帯（まとめ帯を含む）も同じ順になる
  - 担当者の範囲の外（下の担当者の行まで）へ引っぱっても、その担当者の末尾で止まる
  - ドラッグ中の Esc で元の並びに戻る。サイドパネルを開いたままでも、パネルは閉じない。案件名のクリックでパネルが開く。つかみのクリックだけでは何も起きない
  - 管理ダイアログに ↑ / ↓ ボタンがなく、つかみのドラッグで担当者を並べ替えられる。左のリストにも反映され、再読み込みしても残る。ドラッグ中の Esc でダイアログは閉じない（ドラッグだけ取り消す）
  - 管理ダイアログで名前を編集中につかんでドラッグすると、名前の保存と並び替えの両方が 1 回の操作で反映される（プランでは「一度離してつかみ直す」想定だったが、下の preventDefault の扱いで不要になった）
  - スキーマ 1 のデータ（`sortOrder` のない案件 3 件、保存順は開始日順でない）を読むと、開始日順の `sortOrder` が付き、バージョン 2 として保存される
  - 保存に失敗させる（`Storage.prototype.setItem` を例外にする）と、元の並びに戻り、左下に「並び順を保存できませんでした。…」が出る。「閉じる」で消える
  - PR #15 のセルフレビュー対応の後: ドラッグ中に名前の検証エラーが出て行が高くなっても、見た目どおりの位置に落ちる（修正前は 1 つずれることを同じ操作で確認済み）。ポインターを止めたままスクロール領域をスクロールしても、つかんだ行はポインターの下に残り、落とす先もスクロールした分だけ変わる
- **未確認**: タッチ操作（スマホ・タブレット実機）、スマホ幅の見た目、管理ダイアログに担当者が多くダイアログ内がスクロールする場合（ダイアログ自体のスクロール量も差し引く実装にはしてある）

### フェーズ 10 以降への申し送り（並び替え）

- データ: `IProject.sortOrder`（担当者ごとに 0 から。0 以上の整数を `isProject` で検証）。`TProjectInput` / `TProjectUpdate` には含めない。並びを変えるのは `IGanttRepository.reorderProjects(memberId, orderedIds)` だけ（その担当者の案件の id を過不足なく。足りない・重複・別の担当者の案件・存在しない id は `GanttValidationError`、担当者がいなければ `GanttNotFoundError`）。`createProject` と、担当者を付け替える `updateProject` は付け替え先の一番下に入れる（付け替え元は詰め直さない）
- スキーマの移行は `repositories/localStorageMigrations.ts` に置いた（`migrateSchemaV1ToV2`）。**今の型・型ガードを使わず、移行元の構造で確かめる**こと、repository のメソッドを呼ばないことをファイルの先頭に書いてある。フェーズ 10 の 2 → 3 も同じファイルに足し、`localStorageRepository.ts` の `SCHEMA_MIGRATIONS` に `2:` を登録する。移行の確かめ方は「並び順を決めるのに使うフィールド（memberId・startDate・endDate）が文字列か」だけにした（ほかのフィールドは触らないので、不正なら移行後の読み込みで既存の扱いになる）
- 画面の並び: `groupProjectsByMember` が `sortOrder` の昇順（同じなら開始日順 → id 順）に並べる。左のリスト・タイムライン・まとめ帯はどれも `memberGroups` を使うので順がそろう
- 共通のフック `hooks/useDragReorder.ts`（計算は `hooks/dragReorder.utils.ts`）。渡された `ids` だけを扱い、`onReorder` にもそれを並べ替えたものを渡す（**フェーズ 10 で完了済みの案件を隠すときは、呼び出し側で全体の並びに戻すこと**）。`ids` は `useMemo` などで参照を保って渡す（effect が作り直されないように）。`onReorder` は例外を投げない契約
  - 使い方: 行の要素を `registerRow(id, element)` で登録し（ref のコールバックは `useCallback` で参照を保つ。変わると描画のたびに登録し直しになる）、つかみに `handleHandlePointerDown(id, event)` / `handleLostPointerCapture` をつなぎ、行は `displayIds` の順に描いて `getRowState(id)` で見た目を決める
  - プランとの違い: **ドラッグ中は並びを変えず**、つかんだ行を `translateY` で浮かせて追従させ、落とす先に横線（`dropBefore` / `dropAfter`）を出す。並びが変わるのは保存中（`displayIds` = 変更後）と保存後
  - 落とす先は、各行の中央とポインターの位置から求める（高さの違う行でもよい）。つかんだ行は先頭の行の上端〜末尾の行の下端より外へは動かさない（`clampDragOffset`。ダイアログの外に出て見えなくなったため）
  - 行の位置は、つかんだときだけでなく **pointermove とスクロールのたびに測り直す**（PR #15 のセルフレビュー対応。ドラッグ中に検証エラーで行が高くなると、落とす先が 1 つずれたため）。`getBoundingClientRect` ではなく `offsetTop` / `offsetHeight` で測り、offsetParent の画面上の位置を足してスクロール量を引く（つかんだ行の `transform` の影響を受けずに、動かす前の位置を測るため）。そのため、スクロールの補正も特別な処理なしで効く。ポインターを止めたままのスクロールは、window の scroll（キャプチャ段階）で受けて更新する。端に近づいたときの自動スクロールはない
  - つかみの `pointerdown` では **`preventDefault` しない**。すると入力欄の blur が起きず、管理ダイアログで編集中の名前が保存されないまま残った（保存中に入力欄が無効になり、フォーカスだけ外れる）。選択はつかみの `user-select: none`、タッチのスクロールは `touch-action: none` で防いでいる
  - Esc は帯のドラッグと同じく window のキャプチャ段階で受けて `preventDefault` / `stopPropagation`（`<dialog>` の Esc で閉じるのも止まることを確認済み）
- コンポーネント: `components/DragHandle/`（つかみ。`button` だがキーボードでは並び替えられないので `tabIndex=-1`。キーボードでの並び替えは不要とユーザーが判断した（PR #15）。`isDisabled` は省略可で、管理ダイアログの保存中だけ使う。無効は `aria-disabled` で表す）、`components/MemberListGroup/`（左のリストの担当者 1 人ぶん。`React.memo`。行のスタイルは `MemberList.module.scss` からこちらへ移した）、`components/MemberListProjectRow/`（左のリストの案件 1 行。ref のコールバックを安定させるために切り出した）。`MemberList` は担当者ごとに `MemberListGroup` を置くだけになった。左のリストの開閉の判定（`isExpanded`）は引き続き `useMemberList` にある（`useTimeline` と同じにすること）
- 案件の並びの保存は `useProjects.reorderProjects` → `useGanttPage` の `projectReorder`（`reorder` / `error` / `dismissError`）。失敗は帯のドラッグと同じく左下のお知らせに出す。お知らせは `.notices` に縦に積むようにした（2 つ出ても重ならない）
- 担当者: `useMemberManagement.moveMember` は `reorderMembers(orderedIds)` に置き換え、`moveId` / `TMoveDirection` は削除した。ダイアログの保存は `runAction` を通す（保存中はドラッグを始められない）
- サンプルデータ（`devSeed.ts`）は変更なし。案件は追加した順に一番下へ入るので、投入直後の並びは開始日順ではなく追加順になる

## 4-00. フェーズ 8 の完了状況

フェーズ 8 は完了（ブランチ `feat/gantt-bar-drag`、PR #13 を `develop` にマージ済み）。フェーズ 9（旧番号。今のフェーズ 11）は未着手。

> 2026-10-30 にフェーズの番号を振り直した。それより前に書かれた記述にある「フェーズ 9（仕上げ）」は、今の**フェーズ 11** を指す。今のフェーズ 9 は「案件・担当者のドラッグによる並び替え」。

### フェーズ 8 の確認結果

- `pnpm lint` / `typecheck` / `test`（213 件。うち `barDrag.utils.test.ts` が 22 件）/ `format:check` / `build` が成功
- ブラウザ（別セッションが起動していた `http://localhost:3000` の開発サーバー。1024×768、マウス）で確認済み:
  - 帯の中央をドラッグすると 1 日単位で移動し、離すと保存される（10/26〜11/8 → 10/29〜11/11）。パネルは開かない
  - 左端を終了日より右まで引っぱると、開始日が終了日で止まり 1 日の帯になる。1 日の帯の右端をドラッグして伸ばせる
  - 表示期間の左にはみ出した帯は、左端のつかみが出ない（右端だけ）
  - 小さく動かさずにクリックするとパネルが開く。キーボード（フォーカスして Enter）でも開く
  - ドラッグ中は帯の上に「11/13 〜 11/17」の形で変更後の期間が出る。Esc で元の位置に戻り、保存されず、開いていたサイドパネルも閉じない。その後の click でもパネルは切り替わらない（Esc の確認は合成イベントで行った。実際のキー操作はドラッグ中に押せないため）
  - **サイドパネルで編集中の帯はドラッグできない**（ユーザーの希望で追加）。ドラッグしても動かず保存もされず、パネルも開いたまま。カーソルは grab ではなく pointer、つかみも出ない。他の帯はパネルを開いたままドラッグでき、パネルを閉じれば同じ帯もドラッグできる
  - 保存に失敗させる（`Storage.prototype.setItem` を一時的に例外にする）と、帯が元の位置に戻り、左下に「期間を保存できませんでした。…」が出る。「閉じる」で消える
  - 再読み込みしても変更が残る
  - PR #13 のレビュー指摘の修正後: Esc で取り消して帯の外で離した（click が来ない）あと、フォーカスして Enter を押すと 1 回目でパネルが開く。通常のドラッグのあとはパネルが開かない。タッチの端末を模した表示（375×812、`pointer: coarse`）でつかみが 10px になる
  - 確認中に見つけた不具合を修正済み: エラーのお知らせを画面下の中央に出していたため、サイドパネルを開いていると右半分が隠れた（左下に移し、`$z-index-notice` でパネルより上に出す）
- **未確認**: タッチ操作（スマホ・タブレット実機）、`pointercancel` が来る場面、ドラッグ中に帯が表示期間の外まで出て描かれなくなったときの離す操作（window で受けているので動く想定）、スマホ幅の見た目
- 動作確認のため、ブラウザペインの localStorage のサンプルデータの日付を変えた（「Web サイト改修 v2」が 11/12〜11/16、「バナー制作（1 日だけ）」が 11/14）

### フェーズ 9 以降への申し送り（帯のドラッグ）

- 構成: `components/ProjectBar/` に `useBarDrag.ts`（ポインター操作と状態）と `barDrag.utils.ts`（状態遷移の純粋関数。`startBarDrag` / `updateBarDrag` / `getDraggedPeriod` / `getBarDragResult` / `formatBarPeriodLabel`）を置いた。`useProjectBar` が `useBarDrag` を呼び、つかみ・期間の表示の値を組み立てる
- ドラッグの状態は**帯 1 本ごと**のフックに持つ（ドラッグ中に `Timeline` 全体を再描画しないため）。担当者行のまとめ帯（`MemberSummaryBar`）はドラッグ中は動かず、保存後に変わる
- プランの `IDragState` は `IBarDragState` として実装。`projectId` は持たず（帯ごとのフックなので自明）、代わりに `pointerId` を持つ（2 本目の指の動きを無視するため）
- イベント: `pointerdown` は帯（中央 = 移動）と左右のつかみ（`span`。`stopPropagation` で移動と区別）の React の props。`setPointerCapture` したうえで、`pointermove` / `pointerup` / `pointercancel` / `keydown`（Esc）は**ドラッグ中だけ window に登録**し、同じ `useEffect` で解除する（帯が表示期間の外へ出て描かれなくなっても離す操作を受けるため）。Esc は window のキャプチャ段階で受けて `stopPropagation` し、サイドパネルの Esc（`document` の keydown）まで届かないようにしている
- クリックとの区別: 移動量が `DRAG_THRESHOLD_PX` 以上になった時点で `isDragging`（戻しても true のまま）。離したとき `isDragging` でなければクリック扱いで、後続の click がそのままパネルを開く。ドラッグ・取り消しのあとは `consumeClickSuppression` が次の**ポインター由来の** click を 1 回だけ無視する。印は click のたびと次の pointerdown で戻す。キーボード（Enter / Space）の click（`MouseEvent.detail === 0`）は抑止しない（PR #13 のレビュー指摘。取り消しの後に click が来ず印が残っていても、キーボードでパネルを開けるようにするため）
- `onCommit` は例外を投げない契約だが、万一 reject されても unhandled rejection にならないよう、`useBarDrag` 側でも `.catch` してコンソールに出す（PR #13 のレビュー指摘）
- 保存: 離したとき期間が変わっていれば `useGanttPage` の `barDrag.changePeriod`（`updateProject` に開始日・終了日だけを渡す部分更新）を 1 回だけ呼ぶ。保存中は変更後の位置に描き（`savingPeriod`）、終わったら保存済みの値に戻す。失敗は例外にせず `barDrag.error` に載せ、`GanttChart` が左下にお知らせを出す
- **サイドパネルで編集中の案件の帯はドラッグできない**（ユーザーの希望。`useBarDrag` の `isDisabled` に `isEditing` を渡す。つかみも出さない）。パネルのフォームの日付とドラッグの結果が食い違い、古い日付のまま保存して戻してしまうのを防ぐ意味もある。このため `sidePanelKey` は案件の ID だけのまま（期間で作り直さない）。クリックは受け付ける
- 帯は `touch-action: pan-y`（横のドラッグは帯の操作、縦のスワイプは画面のスクロール）。そのため、タッチで帯の上から横にスクロールすることはできない
- 新しいトークン: `$z-index-bar-dragging`（ドラッグ中の帯と期間の表示）、`$z-index-notice`（お知らせ。パネルより上）。つかみの幅は `ProjectBar.module.scss` の Sass 変数で、マウスは 6px、指で操作する端末（`@media (pointer: coarse)`）は 10px（1 日の帯でも中央が 12px 残る。PR #13 のレビュー指摘。実機では未確認なので、狭い・広いと感じたらフェーズ 11 で調整する）
- テストは jsdom を入れず、状態遷移を純粋関数に切り出して node 環境で確認した（ポインターイベントの順番を変えた流れを `dragThrough` で再現）。フック自体の配線（キャプチャ・window の登録・click の抑止）はブラウザでの手動確認のみ
- 開発サーバーが別のセッションで動いていると、このセッションの `preview_start`（`dev-http`）は「Another next dev server is already running」で失敗する。同じフォルダーのサーバーなら、`http://localhost:3000` を開けばこの作業ツリーの変更が反映されている

## 4-0. デザイン調整（ダークテーマ化）

ユーザーの依頼「全体的にチープなので、ダークカラーでモダンに」を受けて、フェーズ 8 の前に実施した。

- 色はすべて `_tokens.scss` に集約。背景は `$color-bg` → `$color-surface` → `$color-elevated` の 3 段階、線や薄い塗りは白の透明度（`$color-border` / `$color-hover` など）。主色は `$color-primary`（インディゴ）
- `globals.scss` にボタン・入力欄の基本スタイルを置いた。クラスのないボタン（キャンセル・閉じるなど）はこの見た目になり、各コンポーネントは色だけ上書きする。`color-scheme: dark` で日付ピッカーやスクロールバーもダーク表示
- 帯（`ProjectBar`）は背景色に白のグラデーションを重ねている。そのため `useProjectBar` のインラインスタイルは `background` ではなく **`backgroundColor`** で渡す（`background` だとグラデーションが消える）。フェーズ 8 でドラッグ中の見た目を足すときも同じ点に注意
- 編集中の帯の強調は `outline` から `box-shadow` の二重リングに変えた
- 確認: `pnpm lint` / `typecheck` / `test`（191 件）/ `build` が成功。ブラウザ（1280×760）でメイン画面・サイドパネル・担当者の管理ダイアログを目視確認。確認ダイアログ（削除）・空の状態・スマホ幅は未確認
- 残課題: PWA のアイコン（`public/icons/`）は明るいデザインのまま。必要なら `scripts/generate-icons.mjs` で作り直す
- プレビュー用に `.claude/launch.json`（Basic 認証の環境変数を空にして `pnpm dev:http` を起動）をローカルに作った。コミットはしていない

## 4. フェーズ 7 の完了状況

フェーズ 7 は完了（ブランチ `feat/gantt-member-management`、PR #11 を `develop` にマージ済み）。

### フェーズ 7 の確認結果

- `pnpm lint` / `typecheck` / `test`（191 件。うち `gantt.utils.test.ts` が 60 件）/ `format:check` / `build` が成功
- ブラウザ（`BASIC_AUTH_USER= BASIC_AUTH_PASSWORD= pnpm dev:http`）で確認済み: 管理ダイアログが開く / 同じ名前の追加は警告だけで登録できる（追加欄・行の両方に警告）/ 名前の変更が左リストに反映 / 上へ・下へで並びが変わり再読み込みしても残る / 名前を空にするとエラーが出て保存されない / 削除の確認に「案件 3 件も一緒に削除されます」が出る / 削除すると配下の案件も localStorage と左リストから消える / 確認ダイアログの Esc は確認だけを閉じる
- 確認中に見つけた不具合を修正済み: 確認ダイアログの Esc が管理ダイアログまで閉じていた（React では `cancel` が親の `onCancel` へ伝わる。`useMemberManageDialog.handleCancel` で発生元が自分自身のときだけ処理する）
- **未確認**: 51 文字の名前のエラー表示（単体テストでは確認済み）、保存失敗時のダイアログ内エラー表示、スマホ幅の見た目、担当者が 0 人になった後に空の画面から再度追加する流れ、読み込み失敗の画面の「再読み込み」ボタン。ブラウザ操作の注意: 画面を操作した直後のスクリーンショットが古い状態のことがある（ペインがバックグラウンドのとき）。状態の確認は `read_page` や JavaScript で DOM・localStorage を見るほうが確実
- 動作確認のため、ブラウザペインの localStorage のサンプルデータを変更した（担当者「佐藤」を削除、「山田」を追加）。サンプルを戻したいときは `gantt:*` を消して「サンプルデータを入れる」

### フェーズ 8 以降への申し送り（担当者の管理）

- 構成: `useMembers`（`createMember` / `renameMember` / `reorderMembers` / `deleteMember`。`useProjects` と同じく、保存成功後に state を更新し、失敗は例外のまま投げる）→ `useMemberManagement`（ダイアログの開閉と、ダイアログから呼ぶ操作。削除後は `removeProjectsOfMember` で手元の案件の一覧から取り除く。再読み込みは挟まないので、削除後に失敗する経路がない）→ `useGanttPage` が `memberManagement` グループで公開 → `GanttChart` が `MemberManageDialog` を置く。左リスト・空の画面の「担当者を管理」は `manageMembers`（= ダイアログを開く）を呼ぶ
- コンポーネントは `components/MemberManageDialog/`（`<dialog>` + `showModal`、`useMemberManageDialog`）と `components/MemberManageRow/`（1 行。名前の下書き・検証は `useMemberManageRow`）。**ダイアログは開いている間だけマウントする**（`isOpen` の props はない。外すと閉じ、入力途中の値も破棄される）。保存系の操作は 1 つずつ実行し（二重実行は `isBusyRef` で弾く）、実行中は `isBusy` で全ボタンを止める。失敗は `actionError` としてダイアログ内に出す
- 担当者名の検証は `gantt.utils.ts` の `validateMemberName`（必須・50 文字。`MEMBER_NAME_MAX_LENGTH`）、重複の警告は `hasSameNameMember`（登録は止めない）、並び替えは `moveId`（`TMoveDirection`）。ダイアログと行の 2 コンポーネントで使うため feature 共通の utils に置いた
- 管理ダイアログを開くときは**サイドパネルを閉じる**（入力途中の内容は破棄される）。パネルの Esc が `document` の keydown で、ダイアログの Esc と二重に効くのを避け、削除した担当者の案件を編集中のままにしないため
- 並び替えは上へ・下へボタンのみ（プラン通りドラッグはなし）。`reorderMembers` は全 id を渡す必要があり、別タブで担当者が増減していると repository がエラーを返す（ダイアログ内に表示される）
- 読み込み失敗の画面（`loadError`）に「再読み込み」ボタンを追加（`retryLoad` が担当者・案件の両方を読み込み直す。初回の読み込み失敗からも復帰できる）
- PR #11 のレビュー指摘「名前を編集したまま他のボタンを押すと 1 回目のクリックが効かない」は、ブラウザの実クリックで再現しなかった（編集直後の「↓」「✕」が 1 回目で効き、名前も保存された。「削除」は未実測）。対処は不要と判断した
- 新しいトークン `$color-warning`（重複の警告の文字色）を `_tokens.scss` に追加
- lint の注意: `react-hooks/refs` の誤検知は `MemberManageDialog` でも出たため、`useMemberManageDialog` の戻り値を分割代入して使っている（`ConfirmDialog` と同じ対処）

## 4-2. フェーズ 6 の完了状況

フェーズ 6 は完了（ブランチ `feat/gantt-side-panel`、PR #7 を `develop` にマージ済み）。フェーズ 7 は未着手。

### フェーズ 6 の確認結果

- `pnpm lint` / `typecheck` / `test`（181 件。うち `projectForm.utils.test.ts` が 13 件）/ `format:check` / `build` が成功
- ブラウザ（`BASIC_AUTH_USER= BASIC_AUTH_PASSWORD= pnpm dev:http`）で確認済み:
  - 担当者（鈴木）の「＋ 案件を追加」→ その担当者が初期選択で開き、案件名にフォーカスが当たる。開始日・終了日は今日。保存すると正しい担当者の下・正しい日付に出る
  - 帯・**左リストの案件名**のどちらをクリックしても編集パネルが開き、編集中の帯が枠で強調される。保存すると帯と左リストの両方が更新され、再読み込みしても残る
  - 案件名が空のまま保存すると、項目の下にエラーが出て保存されない
  - 削除 → 確認ダイアログ（フォーカスはキャンセル）→ 削除でき、localStorage からも消える。確認ダイアログ表示中の Esc は確認だけ閉じ、もう一度 Esc でパネルが閉じる
  - 確認中に見つけた不具合を修正済み: フォームの項目が縦に引き伸ばされて間が空いていた（`.field` の `flex: 1` は日付の 2 列だけに限定）
- **未確認**: 101 文字の案件名・開始日 > 終了日のエラー表示（単体テストでは確認済み）、「✕」・キャンセルボタンでの閉じ方、スマホ幅での見た目、保存失敗時のパネル内エラー表示。ブラウザ操作の注意: 再読み込みするとビューポートの設定が戻り、スクリーンショットの座標系（800x600）が実際のビューポートより小さくなってパネルが見切れることがある

### フェーズ 7 以降への申し送り（サイドパネル）

- 構成: `useSidePanel`（`TSidePanelState`: closed / create / edit の 1 つの state）→ `useGanttPage` が `sidePanel` グループで公開 → `GanttChart` が `ProjectSidePanel` を置く。編集中の案件は state に持たず、`projectId` から `projects` を引く（見つからなければパネルは出さない）
- `useProjects` に `createProject` / `updateProject` / `deleteProject` を追加。repository の保存が成功してから state を更新し、失敗は例外のまま投げる（フォームが `submitError` としてパネル内に出す）。フェーズ 7 の `useMembers` も同じ形にそろえるとよい
- フォームは `components/ProjectSidePanel/` に置いた（`useProjectForm` / `projectForm.type.ts` / `projectForm.utils.ts`。パネル全体の表示用の値は `useProjectSidePanel`）。入力値の初期値は初回の描画で 1 度だけ決めるので、別の案件・担当者で開き直すときは `GanttChart` が `ProjectSidePanel` の `key` を変えて作り直している
- 案件名の必須・100 文字チェックは `validateProjectForm`（`PROJECT_NAME_MAX_LENGTH`）。フェーズ 7 の担当者名も同じ観点（前後の空白を除いて空なら不可）で検証すること
- `ConfirmDialog`（`<dialog>` + `showModal`）はフェーズ 7 の担当者の削除でも使える。開閉は `isOpen` の props が正で、Esc は `onCancel` 経由で親が閉じる
- パネルの Esc は `document` の keydown で受けており、確認ダイアログの表示中・保存中は無効にしている
- 左リストの案件名（`MemberList` の `projectButton`）も、クリックで同じ `selectProject` を呼ぶ（`onSelectProject`。`React.memo` を保つため参照が変わらない関数を渡す）。左リスト側には編集中の強調は付けていない
- `ProjectBar` は `button` になり、クリックで `onSelect(projectId)`、編集中は `isEditing` で枠線を出す。`Timeline` に `editingProjectId` / `onSelectProject` を渡している（`onSelectProject` は参照が変わらない関数にして `React.memo` を保つこと）。フェーズ 8 のドラッグは、このクリックとの区別に `DRAG_THRESHOLD_PX` を使う
- 「担当者が 0 人のときは追加ボタンを押せない」は、案件を追加するボタンが担当者ごとの案件リスト下にあるため、担当者がいなければボタン自体が存在しない（空の画面に「まず担当者を追加してください」を出している）ことで満たしている
- 新しいトークン `$color-danger`（削除ボタン・エラー文字）を `_tokens.scss` に追加。パネルの幅（360px）は `ProjectSidePanel.module.scss` の Sass 変数
- 追加時の開始日・終了日の初期値は今日の 1 日だけ。担当者が他のタブで消えたときは、保存時に「担当者を選択してください」になる
- **別タブでの同時編集は後勝ちで、古いフォームの値が先の変更を上書きする**（PR #7 の Codex レビュー指摘。意図的に未対応）: `handleSaveProject` はフォームの全項目を `updateProject` に渡すため、別タブで日付を変えて保存した後、古いタブで案件名だけ変えて保存すると日付も元に戻る。他タブの変更を取り込む仕組み（`storage` イベントの購読など）もない。localStorage・身内利用では同じ案件を複数タブで同時に編集する場面がほぼないため、フェーズ 6 では対応しない。Firestore へ移行して複数人が同時に編集できるようになる時点で、`updatedAt` の照合による競合検知（`IGanttRepository` の API 変更を伴う）として設計する。それまでの暫定策としては、フォームの初期値との差分だけを送る方法がある（`TProjectUpdate` と repository は部分更新に対応済み）
- 開発サーバーがすでに別で動いているとき（`https://localhost:3000`）、2 つ目の `pnpm dev:http` は「Another next dev server is already running」で失敗する。その場合は動いているサーバーを止めてもらってから起動する

## 5. フェーズ 5 の完了状況

フェーズ 5 は完了（ブランチ `feat/gantt-layout`、PR #6 を `develop` にマージ済み）。フェーズ 6 は未着手。

### フェーズ 5 の確認結果

- `pnpm lint` / `typecheck` / `test`（168 件）/ `build` が成功（`/` は静的にプリレンダリングされる）
- ブラウザ（`pnpm dev:http`）で確認済み: 空の状態 →「サンプルデータを入れる」→ 担当者 → 案件の 2 階層と帯、今日の線、土日祝の色分け、月またぎ、期間の外にはみ出す帯の角（切れた側は丸めない）、折りたたみ、無限スクロール（右端・左端に近づくと範囲が 90 日ずつ広がり、左に広がっても見ている位置が動かない）、横スクロールしても左リストと日付ヘッダーが残る
- **未確認**（フェーズ 5 時点）: 縦スクロール（サンプルデータが少なく画面に収まったため。同じ `position: sticky` の仕組み）、「今日」「◀」「▶」ボタンの動作、スマホ幅の見た目。ブラウザ操作の確認では、バックグラウンドのペインだと scroll イベントの到着が遅れた（実機では即時のはず）

### フェーズ 6 以降への申し送り（画面）

- **表示期間は「無限スクロール」**（2026-10-29 に「2 か月ごと」から変更）。`useTimelineRange` が用意する日付の範囲（初期は今日の 60 日前から 180 日分。`gantt.constants.ts` の `DEFAULT_RANGE_*` / `RANGE_EXTEND_DAYS`）を持ち、`useTimelineScroll` がスクロール位置を見て端（`RANGE_EDGE_THRESHOLD_PX`）に近づいたら範囲を広げる。過去側に広げたときは `flushSync` で描画を済ませてから `scrollLeft` を広げた分だけ補正する（見ている位置を保つため）。範囲は広げるだけで縮めない。◀ / ▶ は 14 日ぶんのスクロール、「今日」は今日が見える位置へのスクロール。帯の位置は `rangeStart`（広がると変わる）基準なので、フェーズ 8 のドラッグでも `getBarLayout` に今の `rangeStart` を渡すこと
- **lint の注意**: `react-hooks/refs` が、`ref={}` に渡す関数を持つフックの戻り値オブジェクト全体を「ref を含む」と誤検知する。`GanttChart.tsx` では `chart.scrollArea` の `attachScroller` / `handleScroll` を先に個別に分割代入して回避している。スクロール領域の要素は ref ではなく state で持っている
- **「範囲の起点」と「今日」は別に管理している**（PR #6 のレビュー指摘）: `useSyncExternalStore` は再描画のたびに getSnapshot を呼び直すため、起点（`rangeStart` の基準）まで毎回 `getToday()` にすると、日付をまたいだ後の再描画で範囲だけが 1 日進み、`scrollLeft` とずれる。そこで `useTimelineRange.ts` では、範囲の起点はモジュール変数 `rangeAnchorDate`（最初に開いた日）で固定し、`today`（今日の線・日付の強調・今日ボタン）は `subscribeToToday` で最新を追いかける（次の 0 時の少し後のタイマー、画面にフォーカスが戻ったとき、タブが表示されたとき）。日付をまたいでも見ている位置は動かず、今日の線だけが正しい日に進む。範囲の起点は再読み込みするまで変わらない。起点は固定なので、範囲の端の判定や `getBarLayout` に渡す `rangeStart` は日付をまたいでも一定
- **再描画の範囲**: 画面左端の日付（`visibleDate`）が変わるたびに `GanttChart` が走り直すため、`memberGroups` / `columns` は `useGanttPage` の `useMemo` で参照を保ち、重い `Timeline` / `TimelineDateHeader` / `MemberList` は `React.memo` にしてある。これらに渡す props に、毎回新しく作るオブジェクト・関数を足さないこと（足すと memo が効かなくなる）
- **smooth スクロールと範囲の拡張**: `scrollLeft` を書き換えると smooth スクロールのアニメーションが止まる。◀ / 今日は `scrollToPosition` が、目的地が左端に近いときに先に範囲を広げて（`flushSync` + `scrollBy` の instant）から smooth を始める。補正には `scrollLeft` の代入ではなく `scrollBy({ behavior: "instant" })` を使う。拡張は左右とも `flushSync` で描画を済ませ、二重に走らせない
- サンプルデータの投入は `isSeeding` で二重実行を防ぎ、失敗は `seedError` として空の画面に出す
- **sticky の注意**: `.grid`（`GanttChart.module.scss`）は `width: max-content` が必須。スクロール領域の幅のままだと、左リストが領域の幅までしか追従しない
- 月の行の年月ラベルは区間の左端に置いているため、スクロールで区間の左が画面外に出るとラベルが切れて見える（`position: sticky` で追従させる改善の余地あり）
- 構成: `GanttChart`（`page.tsx` から置く唯一のコンポーネント）→ `useGanttPage`（`useMembers` / `useProjects` / `useTimelineRange` / `useTimelineScroll` / `useCollapsedMembers` を束ねる）。コンポーネントは `components/<名前>/`（tsx・scss・専用フック・`index.ts` を同じディレクトリに置く。画面の値の組み立ては `GanttChart/useGanttChart.ts` が `useGanttPage` の結果から行う）、ページ全体のフックは `hooks/`、サンプルデータは `devSeed.ts`
- 画面は 1 つのスクロール領域（`.scroller`）の中に CSS Grid で左リスト（`MemberList`）と右タイムライン（`Timeline`）を並べ、日付ヘッダー・左リスト・左上の角を `position: sticky` で固定している。`Timeline` は本体（背景・今日の線・帯）だけで、日付ヘッダーは `TimelineDateHeader` が別に受け持つ。**行の並びと高さは `MemberList` と `Timeline` で同じ**（`MEMBER_ROW_HEIGHT` / `PROJECT_ROW_HEIGHT`）。行を足すときは両方を直す
- **今日の日付は `useSyncExternalStore` で取っている**（サーバー側は null）。`cacheComponents` が有効なため、レンダリング中に `new Date()` を読むと静的シェルに焼き込まれる。日付をレンダリング中に読む処理を足すときは `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md` を読むこと。データの読み込みは `useEffect` 内（クライアント側）で行っている
- `useMembers` / `useProjects` は読み込みと `reloadMembers` / `reloadProjects` だけを持つ。フェーズ 6・7 で追加・編集・削除の操作をここに足す（repository はコンポーネントの外で 1 回だけ作り、`useGanttPage.ts` の先頭で生成して引数で渡している）
- 「案件を追加」は**各担当者の案件リストの下**（開いているときだけ）に置いてある（2026-10-29 に最下部から変更）。押すと `addProject(memberId)` が呼ばれるので、フェーズ 6 ではその担当者を担当者の初期値にしてサイドパネルを開く。`Timeline` 側にも同じ高さの空行があり、左右の行をそろえている。「担当者を管理」は最下部のまま。ボタンの処理は `useGanttPage` の `addProject` / `manageMembers`（今は空の関数で `TODO:` が付いている）を差し替える。`ProjectBar` はまだクリックできない（フェーズ 6 でサイドパネルを開く、フェーズ 8 でドラッグを足す）
- 「サンプルデータを入れる（開発用）」は担当者が 0 人のときの空の画面にだけ出る（本番ビルドでは出ない）。再度入れたいときはブラウザの localStorage（`gantt:*`）を消す
- `gantt.utils.ts` に追加した関数: `getDayColumns` / `getMonthSegments` / `formatYearMonth` / `groupProjectsByMember`（担当者ごとの案件のまとまり。開始日順）/ `toError`。型は `IDayColumn` / `IMonthSegment` / `IMemberGroup`
- `isRangeOverlapping` は引き続きどこからも呼ばれていない（`getBarLayout` が `null` を返すことで代用している）。使わないなら、フェーズ 11 で削除を検討する
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
- 壊れたデータを読んだときは配列ごと捨てて空から始め、元の値をコンソールの警告に出す。次に書き込むと元のデータは上書きされる（身内利用なので許容。必要ならフェーズ 11 でバックアップを検討）
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

- 次にやること: **フェーズ 12**（[13-phase12-polish-review.md](13-phase12-polish-review.md)。仕上げ・全体の検証・Codex のレビュー）。着手前にユーザーの確認を取る。4-00000 章の「未確認」（320px 以下・タッチ操作・保存中の抑止の実機確認など）も仕上げで見ること
- その次: **フェーズ 12**（[13-phase12-polish-review.md](13-phase12-polish-review.md)。仕上げ・全体の検証・Codex のレビュー）。4-0000 章の「未確認」（タッチ操作・スマホ幅のヘッダー以外の見た目など）も仕上げで見ること
- 担当: フェーズ 9・10 は Opus 5.5、フェーズ 11（調整）は Sonnet 5.5、フェーズ 12（仕上げ）は Sonnet 5.5 / Codex
- クラウドのセッションの環境の注意（フェーズ 10 で判明）: 既定の Node が 22・pnpm が 10 で、`engines`（Node 24 以上・pnpm 11 以上）に合わず `pnpm` のコマンドが動かない。`source /opt/nvm/nvm.sh && nvm install 24` → `corepack enable && corepack prepare pnpm@11.5.2 --activate` → `pnpm install --frozen-lockfile` で動くようになる。Playwright は `/opt/node22/lib/node_modules` にあるので、確認用のスクリプトは `NODE_PATH=/opt/node22/lib/node_modules /usr/local/bin/node` で動かす
- 追加した 2 フェーズの要点（ユーザーの依頼。2026-10-30）
  - フェーズ 9: `IProject.sortOrder`（担当者ごとに 0 から）を足し、スキーマを 1 → 2 に移行（既存データは今と同じ開始日順で番号を振る）。左リストの案件名の左のつかみをドラッグして、同じ担当者の中だけで並べ替える。担当者の管理ダイアログも ↑ / ↓ ボタンをやめ、同じつかみのドラッグで並べ替える（ドラッグの処理は共通のフック `useDragReorder` にまとめる）
  - フェーズ 10: `IProject.completedAt`（未完了は `null`）を足し、スキーマを 2 → 3 に移行。サイドパネルに「完了にする / 未完了に戻す」、ヘッダー右上に「完了済みを表示」の切り替え（保存しない。初期値は表示しない）
  - スキーマの移行はフェーズごとに 1 段ずつ行う（`SCHEMA_MIGRATIONS` に足していく）。フェーズ 10 を先にやる場合は番号の順を入れ替えること
- 始め方: 新しいセッションで、次のように依頼すれば再開できる

  ```
  .plan/handoff.md を読んで、フェーズ 11 を進めてください。
  ```
